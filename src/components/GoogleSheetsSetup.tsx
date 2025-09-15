import React, { useState } from 'react';
import { 
  ExternalLink, 
  Key, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { config } from '../config/environment';

interface GoogleSheetsSetupProps {
  onClose: () => void;
}

const GoogleSheetsSetup: React.FC<GoogleSheetsSetupProps> = ({ onClose }) => {
  const { connect, isLoading, error, isConnected } = useGoogleSheets();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    apiKey: config.googleSheets.apiKey || '',
    spreadsheetId: config.googleSheets.spreadsheetId || '',
    clientId: config.googleSheets.clientId || '',
    clientSecret: config.googleSheets.clientSecret || ''
  });
  const [showSecrets, setShowSecrets] = useState({
    apiKey: false,
    clientSecret: false
  });

  // Close modal when successfully connected
  React.useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  const handleConnect = async () => {
    try {
      const success = await connect(config);
      if (success) {
        // Connection successful, modal will close automatically via useEffect
        return;
      }
    } catch (err) {
      console.error('Connection failed:', err);
      // Error will be displayed via the error state from the hook
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900">Google Sheets Integration Setup</h3>
          <button
            onClick={onClose}
            className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum 
                      ? 'bg-fergbutcher-green-600 text-white' 
                      : 'bg-fergbutcher-brown-200 text-fergbutcher-brown-600'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 4 && (
                    <div className={`w-12 h-0.5 ${
                      step > stepNum ? 'bg-fergbutcher-green-600' : 'bg-fergbutcher-brown-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <FileSpreadsheet className="h-16 w-16 text-fergbutcher-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-fergbutcher-black-900 mb-2">
                  Step 1: Create Your Google Spreadsheet
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  First, we need to create a new Google Spreadsheet for your butcher shop data.
                </p>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                <h5 className="font-semibold text-fergbutcher-black-900 mb-4">Instructions:</h5>
                <ol className="space-y-3 text-fergbutcher-brown-700">
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <div>
                      <span>Go to </span>
                      <a 
                        href="https://sheets.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-fergbutcher-green-600 hover:text-fergbutcher-green-700 underline inline-flex items-center space-x-1"
                      >
                        <span>Google Sheets</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>Click <strong>"+ Blank"</strong> to create a new spreadsheet</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span>Rename it to <strong>"Fergbutcher Orders"</strong> (or any name you prefer)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <span>Copy the <strong>Spreadsheet ID</strong> from the URL (the long string between /d/ and /edit)</span>
                  </li>
                </ol>
              </div>

              <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-fergbutcher-yellow-800 font-medium">Example URL:</p>
                    <p className="text-sm text-fergbutcher-yellow-700 font-mono mt-1">
                      https://docs.google.com/spreadsheets/d/<span className="bg-fergbutcher-yellow-200 px-1 rounded">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</span>/edit
                    </p>
                    <p className="text-sm text-fergbutcher-yellow-700 mt-1">
                      The highlighted part is your Spreadsheet ID
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-fergbutcher-green-600 mt-0.5" />
                  <div>
                    <p className="text-fergbutcher-green-800 font-medium">Current Origin:</p>
                    <p className="text-sm text-fergbutcher-green-700 font-mono mt-1">
                      {window.location.origin}
                    </p>
                    <p className="text-sm text-fergbutcher-green-700 mt-1">
                      Make sure this exact URL is in your Google OAuth settings
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="bg-fergbutcher-green-600 text-white px-6 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
                >
                  Next: Enable Google Sheets API
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Key className="h-16 w-16 text-fergbutcher-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-fergbutcher-black-900 mb-2">
                  Step 2: Enable Google Sheets API
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Enable the Google Sheets API and create credentials for your application.
                </p>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                <h5 className="font-semibold text-fergbutcher-black-900 mb-4">Instructions:</h5>
                <ol className="space-y-3 text-fergbutcher-brown-700">
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <div>
                      <span>Go to the </span>
                      <a 
                        href="https://console.cloud.google.com/apis/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-fergbutcher-green-600 hover:text-fergbutcher-green-700 underline inline-flex items-center space-x-1"
                      >
                        <span>Google Cloud Console</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>Create a new project or select an existing one</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span>Click <strong>"+ ENABLE APIS AND SERVICES"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <span>Search for <strong>"Google Sheets API"</strong> and enable it</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">5</span>
                    <span>Go to <strong>"Credentials"</strong> in the left sidebar</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">6</span>
                    <span>Click <strong>"+ CREATE CREDENTIALS"</strong> → <strong>"API Key"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">7</span>
                    <span>Copy the API Key (keep it safe!)</span>
                  </li>
                </ol>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-6 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-fergbutcher-green-600 text-white px-6 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
                >
                  Next: Create OAuth Credentials
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-fergbutcher-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-fergbutcher-black-900 mb-2">
                  Step 3: Create OAuth Credentials
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Create OAuth 2.0 credentials to allow secure access to your spreadsheet.
                </p>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                <h5 className="font-semibold text-fergbutcher-black-900 mb-4">Instructions:</h5>
                <ol className="space-y-3 text-fergbutcher-brown-700">
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <span>In Google Cloud Console, go to <strong>"Credentials"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>Click <strong>"+ CREATE CREDENTIALS"</strong> → <strong>"OAuth client ID"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span>Choose <strong>"Web application"</strong> as the application type</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <div>
                      <span>Add this URL to <strong>"Authorized redirect URIs"</strong>:</span>
                      <div className="mt-2 p-2 bg-fergbutcher-brown-100 rounded font-mono text-sm flex items-center justify-between">
                        <span>{window.location.origin}</span>
                        <button
                          onClick={() => copyToClipboard(window.location.origin)}
                          className="text-fergbutcher-green-600 hover:text-fergbutcher-green-700"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-fergbutcher-brown-600">
                        <strong>Important:</strong> Use the exact URL above as your redirect URI in Google Cloud Console.
                      </div>
                      <div className="mt-2 p-2 bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded text-xs">
                        <strong>Development Note:</strong> This WebContainer URL is temporary and will change when you restart. 
                        For production, you'll need to use your actual domain (e.g., https://yourdomain.com).
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">5</span>
                    <span>Click <strong>"CREATE"</strong> and copy both the <strong>Client ID</strong> and <strong>Client Secret</strong></span>
                  </li>
                </ol>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-6 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="bg-fergbutcher-green-600 text-white px-6 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
                >
                  Next: Enter Credentials
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <Key className="h-16 w-16 text-fergbutcher-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-fergbutcher-black-900 mb-2">
                  Step 4: Enter Your Credentials
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Enter the credentials you obtained from Google Cloud Console.
                </p>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                {(config.googleSheets.apiKey && config.googleSheets.clientId && config.googleSheets.clientSecret && config.googleSheets.spreadsheetId) ? (
                  <div className="mb-6 p-4 bg-fergbutcher-green-100 border border-fergbutcher-green-300 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-fergbutcher-green-600" />
                      <p className="text-fergbutcher-green-800 font-medium">
                        Environment variables detected! Your credentials are pre-filled from Netlify.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600" />
                      <p className="text-fergbutcher-yellow-800 font-medium">
                        No environment variables found. You'll need to enter credentials manually or set them up in Netlify.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
                    Spreadsheet ID *
                  </label>
                  <input
                    type="text"
                    value={config.spreadsheetId}
                    onChange={(e) => setConfig(prev => ({ ...prev, spreadsheetId: e.target.value }))}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
                    API Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.apiKey ? "text" : "password"}
                      value={config.apiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="AIzaSyD..."
                      className="w-full px-3 py-2 pr-10 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(prev => ({ ...prev, apiKey: !prev.apiKey }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
                    >
                      {showSecrets.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={config.clientId}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="123456789-abc123.apps.googleusercontent.com"
                    className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
                    Client Secret *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.clientSecret ? "text" : "password"}
                      value={config.clientSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder="GOCSPX-..."
                      className="w-full px-3 py-2 pr-10 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(prev => ({ ...prev, clientSecret: !prev.clientSecret }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
                    >
                      {showSecrets.clientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-red-700 font-medium">Connection Error</p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>
                      {error.includes('redirect_uri_mismatch') && (
                        <div className="mt-3 p-3 bg-red-100 rounded text-sm">
                          <p className="font-medium text-red-800">Redirect URI Mismatch Fix:</p>
                          <ol className="mt-2 space-y-1 text-red-700">
                            <li>1. Go to Google Cloud Console → Credentials</li>
                            <li>2. Edit your OAuth 2.0 Client ID</li>
                            <li>3. Add this exact URL to "Authorized redirect URIs":</li>
                            <li className="font-mono bg-red-200 p-1 rounded">
                              {window.location.origin}
                            </li>
                            <li>4. Save and try connecting again</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-6 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isLoading || !config.spreadsheetId || !config.apiKey || !config.clientId || !config.clientSecret}
                  className="bg-fergbutcher-green-600 text-white px-6 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Connecting...' : 'Connect to Google Sheets'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsSetup;