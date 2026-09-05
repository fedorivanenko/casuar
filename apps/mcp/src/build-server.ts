import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createCasuarDb } from '../../../packages/db/src/client.js';
import { CasuarService } from '../../../packages/core/src/service.js';

export function buildCasuarMcpServer() {
  const service = new CasuarService(createCasuarDb());
  const server = new McpServer({ name: 'casuar', version: '0.1.0' });

  server.tool('get_object', 'Get a canonical Casuar object by UUID or key.', { idOrKey: z.string() }, async ({ idOrKey }) => ({
    content: [{ type: 'text', text: JSON.stringify(await service.getObject(idOrKey), null, 2) }]
  }));

  server.tool('create_observation', 'Record a direct person observation without converting it into an inferred biological state.', {
    subjectId: z.string().uuid(),
    conceptId: z.string().uuid(),
    observedAt: z.string(),
    value: z.union([z.number(), z.string(), z.record(z.unknown())]),
    unit: z.string().optional(),
    sourceType: z.string(),
    sourceRef: z.string().optional(),
    conditions: z.record(z.unknown()).optional()
  }, async (input) => ({ content: [{ type: 'text', text: JSON.stringify(await service.createObservation(input), null, 2) }] }));

  server.tool('propose_claim', 'Create a proposed epistemic claim. This does not make the claim accepted knowledge.', {
    subjectObjectId: z.string().uuid(),
    relationType: z.string(),
    objectObjectId: z.string().uuid().optional(),
    objectLiteral: z.unknown().optional(),
    scope: z.record(z.unknown()).optional(),
    notes: z.string().optional()
  }, async (input) => ({ content: [{ type: 'text', text: JSON.stringify(await service.proposeClaim(input), null, 2) }] }));

  server.tool('open_research_question', 'Open a scoped research question without changing the biological truth layer.', {
    projectId: z.string().uuid(),
    question: z.string(),
    questionType: z.string().default('causal')
  }, async ({ projectId, question, questionType }) => ({ content: [{ type: 'text', text: JSON.stringify(await service.openResearchQuestion(projectId, question, questionType), null, 2) }] }));

  return server;
}
