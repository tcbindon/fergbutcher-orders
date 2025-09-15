// Google APIs Client Library and Google Identity Services type declarations
declare global {
  interface Window {
    gapi: {
      load: (apis: string, options: { callback: () => void; onerror: () => void }) => void;
      client: {
        init: (config: {
          apiKey: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        sheets: {
          spreadsheets: {
            get: (params: { spreadsheetId: string; fields?: string }) => Promise<any>;
            batchUpdate: (params: { spreadsheetId: string; resource: any }) => Promise<any>;
            values: {
              get: (params: { spreadsheetId: string; range: string }) => Promise<any>;
              update: (params: { 
                spreadsheetId: string; 
                range: string; 
                valueInputOption: string;
                resource: { values: any[][] };
              }) => Promise<any>;
              clear: (params: { spreadsheetId: string; range: string }) => Promise<any>;
            };
          };
        };
      };
    };
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: any) => void }) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export {};