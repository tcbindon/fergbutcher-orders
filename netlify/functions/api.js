// netlify/functions/api.js
// ============================================================
// Proxy function — forwards all API requests to SiteGround
// No CORS issues — this runs server-to-server.
// ============================================================

const API_BASE   = 'https://orders.fergbutcher.com/api';
const API_SECRET = process.env.API_SECRET;

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

      console.log('[/all] customers:', listCustomers.length, '| orders:', orderList.length, '| staffNotes:', (staffNotes.data || []).length);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ...corsHeaders() },
        body: JSON.stringify({
          success: true,
          data: {
            customers: listCustomers,
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
