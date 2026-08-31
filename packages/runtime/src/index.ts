import { compileModel } from '../../model-compiler/src/index.js';
import { reviewModel } from '../../model-reviewer/src/index.js';
import type { ModelSpec } from '../../model-spec/src/index.js';
import { executeGeneratedModel } from '../../sandbox/src/index.js';

export async function buildAndRunModel(
  spec: ModelSpec,
  inputs: Record<string, unknown>,
) {
  const generated = await compileModel(spec);
  const review = await reviewModel(spec, generated);

  if (!review.passed) {
    return {
      status: 'review_failed' as const,
      generated,
      review,
    };
  }

  const execution = await executeGeneratedModel(generated, inputs);

  return {
    status: execution.tests.exitCode === 0 ? 'passed' as const : 'tests_failed' as const,
    generated,
    review,
    execution,
  };
}
