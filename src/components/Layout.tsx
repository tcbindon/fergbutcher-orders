import React from 'react';
import { 
  Home, 
  Users, 
  ShoppingCart, 
  Calendar, 
  Settings
} from 'lucide-react';
import { ViewType } from '../types';

interface LayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onViewChange, children }) => {
  const navigationItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
    { id: 'customers' as ViewType, label: 'Customers', icon: Users },
    { id: 'orders' as ViewType, label: 'Orders', icon: ShoppingCart },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'settings' as ViewType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-fergbutcher-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-fergbutcher-brown-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/Fergbutcher_vector-01.png" 
                alt="Fergbutcher Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-fergbutcher-black-900">Fergbutcher</h1>
                <p className="text-sm text-fergbutcher-brown-600">Pre-Order Management</p>
              </div>
            </div>
            <div className="text-sm text-fergbutcher-brown-600">
              Welcome back, Team
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen border-r border-fergbutcher-brown-200">
          <div className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onViewChange(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-fergbutcher-green-50 text-fergbutcher-green-700 border border-fergbutcher-green-200'
                          : 'text-fergbutcher-black-700 hover:bg-fergbutcher-green-50 hover:text-fergbutcher-black-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-fergbutcher-green-600' : 'text-fergbutcher-brown-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;