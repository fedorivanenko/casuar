import { createHmac } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerWindTunnelTools } from './wind-tunnel-tools.js';

export async function invokeCausalRun(input: Record<string, unknown>) {
  const secret = process.env.CASUAR_MCP_TOKEN;
  if (!secret) throw new Error('Causal service authentication is not configured');
  const endpoint = new URL(process.env.CASUAR_CAUSAL_RUN_URL ?? 'https://casuar-jet.vercel.app/api/causal-run');
  if (endpoint.protocol !== 'https:') throw new Error('Causal service must use HTTPS');
  const body = JSON.stringify(input);
  if (Buffer.byteLength(body) > 65536) throw new Error('Request exceeds 64 KiB');
  const key = createHmac('sha256', secret).update('casuar-causal-run-v1').digest('hex');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body,
    signal: AbortSignal.timeout(65000),
    redirect: 'error'
  });
  if (!response.ok) {
    throw new Error(`Causal run failed (HTTP ${response.status}); check model limits or service/database configuration`);
  }
  return await response.json();
}

export function registerCausalTools(server: McpServer) {
  server.tool('run_model',
    'Simulate baseline and timed interventions in a dynamic causal model. Supply inline model or stored model_id; omit both for a synthetic demo. Returns trajectories, uncertainty, assumptions and persistence status. This is simulation, not causal identification or a treatment recommendation. Database runs require configured storage.', {
      model_id: z.string().uuid().optional(),
      model: z.object({
        name: z.string().min(1), version: z.number().int().positive(),
        time_unit: z.string(),
        assumptions: z.array(z.string()).default([]),
        evidence: z.array(z.unknown()).default([]),
        variables: z.record(z.object({ initial: z.number().finite(), equation: z.string().max(1000), noise_sd: z.number().finite().nonnegative().default(0) })),
        parameters: z.record(z.object({ mean: z.number().finite(), sd: z.number().finite().nonnegative().default(0) })).default({})
      }).optional(),
      initial: z.record(z.number().finite()).default({}),
      interventions: z.record(z.object({ value: z.number().finite(), start: z.number().int().min(1), end: z.number().int().min(1) })).default({}),
      steps: z.number().int().min(1).max(120).default(12),
      draws: z.number().int().min(1).max(5000).default(500),
      seed: z.number().int().min(0).max(2147483647).default(42),
      persist: z.boolean().default(false)
    }, async (input) => {
      try {
        if (input.model && input.model_id) throw new Error('Supply model or model_id, not both');
        const result = await invokeCausalRun(input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : 'Causal run failed' }] };
      }
    });

  registerWindTunnelTools(server);
}
