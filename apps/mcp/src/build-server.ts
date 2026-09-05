import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createCasuarDb } from '../../../packages/db/src/client.js';
import { CasuarService } from '../../../packages/core/src/service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function buildCasuarMcpServer() {
  const db = createCasuarDb();
  const service = new CasuarService(db);
  const server = new McpServer({ name: 'casuar', version: '0.5.0' });

  async function deleteById(table: string, id: string) {
    const { data, error } = await db.from(table).delete().eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    return data;
  }

  server.tool('get_object', 'Get a canonical Casuar object by UUID or key.', { idOrKey: z.string() }, async ({ idOrKey }) =>
    text(await service.getObject(idOrKey))
  );

  server.tool('search_objects', 'Search canonical Casuar objects by key or label, optionally constrained by object kind.', {
    query: z.string().optional(),
    kind: z.enum(['concept', 'state', 'event', 'observation', 'claim', 'source', 'research_project', 'research_question']).optional(),
    limit: z.number().int().min(1).max(100).default(20)
  }, async (input) => text(await service.searchObjects(input)));

  server.tool('upsert_object', 'Create or update a canonical Casuar object by stable key.', {
    key: z.string().min(1),
    kind: z.enum(['concept', 'state', 'event', 'observation', 'claim', 'source', 'research_project', 'research_question']),
    label: z.string().min(1),
    description: z.string().optional(),
    attributes: z.record(z.unknown()).optional()
  }, async (input) => text(await service.upsertObject(input)));

  server.tool('delete_object', 'Delete a canonical Casuar object by UUID or key. Deletion fails if protected references still depend on it.', {
    idOrKey: z.string().min(1)
  }, async ({ idOrKey }) => {
    const query = db.from('objects').delete();
    const { data, error } = UUID_RE.test(idOrKey)
      ? await query.eq('id', idOrKey).select('*').maybeSingle()
      : await query.eq('key', idOrKey).select('*').maybeSingle();
    if (error) throw error;
    return text(data);
  });

  server.tool('list_subjects', 'List Casuar subjects.', {
    limit: z.number().int().min(1).max(100).default(50)
  }, async ({ limit }) => text(await service.listSubjects(limit)));

  server.tool('upsert_subject', 'Create or resolve a Casuar subject by stable external key.', {
    externalKey: z.string().min(1)
  }, async ({ externalKey }) => text(await service.upsertSubject(externalKey)));

  server.tool('delete_subject', 'Delete a Casuar subject and cascade-delete its observations and inferred states.', {
    subjectId: z.string().uuid()
  }, async ({ subjectId }) => text(await deleteById('subjects', subjectId)));

  server.tool('list_observations', 'List direct observations for a subject, optionally filtered to one concept.', {
    subjectId: z.string().uuid(),
    conceptId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(50)
  }, async (input) => text(await service.listObservations(input)));

  server.tool('create_observation', 'Record a direct person observation without converting it into an inferred biological state.', {
    subjectId: z.string().uuid(),
    conceptId: z.string().uuid(),
    observedAt: z.string(),
    value: z.union([z.number(), z.string(), z.record(z.unknown())]),
    unit: z.string().optional(),
    sourceType: z.string(),
    sourceRef: z.string().optional(),
    conditions: z.record(z.unknown()).optional()
  }, async (input) => text(await service.createObservation(input)));

  server.tool('delete_observation', 'Delete one direct observation by UUID.', {
    observationId: z.string().uuid()
  }, async ({ observationId }) => text(await deleteById('observations', observationId)));

  server.tool('list_inferred_states', 'List inferred states for a subject, optionally filtered to one concept.', {
    subjectId: z.string().uuid(),
    conceptId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(50)
  }, async (input) => text(await service.listInferredStates(input)));

  server.tool('create_inferred_state', 'Record an explicitly epistemic inferred state, separate from direct observations.', {
    subjectId: z.string().uuid(),
    conceptId: z.string().uuid(),
    stateKind: z.string().min(1),
    epistemicStatus: z.string().min(1),
    value: z.union([z.number(), z.string(), z.record(z.unknown())]),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    unit: z.string().optional(),
    probability: z.number().min(0).max(1).optional(),
    conditions: z.record(z.unknown()).optional(),
    provenance: z.record(z.unknown()).optional()
  }, async (input) => text(await service.createInferredState(input)));

  server.tool('delete_inferred_state', 'Delete one inferred state by UUID.', {
    stateId: z.string().uuid()
  }, async ({ stateId }) => text(await deleteById('inferred_states', stateId)));

  server.tool('list_research_projects', 'List Casuar research projects.', {
    limit: z.number().int().min(1).max(100).default(50)
  }, async ({ limit }) => text(await service.listResearchProjects(limit)));

  server.tool('upsert_research_project', 'Create or update a research project by stable key.', {
    key: z.string().min(1),
    label: z.string().min(1),
    objective: z.string().min(1),
    status: z.string().optional(),
    researchMode: z.string().optional()
  }, async (input) => text(await service.upsertResearchProject(input)));

  server.tool('delete_research_project', 'Delete a research project and cascade-delete its questions and jobs.', {
    projectId: z.string().uuid()
  }, async ({ projectId }) => text(await deleteById('research_projects', projectId)));

  server.tool('list_research_questions', 'List research questions, optionally filtered by project or status.', {
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(50)
  }, async (input) => text(await service.listResearchQuestions(input)));

  server.tool('open_research_question', 'Open a scoped research question without changing the biological truth layer.', {
    projectId: z.string().uuid(),
    question: z.string(),
    questionType: z.string().default('causal')
  }, async ({ projectId, question, questionType }) => text(await service.openResearchQuestion(projectId, question, questionType)));

  server.tool('update_research_question', 'Update research-question workflow state, priority, or readiness blocking.', {
    questionId: z.string().uuid(),
    status: z.string().optional(),
    priority: z.number().optional(),
    readinessBlocking: z.boolean().optional()
  }, async (input) => text(await service.updateResearchQuestion(input)));

  server.tool('delete_research_question', 'Delete a research question and cascade-delete jobs attached to it.', {
    questionId: z.string().uuid()
  }, async ({ questionId }) => text(await deleteById('research_questions', questionId)));

  server.tool('list_research_jobs', 'List research jobs, optionally filtered by project, question, or status.', {
    projectId: z.string().uuid().optional(),
    questionId: z.string().uuid().optional(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(50)
  }, async (input) => text(await service.listResearchJobs(input)));

  server.tool('create_research_job', 'Queue a research job for a project or question.', {
    projectId: z.string().uuid().optional(),
    questionId: z.string().uuid().optional(),
    jobType: z.string().min(1),
    payload: z.record(z.unknown()).optional()
  }, async (input) => text(await service.createResearchJob(input)));

  server.tool('update_research_job', 'Update a research job status, output, error, or lifecycle timestamps.', {
    jobId: z.string().uuid(),
    status: z.string().optional(),
    output: z.record(z.unknown()).optional(),
    error: z.string().optional(),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional()
  }, async (input) => text(await service.updateResearchJob(input)));

  server.tool('delete_research_job', 'Delete one research job by UUID.', {
    jobId: z.string().uuid()
  }, async ({ jobId }) => text(await deleteById('research_jobs', jobId)));

  server.tool('get_claim_with_evidence', 'Get one epistemic claim together with its linked evidence and source records.', {
    claimId: z.string().uuid()
  }, async ({ claimId }) => text(await service.getClaimWithEvidence(claimId)));

  server.tool('propose_claim', 'Create a proposed epistemic claim. This does not make the claim accepted knowledge.', {
    subjectObjectId: z.string().uuid(),
    relationType: z.string(),
    objectObjectId: z.string().uuid().optional(),
    objectLiteral: z.unknown().optional(),
    scope: z.record(z.unknown()).optional(),
    notes: z.string().optional()
  }, async (input) => text(await service.proposeClaim(input)));

  server.tool('update_claim', 'Update claim review status and epistemic confidence fields.', {
    claimId: z.string().uuid(),
    status: z.enum(['proposed', 'accepted', 'rejected', 'superseded']).optional(),
    causalStatus: z.string().optional(),
    causalConfidence: z.number().min(0).max(1).optional(),
    mechanisticConfidence: z.number().min(0).max(1).optional(),
    empiricalConfidence: z.number().min(0).max(1).optional(),
    notes: z.string().optional()
  }, async (input) => text(await service.updateClaim(input)));

  server.tool('delete_claim', 'Delete an epistemic claim and cascade-delete its attached evidence.', {
    claimId: z.string().uuid()
  }, async ({ claimId }) => {
    const { data, error } = await db.from('claims').delete().eq('object_id', claimId).select('*').maybeSingle();
    if (error) throw error;
    return text(data);
  });

  server.tool('upsert_source', 'Create or update a research source by stable citation key.', {
    citationKey: z.string().min(1),
    title: z.string().min(1),
    doi: z.string().optional(),
    url: z.string().optional(),
    publicationYear: z.number().int().optional(),
    sourceType: z.string().optional(),
    studyDesign: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  }, async (input) => text(await service.upsertSource(input)));

  server.tool('delete_source', 'Delete a research source by UUID. Deletion fails while claim evidence still references it.', {
    sourceId: z.string().uuid()
  }, async ({ sourceId }) => text(await deleteById('sources', sourceId)));

  server.tool('attach_claim_evidence', 'Attach structured supporting, opposing, null, or mixed evidence to a claim.', {
    claimId: z.string().uuid(),
    sourceId: z.string().uuid(),
    evidenceRole: z.enum(['supporting', 'opposing', 'null', 'mixed']),
    population: z.string().optional(),
    endpoint: z.string().optional(),
    effectMetric: z.string().optional(),
    effectEstimate: z.number().optional(),
    effectLow: z.number().optional(),
    effectHigh: z.number().optional(),
    riskOfBias: z.string().optional(),
    certainty: z.string().optional(),
    transportability: z.number().min(0).max(1).optional(),
    effectModifiers: z.record(z.unknown()).optional(),
    notes: z.string().optional()
  }, async (input) => text(await service.attachClaimEvidence(input)));

  server.tool('delete_claim_evidence', 'Delete one claim-evidence attachment by UUID.', {
    evidenceId: z.string().uuid()
  }, async ({ evidenceId }) => text(await deleteById('claim_evidence', evidenceId)));

  return server;
}
