import React, { useState } from 'react';
import { 
  ExternalLink, 
  Key, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Copy
} from 'lucide-react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';

interface GoogleSheetsSetupProps {
  onClose: () => void;
}

const GoogleSheetsSetup: React.FC<GoogleSheetsSetupProps> = ({ onClose }) => {
  const { connect, isLoading, error, isConnected } = useGoogleSheets();
  const [step, setStep] = useState(1);

  // Close modal when successfully connected
  React.useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  const handleConnect = async () => {
    try {
      const success = await connect();
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

  // Check if environment variables are configured
  const hasEnvVars = !!(
    import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID &&
    import.meta.env.VITE_GOOGLE_SHEETS_SERVICE_EMAIL &&
    import.meta.env.VITE_GOOGLE_SHEETS_SERVICE_KEY
  );
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
          {/* Environment Variables Check */}
          {hasEnvVars ? (
            <div className="mb-6 p-4 bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-fergbutcher-green-600" />
                <div>
                  <p className="text-fergbutcher-green-800 font-medium">
                    Environment variables configured!
                  </p>
                  <p className="text-sm text-fergbutcher-green-700 mt-1">
                    Your Google Sheets credentials are set up in Netlify. Click connect to test the integration.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="bg-fergbutcher-green-600 text-white px-6 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Testing Connection...' : 'Test Connection'}
                </button>
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600" />
                <div>
                  <p className="text-fergbutcher-yellow-800 font-medium">
                    Environment variables not configured
                  </p>
                  <p className="text-sm text-fergbutcher-yellow-700 mt-1">
                    You need to set up Google Sheets credentials in your Netlify environment variables.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum 
                      ? 'bg-fergbutcher-green-600 text-white' 
                      : 'bg-fergbutcher-brown-200 text-fergbutcher-brown-600'
                  }`}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
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
                  Step 1: Create Service Account
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Create a Google Cloud service account for automatic Google Sheets access.
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
                        href="https://console.cloud.google.com" 
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
                    <span>Enable the <strong>Google Sheets API</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <span>Go to <strong>IAM & Admin → Service Accounts</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">5</span>
                    <span>Click <strong>"+ CREATE SERVICE ACCOUNT"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">6</span>
                    <span>Name it <strong>"fergbutcher-sheets"</strong> and create it</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">7</span>
                    <span>Click on the service account → <strong>Keys</strong> → <strong>Add Key</strong> → <strong>Create New Key</strong> → <strong>JSON</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">8</span>
                    <span>Download the JSON key file (keep it safe!)</span>
                  </li>
                </ol>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="bg-fergbutcher-green-600 text-white px-6 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
                >
                  Next: Create Spreadsheet
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <FileSpreadsheet className="h-16 w-16 text-fergbutcher-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-fergbutcher-black-900 mb-2">
                  Step 2: Create Your Spreadsheet
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Create a Google Spreadsheet and share it with your service account.
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
                    <span>Create a new blank spreadsheet</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span>Name it <strong>"Fergbutcher Orders"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <span>Copy the <strong>Spreadsheet ID</strong> from the URL</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">5</span>
                    <span>Click <strong>"Share"</strong> button</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">6</span>
                    <span>Add your service account email (from the JSON file) as an <strong>Editor</strong></span>
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
                  Next: Configure Netlify
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <Key className="h-16 w-16 text-fergbutcher-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-fergbutcher-black-900 mb-2">
                  Step 3: Configure Netlify Environment Variables
                </h4>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Add your Google Sheets credentials to Netlify environment variables.
                </p>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                <h5 className="font-semibold text-fergbutcher-black-900 mb-4">Instructions:</h5>
                <ol className="space-y-3 text-fergbutcher-brown-700">
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <span>Go to your Netlify dashboard → Site settings → Environment variables</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-fergbutcher-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>Add these environment variables:</span>
                  </li>
                </ol>
                
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-fergbutcher-brown-100 rounded">
                    <div className="flex items-center justify-between">
                      <code className="text-sm">VITE_GOOGLE_SHEETS_SPREADSHEET_ID</code>
                      <span className="text-xs text-fergbutcher-brown-600">Your spreadsheet ID</span>
                    </div>
                  </div>
                  <div className="p-3 bg-fergbutcher-brown-100 rounded">
                    <div className="flex items-center justify-between">
                      <code className="text-sm">VITE_GOOGLE_SHEETS_SERVICE_EMAIL</code>
                      <span className="text-xs text-fergbutcher-brown-600">client_email from JSON</span>
                    </div>
                  </div>
                  <div className="p-3 bg-fergbutcher-brown-100 rounded">
                    <div className="flex items-center justify-between">
                      <code className="text-sm">VITE_GOOGLE_SHEETS_SERVICE_KEY</code>
                      <span className="text-xs text-fergbutcher-brown-600">private_key from JSON</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-fergbutcher-yellow-800 font-medium">Important:</p>
                    <p className="text-sm text-fergbutcher-yellow-700 mt-1">
                      After adding environment variables, you need to redeploy your site for the changes to take effect.
                    </p>
                  </div>
                </div>
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
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsSetup;