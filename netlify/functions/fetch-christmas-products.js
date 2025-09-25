const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Check if environment variables are set
    if (!process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID || 
        !process.env.VITE_GOOGLE_SHEETS_SERVICE_EMAIL || 
        !process.env.VITE_GOOGLE_SHEETS_SERVICE_KEY) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Google Sheets environment variables not configured',
          details: 'Please set VITE_GOOGLE_SHEETS_SPREADSHEET_ID, VITE_GOOGLE_SHEETS_SERVICE_EMAIL, and VITE_GOOGLE_SHEETS_SERVICE_KEY in Netlify environment variables'
        })
      };
    }

    // Enhanced private key parsing
    let privateKey = process.env.VITE_GOOGLE_SHEETS_SERVICE_KEY;
    
    try {
      // Handle escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Remove surrounding quotes if present
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      // Ensure proper PEM format
      if (!privateKey.includes('\n')) {
        const keyContent = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '')
          .replace('-----END PRIVATE KEY-----', '')
          .replace(/\s/g, '');
        
        privateKey = '-----BEGIN PRIVATE KEY-----\n' + 
                    keyContent.match(/.{1,64}/g).join('\n') + 
                    '\n-----END PRIVATE KEY-----\n';
      }
      
      if (!privateKey.endsWith('\n')) {
        privateKey += '\n';
      }
      
    } catch (keyError) {
      console.error('Error processing private key:', keyError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to process private key',
          details: keyError.message 
        })
      };
    }

    // Create JWT auth
    const serviceAccountAuth = new JWT({
      email: process.env.VITE_GOOGLE_SHEETS_SERVICE_EMAIL,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    // Initialize Google Sheets document
    const doc = new GoogleSpreadsheet(process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID, serviceAccountAuth);
    
    // Load document info
    await doc.loadInfo();

    // Ensure Christmas Products sheet exists
    let sheet = doc.sheetsByTitle['Christmas Products'];
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = await doc.addSheet({ 
        title: 'Christmas Products',
        headerValues: ['ID', 'Name', 'Unit', 'Description']
      });
      
      // Add some default products
      const defaultProducts = [
        ['1', 'Half Ham', 'kg', 'Traditional half ham'],
        ['2', 'Whole Ham', 'kg', 'Full traditional ham'],
        ['3', '4kg Turkey', 'each', '4kg fresh turkey'],
        ['4', '6kg Turkey', 'each', '6kg fresh turkey'],
        ['5', 'Dressing service', 'service', 'Professional dressing service'],
        ['6', 'Gravy', 'portion', 'Traditional gravy'],
        ['7', 'Stuffing', 'portion', 'Traditional stuffing'],
        ['8', 'Pigs in Blankets', 'kg', 'Sausages wrapped in bacon']
      ];
      
      await sheet.addRows(defaultProducts.map(row => ({
        'ID': row[0],
        'Name': row[1],
        'Unit': row[2],
        'Description': row[3]
      })));
    }

    // Fetch all rows
    const rows = await sheet.getRows();
    
    // Convert to ChristmasProduct format
    const products = rows.map(row => ({
      id: row.get('ID') || '',
      name: row.get('Name') || '',
      unit: row.get('Unit') || '',
      description: row.get('Description') || ''
    })).filter(product => product.id && product.name); // Filter out empty rows

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        products,
        count: products.length
      })
    };

  } catch (error) {
    console.error('Error fetching Christmas products:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch Christmas products',
        details: error.message 
      })
    };
  }
};