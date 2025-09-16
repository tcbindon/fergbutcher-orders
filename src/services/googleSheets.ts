// Google Sheets API service using Service Account authentication for Netlify
import { Customer, Order } from '../types';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountEmail: string;
  serviceAccountKey: string;
}

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;
  private isInitialized = false;
  private accessToken: string | null = null;

  // Initialize the service with configuration
  async initialize(config: GoogleSheetsConfig) {
    this.config = config;
    
    try {
      // Get access token using service account
      await this.authenticateServiceAccount();
      this.isInitialized = true;
      console.log('Google Sheets service initialized successfully with service account');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  // Authenticate using service account (for server-side/automatic access)
  private async authenticateServiceAccount(): Promise<void> {
    if (!this.config) {
      throw new Error('Config not set');
    }

    try {
      // Create JWT for service account authentication
      const jwt = await this.createServiceAccountJWT();
      
      // Exchange JWT for access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      
      console.log('Service account authentication successful');
    } catch (error) {
      console.error('Service account authentication failed:', error);
      throw error;
    }
  }

  // Create JWT for service account
  private async createServiceAccountJWT(): Promise<string> {
    if (!this.config) {
      throw new Error('Config not set');
    }

    // For production, you would use a proper JWT library
    // This is a simplified version - in practice, use jsonwebtoken or similar
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now,
    };

    // Note: This is a simplified JWT creation
    // In production, you'd use a proper JWT library with RSA signing
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // For now, we'll use a different approach - direct API key authentication
    throw new Error('Service account JWT creation requires server-side implementation');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Make authenticated API request
  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Create the required sheets structure
  async createSheetsStructure(): Promise<boolean> {
    if (!this.config || !this.isAuthenticated()) {
      throw new Error('Service not authenticated');
    }

    try {
      // Get existing sheets
      const spreadsheet = await this.makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}?fields=sheets.properties`
      );

      const existingSheets = spreadsheet.sheets?.map((sheet: any) => sheet.properties?.title) || [];
      
      // Create required sheets if they don't exist
      const requiredSheets = [
        { title: 'Customers', headers: ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Created Date'] },
        { title: 'Orders', headers: ['Order ID', 'Customer ID', 'Customer Name', 'Collection Date', 'Collection Time', 'Status', 'Items', 'Notes', 'Created Date', 'Updated Date'] },
        { title: 'Daily Collections', headers: ['Date', 'Customer Name', 'Phone', 'Items', 'Collection Time', 'Status', 'Notes'] }
      ];

      const requests = [];

      // Add new sheets
      for (const sheet of requiredSheets) {
        if (!existingSheets.includes(sheet.title)) {
          requests.push({
            addSheet: {
              properties: {
                title: sheet.title
              }
            }
          });
        }
      }

      // Execute batch update if needed
      if (requests.length > 0) {
        await this.makeAuthenticatedRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            body: JSON.stringify({ requests })
          }
        );
      }

      // Add headers to each sheet
      for (const sheet of requiredSheets) {
        await this.makeAuthenticatedRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheet.title}!A1:Z1?valueInputOption=RAW`,
          {
            method: 'PUT',
            body: JSON.stringify({
              values: [sheet.headers]
            })
          }
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to create sheets structure:', error);
      throw error;
    }
  }

  // Sync customers to Google Sheets
  async syncCustomers(customers: Customer[]): Promise<boolean> {
    if (!this.config || !this.isAuthenticated()) {
      console.warn('Google Sheets not configured, skipping sync');
      return false;
    }

    try {
      const customerData = customers.map(customer => [
        customer.id,
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone || '',
        customer.company || '',
        new Date(customer.createdAt).toLocaleDateString('en-NZ')
      ]);

      // Clear existing data first (except headers)
      await this.makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/Customers!A2:Z1000:clear`,
        { method: 'POST' }
      );
      
      // Add new data
      if (customerData.length > 0) {
        await this.makeAuthenticatedRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/Customers!A2:G${customerData.length + 1}?valueInputOption=RAW`,
          {
            method: 'PUT',
            body: JSON.stringify({
              values: customerData
            })
          }
        );
      }
      
      console.log(`Synced ${customers.length} customers to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Failed to sync customers:', error);
      throw error;
    }
  }

  // Sync orders to Google Sheets
  async syncOrders(orders: Order[], customers: Customer[]): Promise<boolean> {
    if (!this.config || !this.isAuthenticated()) {
      console.warn('Google Sheets not configured, skipping sync');
      return false;
    }

    try {
      const orderData = orders.map(order => {
        const customer = customers.find(c => c.id === order.customerId);
        const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown';
        const itemsText = order.items.map(item => 
          `${item.description} (${item.quantity} ${item.unit})`
        ).join('; ');

        return [
          order.id,
          order.customerId,
          customerName,
          order.collectionDate,
          order.collectionTime || '',
          order.status,
          itemsText,
          order.additionalNotes || '',
          new Date(order.createdAt).toLocaleDateString('en-NZ'),
          new Date(order.updatedAt).toLocaleDateString('en-NZ')
        ];
      });

      // Clear existing data first (except headers)
      await this.makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/Orders!A2:Z1000:clear`,
        { method: 'POST' }
      );
      
      // Add new data
      if (orderData.length > 0) {
        await this.makeAuthenticatedRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/Orders!A2:J${orderData.length + 1}?valueInputOption=RAW`,
          {
            method: 'PUT',
            body: JSON.stringify({
              values: orderData
            })
          }
        );
      }

      console.log(`Synced ${orders.length} orders to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Failed to sync orders:', error);
      throw error;
    }
  }

  // Update daily collections sheet
  async syncDailyCollections(orders: Order[], customers: Customer[], date: string): Promise<boolean> {
    if (!this.config || !this.isAuthenticated()) {
      console.warn('Google Sheets not configured, skipping sync');
      return false;
    }

    try {
      const dailyOrders = orders.filter(order => order.collectionDate === date);
      
      const collectionsData = dailyOrders.map(order => {
        const customer = customers.find(c => c.id === order.customerId);
        const itemsText = order.items.map(item => 
          `${item.description} (${item.quantity} ${item.unit})`
        ).join('; ');

        return [
          order.collectionDate,
          customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
          customer?.phone || '',
          itemsText,
          order.collectionTime || '',
          order.status,
          order.additionalNotes || ''
        ];
      });

      // Clear existing data first (except headers)
      await this.makeAuthenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/Daily Collections!A2:Z1000:clear`,
        { method: 'POST' }
      );
      
      // Add new data
      if (collectionsData.length > 0) {
        await this.makeAuthenticatedRequest(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/Daily Collections!A2:G${collectionsData.length + 1}?valueInputOption=RAW`,
          {
            method: 'PUT',
            body: JSON.stringify({
              values: collectionsData
            })
          }
        );
      }

      console.log(`Synced ${dailyOrders.length} daily collections to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Failed to sync daily collections:', error);
      throw error;
    }
  }

  // Get connection status
  getStatus(): { connected: boolean; lastSync?: Date } {
    return {
      connected: this.isInitialized && this.isAuthenticated(),
      lastSync: this.isAuthenticated() ? new Date() : undefined
    };
  }

  // Disconnect and clear tokens
  disconnect(): void {
    this.accessToken = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;