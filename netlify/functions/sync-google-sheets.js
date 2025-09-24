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

    // Enhanced private key parsing with multiple fallback methods
    let privateKey = process.env.VITE_GOOGLE_SHEETS_SERVICE_KEY;
    
    console.log('Original private key length:', privateKey ? privateKey.length : 'undefined');
    console.log('Private key starts with:', privateKey ? privateKey.substring(0, 50) : 'undefined');
    
    try {
      // Method 1: Handle escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        console.log('Applied method 1: replaced \\n with newlines');
      }
      
      // Method 2: Remove surrounding quotes if present
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      // Method 3: Ensure proper PEM format
      if (!privateKey.includes('\n')) {
        // Split the key content and add proper line breaks
        const keyContent = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '')
          .replace('-----END PRIVATE KEY-----', '')
          .replace(/\s/g, ''); // Remove any spaces
        
        // Reconstruct with proper formatting
        privateKey = '-----BEGIN PRIVATE KEY-----\n' + 
                    keyContent.match(/.{1,64}/g).join('\n') + 
                    '\n-----END PRIVATE KEY-----\n';
        console.log('Applied method 3: reconstructed PEM format');
      }
      
      // Method 4: Ensure proper line endings
      if (!privateKey.endsWith('\n')) {
        privateKey += '\n';
      }
      
      console.log('Final private key format check:');
      console.log('- Starts with BEGIN:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
      console.log('- Ends with END:', privateKey.includes('-----END PRIVATE KEY-----'));
      console.log('- Has newlines:', privateKey.includes('\n'));
      
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

    // Get Christmas products for syncing
    const christmasProducts = await getChristmasProducts(doc);

    if (type === 'christmas-products') {
      // Return Christmas products
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          products: christmasProducts
        })
      };
    }

    if (type === 'customers' || type === 'all') {
      await syncCustomers(doc, customers || []);
    }

    if (type === 'orders' || type === 'all') {
      // Separate standard and Christmas orders
      const standardOrders = (orders || []).filter(order => order.orderType !== 'christmas');
      const christmasOrders = (orders || []).filter(order => order.orderType === 'christmas');
      
      // Sync standard orders
      if (standardOrders.length > 0) {
        await syncOrders(doc, standardOrders, customers || []);
      }
      
      // Sync Christmas orders
      if (christmasOrders.length > 0) {
        await syncChristmasOrders(doc, christmasOrders, customers || [], christmasProducts);
      }
    }

    if (type === 'christmas-orders') {
      const christmasOrders = (orders || []).filter(order => order.orderType === 'christmas');
      await syncChristmasOrders(doc, christmasOrders, customers || [], christmasProducts);
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
    { title: 'Daily Collections', headers: ['Date', 'Customer Name', 'Phone', 'Items', 'Collection Time', 'Status', 'Notes'] },
    { title: 'Christmas Products', headers: ['Product Name', 'Unit', 'Description'] },
    { title: 'Christmas Orders', headers: ['Order ID', 'Customer ID', 'Customer Name', 'Collection Date', 'Collection Time', 'Status', 'Notes', 'Created Date', 'Updated Date', 'Other Items'] }
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

  // Initialize Christmas Products sheet with default products if empty
  await initializeChristmasProducts(doc);
}

