import React from 'react';
import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import { ToastContainer } from './components/Toast';
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
import TodayChecklist from './components/TodayChecklist';
import { ViewType } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string | undefined>(undefined);
  const [ordersCollectionDate, setOrdersCollectionDate] = useState<string | undefined>(undefined);
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

    return () => {
      backupService.cleanup();
    };
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('fergbutcher_authenticated', 'true');
    errorLogger.info('User logged in');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('fergbutcher_authenticated');
    errorLogger.info('User logged out');
  };

  // Handle URL hash navigation
  useEffect(() => {
    const validViews: ViewType[] = ['dashboard', 'checklist', 'customers', 'orders', 'calendar', 'settings'];
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1) as ViewType;
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    window.location.hash = view;
    if (view !== 'orders') {
      setOrdersStatusFilter(undefined);
      setOrdersCollectionDate(undefined);
    }
  };

  const handleNavigateToOrders = (statusFilter?: string, collectionDate?: string) => {
    setOrdersStatusFilter(statusFilter);
    setOrdersCollectionDate(collectionDate);
    setCurrentView('orders');
    window.location.hash = 'orders';
  };

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLogin} />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleViewChange} onNavigateToOrders={handleNavigateToOrders} />;
      case 'checklist':
        return <TodayChecklist />;
      case 'customers':
        return <Customers />;
      case 'orders':
        return <Orders initialStatusFilter={ordersStatusFilter} initialCollectionDate={ordersCollectionDate} />;
      case 'calendar':
        return <CalendarView />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleViewChange} onNavigateToOrders={handleNavigateToOrders} />;
    }
  };

  return (
    <>
      <ToastContainer />
      <Layout currentView={currentView} onViewChange={handleViewChange} onLogout={handleLogout}>
        {renderCurrentView()}
      </Layout>

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
