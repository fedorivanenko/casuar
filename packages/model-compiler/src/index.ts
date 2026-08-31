import { generateObject } from 'ai';
import { generatedModelSchema, type GeneratedModel, type ModelSpec } from '../../model-spec/src/index.js';

export const DEFAULT_COMPILER_MODEL = process.env.CASUAR_COMPILER_MODEL ?? 'zai/glm-5.3-flash';

const SYSTEM = `You are Casuar's model compiler. Translate an already-specified mechanistic model into small, deterministic Python. Do not invent medical or scientific claims. Preserve equations, units, assumptions, and validity constraints exactly. Return one implementation module defining calculate(inputs: dict) -> dict and one Python unittest module named conceptually test_model.py that imports calculate from model. Use only the Python standard library unless the specification explicitly requires otherwise. No network, subprocesses, filesystem access, dynamic imports, eval, or exec. Tests must cover nominal behavior, boundaries implied by the spec, and malformed/missing inputs.`;

export async function compileModel(spec: ModelSpec): Promise<GeneratedModel> {
  const { object } = await generateObject({
    model: DEFAULT_COMPILER_MODEL,
    schema: generatedModelSchema,
    system: SYSTEM,
    prompt: `Compile this ModelSpec to Python:\n${JSON.stringify(spec, null, 2)}`,
  });

  return object;
}
