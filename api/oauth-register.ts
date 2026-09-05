import type { IncomingMessage, ServerResponse } from 'node:http';
import { issueClientId } from '../packages/auth/src/oauth.js';

async function readJson(req: IncomingMessage) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  try {
    const input = await readJson(req) as { redirect_uris?: string[]; grant_types?: string[]; response_types?: string[] };
    const redirectUris = (input.redirect_uris ?? []).filter((uri) => typeof uri === 'string' && /^https?:\/\//.test(uri));
    if (!redirectUris.length) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'invalid_redirect_uri' }));
    }
    const clientId = issueClientId(redirectUris);
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      client_id: clientId,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    }));
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'invalid_client_metadata' }));
  }
}
