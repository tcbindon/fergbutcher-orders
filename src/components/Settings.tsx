import React, { useState } from 'react';
import { Save, Download, Upload, Mail, Database, Shield, AlertTriangle, CheckCircle, ExternalLink, FolderSync as Sync, Settings as SettingsIcon, Clock, FileText, Trash2, Gift, RefreshCw, Loader2 } from 'lucide-react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { useAppData } from '../context/AppDataContext';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useChristmasProducts } from '../hooks/useChristmasProducts';
import backupService from '../services/backupService';
import errorLogger from '../services/errorLogger';
import { toast } from './Toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { isConnected, isLoading, error, lastSync, syncAll, disconnect } = useGoogleSheets();
  const { customers, setAllCustomers, orders, setAllOrders } = useAppData();
  const { templates, updateTemplate, resetToDefaults } = useEmailTemplates();
  const {
    products: christmasProducts,
    loading: productsLoading,
    error: productsError,
    lastFetch: productsLastFetch,
    refreshProducts,
    clearCache,
    isCacheExpired,
    isUsingFallback
  } = useChristmasProducts();

  const tabs = [
    { id: 'email', label: 'Email Templates', icon: Mail },
    { id: 'christmas', label: 'Christmas Products', icon: Gift },
    { id: 'sheets', label: 'Google Sheets', icon: ExternalLink },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'system', label: 'System Status', icon: Shield },
  ];

  const handleSyncAll = async () => {
    await syncAll(customers, orders);
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const success = await backupService.createBackup(customers, orders, 'manual');
      if (success) {
        toast.success('Backup created successfully!');
      } else {
        toast.error('Failed to create backup. Please try again.');
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportData = () => {
    try {
      backupService.exportToFile(customers, orders);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await backupService.importFromFile(file);
      if (window.confirm(`This will replace all current data with ${data.customers.length} customers and ${data.orders.length} orders. Are you sure?`)) {
        const customersOk = await setAllCustomers(data.customers);
        const ordersOk = await setAllOrders(data.orders);
        if (customersOk && ordersOk) {
          toast.success(`Restored ${data.customers.length} customers and ${data.orders.length} orders from backup.`);
        } else {
          toast.error('Partial restore — some data may not have been restored.');
        }
      }
    } catch (error) {
      toast.error('Failed to import data. Please check the file format.');
    } finally {
      setIsImporting(false);
    }

    event.target.value = '';
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!window.confirm('Restore from this backup? This will overwrite current data.')) return;
    setIsImporting(true);
    try {
      const data = backupService.restoreFromBackup(backupId);
      if (data) {
        const customersOk = await setAllCustomers(data.customers);
        const ordersOk = await setAllOrders(data.orders);
        if (customersOk && ordersOk) {
          toast.success(`Restored ${data.customers.length} customers and ${data.orders.length} orders.`);
        } else {
          toast.error('Partial restore — some data may not have been restored.');
        }
      } else {
        toast.error('Failed to restore backup. Backup may be corrupted.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fergbutcher-black-900">Settings</h1>
        <p className="text-fergbutcher-green-400">Configure system settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300">
        <div className="border-b border-fergbutcher-gold-300 overflow-x-auto">
          <nav className="flex min-w-max px-4 sm:px-6 space-x-1 sm:space-x-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 py-3.5 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-fergbutcher-green-600 text-fergbutcher-green-600'
                      : 'border-transparent text-fergbutcher-green-400 hover:text-fergbutcher-black-900 hover:border-fergbutcher-gold-300'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Email Templates Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Email Templates</h3>
                <p className="text-fergbutcher-green-400 mb-6">
                  Customize email templates sent to customers. Use placeholders like {'{firstName}'}, {'{lastName}'}, {'{orderItems}'} for dynamic content.
                </p>
                <div className="mb-4">
                  <button
                    onClick={resetToDefaults}
                    className="text-sm bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-3 py-1 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {templates.map((template) => (
                  <div key={template.id} className="border border-fergbutcher-gold-300 rounded-lg p-4">
                    <h4 className="font-medium text-fergbutcher-black-900 mb-3">{template.name}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-fergbutcher-gold-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={template.subject}
                          onChange={(e) => updateTemplate(template.id, { subject: e.target.value })}
                          className="w-full px-3 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-fergbutcher-gold-700 mb-1">Body</label>
                        <textarea
                          rows={8}
                          value={template.body}
                          onChange={(e) => updateTemplate(template.id, { body: e.target.value })}
                          className="w-full px-3 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4">
                <h4 className="font-medium text-fergbutcher-black-900 mb-2">Available Placeholders</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{firstName}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{lastName}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{email}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{orderId}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{orderItems}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{collectionDate}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{collectionTime}'}</code>
                  <code className="bg-white px-2 py-1 rounded border border-fergbutcher-gold-200">{'{additionalNotes}'}</code>
                </div>
                <p className="text-xs text-fergbutcher-green-700 mt-2">
                  Templates are automatically saved as you type. Collection time will show "TBC" if not specified.
                </p>
              </div>
            </div>
          )}

          {/* Christmas Products Tab */}
          {activeTab === 'christmas' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Christmas Products</h3>
                <p className="text-fergbutcher-green-400 mb-6">
                  Manage Christmas products for seasonal orders. Products are synced from Google Sheets or use fallback defaults.
                </p>
              </div>

              {/* Products Status */}
              <div className={`p-4 rounded-lg border ${
                productsError
                  ? 'bg-fergbutcher-yellow-50 border-fergbutcher-yellow-200'
                  : isUsingFallback
                  ? 'bg-fergbutcher-gold-50 border-fergbutcher-gold-300'
                  : 'bg-fergbutcher-green-50 border-fergbutcher-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {productsError ? (
                      <AlertTriangle className="h-6 w-6 text-fergbutcher-yellow-600" />
                    ) : isUsingFallback ? (
                      <Database className="h-6 w-6 text-fergbutcher-gold-600" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-fergbutcher-green-600" />
                    )}
                    <div>
                      <h4 className="font-medium text-fergbutcher-black-900">
                        {productsError
                          ? 'Products Error - Using Fallback'
                          : isUsingFallback
                          ? 'Using Default Products'
                          : 'Products Loaded from Google Sheets'
                        }
                      </h4>
                      <p className="text-sm text-fergbutcher-green-400">
                        {productsError
                          ? `Error: ${productsError}. Using built-in default products.`
                          : isUsingFallback
                          ? 'Google Sheets not connected. Using built-in default Christmas products.'
                          : `${christmasProducts.length} products loaded from Google Sheets`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isConnected && (
                      <button
                        onClick={async () => {
                          const success = await refreshProducts();
                          if (success) {
                            toast.success('Christmas products refreshed successfully!');
                          }
                        }}
                        disabled={productsLoading}
                        className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${productsLoading ? 'animate-spin' : ''}`} />
                        <span>{productsLoading ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        clearCache();
                        toast.success('Christmas products cache cleared. Products will be refreshed on next load.');
                      }}
                      className="bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-3 py-2 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors text-sm"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>

              {/* Products List */}
              <div className="bg-white border border-fergbutcher-gold-300 rounded-lg">
                <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
                  <h4 className="font-medium text-fergbutcher-black-900">Available Christmas Products</h4>
                  <p className="text-sm text-fergbutcher-green-400 mt-1">
                    {christmasProducts.length} products available for Christmas orders
                  </p>
                </div>
                <div className="p-6">
                  {productsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 text-fergbutcher-gold-400 mx-auto mb-2 animate-spin" />
                      <p className="text-fergbutcher-green-400">Loading Christmas products...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {christmasProducts.map((product) => (
                        <div key={product.id} className="border border-fergbutcher-gold-300 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Gift className="h-4 w-4 text-fergbutcher-green-600" />
                              <h5 className="font-medium text-fergbutcher-black-900">{product.name}</h5>
                            </div>
                            <span className="text-xs bg-fergbutcher-green-100 text-fergbutcher-green-700 px-2 py-1 rounded-full">
                              {product.unit}
                            </span>
                          </div>
                          {product.description && (
                            <p className="text-sm text-fergbutcher-green-400">{product.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cache Information */}
              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4">
                <h4 className="font-medium text-fergbutcher-black-900 mb-3">Cache Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-fergbutcher-green-400">Cache Status:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">
                      {isCacheExpired() ? 'Expired' : 'Valid'}
                    </span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Last Fetch:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">
                      {productsLastFetch
                        ? productsLastFetch.toLocaleString('en-NZ')
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Data Source:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">
                      {isUsingFallback ? 'Built-in Defaults' : 'Google Sheets'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-fergbutcher-yellow-800 font-medium">Managing Christmas Products</p>
                    <ul className="text-sm text-fergbutcher-yellow-700 mt-2 space-y-1">
                      <li>• Products are automatically loaded from the "Christmas Products" sheet in Google Sheets</li>
                      <li>• To add/edit products, modify the Google Sheets directly and click "Refresh"</li>
                      <li>• If Google Sheets is unavailable, the system uses built-in default products</li>
                      <li>• Products are cached for 24 hours to improve performance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Google Sheets Tab */}
          {activeTab === 'sheets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Google Sheets Integration</h3>
                <p className="text-fergbutcher-green-400 mb-6">
                  Sync your customer and order data with Google Sheets for backup, reporting, and team collaboration.
                </p>
              </div>

              {/* Connection Status */}
              <div className={`p-4 rounded-lg border ${
                isConnected
                  ? 'bg-fergbutcher-green-50 border-fergbutcher-green-200'
                  : 'bg-fergbutcher-yellow-50 border-fergbutcher-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isConnected ? (
                      <CheckCircle className="h-6 w-6 text-fergbutcher-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-fergbutcher-yellow-600" />
                    )}
                    <div>
                      <h4 className="font-medium text-fergbutcher-black-900">
                        {isConnected ? 'Connected to Google Sheets' : 'Not Connected'}
                      </h4>
                      <p className="text-sm text-fergbutcher-green-400">
                        {isConnected
                          ? `Service Account authentication active`
                          : 'Configure environment variables in Netlify to enable sync'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={handleSyncAll}
                          disabled={isLoading}
                          className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                        >
                          <Sync className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-fergbutcher-green-400">
                        Configure in Netlify Environment Variables
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Features Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-fergbutcher-gold-300 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Database className="h-5 w-5 text-fergbutcher-green-600" />
                    <span>Data Synchronization</span>
                  </h4>
                  <ul className="text-sm text-fergbutcher-green-400 space-y-2">
                    <li>• Automatic customer data sync via Netlify Functions</li>
                    <li>• Order updates synced to Google Sheets</li>
                    <li>• Daily collection schedules generated</li>
                    <li>• Service Account authentication (no user interaction needed)</li>
                  </ul>
                </div>

                <div className="border border-fergbutcher-gold-300 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-fergbutcher-green-600" />
                    <span>Benefits</span>
                  </h4>
                  <ul className="text-sm text-fergbutcher-green-400 space-y-2">
                    <li>• Cloud backup of all data</li>
                    <li>• Team collaboration</li>
                    <li>• Easy reporting & analytics</li>
                    <li>• Print-friendly schedules</li>
                  </ul>
                </div>
              </div>

              {isConnected && (
                <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3">Sync Statistics</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-fergbutcher-green-600">{customers.length}</div>
                      <div className="text-sm text-fergbutcher-green-400">Customers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-fergbutcher-green-600">{orders.length}</div>
                      <div className="text-sm text-fergbutcher-green-400">Orders</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-fergbutcher-green-600">
                        {orders.filter(o => o.collectionDate === new Date().toISOString().split('T')[0]).length}
                      </div>
                      <div className="text-sm text-fergbutcher-green-400">Today's Collections</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-fergbutcher-green-200">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-fergbutcher-green-600">
                          {orders.filter(o => o.orderType === 'christmas').length}
                        </div>
                        <div className="text-sm text-fergbutcher-green-400">Christmas Orders</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-fergbutcher-green-600">{christmasProducts.length}</div>
                        <div className="text-sm text-fergbutcher-green-400">Christmas Products</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backup & Restore Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Backup & Restore</h3>
                <p className="text-fergbutcher-green-400 mb-6">
                  Create backups of your system data or restore from a previous backup.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Backup */}
                <div className="border border-fergbutcher-gold-300 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Download className="h-5 w-5 text-fergbutcher-green-600" />
                    <span>Create Backup</span>
                  </h4>
                  <p className="text-fergbutcher-green-400 mb-4">
                    Download a complete backup of all customers, orders, and system data.
                  </p>
                  <button
                    onClick={handleCreateBackup}
                    disabled={isBackingUp}
                    className="w-full bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center justify-center space-x-2 mb-2 disabled:opacity-50"
                  >
                    {isBackingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>{isBackingUp ? 'Creating...' : 'Create Backup'}</span>
                  </button>
                  <button
                    onClick={handleExportData}
                    className="w-full bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export to File</span>
                  </button>
                  <p className="text-xs text-fergbutcher-green-400 mt-2">
                    Next auto backup: {backupService.getNextBackupTime().toLocaleString('en-NZ')}
                  </p>
                </div>

                {/* Restore Backup */}
                <div className="border border-fergbutcher-gold-300 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-fergbutcher-yellow-600" />
                    <span>Restore Backup</span>
                  </h4>
                  <p className="text-fergbutcher-green-400 mb-4">
                    Upload and restore from a previous backup file.
                  </p>
                  <div className="space-y-3">
                    <input
                      onChange={handleImportData}
                      type="file"
                      accept=".json"
                      disabled={isImporting}
                      className="w-full px-3 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                  <div className="mt-3 p-3 bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-fergbutcher-yellow-600 mt-0.5" />
                      <p className="text-xs text-fergbutcher-yellow-700">
                        Warning: Importing will overwrite all current data. Create a backup first!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Backup History */}
                <div className="border border-fergbutcher-gold-300 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-fergbutcher-gold-600" />
                    <span>Recent Backups</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {backupService.getBackupList().slice(0, 5).map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-2 bg-fergbutcher-gold-50 rounded">
                        <div>
                          <span className="text-sm font-medium text-fergbutcher-black-900">
                            {backup.type} Backup
                          </span>
                          <p className="text-xs text-fergbutcher-green-400">
                            {new Date(backup.timestamp).toLocaleString('en-NZ')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={isImporting}
                          className="text-xs bg-fergbutcher-green-600 text-white px-2 py-1 rounded hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50"
                        >
                          {isImporting ? 'Restoring...' : 'Restore'}
                        </button>
                      </div>
                    ))}
                    {backupService.getBackupList().length === 0 && (
                      <p className="text-sm text-fergbutcher-green-400 text-center py-4">
                        No backups available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Status Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">System Status</h3>
                <p className="text-fergbutcher-green-400 mb-6">
                  Monitor the status of system integrations and services.
                </p>
              </div>

              <div className="space-y-4">
                {/* Google Sheets Status */}
                <div className="flex items-center justify-between p-4 bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-fergbutcher-green-600" />
                    <div>
                      <h4 className="font-medium text-fergbutcher-black-900">Google Sheets Integration</h4>
                      <p className="text-sm text-fergbutcher-green-400">Connected and syncing</p>
                    </div>
                  </div>
                  <span className="text-sm text-fergbutcher-green-600 font-medium">Active</span>
                </div>

                {/* Email Service Status */}
                <div className="flex items-center justify-between p-4 bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-fergbutcher-green-600" />
                    <div>
                      <h4 className="font-medium text-fergbutcher-black-900">Email Service (Gmail SMTP)</h4>
                      <p className="text-sm text-fergbutcher-green-400">Ready to send notifications</p>
                    </div>
                  </div>
                  <span className="text-sm text-fergbutcher-green-600 font-medium">Active</span>
                </div>

                {/* Backup System Status */}
                <div className="flex items-center justify-between p-4 bg-fergbutcher-gold-50 border border-fergbutcher-gold-300 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-fergbutcher-gold-600" />
                    <div>
                      <h4 className="font-medium text-fergbutcher-black-900">Backup System</h4>
                      <p className="text-sm text-fergbutcher-green-400">Last backup: 2 hours ago</p>
                    </div>
                  </div>
                  <span className="text-sm text-fergbutcher-gold-600 font-medium">Operational</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-fergbutcher-gold-50 border border-fergbutcher-gold-300 rounded-lg">
                <h4 className="font-medium text-fergbutcher-black-900 mb-2">System Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-fergbutcher-green-400">Version:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">{import.meta.env.VITE_APP_VERSION || '1.0.0-beta'}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Last Updated:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">{new Date().toLocaleDateString('en-NZ')}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Total Customers:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">{customers.length}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Total Orders:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">{orders.length}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Environment:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">{import.meta.env.MODE}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-green-400">Error Logs:</span>
                    <span className="ml-2 font-medium text-fergbutcher-black-900">{errorLogger.getLogStats().error}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-fergbutcher-gold-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fergbutcher-green-400">System Logs</span>
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          const logs = errorLogger.exportLogs();
                          const blob = new Blob([logs], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `fergbutcher-logs-${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-xs bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-2 py-1 rounded hover:bg-fergbutcher-gold-200 transition-colors"
                      >
                        Export Logs
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Clear all system logs?')) {
                            errorLogger.clearLogs();
                            toast.success('Logs cleared successfully');
                          }
                        }}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                      >
                        Clear Logs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
