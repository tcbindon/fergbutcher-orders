import React from 'react';
import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import keyboardShortcuts from './services/keyboardShortcuts';
import { useUndo } from './hooks/useUndo';
import UndoNotification from './components/UndoNotification';
import backupService from './services/backupService';
import errorLogger from './services/errorLogger';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Orders from './components/Orders';
import CalendarView from './components/CalendarView';
import Settings from './components/Settings';
import { ViewType } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { 
    showUndoNotification, 
    lastAction, 
    performUndo, 
    hideUndoNotification 
  } = useUndo();

  // Check authentication status on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('fergbutcher_authenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // Initialize services
  useEffect(() => {
    errorLogger.info('Application started');
    
    // Register keyboard shortcuts
    keyboardShortcuts.register({
      key: 'n',
      ctrlKey: true,
      description: 'Create new order',
      action: () => {
        setCurrentView('orders');
        // Trigger new order creation - this would need to be passed down to Orders component
        errorLogger.debug('Keyboard shortcut: New order');
      }
    });

    keyboardShortcuts.register({
      key: 'c',
      ctrlKey: true,
      description: 'Go to customers',
      action: () => {
        setCurrentView('customers');
        errorLogger.debug('Keyboard shortcut: Go to customers');
      }
    });

    keyboardShortcuts.register({
      key: 'o',
      ctrlKey: true,
      description: 'Go to orders',
      action: () => {
        setCurrentView('orders');
        errorLogger.debug('Keyboard shortcut: Go to orders');
      }
    });

    keyboardShortcuts.register({
      key: 'd',
      ctrlKey: true,
      description: 'Go to dashboard',
      action: () => {
        setCurrentView('dashboard');
        errorLogger.debug('Keyboard shortcut: Go to dashboard');
      }
    });

    keyboardShortcuts.register({
      key: 'k',
      ctrlKey: true,
      description: 'Go to calendar',
      action: () => {
        setCurrentView('calendar');
        errorLogger.debug('Keyboard shortcut: Go to calendar');
      }
    });

    keyboardShortcuts.register({
      key: 'z',
      ctrlKey: true,
      description: 'Undo last action',
      action: () => {
        const success = performUndo();
        if (success) {
          errorLogger.debug('Keyboard shortcut: Undo performed');
        }
      }
    });

    // Cleanup function
    return () => {
      keyboardShortcuts.cleanup();
      backupService.cleanup();
    };
  }, [performUndo]);

  // Handle login
  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('fergbutcher_authenticated', 'true');
    errorLogger.info('User logged in');
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('fergbutcher_authenticated');
    errorLogger.info('User logged out');
  };

  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1) as ViewType;
      if (['dashboard', 'customers', 'orders', 'calendar', 'settings'].includes(hash)) {
        setCurrentView(hash);
      }
    };

    // Set initial view from hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when view changes
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    window.location.hash = view;
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLogin} />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'orders':
        return <Orders />;
      case 'calendar':
        return <CalendarView />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <Layout currentView={currentView} onViewChange={handleViewChange} onLogout={handleLogout}>
        {renderCurrentView()}
      </Layout>
      
      {/* Undo Notification */}
      <UndoNotification
        show={showUndoNotification}
        actionDescription={lastAction?.description || ''}
        onUndo={performUndo}
        onDismiss={hideUndoNotification}
      />
    </>
  );
}

export default App;
