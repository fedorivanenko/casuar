import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildAndRunModel } from '../packages/runtime/src/index.js';
import { modelSpecSchema } from '../packages/model-spec/src/index.js';

const spec = modelSpecSchema.parse({
  id: 'linear-demo',
  version: '0.1.0',
  purpose: 'Demonstrate the Casuar generated-model pipeline without encoding a medical claim.',
  inputs: [{ name: 'x', unit: '1' }],
  outputs: [{ name: 'y', unit: '1' }],
  assumptions: ['The relation is exactly linear for this demo.'],
  equations: ['y = 2 * x + 1'],
  dependencies: [],
  validity: { conditions: ['x is a finite number'], exclusions: [] },
  evidence: [],
});

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const startedAt = Date.now();

  try {
    const result = await buildAndRunModel(spec, { x: 3 });
    res.status(200).json({ ok: true, durationMs: Date.now() - startedAt, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
