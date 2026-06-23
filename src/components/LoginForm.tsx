import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (username === 'staff' && password === 'staff') {
      onLoginSuccess();
    } else {
      setError('Invalid username or password');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-fergbutcher-gold-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-lg border border-fergbutcher-gold-300 p-8">
          <div className="text-center mb-8">
            <img
              src="/2025_Fergbutcher_Logo_Pos_(1).jpg"
              alt="Fergbutcher Logo"
              className="h-24 w-auto mx-auto mb-4"
            />
            <h2 className="text-xl font-semibold text-fergbutcher-black-900">Staff Login</h2>
            <p className="text-fergbutcher-green-400 text-sm mt-1">
              Pre-Order Management System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-fergbutcher-black-900 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-fergbutcher-gold-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
                  placeholder="Enter username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fergbutcher-black-900 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-fergbutcher-gold-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
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
                    <EyeOff className="h-5 w-5 text-fergbutcher-gold-500 hover:text-fergbutcher-gold-700" />
                  ) : (
                    <Eye className="h-5 w-5 text-fergbutcher-gold-500 hover:text-fergbutcher-gold-700" />
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

          <div className="mt-8 text-center">
            <p className="text-xs text-fergbutcher-gold-600">
              Arrowtown · New Zealand
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
