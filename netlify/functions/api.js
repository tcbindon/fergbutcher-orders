// netlify/functions/api.js
// ============================================================
// Proxy function — forwards all API requests to SiteGround
// The app calls /.netlify/functions/api/customers etc.
// This function forwards to orders.fergbutcher.com/api/
// No CORS issues because this is server-to-server.
// ============================================================

const API_BASE   = 'https://orders.fergbutcher.com/api';
const API_SECRET = process.env.API_SECRET; // Set this in Netlify environment variables

exports.handler = async (event) => {
  // Extract the endpoint from the path
  // e.g. /.netlify/functions/api/customers → /customers.php
  const path = event.path
    .replace('/.netlify/functions/api', '')
    .replace(/\/$/, '');

  // Map path to PHP file
  const endpointMap = {
    '/customers':    '/customers.php',
    '/orders':       '/orders.php',
    '/staff-notes':  '/staff-notes.php',
  };

  const phpFile = endpointMap[path];
  if (!phpFile) {
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: `Unknown endpoint: ${path}` }),
    };
  }

  // Build the full URL including query string
  const queryString = event.queryStringParameters
    ? '?' + new URLSearchParams(event.queryStringParameters).toString()
    : '';

  const url = API_BASE + phpFile + queryString;

  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_SECRET,
      },
      body: event.body || undefined,
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}
