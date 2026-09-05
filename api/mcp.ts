import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildCasuarMcpServer } from '../apps/mcp/src/build-server.js';

function isAuthorized(req: IncomingMessage) {
  const expected = process.env.CASUAR_MCP_TOKEN;
  if (!expected) return false;

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;

  const provided = auth.slice('Bearer '.length);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isAuthorized(req)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Bearer realm="casuar-mcp"');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildCasuarMcpServer();
  await server.connect(transport);

  try {
    await transport.handleRequest(req, res);
  } finally {
    await transport.close();
    await server.close();
  }
}
