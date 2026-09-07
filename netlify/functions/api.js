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

      // Log raw PHP responses for diagnostics
      const ordRaw = await ordRes.text();
      const custRaw = await custRes.text();
      const notesRaw = await notesRes.text();
      console.log('[/all] orders.php status:', ordRes.status, 'body length:', ordRaw.length, 'body preview:', ordRaw.substring(0, 500));
      console.log('[/all] customers.php status:', custRes.status, 'body length:', custRaw.length);
      console.log('[/all] staff-notes.php status:', notesRes.status, 'body length:', notesRaw.length);

      let customers, orders, staffNotes;
      try { customers = JSON.parse(custRaw); } catch (e) { console.error('[/all] customers.php JSON parse error:', e.message, 'raw:', custRaw.substring(0, 200)); customers = { data: [] }; }
      try { orders = JSON.parse(ordRaw); } catch (e) { console.error('[/all] orders.php JSON parse error:', e.message, 'raw:', ordRaw.substring(0, 200)); orders = { data: [] }; }
      try { staffNotes = JSON.parse(notesRaw); } catch (e) { console.error('[/all] staff-notes.php JSON parse error:', e.message, 'raw:', notesRaw.substring(0, 200)); staffNotes = { data: [] }; }

      console.log('[/all] Parsed counts — customers:', (customers.data || []).length, 'orders:', (orders.data || []).length, 'staffNotes:', (staffNotes.data || []).length);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ...corsHeaders() },
        body: JSON.stringify({
          success: true,
          data: {
            customers: customers.data || [],
            orders: orders.data || [],
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

  // Don't send body for GET/HEAD requests
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

    // Log save/update responses for diagnostics
    if (['POST', 'PUT', 'DELETE'].includes(event.httpMethod)) {
      console.log(`[${event.httpMethod} ${path}] PHP status:`, response.status, 'response:', data.substring(0, 500));
    }
    // Log GET responses for orders (to diagnose disappearing orders)
    if (event.httpMethod === 'GET' && path === '/orders') {
      console.log(`[GET ${path}${queryString}] PHP status:`, response.status, 'body length:', data.length, 'body preview:', data.substring(0, 500));
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
