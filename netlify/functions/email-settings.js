// netlify/functions/email-settings.js
// ============================================================
// Server-side proxy for email automation settings + email log.
// Reads/writes Supabase using the service role key (no VITE_ vars),
// so the browser never talks to Supabase directly.
//
// Routes (via ?action= query param):
//   GET  ?action=settings              → single email_settings row
//   POST ?action=settings              → update email_settings (merge)
//   GET  ?action=log&limit=N           → recent email_log rows
//   GET  ?action=log&order_id=X        → email_log rows for an order
//   GET  ?action=was_sent&order_id=X&template_id=Y → { sent: bool }
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

const SETTINGS_FIELDS = [
  'id',
  'automation_enabled',
  'template_order_received',
  'template_order_confirmed',
  'template_collection_reminder',
  'from_address',
  'reply_to_address',
  'updated_at',
];

// Map client camelCase ↔ DB snake_case for settings
const camelToSnake = {
  automationEnabled: 'automation_enabled',
  templateOrderReceived: 'template_order_received',
  templateOrderConfirmed: 'template_order_confirmed',
  templateCollectionReminder: 'template_collection_reminder',
  fromAddress: 'from_address',
  replyToAddress: 'reply_to_address',
};

function mapSettingsRow(row) {
  if (!row) return null;
  return {
    automationEnabled: !!row.automation_enabled,
    templateOrderReceived: !!row.template_order_received,
    templateOrderConfirmed: !!row.template_order_confirmed,
    templateCollectionReminder: !!row.template_collection_reminder,
    fromAddress: process.env.RESEND_FROM_ADDRESS || row.from_address || '',
    replyToAddress: process.env.RESEND_REPLY_TO || row.reply_to_address || null,
  };
}

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

  // ── GET settings ───────────────────────────────────────────
  if (action === 'settings' && event.httpMethod === 'GET') {
    try {
      const url = `${base}/email_settings?select=${SETTINGS_FIELDS.join(',')}&id=eq.1`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) return jsonResponse(res.status, { error: json?.message || 'Supabase error' });
      return jsonResponse(200, { settings: mapSettingsRow(json?.[0]) });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── POST settings (merge update) ───────────────────────────
  if (action === 'settings' && event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const dbUpdates = { updated_at: new Date().toISOString() };
    for (const [camel, snake] of Object.entries(camelToSnake)) {
      if (payload[camel] !== undefined) dbUpdates[snake] = payload[camel];
    }

    try {
      const res = await fetch(`${base}/email_settings?id=eq.1`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(dbUpdates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return jsonResponse(res.status, { error: json?.message || 'Supabase update failed' });
      }
      return jsonResponse(200, { success: true });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── GET log (recent or by order) ───────────────────────────
  if (action === 'log' && event.httpMethod === 'GET') {
    try {
      let url = `${base}/email_log?order=created_at.desc`;
      if (params.order_id) {
        url += `&order_id=eq.${encodeURIComponent(params.order_id)}`;
      } else {
        const limit = Math.min(parseInt(params.limit || '20', 10) || 20, 100);
        url += `&limit=${limit}`;
      }
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) return jsonResponse(res.status, { error: json?.message || 'Supabase error' });
      return jsonResponse(200, { entries: json || [] });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  // ── GET was_sent (dedup check) ─────────────────────────────
  if (action === 'was_sent' && event.httpMethod === 'GET') {
    if (!params.order_id || !params.template_id) {
      return jsonResponse(400, { error: 'order_id and template_id required' });
    }
    try {
      const url = `${base}/email_log?select=id&order_id=eq.${encodeURIComponent(params.order_id)}&template_id=eq.${encodeURIComponent(params.template_id)}&status=eq.sent`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (!res.ok) return jsonResponse(res.status, { error: json?.message || 'Supabase error' });
      return jsonResponse(200, { sent: (json?.length || 0) > 0 });
    } catch (err) {
      return jsonResponse(502, { error: 'Supabase request failed: ' + err.message });
    }
  }

  return jsonResponse(400, { error: `Unknown action: ${action}` });
};
