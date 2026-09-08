import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { compileResearchTask, expandFrontier, type GraphSnapshot } from '../../../packages/autoresearcher/src/index.js';
import { synthesizeProposal } from '../../../packages/ai/src/index.js';
import { compareGraphs } from '../../../packages/wind-tunnel/src/index.js';

const NodeSchema = z.object({ id: z.string(), label: z.string().optional(), material: z.boolean().optional() });
const EdgeSchema = z.object({ from: z.string(), to: z.string(), relation: z.string().optional(), material: z.boolean().optional() });
const GraphSchema = z.object({ nodes: z.array(NodeSchema), edges: z.array(EdgeSchema), objectives: z.array(z.string()).optional() });
const EvidenceSchema = z.object({
  sourceId: z.string(),
  statement: z.string(),
  supports: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function registerWindTunnelTools(server: McpServer) {
  server.tool('expand_causal_frontier', 'Generate autoresearch questions deterministically from a causal graph.', {
    graph: GraphSchema,
  }, async ({ graph }) => text({ frontier: expandFrontier(graph as GraphSnapshot) }));

  server.tool('synthesize_graph_mutation', 'Use the configured Vercel AI Gateway model to propose the smallest evidence-supported graph mutation.', {
    graph: GraphSchema,
    evidence: z.array(EvidenceSchema).default([]),
  }, async ({ graph, evidence }) => {
    const task = compileResearchTask(graph as GraphSnapshot, evidence);
    return text({ task, proposal: await synthesizeProposal(task) });
  });

  server.tool('compare_causal_graphs', 'Run deterministic Wind Tunnel regressions against incumbent and challenger graph versions.', {
    incumbent: GraphSchema,
    challenger: GraphSchema,
  }, async ({ incumbent, challenger }) => text(compareGraphs(incumbent as GraphSnapshot, challenger as GraphSnapshot)));
}
