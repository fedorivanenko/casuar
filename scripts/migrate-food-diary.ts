import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const sourceUrl = process.env.CASUAR_LEGACY_SUPABASE_URL;
const sourceKey = process.env.CASUAR_LEGACY_SUPABASE_SERVICE_ROLE_KEY;
const targetUrl = process.env.CASUAR_SUPABASE_URL;
const targetKey = process.env.CASUAR_SUPABASE_SERVICE_ROLE_KEY;
const subjectKey = process.env.CASUAR_MIGRATION_SUBJECT_KEY ?? 'catia';
const dryRun = process.argv.includes('--dry-run');

if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
  throw new Error(
    'Missing migration env. Required: CASUAR_LEGACY_SUPABASE_URL, CASUAR_LEGACY_SUPABASE_SERVICE_ROLE_KEY, CASUAR_SUPABASE_URL, CASUAR_SUPABASE_SERVICE_ROLE_KEY.'
  );
}

const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const target = createClient(targetUrl, targetKey, { auth: { persistSession: false, autoRefreshToken: false } });

function slug(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'unknown';
}

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function ensureSubject(client: SupabaseClient) {
  const existing = await rows<any>(client.from('subjects').select('id,external_key').eq('external_key', subjectKey).limit(1));
  if (existing[0]) return existing[0].id as string;
  if (dryRun) return 'dry-run-subject';
  const { data, error } = await client.from('subjects').insert({ external_key: subjectKey }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function ensureConcept(input: {
  key: string;
  label: string;
  semanticType: string;
  description?: string;
  attributes?: Record<string, unknown>;
  aliases?: string[];
  externalIds?: Record<string, unknown>;
}) {
  const existing = await rows<any>(target.from('objects').select('id').eq('key', input.key).limit(1));
  let id = existing[0]?.id as string | undefined;
  if (!id && !dryRun) {
    const { data, error } = await target
      .from('objects')
      .insert({
        kind: 'concept',
        key: input.key,
        label: input.label,
        description: input.description ?? null,
        attributes: input.attributes ?? {},
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  if (!id) id = `dry-run:${input.key}`;

  const concept = await rows<any>(target.from('concepts').select('object_id').eq('object_id', id).limit(1));
  if (!concept[0] && !dryRun) {
    const { error } = await target.from('concepts').insert({
      object_id: id,
      semantic_type: input.semanticType,
      aliases: input.aliases ?? [],
      external_ids: input.externalIds ?? {},
      canonical: true,
    });
    if (error) throw new Error(error.message);
  }
  return id;
}

async function observationExists(sourceRef: string) {
  const found = await rows<any>(target.from('observations').select('id').eq('source_ref', sourceRef).limit(1));
  return Boolean(found[0]);
}

async function migrateRawObservations(subjectId: string) {
  const conceptId = await ensureConcept({
    key: 'legacy_food_diary_raw_event',
    label: 'Legacy food diary raw event',
    semanticType: 'personal_event_raw',
    description: 'Raw personal event migrated from the legacy Food Diary database.',
    attributes: { migration: 'food-diary-v1' },
    externalIds: { legacy_table: 'raw_observations' },
  });

  const sourceRows = await rows<any>(
    source
      .from('raw_observations')
      .select('id,observed_at,source_type,raw_text,source_reference,media_filename,notes,created_at')
      .order('created_at')
  );

  let inserted = 0;
  for (const row of sourceRows) {
    const sourceRef = `legacy-food-diary:raw_observation:${row.id}`;
    if (await observationExists(sourceRef)) continue;
    if (!dryRun) {
      const { error } = await target.from('observations').insert({
        subject_id: subjectId,
        concept_id: conceptId,
        observed_at: row.observed_at ?? row.created_at,
        value_text: row.raw_text,
        value_json: {
          legacy_id: row.id,
          original_observed_at: row.observed_at,
          original_source_reference: row.source_reference,
          media_filename: row.media_filename,
          notes: row.notes,
          migrated_from: 'legacy_food_diary.raw_observations',
        },
        source_type: row.source_type,
        source_ref: sourceRef,
        measurement_conditions: { timestamp_fallback_used: row.observed_at == null },
        created_at: row.created_at,
      });
      if (error) throw new Error(error.message);
    }
    inserted++;
  }
  return { scanned: sourceRows.length, inserted };
}

async function migrateDiaryEntries(subjectId: string) {
  const conceptId = await ensureConcept({
    key: 'legacy_food_diary_entry',
    label: 'Legacy food diary entry',
    semanticType: 'personal_event',
    description: 'Structured diary event migrated from the legacy Food Diary database.',
    attributes: { migration: 'food-diary-v1' },
    externalIds: { legacy_table: 'diary_entries' },
  });

  const sourceRows = await rows<any>(
    source
      .from('diary_entries')
      .select('id,diary_date,event_time,time_accuracy,entry_type,description,notes,created_at,event_time_lower_bound,event_time_upper_bound,event_time_source,event_time_notes,cycle_day')
      .order('created_at')
  );

  let inserted = 0;
  for (const row of sourceRows) {
    const sourceRef = `legacy-food-diary:diary_entry:${row.id}`;
    if (await observationExists(sourceRef)) continue;
    const observedAt = row.event_time ?? row.event_time_lower_bound ?? row.event_time_upper_bound ?? `${row.diary_date}T12:00:00Z`;
    if (!dryRun) {
      const { error } = await target.from('observations').insert({
        subject_id: subjectId,
        concept_id: conceptId,
        observed_at: observedAt,
        value_text: row.description,
        value_json: {
          legacy_id: row.id,
          diary_date: row.diary_date,
          entry_type: row.entry_type,
          notes: row.notes,
          event_time_lower_bound: row.event_time_lower_bound,
          event_time_upper_bound: row.event_time_upper_bound,
          event_time_source: row.event_time_source,
          event_time_notes: row.event_time_notes,
          cycle_day: row.cycle_day,
          migrated_from: 'legacy_food_diary.diary_entries',
        },
        source_type: 'legacy_food_diary',
        source_ref: sourceRef,
        measurement_conditions: { time_accuracy: row.time_accuracy },
        created_at: row.created_at,
      });
      if (error) throw new Error(error.message);
    }
    inserted++;
  }
  return { scanned: sourceRows.length, inserted };
}

async function migrateFoods() {
  const sourceRows = await rows<any>(source.from('foods').select('id,name,brand,barcode,is_packaged,food_category,notes,created_at,updated_at').order('created_at'));
  let inserted = 0;
  for (const row of sourceRows) {
    const key = `food_${slug(row.name)}_${String(row.id).slice(0, 8)}`;
    const existing = await rows<any>(target.from('objects').select('id').eq('key', key).limit(1));
    if (existing[0]) continue;
    if (!dryRun) {
      const { data, error } = await target
        .from('objects')
        .insert({
          kind: 'concept',
          key,
          label: row.name,
          description: row.notes,
          attributes: {
            semantic_type: 'food',
            brand: row.brand,
            barcode: row.barcode,
            is_packaged: row.is_packaged,
            food_category: row.food_category,
            legacy_id: row.id,
            migrated_from: 'legacy_food_diary.foods',
          },
          created_at: row.created_at,
          updated_at: row.updated_at,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const conceptError = await target.from('concepts').insert({
        object_id: data.id,
        semantic_type: 'food',
        aliases: [],
        external_ids: { legacy_food_id: row.id },
        canonical: true,
      });
      if (conceptError.error) throw new Error(conceptError.error.message);
    }
    inserted++;
  }
  return { scanned: sourceRows.length, inserted };
}

async function foodConceptByLegacyId(legacyId: string) {
  const objects = await rows<any>(
    target.from('objects').select('id,attributes').contains('attributes', { legacy_id: legacyId }).limit(1)
  );
  return objects[0]?.id as string | undefined;
}

async function diaryEntryTime(entryId: string) {
  const found = await rows<any>(source.from('diary_entries').select('diary_date,event_time,event_time_lower_bound,event_time_upper_bound').eq('id', entryId).limit(1));
  const row = found[0];
  if (!row) return null;
  return row.event_time ?? row.event_time_lower_bound ?? row.event_time_upper_bound ?? `${row.diary_date}T12:00:00Z`;
}

async function migrateDiaryItems(subjectId: string) {
  const sourceRows = await rows<any>(
    source
      .from('diary_items')
      .select('id,entry_id,food_id,recipe_batch_id,served_amount,consumed_amount,amount_unit,preparation_state,measurement_method,confidence,notes')
      .order('id')
  );

  let inserted = 0;
  let skippedUnresolved = 0;
  for (const row of sourceRows) {
    if (!row.food_id) { skippedUnresolved++; continue; }
    const conceptId = await foodConceptByLegacyId(row.food_id);
    if (!conceptId) { skippedUnresolved++; continue; }
    const sourceRef = `legacy-food-diary:diary_item:${row.id}`;
    if (await observationExists(sourceRef)) continue;
    const observedAt = await diaryEntryTime(row.entry_id);
    if (!observedAt) { skippedUnresolved++; continue; }
    if (!dryRun) {
      const { error } = await target.from('observations').insert({
        subject_id: subjectId,
        concept_id: conceptId,
        observed_at: observedAt,
        value_num: row.consumed_amount ?? row.served_amount,
        unit: row.amount_unit,
        value_json: {
          legacy_id: row.id,
          legacy_entry_id: row.entry_id,
          legacy_food_id: row.food_id,
          recipe_batch_id: row.recipe_batch_id,
          served_amount: row.served_amount,
          consumed_amount: row.consumed_amount,
          preparation_state: row.preparation_state,
          measurement_method: row.measurement_method,
          confidence_label: row.confidence,
          notes: row.notes,
          migrated_from: 'legacy_food_diary.diary_items',
        },
        source_type: 'legacy_food_diary',
        source_ref: sourceRef,
        measurement_conditions: {},
      });
      if (error) throw new Error(error.message);
    }
    inserted++;
  }
  return { scanned: sourceRows.length, inserted, skippedUnresolved };
}

async function migrateSymptoms(subjectId: string) {
  const sourceRows = await rows<any>(source.from('symptoms').select('id,entry_id,symptom,severity,location,duration_minutes,notes').order('id'));
  let inserted = 0;
  for (const row of sourceRows) {
    const conceptId = await ensureConcept({
      key: `symptom_${slug(row.symptom)}`,
      label: row.symptom,
      semanticType: 'symptom',
      attributes: { migrated_from: 'legacy_food_diary.symptoms' },
      externalIds: { legacy_symptom_label: row.symptom },
    });
    const sourceRef = `legacy-food-diary:symptom:${row.id}`;
    if (await observationExists(sourceRef)) continue;
    const observedAt = await diaryEntryTime(row.entry_id);
    if (!observedAt) continue;
    if (!dryRun) {
      const { error } = await target.from('observations').insert({
        subject_id: subjectId,
        concept_id: conceptId,
        observed_at: observedAt,
        value_num: row.severity,
        value_json: {
          legacy_id: row.id,
          legacy_entry_id: row.entry_id,
          location: row.location,
          duration_minutes: row.duration_minutes,
          notes: row.notes,
          migrated_from: 'legacy_food_diary.symptoms',
        },
        source_type: 'legacy_food_diary',
        source_ref: sourceRef,
        measurement_conditions: {},
      });
      if (error) throw new Error(error.message);
    }
    inserted++;
  }
  return { scanned: sourceRows.length, inserted };
}

async function main() {
  console.log(`Casuar Food Diary migration${dryRun ? ' (dry run)' : ''}`);
  const subjectId = await ensureSubject(target);
  const results = {
    rawObservations: await migrateRawObservations(subjectId),
    diaryEntries: await migrateDiaryEntries(subjectId),
    foods: await migrateFoods(),
    diaryItems: await migrateDiaryItems(subjectId),
    symptoms: await migrateSymptoms(subjectId),
  };
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
