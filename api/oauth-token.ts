import type { IncomingMessage, ServerResponse } from 'node:http';
import { exchangeAuthorizationCode, exchangeRefreshToken } from '../packages/auth/src/oauth.js';

async function readForm(req: IncomingMessage) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return new URLSearchParams(body);
}

function sendTokenResponse(res: ServerResponse, result: { accessToken: string; refreshToken: string }) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    token_type: 'Bearer',
    expires_in: 3600
  }));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  const form = await readForm(req);
  const grantType = form.get('grant_type') ?? '';
  const clientId = form.get('client_id') ?? '';

  if (grantType === 'authorization_code') {
    const code = form.get('code') ?? '';
    const verifier = form.get('code_verifier') ?? '';
    const redirectUri = form.get('redirect_uri') ?? '';
    const result = exchangeAuthorizationCode(code, verifier, clientId, redirectUri);
    if (!result) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'invalid_grant' }));
    }
    return sendTokenResponse(res, result);
  }

  if (grantType === 'refresh_token') {
    const refreshToken = form.get('refresh_token') ?? '';
    const result = exchangeRefreshToken(refreshToken, clientId);
    if (!result) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'invalid_grant' }));
    }
    return sendTokenResponse(res, result);
  }

  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
}
