// netlify/functions/send-email.js
// ============================================================
// Sends an email via Resend and logs the result to Supabase.
// Client builds the populated subject/body from templates, so this
// function is template-agnostic — it just relays to Resend.
// ============================================================

const RESEND_API_URL = 'https://api.resend.com/emails';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

export default async (req, ctx) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return jsonResponse(500, { error: 'RESEND_API_KEY not configured' });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const {
    to, subject, html, text,
    templateId, orderId, customerId, sentBy,
  } = payload;

  if (!to || !subject) {
    return jsonResponse(400, { error: 'Missing required fields: to, subject' });
  }
  if (!templateId) {
    return jsonResponse(400, { error: 'Missing required field: templateId' });
  }

  const fromAddress = Netlify.env.get('RESEND_FROM_ADDRESS') || 'orders@fergbutcher.com';
  const replyTo = Netlify.env.get('RESEND_REPLY_TO') || undefined;

  const resendBody = {
    from: fromAddress,
    to,
    subject,
  };
  if (html) resendBody.html = html;
  if (text) resendBody.text = text;
  if (replyTo) resendBody.reply_to = replyTo;

  let resendResponse;
  let logStatus = 'sent';
  let logMessageId = null;
  let logError = null;

  try {
    resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });
    const resendJson = await resendResponse.json();
    if (!resendResponse.ok) {
      logStatus = 'failed';
      logError = resendJson?.message || `Resend HTTP ${resendResponse.status}`;
      logError = logError.slice(0, 500);
    } else {
      logMessageId = resendJson?.id || null;
    }
  } catch (err) {
    logStatus = 'failed';
    logError = (err?.message || 'Network error').slice(0, 500);
  }

  // Log to Supabase (best-effort — don't fail the request if logging fails)
  await logEmail({
    orderId, customerId, templateId,
    recipient: to, subject,
    status: logStatus, messageId: logMessageId, error: logError,
    sentBy,
  });

  if (logStatus === 'failed') {
    return jsonResponse(502, { success: false, error: logError || 'Resend send failed' });
  }
  return jsonResponse(200, {
    success: true,
    messageId: logMessageId,
    message: 'Email sent',
  });
};

// ── Best-effort Supabase logging ────────────────────────────
async function logEmail(entry) {
  const supabaseUrl = Netlify.env.get('SUPABASE_URL');
  const serviceKey = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/email_log`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        order_id: entry.orderId || null,
        customer_id: entry.customerId || null,
        template_id: entry.templateId,
        recipient: entry.recipient,
        subject: entry.subject,
        status: entry.status,
        resend_message_id: entry.messageId,
        error: entry.error,
        sent_by: entry.sentBy || null,
      }),
    });
  } catch {
    // Silently ignore — logging is non-critical
  }
}
