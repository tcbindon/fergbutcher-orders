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
 
  const queryString = event.queryStringParameters
    ? '?' + new URLSearchParams(event.queryStringParameters).toString()
    : '';
 
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
 
    return {
      statusCode: response.status,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma':        'no-cache',
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
