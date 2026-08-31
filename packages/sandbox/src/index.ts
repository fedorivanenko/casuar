import { Sandbox } from '@vercel/sandbox';
import type { GeneratedModel } from '../../model-spec/src/index.js';

export type SandboxExecution = {
  sandboxName: string;
  tests: { exitCode: number; stdout: string; stderr: string };
  result?: unknown;
};

function b64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

export async function executeGeneratedModel(
  generated: GeneratedModel,
  inputs: Record<string, unknown>,
): Promise<SandboxExecution> {
  const sandbox = await Sandbox.create({
    runtime: 'python3.13',
    persistent: false,
    timeout: 60_000,
  });

  try {
    const bootstrap = [
      'import base64, pathlib',
      `pathlib.Path("model.py").write_bytes(base64.b64decode("${b64(generated.python)}"))`,
      `pathlib.Path("test_model.py").write_bytes(base64.b64decode("${b64(generated.tests)}"))`,
    ].join(';');

    const write = await sandbox.runCommand('python', ['-c', bootstrap]);
    if (write.exitCode !== 0) {
      throw new Error(`Failed to write generated model: ${await write.stderr()}`);
    }

    const test = await sandbox.runCommand('python', ['-m', 'unittest', '-v', 'test_model.py']);
    const testResult = {
      exitCode: test.exitCode,
      stdout: await test.stdout(),
      stderr: await test.stderr(),
    };

    if (test.exitCode !== 0) {
      return { sandboxName: sandbox.name, tests: testResult };
    }

    const encodedInputs = b64(JSON.stringify(inputs));
    const runner = `import base64,json; from model import calculate; x=json.loads(base64.b64decode("${encodedInputs}")); print(json.dumps(calculate(x), separators=(",",":")))`;
    const run = await sandbox.runCommand('python', ['-c', runner]);

    if (run.exitCode !== 0) {
      throw new Error(`Generated model failed: ${await run.stderr()}`);
    }

    return {
      sandboxName: sandbox.name,
      tests: testResult,
      result: JSON.parse((await run.stdout()).trim()),
    };
  } finally {
    await sandbox.stop();
  }
}
