// Google Sheets API service using Google Identity Services
import { Customer, Order } from '../types';

export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  clientId: string;
  clientSecret: string;
}

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;
  private isInitialized = false;
  private accessToken: string | null = null;

  // Initialize the service with configuration
  async initialize(config: GoogleSheetsConfig) {
    this.config = config;
    
    // Check if we have a stored access token from OAuth redirect
    const storedToken = sessionStorage.getItem('google_access_token');
    if (storedToken) {
      this.accessToken = storedToken;
      sessionStorage.removeItem('google_access_token');
      console.log('Using stored access token from OAuth redirect');
    }
    
    try {
      // Load Google Identity Services and GAPI
      await Promise.all([
        this.loadGoogleIdentityServices(),
        this.loadGoogleAPIs()
      ]);
      
      await this.initializeGapi();
      this.initializeGoogleIdentity();
      
      this.isInitialized = true;
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  // Load Google Identity Services
  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  // Load Google APIs Client Library
  private loadGoogleAPIs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google APIs'));
      document.head.appendChild(script);
    });
  }

  // Initialize GAPI
  private initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config) {
        reject(new Error('Config not set'));
        return;
      }

      window.gapi.load('client', {
        callback: async () => {
          try {
            await window.gapi.client.init({
              apiKey: this.config!.apiKey,
              discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });
            resolve();
          } catch (error) {
            console.error('GAPI initialization error:', error);
            reject(error);
          }
        },
        onerror: () => reject(new Error('Failed to load GAPI client'))
      });
    });
  }

  // Initialize Google Identity Services
  private initializeGoogleIdentity(): void {
    if (!this.config || !window.google?.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    window.google.accounts.id.initialize({
      client_id: this.config.clientId,
      callback: (response: any) => {
        console.log('Google Identity callback:', response);
      }
    });
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Authenticate user using Google Identity Services
  async authenticate(): Promise<boolean> {
    if (!this.config || !window.google?.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    try {
      return new Promise((resolve, reject) => {
        // Clear any existing tokens first
        this.accessToken = null;
        
        let tokenClient: any;
        let authCompleted = false;
        
        try {
          console.log('Creating token client with config:', {
            client_id: this.config!.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets'
          });
          
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.config!.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (response: any) => {
              if (authCompleted) return;
              authCompleted = true;
              
              console.log('OAuth callback received:', response);
              
              if (response.error) {
                console.error('OAuth callback error:', response.error);
                reject(new Error(`Authentication failed: ${response.error}${response.error_description ? ' - ' + response.error_description : ''}`));
                return;
              }
              
              if (!response.access_token) {
                console.error('No access token in response:', response);
                reject(new Error('No access token received from Google'));
                return;
              }
              
              this.accessToken = response.access_token;
              console.log('Authentication successful, token received:', response.access_token.substring(0, 20) + '...');
              resolve(true);
            }
          });
          
          console.log('Token client created successfully, requesting access token...');
          
          // Try to request access token immediately
          try {
            tokenClient.requestAccessToken({
              prompt: 'consent'
            });
            
            // Set a timeout to handle cases where the callback never fires
            setTimeout(() => {
              if (!authCompleted) {
                authCompleted = true;
                console.error('Authentication timeout - no token received after 45 seconds');
                reject(new Error('Authentication timeout. Please try again and ensure you complete the Google sign-in process.'));
              }
            }, 45000);
            
          } catch (requestError) {
            console.error('Request access token error:', requestError);
            reject(new Error('Failed to request access token. Please ensure popups are allowed and try again.'));
          }
          
        } catch (initError) {
          console.error('Token client initialization error:', initError);
          reject(new Error(`Failed to initialize authentication: ${initError.message || initError}`));
        }
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  // Alternative authentication method using implicit flow
  async authenticateImplicit(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Config not set');
    }

    try {
      // Use the origin as redirect URI to match what's in Google Cloud Console
      const redirectUri = window.location.origin;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(this.config.clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets')}&` +
        `include_granted_scopes=true&` +
        `state=auth_state_${Math.random().toString(36).substring(7)}`;

      return new Promise((resolve, reject) => {
        const popup = window.open(authUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
        
        if (!popup) {
          reject(new Error('Failed to open popup window. Please allow popups for this site.'));
          return;
        }

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            if (!this.accessToken) {
              reject(new Error('Authentication cancelled or failed'));
            }
          }
        }, 1000);

        // Check popup URL for access token
        const checkForToken = setInterval(() => {
          try {
            if (popup.location.hash && popup.location.hash.includes('access_token')) {
              const params = new URLSearchParams(popup.location.hash.substring(1));
              const accessToken = params.get('access_token');
              const error = params.get('error');
              
              if (accessToken) {
                this.accessToken = accessToken;
                popup.close();
                clearInterval(checkClosed);
                clearInterval(checkForToken);
                resolve(true);
              } else if (error) {
                popup.close();
                clearInterval(checkClosed);
                clearInterval(checkForToken);
                reject(new Error(error));
              }
            }
          } catch (e) {
            // Cross-origin error, continue checking
          }
        }, 1000);

        // Timeout after 2 minutes
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
          }
          clearInterval(checkClosed);
          clearInterval(checkForToken);
          if (!this.accessToken) {
            reject(new Error('Authentication timeout'));
          }
        }, 120000);
      });
    } catch (error) {
      console.error('Implicit authentication failed:', error);
      throw error;
    }
  }

  // New method to handle direct OAuth flow without popup
  async authenticateDirect(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Config not set');
    }

    try {
      // Use the origin as redirect URI
      const redirectUri = window.location.origin;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(this.config.clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets')}&` +
        `include_granted_scopes=true&` +
        `state=auth_state_${Math.random().toString(36).substring(7)}`;

      // Store the current state so we can return to it after auth
      sessionStorage.setItem('pre_auth_state', JSON.stringify({
        url: window.location.href,
        timestamp: Date.now()
      }));

      // Redirect to Google OAuth
      window.location.href = authUrl;
      
      return true; // This won't actually return since we're redirecting
    } catch (error) {
      console.error('Direct authentication failed:', error);
      throw error;
    }
  }

  // Alternative authentication method
  async authenticateAlternative(): Promise<boolean> {
    if (!this.config || !window.google?.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    try {
      return new Promise((resolve, reject) => {
        // Clear any existing tokens first
        this.accessToken = null;
        
        let tokenClient: any;
        
        try {
          console.log('Creating token client with config:', {
            client_id: this.config!.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets'
          });
          
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.config!.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (response: any) => {
              console.log('OAuth callback received:', response);
              
              if (response.error) {
                console.error('OAuth callback error:', response.error);
                reject(new Error(`Authentication failed: ${response.error}${response.error_description ? ' - ' + response.error_description : ''}`));
                return;
              }
              
              if (!response.access_token) {
                console.error('No access token in response:', response);
                reject(new Error('No access token received from Google'));
                return;
              }
              
              this.accessToken = response.access_token;
              console.log('Authentication successful, token received:', response.access_token.substring(0, 20) + '...');
              resolve(true);
            },
            error_callback: (error: any) => {
              console.error('OAuth error callback:', error);
              // Don't immediately reject on error callback, as it might be a popup blocker issue
              console.warn('OAuth error callback triggered, but continuing...');
            }
          });
          
          console.log('Token client created successfully, requesting access token...');
          
          // Try to request access token immediately
          try {
            tokenClient.requestAccessToken({
              prompt: 'select_account',
              include_granted_scopes: true
            });
            
            // Set a timeout to handle cases where the callback never fires
            setTimeout(() => {
              if (!this.accessToken) {
                console.error('Authentication timeout - no token received after 30 seconds');
                reject(new Error('Authentication timeout. Please try again and ensure you complete the Google sign-in process.'));
              }
            }, 30000);
            
          } catch (requestError) {
            console.error('Request access token error:', requestError);
            reject(new Error('Failed to request access token. Please ensure popups are allowed and try again.'));
          }
          
        } catch (initError) {
          console.error('Token client initialization error:', initError);
          reject(new Error(`Failed to initialize authentication: ${initError.message || initError}`));
        }
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
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
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
    if (window.google?.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;