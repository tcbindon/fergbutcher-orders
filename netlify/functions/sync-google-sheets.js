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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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

    // Parse the incoming data
    const { customers, orders, type } = JSON.parse(event.body);

    // Create JWT auth
    const serviceAccountAuth = new JWT({
      email: process.env.VITE_GOOGLE_SHEETS_SERVICE_EMAIL,
      key: process.env.VITE_GOOGLE_SHEETS_SERVICE_KEY.replace(/\\n/gm, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    // Initialize Google Sheets document
    const doc = new GoogleSpreadsheet(process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID, serviceAccountAuth);
    
    // Load document info
    await doc.loadInfo();

    // Ensure required sheets exist
    await ensureSheetsExist(doc);

    // Sync data based on type
    if (type === 'test') {
      // Just test the connection
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Google Sheets connection test successful',
          spreadsheetTitle: doc.title
        })
      };
    }

    if (type === 'customers' || type === 'all') {
      await syncCustomers(doc, customers || []);
    }

    if (type === 'orders' || type === 'all') {
      await syncOrders(doc, orders || [], customers || []);
    }

    if (type === 'daily' || type === 'all') {
      const today = new Date().toISOString().split('T')[0];
      await syncDailyCollections(doc, orders || [], customers || [], today);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${type} data to Google Sheets`,
        spreadsheetTitle: doc.title
      })
    };

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to sync data to Google Sheets',
        details: error.message 
      })
    };
  }
};

// Ensure required sheets exist
async function ensureSheetsExist(doc) {
  const requiredSheets = [
    { title: 'Customers', headers: ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Created Date'] },
    { title: 'Orders', headers: ['Order ID', 'Customer ID', 'Customer Name', 'Collection Date', 'Collection Time', 'Status', 'Items', 'Notes', 'Created Date', 'Updated Date'] },
    { title: 'Daily Collections', headers: ['Date', 'Customer Name', 'Phone', 'Items', 'Collection Time', 'Status', 'Notes'] }
  ];

  for (const sheetConfig of requiredSheets) {
    let sheet = doc.sheetsByTitle[sheetConfig.title];
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = await doc.addSheet({ title: sheetConfig.title });
      
      // Add headers
      await sheet.setHeaderRow(sheetConfig.headers);
    }
  }
}

// Sync customers to Google Sheets
async function syncCustomers(doc, customers) {
  const sheet = doc.sheetsByTitle['Customers'];
  
  // Clear existing data (except headers)
  await sheet.clear('A2:Z1000');
  
  // Prepare customer data
  const customerRows = customers.map(customer => ({
    'ID': customer.id,
    'First Name': customer.firstName,
    'Last Name': customer.lastName,
    'Email': customer.email,
    'Phone': customer.phone || '',
    'Company': customer.company || '',
    'Created Date': new Date(customer.createdAt).toLocaleDateString('en-NZ')
  }));
  
  // Add customer data
  if (customerRows.length > 0) {
    await sheet.addRows(customerRows);
  }
  
  console.log(`Synced ${customers.length} customers`);
}

// Sync orders to Google Sheets
async function syncOrders(doc, orders, customers) {
  const sheet = doc.sheetsByTitle['Orders'];
  
  // Clear existing data (except headers)
  await sheet.clear('A2:Z1000');
  
  // Prepare order data
  const orderRows = orders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown';
    const itemsText = order.items.map(item => 
      `${item.description} (${item.quantity} ${item.unit})`
    ).join('; ');

    return {
      'Order ID': order.id,
      'Customer ID': order.customerId,
      'Customer Name': customerName,
      'Collection Date': order.collectionDate,
      'Collection Time': order.collectionTime || '',
      'Status': order.status,
      'Items': itemsText,
      'Notes': order.additionalNotes || '',
      'Created Date': new Date(order.createdAt).toLocaleDateString('en-NZ'),
      'Updated Date': new Date(order.updatedAt).toLocaleDateString('en-NZ')
    };
  });
  
  // Add order data
  if (orderRows.length > 0) {
    await sheet.addRows(orderRows);
  }
  
  console.log(`Synced ${orders.length} orders`);
}

// Sync daily collections
async function syncDailyCollections(doc, orders, customers, date) {
  const sheet = doc.sheetsByTitle['Daily Collections'];
  
  // Clear existing data (except headers)
  await sheet.clear('A2:Z1000');
  
  // Filter orders for the specified date
  const dailyOrders = orders.filter(order => order.collectionDate === date);
  
  // Prepare daily collections data
  const collectionRows = dailyOrders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const itemsText = order.items.map(item => 
      `${item.description} (${item.quantity} ${item.unit})`
    ).join('; ');

    return {
      'Date': order.collectionDate,
      'Customer Name': customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
      'Phone': customer?.phone || '',
      'Items': itemsText,
      'Collection Time': order.collectionTime || '',
      'Status': order.status,
      'Notes': order.additionalNotes || ''
    };
  });
  
  // Add collection data
  if (collectionRows.length > 0) {
    await sheet.addRows(collectionRows);
  }
  
  console.log(`Synced ${dailyOrders.length} daily collections`);
}