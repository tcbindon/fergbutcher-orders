// netlify/functions/api.js
// ============================================================
// Proxy function — forwards all API requests to SiteGround
// No CORS issues — this runs server-to-server.
// ============================================================

const API_BASE   = 'https://orders.fergbutcher.com/api';
const API_SECRET = process.env.API_SECRET;

// The PHP customers.php list endpoint has a bug: it doesn't return
// recently added customers even though they exist in the database
// and are retrievable individually via customers.php?id=X.
// This function probes for IDs above the max returned by the list
// and also checks any IDs referenced by orders, then merges them in.
// Runs server-side so it works for all devices.
async function fetchMissingCustomers(listCustomers, orders, hdrs) {
  const knownIds = new Set(listCustomers.map(c => String(c.id)));
  const numericIds = listCustomers
    .map(c => parseInt(c.id))
    .filter(n => !isNaN(n));
  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;

  // Build probe set: max+1 through max+20, plus any IDs referenced by orders
  const probeIds = new Set();
  for (let i = 1; i <= 20; i++) probeIds.add(String(maxId + i));
  if (orders) {
    for (const order of orders) {
      const cid = String(order.customerId);
      if (!knownIds.has(cid)) probeIds.add(cid);
    }
  }
  // Don't re-probe IDs already in the list
  for (const id of knownIds) probeIds.delete(id);

  const found = await Promise.all(
    [...probeIds].map(async (id) => {
      try {
        const res = await fetch(`${API_BASE}/customers.php?id=${id}`, { headers: hdrs });
        if (!res.ok) return null;
        const json = await res.json();
        if (json.success && json.data && json.data.id) return json.data;
        return null;
      } catch {
        return null;
      }
    })
  );

  return found.filter(c => c !== null);
}

exports.handler = async (event) => {

  const path = event.path
    .replace('/.netlify/functions/api', '')
    .replace(/\/$/, '');

  // Combined endpoint — fetches customers, orders, and staff notes
  // in a single round trip so the app loads with one request instead of three.
  if (path === '/all') {
    try {
      const params = new URLSearchParams(event.queryStringParameters || {});
      if (!params.has('from')) params.set('from', '1900-01-01');
      if (!params.has('to')) params.set('to', '2100-12-31');
      params.set('_cacheBust', Date.now().toString());
      const qs = '?' + params.toString();
      const hdrs = {
        'Content-Type': 'application/json',
        'X-API-Key': API_SECRET,
        'Cache-Control': 'no-cache, no-store',
      };
      const [custRes, ordRes, notesRes] = await Promise.all([
        fetch(`${API_BASE}/customers.php`, { headers: hdrs }),
        fetch(`${API_BASE}/orders.php${qs}`, { headers: hdrs }),
        fetch(`${API_BASE}/staff-notes.php`, { headers: hdrs }),
      ]);

      const ordRaw = await ordRes.text();
      const custRaw = await custRes.text();
      const notesRaw = await notesRes.text();

      let customers, orders, staffNotes;
      try { customers = JSON.parse(custRaw); } catch (e) { customers = { data: [] }; }
      try { orders = JSON.parse(ordRaw); } catch (e) { orders = { data: [] }; }
      try { staffNotes = JSON.parse(notesRaw); } catch (e) { staffNotes = { data: [] }; }

      const listCustomers = customers.data || [];
      const orderList = orders.data || [];

      // Probe for customers missing from the bulk list
      const missing = await fetchMissingCustomers(listCustomers, orderList, hdrs);
      const allCustomers = missing.length > 0 ? [...listCustomers, ...missing] : listCustomers;

      console.log('[/all] customers:', listCustomers.length, '+', missing.length, 'probed =', allCustomers.length, '| orders:', orderList.length, '| staffNotes:', (staffNotes.data || []).length);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ...corsHeaders() },
        body: JSON.stringify({
          success: true,
          data: {
            customers: allCustomers,
            orders: orderList,
            staffNotes: staffNotes.data || [],
          },
        }),
      };
    } catch (err) {
      console.error('Proxy /all error:', err);
      return {
        statusCode: 502,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, error: 'Proxy error: ' + err.message }),
      };
    }
  }

  const endpointMap = {
    '/customers':   '/customers.php',
    '/orders':      '/orders.php',
    '/staff-notes': '/staff-notes.php',
  };

  const phpFile = endpointMap[path];
  if (!phpFile) {
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: `Unknown endpoint: ${path}` }),
    };
  }

  const queryParams = new URLSearchParams(event.queryStringParameters || {});
  if (event.httpMethod === 'GET') queryParams.set('_cacheBust', Date.now().toString());
  const queryString = queryParams.toString() ? '?' + queryParams.toString() : '';

  const url = API_BASE + phpFile + queryString;

  const hasBody = !['GET', 'HEAD'].includes(event.httpMethod) && event.body;

  try {
    const response = await fetch(url, {
      method:  event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key':    API_SECRET,
      },
      body: hasBody ? event.body : undefined,
    });

    const data = await response.text();

    // For GET /customers (no specific id), probe for missing customers
    if (event.httpMethod === 'GET' && path === '/customers' && !queryParams.has('id')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.success && Array.isArray(parsed.data)) {
          const hdrs = { 'Content-Type': 'application/json', 'X-API-Key': API_SECRET };
          const missing = await fetchMissingCustomers(parsed.data, null, hdrs);
          if (missing.length > 0) {
            const merged = [...parsed.data, ...missing];
            console.log('[GET /customers] list:', parsed.data.length, '+', missing.length, 'probed =', merged.length);
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ...corsHeaders() },
              body: JSON.stringify({ success: true, data: merged }),
            };
          }
        }
      } catch (e) {
        console.error('[GET /customers] probe failed:', e.message);
      }
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'no-cache',
        ...corsHeaders(),
      },
      body: data,
    };

  } catch (err) {
    console.error('Proxy error:', err);
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: 'Proxy error: ' + err.message }),
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}
