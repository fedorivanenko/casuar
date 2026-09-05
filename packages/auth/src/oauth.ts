import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
  const value = process.env.CASUAR_MCP_TOKEN;
  if (!value) throw new Error('Missing CASUAR_MCP_TOKEN');
  return value;
}

function b64url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(payload: Record<string, unknown>) {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySigned<T extends Record<string, unknown>>(token: string): T | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueClientId(redirectUris: string[]) {
  return `casuar_client.${signPayload({ redirectUris, iat: Math.floor(Date.now() / 1000) })}`;
}

export function readClient(clientId: string): { redirectUris: string[] } | null {
  if (!clientId.startsWith('casuar_client.')) return null;
  return verifySigned<{ redirectUris: string[]; iat: number }>(clientId.slice('casuar_client.'.length));
}

export function issueAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return signPayload({ ...input, typ: 'code', iat: now, exp: now + 300 });
}

export function exchangeAuthorizationCode(code: string, verifier: string, clientId: string, redirectUri: string) {
  const payload = verifySigned<{
    typ: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scope: string;
    exp: number;
  }>(code);
  if (!payload || payload.typ !== 'code') return null;
  if (payload.clientId !== clientId || payload.redirectUri !== redirectUri) return null;
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  if (challenge !== payload.codeChallenge) return null;
  return issueAccessToken(payload.clientId, payload.scope);
}

export function issueAccessToken(clientId: string, scope: string) {
  const now = Math.floor(Date.now() / 1000);
  return signPayload({ typ: 'access', clientId, scope, iat: now, exp: now + 3600, aud: 'casuar-mcp' });
}

export function verifyAccessToken(token: string) {
  const payload = verifySigned<{
    typ: string;
    clientId: string;
    scope: string;
    exp: number;
    aud: string;
  }>(token);
  if (!payload || payload.typ !== 'access' || payload.aud !== 'casuar-mcp') return null;
  return payload;
}

export function verifyOwnerPassword(password: string) {
  const expected = Buffer.from(secret());
  const provided = Buffer.from(password);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
