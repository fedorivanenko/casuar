import type { IncomingMessage, ServerResponse } from 'node:http';
import { issueAuthorizationCode, readClient, verifyOwnerPassword } from '../packages/auth/src/oauth.js';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

async function readForm(req: IncomingMessage) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return new URLSearchParams(body);
}

function validate(params: URLSearchParams) {
  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const responseType = params.get('response_type') ?? '';
  const codeChallenge = params.get('code_challenge') ?? '';
  const codeChallengeMethod = params.get('code_challenge_method') ?? '';
  const state = params.get('state') ?? '';
  const scope = params.get('scope') || 'casuar:read casuar:write';
  const client = readClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) throw new Error('invalid_client');
  if (responseType !== 'code') throw new Error('unsupported_response_type');
  if (codeChallengeMethod !== 'S256' || !codeChallenge) throw new Error('invalid_request');
  return { clientId, redirectUri, codeChallenge, state, scope };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const params = req.method === 'POST'
      ? await readForm(req)
      : new URL(req.url ?? '/', 'https://casuar-jet.vercel.app').searchParams;
    const auth = validate(params);

    if (req.method === 'POST') {
      const password = params.get('password') ?? '';
      if (!verifyOwnerPassword(password)) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end('<h1>Authorization denied</h1><p>Invalid Casuar owner token.</p>');
      }
      const code = issueAuthorizationCode({
        clientId: auth.clientId,
        redirectUri: auth.redirectUri,
        codeChallenge: auth.codeChallenge,
        scope: auth.scope
      });
      const target = new URL(auth.redirectUri);
      target.searchParams.set('code', code);
      if (auth.state) target.searchParams.set('state', auth.state);
      res.statusCode = 302;
      res.setHeader('Location', target.toString());
      return res.end();
    }

    const hidden = [...params.entries()]
      .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
      .join('');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Authorize Casuar</title></head><body style="font:16px system-ui;max-width:520px;margin:64px auto;padding:0 20px"><h1>Authorize Casuar MCP</h1><p>ChatGPT is requesting access to Casuar with scope <code>${escapeHtml(auth.scope)}</code>.</p><form method="post">${hidden}<label>Casuar owner token<br><input name="password" type="password" required autocomplete="current-password" style="width:100%;padding:10px;margin:8px 0 16px"></label><button type="submit" style="padding:10px 16px">Authorize ChatGPT</button></form></body></html>`);
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'invalid_request' }));
  }
}
