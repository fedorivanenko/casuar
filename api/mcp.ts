import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildCasuarMcpServer } from '../apps/mcp/src/build-server.js';
import { verifyAccessToken } from '../packages/auth/src/oauth.js';

function authInfo(req: IncomingMessage) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyAccessToken(auth.slice('Bearer '.length));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const auth = authInfo(req);
  if (!auth) {
    res.statusCode = 401;
    res.setHeader(
      'WWW-Authenticate',
      'Bearer resource_metadata="https://casuar-jet.vercel.app/.well-known/oauth-protected-resource/mcp", scope="casuar:read casuar:write"'
    );
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
