// netlify/functions/scheduled-backup.js
// ============================================================
// Scheduled server-side backup — runs 4x daily (8am, 12pm, 4pm, 8pm NZ time).
// Fetches all live data from the SiteGround PHP API and stores a snapshot
// in the Supabase backups table, same format as manual/browser backups.
//
// Cron (UTC): "0 0,4,8,20 * * *"
//   20:00 UTC = 8am NZ (winter) / 9am NZ (summer)
//   00:00 UTC = 12pm NZ (winter) / 1pm NZ (summer)
//   04:00 UTC = 4pm NZ (winter) / 5pm NZ (summer)
//   08:00 UTC = 8pm NZ (winter) / 9pm NZ (summer)
// Using winter offset guarantees it never fires early.
// ============================================================

const API_BASE = 'https://orders.fergbutcher.com/api';
const MAX_BACKUPS = 30;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const apiSecret = process.env.API_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiSecret || !supabaseUrl || !serviceKey) {
    console.error('Missing required env vars for scheduled backup');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Missing env vars' }),
    };
  }

  const sbHeaders = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Fetch all live data from SiteGround PHP API in parallel
    const [customersRes, ordersRes, staffNotesRes] = await Promise.all([
      fetch(`${API_BASE}/customers.php`, {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiSecret },
      }),
      fetch(`${API_BASE}/orders.php`, {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiSecret },
      }),
      fetch(`${API_BASE}/staff-notes.php`, {
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiSecret },
      }),
    ]);

    const customersJson = await customersRes.json();
    const ordersJson = await ordersRes.json();
    const staffNotesJson = await staffNotesRes.json();

    const customers = customersJson?.data ?? [];
    const orders = ordersJson?.data ?? [];
    const staffNotes = staffNotesJson?.data ?? [];

    // 2. Build the backup payload — same shape as browser-created backups
    const data = {
      customers,
      orders,
      staffNotes,
      timestamp: new Date().toISOString(),
      version: '1.0.0-beta',
    };

    // 3. Insert into Supabase backups table
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/backups`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify({ type: 'automatic', data }),
    });

    if (!insertRes.ok) {
      const errBody = await insertRes.json().catch(() => ({}));
      console.error('Supabase insert failed:', errBody);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: errBody?.message || 'Supabase insert failed' }),
      };
    }

    // 4. Enforce 30-backup retention cap — delete oldest beyond MAX_BACKUPS
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/backups?select=id&order=created_at.desc&limit=${MAX_BACKUPS + 1}`,
      { headers: sbHeaders },
    );
    const countJson = await countRes.json();
    if (countRes.ok && countJson && countJson.length > MAX_BACKUPS) {
      const toDelete = countJson.slice(MAX_BACKUPS);
      for (const row of toDelete) {
        await fetch(`${supabaseUrl}/rest/v1/backups?id=eq.${row.id}`, {
          method: 'DELETE',
          headers: sbHeaders,
        });
      }
    }

    console.log(`Scheduled backup created: ${customers.length} customers, ${orders.length} orders, ${staffNotes.length} staff notes`);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        backup: { customers: customers.length, orders: orders.length, staffNotes: staffNotes.length },
      }),
    };
  } catch (err) {
    console.error('Scheduled backup failed:', err);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Scheduled backup failed: ' + err.message }),
    };
  }
};
