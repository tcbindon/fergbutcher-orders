// Environment configuration for production deployment
interface EnvironmentConfig {
  googleSheets: {
    spreadsheetId: string;
    serviceEmail: string;
    serviceKey: string;
  };
  app: {
    version: string;
    environment: 'development' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  features: {
    autoBackup: boolean;
    googleSheetsSync: boolean;
    errorReporting: boolean;
  };
}

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

// Configuration using environment variables
const config: EnvironmentConfig = {
  googleSheets: {
    spreadsheetId: getEnvVar('VITE_GOOGLE_SHEETS_SPREADSHEET_ID'),
    serviceEmail: getEnvVar('VITE_GOOGLE_SHEETS_SERVICE_EMAIL'),
    serviceKey: getEnvVar('VITE_GOOGLE_SHEETS_SERVICE_KEY'),
  },
  app: {
    version: getEnvVar('VITE_APP_VERSION', '1.0.0-beta'),
    environment: (import.meta.env.MODE as 'development' | 'production') || 'development',
    logLevel: getEnvVar('VITE_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
  features: {
    autoBackup: getEnvVar('VITE_ENABLE_AUTO_BACKUP', 'true') !== 'false',
    googleSheetsSync: getEnvVar('VITE_ENABLE_GOOGLE_SHEETS', 'true') !== 'false',
    errorReporting: getEnvVar('VITE_ENABLE_ERROR_REPORTING', 'false') === 'true',
  },
};

export { config };
export default config;