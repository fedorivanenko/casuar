import { generateText } from 'ai';
import type { GeneratedModel, ModelSpec } from '../../model-spec/src/index.js';

export const DEFAULT_COMPILER_MODEL = process.env.CASUAR_COMPILER_MODEL ?? 'zai/glm-5.3-flash';

const IMPLEMENTATION_SYSTEM = `You are Casuar's model compiler. Translate an already-specified mechanistic model into a small, deterministic Python 3.13 module.

Your entire response must be the contents of model.py.
Do not return JSON. Do not return a filename. Do not use Markdown or fenced code blocks.
Define calculate(inputs: dict) -> dict.
Preserve the supplied equations, units, assumptions, and validity constraints exactly.
Do not invent medical or scientific claims.
Use only the Python standard library unless the ModelSpec explicitly requires otherwise.
No network, subprocesses, filesystem access, dynamic imports, eval, or exec.
Use plain ASCII quotes and normal Python newlines/indentation.`;

const TEST_SYSTEM = `You are Casuar's test compiler. Produce a Python 3.13 unittest module for the supplied ModelSpec and model.py implementation.

Your entire response must be the contents of test_model.py.
Do not return JSON. Do not return a filename. Do not use Markdown or fenced code blocks.
Import calculate from model.
Test the exact specified equation/behavior, validity constraints, malformed inputs, and missing inputs where applicable.
Use only the Python standard library.
Use plain ASCII quotes and normal Python newlines/indentation.`;

function normalizeSource(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:python)?\s*\n([\s\S]*?)\n```$/i);
  return (fenced ? fenced[1] : trimmed).trim() + '\n';
}

export async function compileModel(spec: ModelSpec, model = DEFAULT_COMPILER_MODEL): Promise<GeneratedModel> {
  const implementation = await generateText({
    model,
    system: IMPLEMENTATION_SYSTEM,
    prompt: `ModelSpec:\n${JSON.stringify(spec, null, 2)}`,
  });

  const python = normalizeSource(implementation.text);

  const testsGeneration = await generateText({
    model,
    system: TEST_SYSTEM,
    prompt: `ModelSpec:\n${JSON.stringify(spec, null, 2)}\n\nmodel.py:\n${python}`,
  });

  return {
    python,
    tests: normalizeSource(testsGeneration.text),
    notes: [],
  };
}
