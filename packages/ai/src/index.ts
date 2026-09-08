import { generateObject } from 'ai';
import { z } from 'zod';
import type { ResearchTask } from '../../autoresearcher/src/index.js';

const MutationSchema = z.object({
  hypothesis: z.string(),
  rationale: z.string(),
  mutations: z.array(z.object({
    op: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
    node: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  })).max(12),
  evidenceSourceIds: z.array(z.string()),
  expectedEffects: z.array(z.string()).max(12),
  falsificationTests: z.array(z.string()).max(12),
  uncertainty: z.number().min(0).max(1),
});

export type ResearchProposal = z.infer<typeof MutationSchema>;

export async function synthesizeProposal(task: ResearchTask): Promise<ResearchProposal> {
  const model = process.env.CASUAR_RESEARCH_MODEL ?? 'mistral/ministral-14b';
  const { object } = await generateObject({
    model,
    schema: MutationSchema,
    prompt: [
      'You are Casuar causal-model researcher.',
      'Propose the smallest graph mutation supported by the supplied evidence.',
      'Do not invent evidence. Preserve uncertainty. Prefer one mechanistic change over broad rewrites.',
      JSON.stringify(task),
    ].join('\n\n'),
  });
  return object;
}
