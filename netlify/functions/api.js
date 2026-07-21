// netlify/functions/api.js
// ============================================================
// Proxy function — forwards all API requests to SiteGround
// No CORS issues — this runs server-to-server.
// Includes a short-lived in-memory GET cache to reduce latency
// for repeated requests within the same warm function instance.
// ============================================================

const API_BASE   = 'https://orders.fergbutcher.com/api';
const API_SECRET = process.env.API_SECRET;

// In-memory GET cache (survives only while the function instance is warm).
const CACHE_TTL_MS = 15_000; // 15 seconds
const memoryCache = new Map();

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}

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

  // Short-circuit GET requests that have a fresh cached response
  const isCacheableGet = event.httpMethod === 'GET';
  if (isCacheableGet) {
    const cached = memoryCache.get(url);
    if (cached && cached.expires > Date.now()) {
      return {
        statusCode: cached.status,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma':        'no-cache',
          'X-Cache':        'HIT',
          ...corsHeaders(),
        },
        body: cached.body,
      };
    }
  }

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

    // Cache successful GET responses for a short window
    if (isCacheableGet && response.status === 200) {
      memoryCache.set(url, { body: data, status: response.status, expires: Date.now() + CACHE_TTL_MS });
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma':        'no-cache',
        'X-Cache':        'MISS',
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
