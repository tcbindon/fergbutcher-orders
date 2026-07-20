// netlify/functions/collection-reminders.js
// ============================================================
// Scheduled function: runs daily at 9am NZ time.
// Finds orders with collectionDate = tomorrow and sends the
// collection-reminder email template to each customer.
//
// Guarded by the email_settings.template_collection_reminder flag
// (read from Supabase). If disabled, exits immediately.
// ============================================================

const RESEND_API_URL = 'https://api.resend.com/emails';

// Default collection-reminder template (used by the scheduled job
// since templates live in client localStorage and aren't reachable here)
const DEFAULT_REMINDER_TEMPLATE = {
  subject: 'Reminder: Your order is ready for collection tomorrow',
  body: `Hi {firstName},

Just a friendly reminder that your order #{orderId} is scheduled for collection tomorrow, {collectionDate}{collectionTime}.

Order items:
{orderItems}

If you need to change your collection time, please give us a call.

Thanks,
Fergbutcher`,
};

const htmlEscape = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const textToHtml = (text) =>
  htmlEscape(text).replace(/\n/g, '<br>');

const formatCollectionDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-NZ', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  } catch {
    return dateStr;
  }
};

const populateTemplate = (tmpl, order, customer) => {
  const itemsText = (order.items || [])
    .map(i => `- ${i.quantity} ${i.unit} ${i.description}`)
    .join('\n');
  const data = {
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: customer.email || '',
    orderId: order.id,
    orderItems: itemsText,
    collectionDate: formatCollectionDate(order.collectionDate),
    collectionTime: order.collectionTime ? ` at ${order.collectionTime}` : '',
    additionalNotes: order.additionalNotes || '',
  };
  const fill = (str) => str.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? '');
  return {
    subject: fill(tmpl.subject),
    body: fill(tmpl.body),
  };
};

export default async (req, ctx) => {
  const apiKey = Netlify.env.get('RESEND_API_KEY');
  const supabaseUrl = Netlify.env.get('SUPABASE_URL');
  const serviceKey = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!apiKey || !supabaseUrl || !serviceKey) {
    console.log('Missing required env vars; exiting');
    return new Response(JSON.stringify({ skipped: true, reason: 'missing-env' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Check automation settings — bail if collection reminders disabled
  const settingsRes = await fetch(`${supabaseUrl}/rest/v1/email_settings?id=eq.1`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  const settingsJson = await settingsRes.json();
  const settings = settingsJson?.[0];
  if (!settings || !settings.template_collection_reminder) {
    console.log('Collection reminder automation disabled; exiting');
    return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Compute tomorrow's date in NZ (Pacific/Auckland)
  const now = new Date();
  const aucklandNow = new Date(now.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' }));
  const tomorrow = new Date(aucklandNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // 3. Fetch orders for tomorrow (exclude cancelled/collected)
  const ordersRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?collection_date=eq.${tomorrowStr}&status=in.(pending,confirmed,prepared)`,
    { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
  );
  const ordersJson = await ordersRes.json();
  const orders = ordersJson || [];
  if (orders.length === 0) {
    console.log(`No orders for ${tomorrowStr}; exiting`);
    return new Response(JSON.stringify({ skipped: true, reason: 'no-orders', date: tomorrowStr }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Fetch all customers (to resolve emails by ID)
  const customersRes = await fetch(`${supabaseUrl}/rest/v1/customers`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });
  const customersJson = await customersRes.json();
  const customersById = new Map((customersJson || []).map(c => [c.id, c]));

  // 5. Fetch already-sent reminder logs for today to avoid duplicates
  const logRes = await fetch(
    `${supabaseUrl}/rest/v1/email_log?template_id=eq.collection-reminder&order_id=in.(${orders.map(o => o.id).join(',')}`,
    { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
  );
  const logJson = await logRes.json();
  const alreadySent = new Set((logJson || []).map(l => l.order_id));

  const fromAddress = Netlify.env.get('RESEND_FROM_ADDRESS') || 'orders@fergbutcher.com';
  const replyTo = Netlify.env.get('RESEND_REPLY_TO') || undefined;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const order of orders) {
    if (alreadySent.has(order.id)) {
      skipped++;
      continue;
    }
    const customer = customersById.get(order.customer_id);
    if (!customer || !customer.email) {
      skipped++;
      continue;
    }

    const { subject, body } = populateTemplate(DEFAULT_REMINDER_TEMPLATE, order, customer);
    const resendBody = {
      from: fromAddress,
      to: customer.email,
      subject,
      text: body,
      html: textToHtml(body),
    };
    if (replyTo) resendBody.reply_to = replyTo;

    let status = 'sent';
    let messageId = null;
    let errorMsg = null;
    try {
      const r = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendBody),
      });
      const rj = await r.json();
      if (!r.ok) {
        status = 'failed';
        errorMsg = (rj?.message || `HTTP ${r.status}`).slice(0, 500);
      } else {
        messageId = rj?.id || null;
      }
    } catch (err) {
      status = 'failed';
      errorMsg = (err?.message || 'Network error').slice(0, 500);
    }

    // Log to Supabase
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
          order_id: order.id,
          customer_id: order.customer_id,
          template_id: 'collection-reminder',
          recipient: customer.email,
          subject,
          status,
          resend_message_id: messageId,
          error: errorMsg,
          sent_by: 'scheduled-job',
        }),
      });
    } catch {
      // non-critical
    }

    if (status === 'sent') sent++; else failed++;
  }

  console.log(`Reminders for ${tomorrowStr}: sent=${sent} skipped=${skipped} failed=${failed}`);
  return new Response(JSON.stringify({
    date: tomorrowStr,
    sent, skipped, failed,
    total: orders.length,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
