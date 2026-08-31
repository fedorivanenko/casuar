import { compileModel } from '../../../packages/model-compiler/src/index.js';
import { reviewModel } from '../../../packages/model-reviewer/src/index.js';
import { executeGeneratedModel } from '../../../packages/sandbox/src/index.js';
import { modelSpecSchema } from '../../../packages/model-spec/src/index.js';

const spec = modelSpecSchema.parse({
  id: 'linear-demo',
  version: '0.1.0',
  purpose: 'Benchmark Casuar compiler reliability without encoding a medical claim.',
  inputs: [{ name: 'x', unit: '1' }],
  outputs: [{ name: 'y', unit: '1' }],
  assumptions: ['The relation is exactly linear for this demo.'],
  equations: ['y = 2 * x + 1'],
  dependencies: [],
  validity: { conditions: ['x is a finite number'], exclusions: [] },
  evidence: [],
});

const models = [
  'zai/glm-5.3-flash',
  'minimax/minimax-m2.1',
  'alibaba/qwen3-coder',
];

const rows = [];
for (const model of models) {
  const started = Date.now();
  try {
    const generated = await compileModel(spec, model);
    const review = await reviewModel(spec, generated);
    let status = review.passed ? 'review_passed' : 'review_failed';
    let result: unknown = undefined;
    let testsExitCode: number | undefined;

    if (review.passed) {
      const execution = await executeGeneratedModel(generated, { x: 3 });
      testsExitCode = execution.tests.exitCode;
      result = execution.result;
      status = execution.tests.exitCode === 0 && JSON.stringify(execution.result) === JSON.stringify({ y: 7 })
        ? 'passed'
        : 'execution_failed';
    }

    rows.push({ model, status, durationMs: Date.now() - started, reviewPassed: review.passed, testsExitCode, result, generated, review });
  } catch (error) {
    rows.push({ model, status: 'error', durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log('CASUAR_COMPILER_BENCHMARK');
console.dir(rows, { depth: null });
