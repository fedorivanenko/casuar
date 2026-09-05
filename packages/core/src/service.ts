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

  async upsertObject(input: {
    key: string;
    kind: string;
    label: string;
    description?: string;
    attributes?: Record<string, unknown>;
  }) {
    const payload = {
      key: input.key,
      kind: input.kind,
      label: input.label,
      description: input.description ?? null,
      attributes: input.attributes ?? {}
    };

    const { data, error } = await this.db
      .from('objects')
      .upsert(payload, { onConflict: 'key' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async listSubjects(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const { data, error } = await this.db.from('subjects').select('*').order('created_at').limit(safeLimit);
    if (error) throw error;
    return data;
  }

  async upsertSubject(externalKey: string) {
    const { data, error } = await this.db
      .from('subjects')
      .upsert({ external_key: externalKey }, { onConflict: 'external_key' })
      .select('*')
      .single();
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

  async listInferredStates(input: { subjectId: string; conceptId?: string; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    let query = this.db
      .from('inferred_states')
      .select('*')
      .eq('subject_id', input.subjectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (input.conceptId) query = query.eq('concept_id', input.conceptId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createInferredState(input: {
    subjectId: string;
    conceptId: string;
    stateKind: string;
    epistemicStatus: string;
    value: number | string | Record<string, unknown>;
    validFrom?: string;
    validTo?: string;
    unit?: string;
    probability?: number;
    conditions?: Record<string, unknown>;
    provenance?: Record<string, unknown>;
  }) {
    const payload: Record<string, unknown> = {
      subject_id: input.subjectId,
      concept_id: input.conceptId,
      state_kind: input.stateKind,
      epistemic_status: input.epistemicStatus,
      valid_from: input.validFrom ?? null,
      valid_to: input.validTo ?? null,
      unit: input.unit ?? null,
      probability: input.probability ?? null,
      conditions: input.conditions ?? {},
      provenance: input.provenance ?? {}
    };
    if (typeof input.value === 'number') payload.value_num = input.value;
    else if (typeof input.value === 'string') payload.value_text = input.value;
    else payload.value_json = input.value;

    const { data, error } = await this.db.from('inferred_states').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  async listResearchProjects(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const { data, error } = await this.db.from('research_projects').select('*').order('created_at', { ascending: false }).limit(safeLimit);
    if (error) throw error;
    return data;
  }

  async upsertResearchProject(input: {
    key: string;
    label: string;
    objective: string;
    status?: string;
    researchMode?: string;
  }) {
    const { data, error } = await this.db
      .from('research_projects')
      .upsert({
        key: input.key,
        label: input.label,
        objective: input.objective,
        status: input.status ?? 'active',
        research_mode: input.researchMode ?? 'domain_360',
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select('*')
      .single();
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

  async updateResearchQuestion(input: {
    questionId: string;
    status?: string;
    priority?: number;
    readinessBlocking?: boolean;
  }) {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.readinessBlocking !== undefined) patch.readiness_blocking = input.readinessBlocking;
    if (Object.keys(patch).length === 0) throw new Error('No research question fields supplied');

    const { data, error } = await this.db
      .from('research_questions')
      .update(patch)
      .eq('id', input.questionId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async listResearchJobs(input: { projectId?: string; questionId?: string; status?: string; limit?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    let query = this.db.from('research_jobs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (input.projectId) query = query.eq('project_id', input.projectId);
    if (input.questionId) query = query.eq('question_id', input.questionId);
    if (input.status) query = query.eq('status', input.status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createResearchJob(input: {
    projectId?: string;
    questionId?: string;
    jobType: string;
    payload?: Record<string, unknown>;
  }) {
    if (!input.projectId && !input.questionId) throw new Error('Research job requires projectId or questionId');
    const { data, error } = await this.db.from('research_jobs').insert({
      project_id: input.projectId ?? null,
      question_id: input.questionId ?? null,
      job_type: input.jobType,
      status: 'queued',
      input: input.payload ?? {}
    }).select('*').single();
    if (error) throw error;
    return data;
  }

  async updateResearchJob(input: {
    jobId: string;
    status?: string;
    output?: Record<string, unknown>;
    error?: string;
    startedAt?: string;
    finishedAt?: string;
  }) {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.output !== undefined) patch.output = input.output;
    if (input.error !== undefined) patch.error = input.error;
    if (input.startedAt !== undefined) patch.started_at = input.startedAt;
    if (input.finishedAt !== undefined) patch.finished_at = input.finishedAt;
    if (Object.keys(patch).length === 0) throw new Error('No research job fields supplied');

    const { data, error } = await this.db
      .from('research_jobs')
      .update(patch)
      .eq('id', input.jobId)
      .select('*')
      .single();
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

  async updateClaim(input: {
    claimId: string;
    status?: string;
    causalStatus?: string;
    causalConfidence?: number;
    mechanisticConfidence?: number;
    empiricalConfidence?: number;
    notes?: string;
  }) {
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.causalStatus !== undefined) patch.causal_status = input.causalStatus;
    if (input.causalConfidence !== undefined) patch.causal_confidence = input.causalConfidence;
    if (input.mechanisticConfidence !== undefined) patch.mechanistic_confidence = input.mechanisticConfidence;
    if (input.empiricalConfidence !== undefined) patch.empirical_confidence = input.empiricalConfidence;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length === 0) throw new Error('No claim fields supplied');

    const { data, error } = await this.db
      .from('claims')
      .update(patch)
      .eq('object_id', input.claimId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async upsertSource(input: {
    citationKey: string;
    title: string;
    doi?: string;
    url?: string;
    publicationYear?: number;
    sourceType?: string;
    studyDesign?: string;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await this.db
      .from('sources')
      .upsert({
        citation_key: input.citationKey,
        title: input.title,
        doi: input.doi ?? null,
        url: input.url ?? null,
        publication_year: input.publicationYear ?? null,
        source_type: input.sourceType ?? null,
        study_design: input.studyDesign ?? null,
        metadata: input.metadata ?? {}
      }, { onConflict: 'citation_key' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async attachClaimEvidence(input: {
    claimId: string;
    sourceId: string;
    evidenceRole: string;
    population?: string;
    endpoint?: string;
    effectMetric?: string;
    effectEstimate?: number;
    effectLow?: number;
    effectHigh?: number;
    riskOfBias?: string;
    certainty?: string;
    transportability?: number;
    effectModifiers?: Record<string, unknown>;
    notes?: string;
  }) {
    const { data, error } = await this.db.from('claim_evidence').insert({
      claim_object_id: input.claimId,
      source_id: input.sourceId,
      evidence_role: input.evidenceRole,
      population: input.population ?? null,
      endpoint: input.endpoint ?? null,
      effect_metric: input.effectMetric ?? null,
      effect_estimate: input.effectEstimate ?? null,
      effect_low: input.effectLow ?? null,
      effect_high: input.effectHigh ?? null,
      risk_of_bias: input.riskOfBias ?? null,
      certainty: input.certainty ?? null,
      transportability: input.transportability ?? null,
      effect_modifiers: input.effectModifiers ?? {},
      notes: input.notes ?? null
    }).select('*').single();
    if (error) throw error;
    return data;
  }
}
