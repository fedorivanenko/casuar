import { buildAndRunModel } from '../../../packages/runtime/src/index.js';
import { modelSpecSchema } from '../../../packages/model-spec/src/index.js';

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

const result = await buildAndRunModel(spec, { x: 3 });
console.dir(result, { depth: null });
