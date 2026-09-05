import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createCasuarDb } from '../../../packages/db/src/client.js';
import { CasuarService } from '../../../packages/core/src/service.js';

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function buildCasuarMcpServer() {
  const service = new CasuarService(createCasuarDb());
  const server = new McpServer({ name: 'casuar', version: '0.2.0' });

  server.tool('get_object', 'Get a canonical Casuar object by UUID or key.', { idOrKey: z.string() }, async ({ idOrKey }) =>
    text(await service.getObject(idOrKey))
  );

  server.tool('search_objects', 'Search canonical Casuar objects by key or label, optionally constrained by object kind.', {
    query: z.string().optional(),
    kind: z.enum(['concept', 'state', 'event', 'observation', 'claim', 'source', 'research_project', 'research_question']).optional(),
    limit: z.number().int().min(1).max(100).default(20)
  }, async (input) => text(await service.searchObjects(input)));

  server.tool('list_subjects', 'List Casuar subjects so observations can be addressed without direct database access.', {
    limit: z.number().int().min(1).max(100).default(50)
  }, async ({ limit }) => text(await service.listSubjects(limit)));

  server.tool('list_observations', 'List direct observations for a subject, optionally filtered to one concept.', {
    subjectId: z.string().uuid(),
    conceptId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).default(50)
  }, async (input) => text(await service.listObservations(input)));

  server.tool('list_research_projects', 'List Casuar research projects.', {
    limit: z.number().int().min(1).max(100).default(50)
  }, async ({ limit }) => text(await service.listResearchProjects(limit)));

  server.tool('list_research_questions', 'List research questions, optionally filtered by project or status.', {
    projectId: z.string().uuid().optional(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(50)
  }, async (input) => text(await service.listResearchQuestions(input)));

  server.tool('get_claim_with_evidence', 'Get one epistemic claim together with its linked evidence and source records.', {
    claimId: z.string().uuid()
  }, async ({ claimId }) => text(await service.getClaimWithEvidence(claimId)));

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

  server.tool('propose_claim', 'Create a proposed epistemic claim. This does not make the claim accepted knowledge.', {
    subjectObjectId: z.string().uuid(),
    relationType: z.string(),
    objectObjectId: z.string().uuid().optional(),
    objectLiteral: z.unknown().optional(),
    scope: z.record(z.unknown()).optional(),
    notes: z.string().optional()
  }, async (input) => text(await service.proposeClaim(input)));

  server.tool('open_research_question', 'Open a scoped research question without changing the biological truth layer.', {
    projectId: z.string().uuid(),
    question: z.string(),
    questionType: z.string().default('causal')
  }, async ({ projectId, question, questionType }) => text(await service.openResearchQuestion(projectId, question, questionType)));

  return server;
}
