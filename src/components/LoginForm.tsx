import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ChevronDown } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (staffName: string) => void;
}

const DEFAULT_STAFF_NAMES = ['Sarah', 'James', 'Tom', 'Emma', 'Liam'];

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'credentials' | 'identity'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaffName, setSelectedStaffName] = useState('');

  const staffNames: string[] = JSON.parse(
    localStorage.getItem('fergbutcher_staff_members') || JSON.stringify(DEFAULT_STAFF_NAMES)
  );

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    if (username === 'staff' && password === 'staff') {
      setStep('identity');
    } else {
      setError('Invalid username or password');
    }

    setIsLoading(false);
  };

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffName) {
      setError('Please select your name');
      return;
    }
    onLoginSuccess(selectedStaffName);
  };

  return (
    <div className="min-h-screen bg-fergbutcher-green-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-lg border border-fergbutcher-brown-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img
                src="/Fergbutcher_vector-01.png"
                alt="Fergbutcher Logo"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-fergbutcher-black-900">Fergbutcher</h1>
                <p className="text-fergbutcher-brown-600">Pre-Order Management</p>
              </div>
            </div>
            {step === 'credentials' ? (
              <>
                <h2 className="text-xl font-semibold text-fergbutcher-black-900">Staff Login</h2>
                <p className="text-fergbutcher-brown-600 text-sm mt-2">
                  Please sign in to access the order management system
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-fergbutcher-black-900">Who are you today?</h2>
                <p className="text-fergbutcher-brown-600 text-sm mt-2">
                  Select your name so your comments and notes are identified correctly
                </p>
              </>
            )}
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-fergbutcher-brown-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                    placeholder="Enter username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-fergbutcher-brown-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                    placeholder="Enter password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-fergbutcher-green-600 text-white py-3 px-4 rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleIdentitySubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {staffNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedStaffName(name);
                      setError('');
                    }}
                    className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors text-left ${
                      selectedStaffName === name
                        ? 'border-fergbutcher-green-500 bg-fergbutcher-green-50 text-fergbutcher-green-700'
                        : 'border-fergbutcher-brown-200 text-fergbutcher-black-700 hover:border-fergbutcher-green-300 hover:bg-fergbutcher-green-50'
                    }`}
                  >
                    <User className="h-4 w-4 inline-block mr-2 opacity-60" />
                    {name}
                  </button>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-fergbutcher-green-600 text-white py-3 px-4 rounded-lg hover:bg-fergbutcher-green-700 transition-colors font-medium disabled:opacity-50"
                disabled={!selectedStaffName}
              >
                Continue as {selectedStaffName || '...'}
              </button>

              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full text-sm text-fergbutcher-brown-500 hover:text-fergbutcher-brown-700"
              >
                Back to login
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-fergbutcher-brown-500">
              Fergbutcher Pre-Order Management System v1.0.0-beta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
