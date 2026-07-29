// netlify/functions/backups.js
// ============================================================
// Server-side proxy for backups stored in Supabase.
// Uses the service role key so the browser never talks to
// Supabase directly — same pattern as email-settings.js.
//
// Routes (via ?action= query param):
//   GET  ?action=list&limit=N        → recent backups (metadata only)
//   GET  ?action=get&id=X             → full backup payload for restore
//   POST ?action=create              → create a new backup
//   POST ?action=migrate             → bulk insert legacy localStorage backups
//   DELETE ?action=delete&id=X        → delete a single backup
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...corsHeaders },
  body: JSON.stringify(body),
});

const sbHeaders = (serviceKey) => ({
  'apikey': serviceKey,
  'Authorization': `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
});

const MAX_BACKUPS = 30;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: 'Supabase env vars not configured' });
  }

  const params = event.queryStringParameters || {};
  const action = params.action || '';
  const base = `${supabaseUrl}/rest/v1`;
  const headers = sbHeaders(serviceKey);

  // ── GET list (metadata only) ───────────────────────────────
  if (action === 'list' && event.httpMethod === 'GET') {
    try {
      const limit = Math.min(parseInt(params.limit || '10', 10) || 10, 50);
      const url = `${base}/backups?select=id,type,created_at&order=created_at.desc&limit=${limit}`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) return jsonResponse(res.status, { error: json?.message || 'Supabase error' });
      return jsonResponse(200, { backups: json || [] });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── GET single backup (full payload) ───────────────────────
  if (action === 'get' && event.httpMethod === 'GET') {
    if (!params.id) return jsonResponse(400, { error: 'id required' });
    try {
      const url = `${base}/backups?id=eq.${encodeURIComponent(params.id)}&select=data&limit=1`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) return jsonResponse(res.status, { error: json?.message || 'Supabase error' });
      if (!json || json.length === 0) return jsonResponse(404, { error: 'Backup not found' });
      return jsonResponse(200, { backup: json[0].data });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── POST create ─────────────────────────────────────────────
  if (action === 'create' && event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }
    if (!payload.customers || !payload.orders) {
      return jsonResponse(400, { error: 'Backup must include customers and orders' });
    }

    const type = payload.type === 'automatic' ? 'automatic' : 'manual';
    const data = {
      customers: payload.customers,
      orders: payload.orders,
      timestamp: new Date().toISOString(),
      version: payload.version || '1.0.0-beta',
    };

    try {
      const res = await fetch(`${base}/backups`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ type, data }),
      });
      const json = await res.json();
      if (!res.ok) return jsonResponse(res.status, { error: json?.message || 'Supabase insert failed' });

      // Enforce retention cap — delete oldest beyond MAX_BACKUPS
      const countRes = await fetch(`${base}/backups?select=id&order=created_at.desc&limit=${MAX_BACKUPS + 1}`, { headers });
      const countJson = await countRes.json();
      if (countRes.ok && countJson && countJson.length > MAX_BACKUPS) {
        const toDelete = countJson.slice(MAX_BACKUPS);
        for (const row of toDelete) {
          await fetch(`${base}/backups?id=eq.${row.id}`, { method: 'DELETE', headers });
        }
      }

      return jsonResponse(200, { success: true, id: json?.[0]?.id });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── POST migrate (bulk insert legacy backups) ───────────────
  if (action === 'migrate' && event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }
    if (!Array.isArray(payload.backups)) {
      return jsonResponse(400, { error: 'Expected { backups: [...] }' });
    }

    try {
      const rows = payload.backups.map((b) => ({
        type: b.type === 'automatic' ? 'automatic' : 'manual',
        data: {
          customers: b.customers || [],
          orders: b.orders || [],
          timestamp: b.timestamp || new Date().toISOString(),
          version: b.version || '1.0.0-beta',
        },
      }));

      const res = await fetch(`${base}/backups`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(rows),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return jsonResponse(res.status, { error: json?.message || 'Supabase bulk insert failed' });
      }
      return jsonResponse(200, { success: true, migrated: rows.length });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── DELETE single backup ────────────────────────────────────
  if (action === 'delete' && event.httpMethod === 'DELETE') {
    if (!params.id) return jsonResponse(400, { error: 'id required' });
    try {
      const res = await fetch(`${base}/backups?id=eq.${encodeURIComponent(params.id)}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return jsonResponse(res.status, { error: json?.message || 'Supabase delete failed' });
      }
      return jsonResponse(200, { success: true });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  return jsonResponse(400, { error: `Unknown action: ${action}` });
};
