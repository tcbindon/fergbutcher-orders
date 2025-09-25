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

    if (type === 'christmas-products') {
      const products = await fetchChristmasProductsFromSheet(doc);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          products,
          message: `Fetched ${products.length} Christmas products`
        })
      };
    }

    if (type === 'christmas-orders') {
      const christmasOrders = (orders || []).filter(order => 
        order.items && order.items.some(item => 
          item.description && (
            item.description.toLowerCase().includes('christmas') ||
            item.description.toLowerCase().includes('turkey') ||
            item.description.toLowerCase().includes('ham') ||
            item.description.toLowerCase().includes('wellington') ||
            item.description.toLowerCase().includes('duck') ||
            item.description.toLowerCase().includes('goose') ||
            item.description.toLowerCase().includes('venison') ||
            item.description.toLowerCase().includes('pudding') ||
            item.description.toLowerCase().includes('mince pie') ||
            item.description.toLowerCase().includes('stuffing') ||
            item.description.toLowerCase().includes('cranberry') ||
            item.description.toLowerCase().includes('gravy')
          )
        )
      );
      
      await syncChristmasOrders(doc, christmasOrders, customers || []);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `Successfully synced ${christmasOrders.length} Christmas orders to Google Sheets`
        })
      };
    }

    // Sync Christmas orders if any exist
    const christmasOrders = (orders || []).filter(order => 
      order.items && order.items.some(item => 
        item.description && (
          item.description.toLowerCase().includes('christmas') ||
          item.description.toLowerCase().includes('turkey') ||
          item.description.toLowerCase().includes('ham') ||
          item.description.toLowerCase().includes('wellington') ||
          item.description.toLowerCase().includes('duck') ||
          item.description.toLowerCase().includes('goose') ||
          item.description.toLowerCase().includes('venison') ||
          item.description.toLowerCase().includes('pudding') ||
          item.description.toLowerCase().includes('mince pie') ||
          item.description.toLowerCase().includes('stuffing') ||
          item.description.toLowerCase().includes('cranberry') ||
          item.description.toLowerCase().includes('gravy')
        )
      )
    );
    
    if (christmasOrders.length > 0 || type === 'all') {
      await syncChristmasOrders(doc, christmasOrders, customers || []);
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
    { 
      title: 'Christmas Orders', 
      headers: [
        'Order ID', 'Customer ID', 'Customer Name', 'Email', 'Phone', 'Collection Date', 'Collection Time', 'Status', 'Notes',
        'Turkey (kg)', 'Ham (kg)', 'Beef Wellington (kg)', 'Lamb Leg (kg)', 'Pork Belly (kg)', 'Duck (whole)', 
        'Goose (whole)', 'Venison (kg)', 'Christmas Pudding', 'Mince Pies (dozen)', 'Stuffing (kg)', 
        'Cranberry Sauce (jars)', 'Gravy (litres)', 'Other Items', 'Total Items', 'Created Date', 'Updated Date'
      ] 
    }
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

// Fetch Christmas products from Google Sheets
async function fetchChristmasProductsFromSheet(doc) {
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

  console.log(`Fetched ${products.length} Christmas products`);
  return products;
}

// Sync Christmas orders with individual product columns
async function syncChristmasOrders(doc, orders, customers) {
  const sheet = doc.sheetsByTitle['Christmas Orders'];
  
  // Clear existing data (except headers)
  await sheet.clear('A2:Z1000');
  
  // Christmas product mapping - maps keywords to column names
  const christmasProducts = {
    'Turkey (kg)': ['turkey'],
    'Ham (kg)': ['ham'],
    'Beef Wellington (kg)': ['wellington', 'beef wellington'],
    'Lamb Leg (kg)': ['lamb leg', 'lamb'],
    'Pork Belly (kg)': ['pork belly', 'pork'],
    'Duck (whole)': ['duck'],
    'Goose (whole)': ['goose'],
    'Venison (kg)': ['venison'],
    'Christmas Pudding': ['christmas pudding', 'pudding'],
    'Mince Pies (dozen)': ['mince pie', 'mince pies'],
    'Stuffing (kg)': ['stuffing'],
    'Cranberry Sauce (jars)': ['cranberry sauce', 'cranberry'],
    'Gravy (litres)': ['gravy']
  };
  
  // Prepare Christmas order data
  const christmasRows = orders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown';
    
    // Initialize row data
    const rowData = {
      'Order ID': order.id,
      'Customer ID': order.customerId,
      'Customer Name': customerName,
      'Email': customer?.email || '',
      'Phone': customer?.phone || '',
      'Collection Date': order.collectionDate,
      'Collection Time': order.collectionTime || '',
      'Status': order.status,
      'Notes': order.additionalNotes || '',
      'Other Items': '',
      'Total Items': order.items.length,
      'Created Date': new Date(order.createdAt).toLocaleDateString('en-NZ'),
      'Updated Date': new Date(order.updatedAt).toLocaleDateString('en-NZ')
    };
    
    // Initialize all Christmas product columns to 0
    Object.keys(christmasProducts).forEach(productColumn => {
      rowData[productColumn] = 0;
    });
    
    // Process each order item
    const otherItems = [];
    
    order.items.forEach(item => {
      const itemDesc = item.description.toLowerCase();
      let matched = false;
      
      // Check each Christmas product
      for (const [productColumn, keywords] of Object.entries(christmasProducts)) {
        if (keywords.some(keyword => itemDesc.includes(keyword))) {
          // Add quantity to the appropriate column
          const currentQty = parseFloat(rowData[productColumn]) || 0;
          const itemQty = parseFloat(item.quantity) || 0;
          rowData[productColumn] = currentQty + itemQty;
          matched = true;
          break;
        }
      }
      
      // If no match found, add to other items
      if (!matched) {
        otherItems.push(`${item.description} (${item.quantity} ${item.unit})`);
      }
    });
    
    // Set other items
    rowData['Other Items'] = otherItems.join('; ');
    
    return rowData;
  });
  
  // Add Christmas order data
  if (christmasRows.length > 0) {
    await sheet.addRows(christmasRows);
  }
  
  console.log(`Synced ${orders.length} Christmas orders with individual product columns`);
}