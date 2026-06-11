import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  ShoppingCart,
  Calendar,
  Settings,
  ClipboardList,
  Menu,
  X
} from 'lucide-react';
import { ViewType } from '../types';

interface LayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onViewChange, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', shortLabel: 'Home', icon: Home },
    { id: 'checklist' as ViewType, label: "Today's Checklist", shortLabel: 'Checklist', icon: ClipboardList },
    { id: 'customers' as ViewType, label: 'Customers', shortLabel: 'Customers', icon: Users },
    { id: 'orders' as ViewType, label: 'Orders', shortLabel: 'Orders', icon: ShoppingCart },
    { id: 'calendar' as ViewType, label: 'Calendar', shortLabel: 'Calendar', icon: Calendar },
    { id: 'settings' as ViewType, label: 'Settings', shortLabel: 'Settings', icon: Settings },
  ];

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-fergbutcher-gold-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-fergbutcher-gold-400 flex-shrink-0 z-10">
        <div className="px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 lg:h-16">
            <div className="flex items-center space-x-3">
              {/* Hamburger — hidden on desktop */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-1 text-fergbutcher-green-600 hover:bg-fergbutcher-green-50 rounded-lg transition-colors"
                aria-label="Open navigation"
              >
                <Menu className="h-6 w-6" />
              </button>
              <img
                src="/2025_Fergbutcher_Logo_Pos_(1).jpg"
                alt="Fergbutcher Logo"
                className="h-8 lg:h-10 w-auto"
              />
              <p className="hidden sm:block text-sm text-fergbutcher-green-400 font-medium">Pre-Order Management</p>
            </div>
            <button
              onClick={onLogout}
              className="text-sm bg-fergbutcher-green-600 text-white px-3 py-2 lg:px-4 rounded-lg hover:bg-fergbutcher-green-700 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar backdrop — mobile only */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <nav
          className={`
            fixed inset-y-0 left-0 z-30 w-72 bg-fergbutcher-green-600 flex flex-col
            transform transition-transform duration-300 ease-in-out
            lg:relative lg:inset-y-auto lg:left-auto lg:translate-x-0 lg:w-64 lg:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Mobile sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 lg:hidden">
            <img
              src="/2025_Fergbutcher_Logo_Rev_Sand_(1).png"
              alt="Fergbutcher"
              className="h-12 w-auto"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop logo area */}
          <div className="hidden lg:flex p-6 border-b border-white/10 items-center justify-center">
            <img
              src="/2025_Fergbutcher_Logo_Rev_Sand_(1).png"
              alt="Fergbutcher"
              className="h-20 w-auto"
            />
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleViewChange(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all min-h-[48px] ${
                        isActive
                          ? 'bg-white/15 text-white border-l-4 border-fergbutcher-gold-400'
                          : 'text-white/70 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                      }`}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-fergbutcher-gold-400' : 'text-white/60'}`} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-white/40 text-center">Pre-Order Management</p>
          </div>
        </nav>

        {/* Main Content — pb-20 leaves space for bottom nav on mobile */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6 min-w-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation Bar — mobile/tablet only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-fergbutcher-green-600 border-t border-white/10 z-10">
        <div className="flex items-stretch">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-colors ${
                  isActive
                    ? 'text-fergbutcher-gold-400 bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5 flex-shrink-0" />
                <span className="text-[10px] font-medium leading-tight text-center">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
