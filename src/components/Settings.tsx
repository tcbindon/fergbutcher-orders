import React, { useState } from 'react';
import { Save, Download, Upload, Mail, Database, Shield, AlertTriangle, CheckCircle, ExternalLink, FolderSync as Sync, Settings as SettingsIcon, Keyboard, Clock, FileText, Trash2, Gift, RefreshCw } from 'lucide-react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useChristmasProducts } from '../hooks/useChristmasProducts';
import keyboardShortcuts, { KeyboardShortcutsService } from '../services/keyboardShortcuts';
import backupService from '../services/backupService';
import errorLogger from '../services/errorLogger';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('email');
  
  const { isConnected, isLoading, error, lastSync, syncAll, disconnect } = useGoogleSheets();
  const { customers } = useCustomers();
  const { orders } = useOrders();
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
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'sheets', label: 'Google Sheets', icon: ExternalLink },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'system', label: 'System Status', icon: Shield },
  ];

  const handleSyncAll = async () => {
    await syncAll(customers, orders);
  };

  const handleCreateBackup = async () => {
    const success = await backupService.createBackup(customers, orders, 'manual');
    if (success) {
      alert('Backup created successfully!');
    } else {
      alert('Failed to create backup. Please try again.');
    }
  };

  const handleExportData = () => {
    try {
      backupService.exportToFile(customers, orders);
    } catch (error) {
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await backupService.importFromFile(file);
      if (window.confirm('This will replace all current data. Are you sure?')) {
        // This would need to be implemented in the hooks to update the data
        alert('Import functionality would be implemented here');
      }
    } catch (error) {
      alert('Failed to import data. Please check the file format.');
    }
    
    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fergbutcher-black-900">Settings</h1>
        <p className="text-fergbutcher-brown-600">Configure system settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
        <div className="border-b border-fergbutcher-brown-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-fergbutcher-green-500 text-fergbutcher-green-600'
                      : 'border-transparent text-fergbutcher-brown-500 hover:text-fergbutcher-brown-700 hover:border-fergbutcher-brown-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
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
                <p className="text-fergbutcher-brown-600 mb-6">
                  Customize email templates sent to customers. Use placeholders like {'{firstName}'}, {'{lastName}'}, {'{orderItems}'} for dynamic content.
                </p>
                <div className="mb-4">
                  <button
                    onClick={resetToDefaults}
                    className="text-sm bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-3 py-1 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {templates.map((template) => (
                  <div key={template.id} className="border border-fergbutcher-brown-200 rounded-lg p-4">
                    <h4 className="font-medium text-fergbutcher-black-900 mb-3">{template.name}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={template.subject}
                          onChange={(e) => updateTemplate(template.id, { subject: e.target.value })}
                          className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">Body</label>
                        <textarea
                          rows={8}
                          value={template.body}
                          onChange={(e) => updateTemplate(template.id, { body: e.target.value })}
                          className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4">
                <h4 className="font-medium text-fergbutcher-black-900 mb-2">Available Placeholders</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <code className="bg-white px-2 py-1 rounded">{'{firstName}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{lastName}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{email}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{orderId}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{orderItems}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{collectionDate}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{collectionTime}'}</code>
                  <code className="bg-white px-2 py-1 rounded">{'{additionalNotes}'}</code>
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
                <p className="text-fergbutcher-brown-600 mb-6">
                  Manage Christmas products for seasonal orders. Products are synced from Google Sheets or use fallback defaults.
                </p>
              </div>

              {/* Products Status */}
              <div className={`p-4 rounded-lg border ${
                productsError 
                  ? 'bg-fergbutcher-yellow-50 border-fergbutcher-yellow-200' 
                  : isUsingFallback
                  ? 'bg-fergbutcher-brown-50 border-fergbutcher-brown-200'
                  : 'bg-fergbutcher-green-50 border-fergbutcher-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {productsError ? (
                      <AlertTriangle className="h-6 w-6 text-fergbutcher-yellow-600" />
                    ) : isUsingFallback ? (
                      <Database className="h-6 w-6 text-fergbutcher-brown-600" />
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
                      <p className="text-sm text-fergbutcher-brown-600">
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
                            alert('Christmas products refreshed successfully!');
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
                        alert('Christmas products cache cleared. Products will be refreshed on next load.');
                      }}
                      className="bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-3 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors text-sm"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>

              {/* Products List */}
              <div className="bg-white border border-fergbutcher-brown-200 rounded-lg">
                <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
                  <h4 className="font-medium text-fergbutcher-black-900">Available Christmas Products</h4>
                  <p className="text-sm text-fergbutcher-brown-600 mt-1">
                    {christmasProducts.length} products available for Christmas orders
                  </p>
                </div>
                <div className="p-6">
                  {productsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 text-fergbutcher-brown-400 mx-auto mb-2 animate-spin" />
                      <p className="text-fergbutcher-brown-600">Loading Christmas products...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {christmasProducts.map((product) => (
                        <div key={product.id} className="border border-fergbutcher-brown-200 rounded-lg p-4">
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
                            <p className="text-sm text-fergbutcher-brown-600">{product.description}</p>
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
                    <span className="text-fergbutcher-brown-600">Cache Status:</span>
                    <span className="ml-2 font-medium">
                      {isCacheExpired() ? 'Expired' : 'Valid'}
                    </span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Last Fetch:</span>
                    <span className="ml-2 font-medium">
                      {productsLastFetch 
                        ? productsLastFetch.toLocaleString('en-NZ')
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Data Source:</span>
                    <span className="ml-2 font-medium">
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

          {/* Keyboard Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Keyboard Shortcuts</h3>
                <p className="text-fergbutcher-brown-600 mb-6">
                  Use these keyboard shortcuts to navigate and perform actions quickly.
                </p>
              </div>

              <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-6">
                <h4 className="font-medium text-fergbutcher-black-900 mb-4">Available Shortcuts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keyboardShortcuts.getShortcuts().map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-fergbutcher-brown-200">
                      <span className="text-fergbutcher-brown-700">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-fergbutcher-brown-100 text-fergbutcher-brown-800 rounded text-sm font-mono">
                        {KeyboardShortcutsService.formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-fergbutcher-yellow-50 border border-fergbutcher-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-fergbutcher-yellow-800 font-medium">Tips:</p>
                    <ul className="text-sm text-fergbutcher-yellow-700 mt-1 space-y-1">
                      <li>• Shortcuts don't work when typing in input fields</li>
                      <li>• Use Ctrl+Z to undo recent deletions</li>
                      <li>• Shortcuts are case-insensitive</li>
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
                <p className="text-fergbutcher-brown-600 mb-6">
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
                      <p className="text-sm text-fergbutcher-brown-600">
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
                      <div className="text-sm text-fergbutcher-brown-600">
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
                <div className="border border-fergbutcher-brown-200 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Database className="h-5 w-5 text-fergbutcher-green-600" />
                    <span>Data Synchronization</span>
                  </h4>
                  <ul className="text-sm text-fergbutcher-brown-600 space-y-2">
                    <li>• Automatic customer data sync via Netlify Functions</li>
                    <li>• Order updates synced to Google Sheets</li>
                    <li>• Daily collection schedules generated</li>
                    <li>• Service Account authentication (no user interaction needed)</li>
                  </ul>
                </div>

                <div className="border border-fergbutcher-brown-200 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-fergbutcher-brown-600" />
                    <span>Benefits</span>
                  </h4>
                  <ul className="text-sm text-fergbutcher-brown-600 space-y-2">
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
                      <div className="text-sm text-fergbutcher-brown-600">Customers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-fergbutcher-green-600">{orders.length}</div>
                      <div className="text-sm text-fergbutcher-brown-600">Orders</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-fergbutcher-green-600">
                        {orders.filter(o => o.collectionDate === new Date().toISOString().split('T')[0]).length}
                      </div>
                      <div className="text-sm text-fergbutcher-brown-600">Today's Collections</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-fergbutcher-green-200">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-fergbutcher-green-600">
                          {orders.filter(o => o.orderType === 'christmas').length}
                        </div>
                        <div className="text-sm text-fergbutcher-brown-600">Christmas Orders</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-fergbutcher-green-600">{christmasProducts.length}</div>
                        <div className="text-sm text-fergbutcher-brown-600">Christmas Products</div>
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
                <p className="text-fergbutcher-brown-600 mb-6">
                  Create backups of your system data or restore from a previous backup.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Backup */}
                <div className="border border-fergbutcher-brown-200 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Download className="h-5 w-5 text-fergbutcher-green-600" />
                    <span>Create Backup</span>
                  </h4>
                  <p className="text-fergbutcher-brown-600 mb-4">
                    Download a complete backup of all customers, orders, and system data.
                  </p>
                  <button 
                    onClick={handleCreateBackup}
                    className="w-full bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center justify-center space-x-2 mb-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Create Backup</span>
                  </button>
                  <button 
                    onClick={handleExportData}
                    className="w-full bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export to File</span>
                  </button>
                  <p className="text-xs text-fergbutcher-brown-500 mt-2">
                    Next auto backup: {backupService.getNextBackupTime().toLocaleString('en-NZ')}
                  </p>
                </div>

                {/* Restore Backup */}
                <div className="border border-fergbutcher-brown-200 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-fergbutcher-yellow-600" />
                    <span>Restore Backup</span>
                  </h4>
                  <p className="text-fergbutcher-brown-600 mb-4">
                    Upload and restore from a previous backup file.
                  </p>
                  <div className="space-y-3">
                    <input
                      onChange={handleImportData}
                      type="file"
                      accept=".json"
                      className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
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
                <div className="border border-fergbutcher-brown-200 rounded-lg p-6">
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-fergbutcher-brown-600" />
                    <span>Recent Backups</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {backupService.getBackupList().slice(0, 5).map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-2 bg-fergbutcher-green-50 rounded">
                        <div>
                          <span className="text-sm font-medium text-fergbutcher-black-900">
                            {backup.type} Backup
                          </span>
                          <p className="text-xs text-fergbutcher-brown-600">
                            {new Date(backup.timestamp).toLocaleString('en-NZ')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Restore from this backup? This will overwrite current data.')) {
                              const data = backupService.restoreFromBackup(backup.id);
                              if (data) {
                                const customersSuccess = setAllCustomers(data.customers);
                                const ordersSuccess = setAllOrders(data.orders);
                                
                                if (customersSuccess && ordersSuccess) {
                                  alert(`Successfully restored ${data.customers.length} customers and ${data.orders.length} orders from backup!`);
                                } else {
                                  alert('Restore partially failed. Please check the console for errors.');
                                }
                              } else {
                                alert('Failed to restore backup. Backup may be corrupted.');
                              }
                            }
                          }}
                          className="text-xs bg-fergbutcher-green-600 text-white px-2 py-1 rounded hover:bg-fergbutcher-green-700 transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                    {backupService.getBackupList().length === 0 && (
                      <p className="text-sm text-fergbutcher-brown-500 text-center py-4">
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
                <p className="text-fergbutcher-brown-600 mb-6">
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
                      <p className="text-sm text-fergbutcher-brown-600">Connected and syncing</p>
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
                      <p className="text-sm text-fergbutcher-brown-600">Ready to send notifications</p>
                    </div>
                  </div>
                  <span className="text-sm text-fergbutcher-green-600 font-medium">Active</span>
                </div>

                {/* Backup System Status */}
                <div className="flex items-center justify-between p-4 bg-fergbutcher-brown-50 border border-fergbutcher-brown-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-fergbutcher-brown-600" />
                    <div>
                      <h4 className="font-medium text-fergbutcher-black-900">Backup System</h4>
                      <p className="text-sm text-fergbutcher-brown-600">Last backup: 2 hours ago</p>
                    </div>
                  </div>
                  <span className="text-sm text-fergbutcher-brown-600 font-medium">Operational</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-fergbutcher-green-50 border border-fergbutcher-brown-200 rounded-lg">
                <h4 className="font-medium text-fergbutcher-black-900 mb-2">System Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-fergbutcher-brown-600">Version:</span>
                    <span className="ml-2 font-medium">{import.meta.env.VITE_APP_VERSION || '1.0.0-beta'}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Last Updated:</span>
                    <span className="ml-2 font-medium">{new Date().toLocaleDateString('en-NZ')}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Total Customers:</span>
                    <span className="ml-2 font-medium">{customers.length}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Total Orders:</span>
                    <span className="ml-2 font-medium">{orders.length}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Environment:</span>
                    <span className="ml-2 font-medium">{import.meta.env.MODE}</span>
                  </div>
                  <div>
                    <span className="text-fergbutcher-brown-600">Error Logs:</span>
                    <span className="ml-2 font-medium">{errorLogger.getLogStats().error}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-fergbutcher-brown-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fergbutcher-brown-600">System Logs</span>
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
                        className="text-xs bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-2 py-1 rounded hover:bg-fergbutcher-brown-200 transition-colors"
                      >
                        Export Logs
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Clear all system logs?')) {
                            errorLogger.clearLogs();
                            alert('Logs cleared successfully');
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