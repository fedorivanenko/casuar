import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { verifyAccessToken } from '../packages/auth/src/oauth.js';

function bearer(req: IncomingMessage) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

function authorized(req: IncomingMessage) {
  const token = bearer(req);
  if (!token) return false;

  const staticToken = process.env.CASUAR_MCP_TOKEN;
  if (staticToken && token === staticToken) return true;

  return Boolean(verifyAccessToken(token));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  if (!authorized(req)) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  const url = process.env.CASUAR_SUPABASE_URL;
  const key = process.env.CASUAR_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'missing_supabase_configuration' }));
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: objects, error: objectError }, { data: claims, error: claimError }] = await Promise.all([
    supabase
      .from('objects')
      .select('id,key,label,kind,description,attributes,created_at,updated_at')
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('claims')
      .select('object_id,subject_object_id,relation_type,object_object_id,object_literal,status,scope,notes,created_at')
      .order('created_at', { ascending: true })
      .limit(1000),
  ]);

  if (objectError || claimError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'graph_query_failed',
        details: objectError?.message ?? claimError?.message,
      })
    );
    return;
  }

  const nodes = (objects ?? []).map((object) => ({
    id: object.id,
    key: object.key,
    label: object.label,
    kind: object.kind,
    description: object.description,
    attributes: object.attributes,
    createdAt: object.created_at,
    updatedAt: object.updated_at,
  }));

  const edges = (claims ?? [])
    .filter((claim) => claim.object_object_id)
    .map((claim) => ({
      id: claim.object_id,
      source: claim.subject_object_id,
      target: claim.object_object_id,
      relation: claim.relation_type,
      status: claim.status,
      scope: claim.scope,
      notes: claim.notes,
      createdAt: claim.created_at,
    }));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ nodes, edges }));
}
