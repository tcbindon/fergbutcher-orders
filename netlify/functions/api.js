// netlify/functions/api.js
// ============================================================
// Proxy function — forwards all API requests to SiteGround
// No CORS issues — this runs server-to-server.
// Includes a lightweight in-memory GET cache (15s TTL) for
// warm function instances to reduce repeat cold-start cost.
// ============================================================
 
const API_BASE   = 'https://orders.fergbutcher.com/api';
const API_SECRET = process.env.API_SECRET;
const CACHE_TTL  = 15_000; // 15 seconds

// Simple in-memory cache: Map<key, { data: string, status: number, ts: number }>
const memCache = new Map();
 
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

  // Check in-memory cache for GET requests
  const isGet = event.httpMethod === 'GET';
  if (isGet) {
    const cacheKey = event.httpMethod + ' ' + url;
    const cached = memCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return {
        statusCode: cached.status,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': 'public, max-age=15',
          'X-Cache':       'HIT',
          ...corsHeaders(),
        },
        body: cached.data,
      };
    }
  }

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

    // Cache successful GET responses
    if (isGet && response.status >= 200 && response.status < 300) {
      const cacheKey = event.httpMethod + ' ' + url;
      memCache.set(cacheKey, { data, status: response.status, ts: Date.now() });
      // Prune old entries if cache grows large
      if (memCache.size > 50) {
        const oldestKey = memCache.keys().next().value;
        if (oldestKey) memCache.delete(oldestKey);
      }
    }
 
    return {
      statusCode: response.status,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=15',
        'X-Cache':       'MISS',
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
