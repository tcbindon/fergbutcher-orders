// Environment configuration for production deployment
interface EnvironmentConfig {
  googleSheets: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
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

// Default configuration
const defaultConfig: EnvironmentConfig = {
  googleSheets: {
    apiKey: '',
    clientId: '',
    clientSecret: '',
  },
  app: {
    version: '1.0.0-beta',
    environment: (import.meta.env.MODE as 'development' | 'production') || 'development',
    logLevel: import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' || 'info',
  },
  features: {
    autoBackup: import.meta.env.VITE_ENABLE_AUTO_BACKUP !== 'false',
    googleSheetsSync: true,
    errorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  },
};


export const config = defaultConfig;
export default config;