// Initialize Christmas Products sheet with default products
async function initializeChristmasProducts(doc) {
  const sheet = doc.sheetsByTitle['Christmas Products'];
  const rows = await sheet.getRows();
  
  // If sheet is empty, add default Christmas products
  if (rows.length === 0) {
    const defaultProducts = [
      { 'Product Name': 'Half Ham', 'Unit': 'kg', 'Description': 'Traditional half ham' },
      { 'Product Name': 'Whole Ham', 'Unit': 'kg', 'Description': 'Full traditional ham' },
      { 'Product Name': '4kg Turkey', 'Unit': 'each', 'Description': '4kg fresh turkey' },
      { 'Product Name': '6kg Turkey', 'Unit': 'each', 'Description': '6kg fresh turkey' },
      { 'Product Name': 'Dressing service', 'Unit': 'service', 'Description': 'Professional dressing service' },
      { 'Product Name': 'Gravy', 'Unit': 'portion', 'Description': 'Traditional gravy' },
      { 'Product Name': 'Stuffing', 'Unit': 'portion', 'Description': 'Traditional stuffing' },
      { 'Product Name': 'Pigs in Blankets', 'Unit': 'kg', 'Description': 'Sausages wrapped in bacon' }
    ];
    
    await sheet.addRows(defaultProducts);
    console.log('Initialized Christmas Products sheet with default products');
  }
}

// Get Christmas products from Google Sheets
async function getChristmasProducts(doc) {
  try {
    const sheet = doc.sheetsByTitle['Christmas Products'];
    const rows = await sheet.getRows();
    
    return rows.map((row, index) => ({
      id: (index + 1).toString(),
      name: row.get('Product Name') || '',
      unit: row.get('Unit') || '',
      description: row.get('Description') || ''
    }));
  } catch (error) {
    console.error('Error fetching Christmas products:', error);
    return [];
  }
}

// Sync Christmas orders to Google Sheets
async function syncChristmasOrders(doc, orders, customers, christmasProducts) {
  const sheet = doc.sheetsByTitle['Christmas Orders'];
  
  // Get current headers to see if we need to add product columns
  const headerValues = await sheet.getHeaderRow();
  const existingHeaders = new Set(headerValues);
  
  // Build required headers (standard fields + product columns)
  const standardHeaders = ['Order ID', 'Customer ID', 'Customer Name', 'Collection Date', 'Collection Time', 'Status', 'Notes', 'Created Date', 'Updated Date'];
  const productHeaders = christmasProducts.map(product => `${product.name} (${product.unit})`);
  const requiredHeaders = [...standardHeaders, ...productHeaders, 'Other Items'];
  
  // Add missing product columns if needed
  const missingHeaders = requiredHeaders.filter(header => !existingHeaders.has(header));
  if (missingHeaders.length > 0) {
    // Update headers by setting the entire header row
    await sheet.setHeaderRow(requiredHeaders);
    console.log('Updated Christmas Orders sheet headers with new product columns');
  }
  
  // Clear existing data (except headers)
  await sheet.clear('A2:ZZ1000');
  
  // Filter for Christmas orders only
  const christmasOrders = orders.filter(order => order.orderType === 'christmas');
  
  // Prepare Christmas order data
  const orderRows = christmasOrders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown';
    
    // Create base row data
    const rowData = {
      'Order ID': order.id,
      'Customer ID': order.customerId,
      'Customer Name': customerName,
      'Collection Date': order.collectionDate,
      'Collection Time': order.collectionTime || '',
      'Status': order.status,
      'Notes': order.additionalNotes || '',
      'Created Date': new Date(order.createdAt).toLocaleDateString('en-NZ'),
      'Updated Date': new Date(order.updatedAt).toLocaleDateString('en-NZ')
    };
    
    // Add quantities for each Christmas product
    christmasProducts.forEach(product => {
      const columnName = `${product.name} (${product.unit})`;
      const orderItem = order.items.find(item => 
        item.isChristmasProduct && item.christmasProductId === product.id
      );
      rowData[columnName] = orderItem ? orderItem.quantity.toString() : '';
    });
    
    // Add other (non-Christmas) items
    const otherItems = order.items
      .filter(item => !item.isChristmasProduct)
      .map(item => `${item.description} (${item.quantity} ${item.unit})`)
      .join('; ');
    rowData['Other Items'] = otherItems;
    
    return rowData;
  });
  
  // Add order data
  if (orderRows.length > 0) {
    await sheet.addRows(orderRows);
  }
  
  console.log(`Synced ${christmasOrders.length} Christmas orders`);
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