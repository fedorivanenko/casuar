import { z } from 'zod';

export const variableSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  description: z.string().optional(),
});

export const modelSpecSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  purpose: z.string().min(1),
  inputs: z.array(variableSchema),
  outputs: z.array(variableSchema),
  assumptions: z.array(z.string()).default([]),
  equations: z.array(z.string()).default([]),
  dependencies: z.array(z.object({
    model: z.string().min(1),
    version: z.string().min(1),
  })).default([]),
  validity: z.object({
    conditions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
  }).default({ conditions: [], exclusions: [] }),
  evidence: z.array(z.string()).default([]),
});

export type ModelSpec = z.infer<typeof modelSpecSchema>;

export const generatedModelSchema = z.object({
  python: z.string().min(1),
  tests: z.string().min(1),
  notes: z.array(z.string()).default([]),
});

export type GeneratedModel = z.infer<typeof generatedModelSchema>;
