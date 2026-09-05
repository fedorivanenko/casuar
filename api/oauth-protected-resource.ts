import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const origin = 'https://casuar-jet.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: ['casuar:read', 'casuar:write'],
    bearer_methods_supported: ['header']
  }));
}
