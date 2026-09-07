import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerCausalTools } from '../apps/mcp/src/causal-tools.js';

async function main() {
  process.env.CASUAR_MCP_TOKEN = 'local-test-secret';
  const child = spawn('python', ['-u', '-c',
    'from http.server import HTTPServer; from causal_runtime.endpoint import Handler; s=HTTPServer(("127.0.0.1",0),Handler); print(s.server_port,flush=True); s.serve_forever()'],
    { env: process.env, stdio: ['ignore', 'pipe', 'inherit'] });
  const realFetch = globalThis.fetch;
  const server = new McpServer({ name: 'causal-test', version: '1' });
  const client = new Client({ name: 'test-client', version: '1' });
  try {
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Python startup timeout')), 5000);
      child.once('error', (e) => { clearTimeout(timer); reject(e); });
      child.stdout.once('data', (data) => { clearTimeout(timer); resolve(Number(String(data).trim())); });
    });
    globalThis.fetch = (async (url, init) => {
      assert.equal(String(url), 'https://casuar-jet.vercel.app/api/causal-run');
      return realFetch(`http://127.0.0.1:${port}/api/causal-run`, init);
    }) as typeof fetch;
    registerCausalTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    await client.connect(b);
    assert.ok((await client.listTools()).tools.some(t => t.name === 'run_model'));
    const response = await client.callTool({ name: 'run_model', arguments: {
      interventions: { input: { value: 2, start: 1, end: 6 } }
    } });
    assert.ok(!response.isError, JSON.stringify(response));
    const content = response.content as Array<{ type: string; text: string }>;
    const result = JSON.parse(content[0].text);
    assert.equal(result.persisted, false);
    assert.equal(result.baseline.length, 13);
    assert.ok(result.final_mean_delta.state > 0);
    console.log('PASS: MCP discovery -> tool call -> authenticated Python HTTP -> causal result');
  } finally {
    globalThis.fetch = realFetch;
    await client.close();
    await server.close();
    child.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
