import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaimInput, ObservationInput } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CasuarService {
  constructor(private readonly db: SupabaseClient) {}

  async getObject(idOrKey: string) {
    const query = this.db.from('objects').select('*');
    const { data, error } = UUID_RE.test(idOrKey)
      ? await query.eq('id', idOrKey).maybeSingle()
      : await query.eq('key', idOrKey).maybeSingle();
    if (error) throw error;
    return data;
  }

  async searchObjects(input: { query?: string; kind?: string; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    let query = this.db.from('objects').select('*').order('label').limit(limit);
    if (input.kind) query = query.eq('kind', input.kind);

    if (!input.query?.trim()) {
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    const needle = input.query.trim();
    const [byKey, byLabel] = await Promise.all([
      this.db.from('objects').select('*').ilike('key', `%${needle}%`).limit(limit),
      this.db.from('objects').select('*').ilike('label', `%${needle}%`).limit(limit)
    ]);
    if (byKey.error) throw byKey.error;
    if (byLabel.error) throw byLabel.error;

    const merged = new Map<string, Record<string, unknown>>();
    for (const row of [...(byKey.data ?? []), ...(byLabel.data ?? [])]) {
      if (input.kind && row.kind !== input.kind) continue;
      merged.set(String(row.id), row as Record<string, unknown>);
      if (merged.size >= limit) break;
    }
    return [...merged.values()];
  }

  async listSubjects(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const { data, error } = await this.db.from('subjects').select('*').order('created_at').limit(safeLimit);
    if (error) throw error;
    return data;
  }

  async listObservations(input: { subjectId: string; conceptId?: string; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    let query = this.db
      .from('observations')
      .select('*')
      .eq('subject_id', input.subjectId)
      .order('observed_at', { ascending: false })
      .limit(limit);
    if (input.conceptId) query = query.eq('concept_id', input.conceptId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async listResearchProjects(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const { data, error } = await this.db.from('research_projects').select('*').order('created_at', { ascending: false }).limit(safeLimit);
    if (error) throw error;
    return data;
  }

  async listResearchQuestions(input: { projectId?: string; status?: string; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    let query = this.db.from('research_questions').select('*').order('created_at', { ascending: false }).limit(limit);
    if (input.projectId) query = query.eq('project_id', input.projectId);
    if (input.status) query = query.eq('status', input.status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getClaimWithEvidence(claimId: string) {
    const { data: claim, error: claimError } = await this.db.from('claims').select('*').eq('object_id', claimId).maybeSingle();
    if (claimError) throw claimError;
    if (!claim) return null;

    const { data: evidence, error: evidenceError } = await this.db
      .from('claim_evidence')
      .select('*, source:sources(*)')
      .eq('claim_object_id', claimId)
      .order('created_at');
    if (evidenceError) throw evidenceError;
    return { claim, evidence: evidence ?? [] };
  }

  async createObservation(input: ObservationInput) {
    const payload: Record<string, unknown> = {
      subject_id: input.subjectId,
      concept_id: input.conceptId,
      observed_at: input.observedAt,
      unit: input.unit ?? null,
      source_type: input.sourceType,
      source_ref: input.sourceRef ?? null,
      measurement_conditions: input.conditions ?? {}
    };
    if (typeof input.value === 'number') payload.value_num = input.value;
    else if (typeof input.value === 'string') payload.value_text = input.value;
    else payload.value_json = input.value;

    const { data, error } = await this.db.from('observations').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  async proposeClaim(input: ClaimInput) {
    if (!input.objectObjectId && input.objectLiteral === undefined) {
      throw new Error('Claim requires objectObjectId or objectLiteral');
    }
    const { data, error } = await this.db.from('claims').insert({
      subject_object_id: input.subjectObjectId,
      relation_type: input.relationType,
      object_object_id: input.objectObjectId ?? null,
      object_literal: input.objectLiteral ?? null,
      scope: input.scope ?? {},
      status: 'proposed',
      notes: input.notes ?? null
    }).select('*').single();
    if (error) throw error;
    return data;
  }

  async openResearchQuestion(projectId: string, question: string, questionType = 'causal') {
    const { data, error } = await this.db.from('research_questions').insert({
      project_id: projectId,
      question_text: question,
      question_type: questionType,
      status: 'open'
    }).select('*').single();
    if (error) throw error;
    return data;
  }
}
