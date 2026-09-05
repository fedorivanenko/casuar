import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaimInput, ObservationInput } from './types.js';

export class CasuarService {
  constructor(private readonly db: SupabaseClient) {}

  async getObject(idOrKey: string) {
    const query = this.db.from('objects').select('*');
    const { data, error } = idOrKey.includes('-')
      ? await query.eq('id', idOrKey).maybeSingle()
      : await query.eq('key', idOrKey).maybeSingle();
    if (error) throw error;
    return data;
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
