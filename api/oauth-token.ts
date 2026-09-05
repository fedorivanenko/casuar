import type { IncomingMessage, ServerResponse } from 'node:http';
import { exchangeAuthorizationCode } from '../packages/auth/src/oauth.js';

async function readForm(req: IncomingMessage) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return new URLSearchParams(body);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  const form = await readForm(req);
  if (form.get('grant_type') !== 'authorization_code') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
  }

  const code = form.get('code') ?? '';
  const verifier = form.get('code_verifier') ?? '';
  const clientId = form.get('client_id') ?? '';
  const redirectUri = form.get('redirect_uri') ?? '';
  const result = exchangeAuthorizationCode(code, verifier, clientId, redirectUri);
  if (!result) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'invalid_grant' }));
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    access_token: result,
    token_type: 'Bearer',
    expires_in: 3600
  }));
}
