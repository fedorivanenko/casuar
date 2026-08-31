import { generateObject } from 'ai';
import { z } from 'zod';
import type { GeneratedModel, ModelSpec } from '../../model-spec/src/index.js';

export const DEFAULT_REVIEWER_MODEL = process.env.CASUAR_REVIEWER_MODEL ?? 'alibaba/qwen3-coder-30b-a3b';

const reviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning']),
    message: z.string(),
  })),
  summary: z.string(),
});

export type ModelReview = z.infer<typeof reviewSchema>;

export async function reviewModel(spec: ModelSpec, generated: GeneratedModel): Promise<ModelReview> {
  const { object } = await generateObject({
    model: DEFAULT_REVIEWER_MODEL,
    schema: reviewSchema,
    system: `You independently review generated scientific calculation code. Check only whether the Python faithfully implements the supplied ModelSpec, preserves units/equations/assumptions, is deterministic, and avoids unsafe capabilities. Do not improve or invent the scientific theory. passed must be false for any semantic mismatch, unsafe operation, missing required behavior, or clearly inadequate tests.`,
    prompt: `ModelSpec:\n${JSON.stringify(spec, null, 2)}\n\nImplementation:\n${generated.python}\n\nTests:\n${generated.tests}`,
  });

  return object;
}
