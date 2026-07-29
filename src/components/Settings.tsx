import React, { useState, useEffect, useCallback } from 'react';
import { Save, Download, Upload, Mail, Database, Shield, AlertTriangle, CheckCircle, ExternalLink, FolderSync as Sync, Settings as SettingsIcon, Clock, FileText, Trash2, Gift, RefreshCw, Loader2, Send, Bell, X } from 'lucide-react';
import { useGoogleSheetsContext } from '../context/GoogleSheetsContext';
import { useAppData } from '../context/AppDataContext';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { useChristmasProducts } from '../hooks/useChristmasProducts';
import backupService, { BackupMeta } from '../services/backupService';
import errorLogger from '../services/errorLogger';
import { toast } from './Toast';
import { emailSettings, emailLog, sendTestEmail, EmailSettings as EmailSettingsType, EmailLogEntry } from '../services/emailService';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ phase: string; message: string; current: number; total: number } | null>(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<{ customers: typeof customers; orders: typeof orders } | null>(null);
  const [backupList, setBackupList] = useState<BackupMeta[]>([]);
  const [backupListLoading, setBackupListLoading] = useState(true);

  // Email automation state
  const [emailAutoSettings, setEmailAutoSettings] = useState<EmailSettingsType | null>(null);
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(true);
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [recentEmails, setRecentEmails] = useState<EmailLogEntry[]>([]);

  const { isConnected, isLoading, error, lastSync, syncAll, disconnect, startHourlySync } = useGoogleSheetsContext();
  const { customers, setAllCustomers, orders, setAllOrders, staffNotes, setAllStaffNotes } = useAppData();
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
    { id: 'automation', label: 'Email Automation', icon: Bell },
    { id: 'christmas', label: 'Christmas Products', icon: Gift },
    { id: 'sheets', label: 'Google Sheets', icon: ExternalLink },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'system', label: 'System Status', icon: Shield },
  ];

  // Load backup list from Supabase
  const refreshBackupList = async () => {
    setBackupListLoading(true);
    const list = await backupService.getBackupList();
    setBackupList(list);
    setBackupListLoading(false);
  };

  // Start hourly Google Sheets sync timer
  useEffect(() => {
    if (isConnected && startHourlySync) {
      const cleanup = startHourlySync(() => ({ customers, orders }));
      return cleanup;
    }
  }, [isConnected, startHourlySync, customers, orders]);

  // Load email automation settings + recent log
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, log] = await Promise.all([
        emailSettings.get(),
        emailLog.getRecent(10),
      ]);
      if (cancelled) return;
      if (s === null) {
        setEmailSettingsError('Unable to load email automation settings. Check the Netlify function logs for email-settings.');
      } else {
        setEmailAutoSettings(s);
        setEmailSettingsError(null);
      }
      setRecentEmails(log);
      setEmailSettingsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const updateEmailSetting = async (updates: Partial<EmailSettingsType>) => {
    if (!emailAutoSettings) return;
    const next = { ...emailAutoSettings, ...updates };
    setEmailAutoSettings(next);
    setSavingEmailSettings(true);
    const ok = await emailSettings.update(updates);
    setSavingEmailSettings(false);
    if (ok) {
      toast.success('Email automation setting saved');
    } else {
      toast.error('Failed to save email automation setting');
      setEmailAutoSettings(emailAutoSettings); // revert
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddr.trim()) {
      toast.error('Enter an email address to send the test to');
      return;
    }
    setSendingTest(true);
    const result = await sendTestEmail(testEmailAddr.trim());
    setSendingTest(false);
    if (result.success) {
      toast.success(`Test email sent to ${testEmailAddr}`);
      // refresh log
      const log = await emailLog.getRecent(10);
      setRecentEmails(log);
    } else {
      toast.error(`Test email failed: ${result.error}`);
    }
  };

  const handleSyncAll = async () => {
    await syncAll(customers, orders);
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const success = await backupService.createBackup(customers, orders, 'manual', staffNotes);
      if (success) {
        toast.success('Backup created successfully!');
        refreshBackupList();
      } else {
        toast.error('Failed to create backup. Please try again.');
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportData = () => {
    try {
      backupService.exportToFile(customers, orders, staffNotes);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setRestoreProgress({ phase: 'safety-backup', message: 'Preparing…', current: 0, total: 1 });
    try {
      const data = await backupService.importFromFile(file);
      if (!window.confirm(`This will replace all current data with ${data.customers.length} customers, ${data.orders.length} orders, and ${data.staffNotes.length} staff notes. A safety backup will be created first. Continue?`)) {
        setRestoreProgress(null);
        return;
      }

      const result = await backupService.safeRestoreFromData(
        data,
        (p) => setRestoreProgress({ phase: p.phase, message: p.message, current: p.current, total: p.total }),
        setAllCustomers,
        setAllOrders,
        setAllStaffNotes,
      );

      if (result.success) {
        toast.success('Restore complete! Review the data and sync to Google Sheets when ready.');
        setPendingRestoreData({ customers, orders });
        setShowSyncConfirm(true);
        refreshBackupList();
      } else {
        toast.error(`Restore failed: ${result.error}`);
        if (result.safetyBackupId) {
          toast.info('A safety backup was created. You can restore from it to recover.');
        }
      }
    } catch (error) {
      toast.error('Failed to import data. Please check the file format.');
      setRestoreProgress(null);
    } finally {
      setIsImporting(false);
      setRestoreProgress(null);
    }

    event.target.value = '';
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!window.confirm('Restore from this backup? This will overwrite all current data. A safety backup of your current data will be created first.')) return;
    setIsImporting(true);
    setRestoreProgress({ phase: 'safety-backup', message: 'Starting…', current: 0, total: 1 });
    try {
      const result = await backupService.safeRestore(
        backupId,
        (p) => setRestoreProgress({ phase: p.phase, message: p.message, current: p.current, total: p.total }),
        setAllCustomers,
        setAllOrders,
        setAllStaffNotes,
      );
      if (result.success) {
        toast.success('Restore complete! Review the data and sync to Google Sheets when ready.');
        setPendingRestoreData({ customers, orders });
        setShowSyncConfirm(true);
        refreshBackupList();
      } else {
        toast.error(`Restore failed: ${result.error}`);
        if (result.safetyBackupId) {
          toast.info('A safety backup was created. You can restore from it to recover.');
        }
      }
    } catch (error) {
      toast.error('Failed to restore backup.');
    } finally {
      setIsImporting(false);
      setRestoreProgress(null);
    }
  };

  const handleConfirmSync = async () => {
    setShowSyncConfirm(false);
    setPendingRestoreData(null);
    const ok = await syncAll(customers, orders);
    if (ok) {
      toast.success('Google Sheets synced successfully!');
    } else {
      toast.error('Google Sheets sync failed. You can retry from the Google Sheets tab.');
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

          {/* Email Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-2">Email Automation</h3>
                <p className="text-fergbutcher-green-400 mb-4">
                  Automated emails are sent via Resend when orders change status. All toggles default OFF — nothing sends until you enable it.
                </p>
              </div>

              {emailSettingsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 text-fergbutcher-gold-400 mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-fergbutcher-green-400">Loading email automation settings…</p>
                </div>
              ) : emailAutoSettings ? (
                <>
                  {/* Master toggle */}
                  <div className={`p-4 rounded-lg border ${emailAutoSettings.automationEnabled ? 'bg-fergbutcher-green-50 border-fergbutcher-green-200' : 'bg-fergbutcher-yellow-50 border-fergbutcher-yellow-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {emailAutoSettings.automationEnabled
                          ? <CheckCircle className="h-5 w-5 text-fergbutcher-green-600" />
                          : <AlertTriangle className="h-5 w-5 text-fergbutcher-yellow-600" />}
                        <div>
                          <h4 className="font-medium text-fergbutcher-black-900">Automation {emailAutoSettings.automationEnabled ? 'Enabled' : 'Disabled'}</h4>
                          <p className="text-sm text-fergbutcher-green-400">
                            {emailAutoSettings.automationEnabled
                              ? 'Automated emails will fire on status changes.'
                              : 'No automated emails will be sent. Use the manual buttons on each order.'}
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={emailAutoSettings.automationEnabled}
                        onChange={(v) => updateEmailSetting({ automationEnabled: v })}
                        disabled={savingEmailSettings}
                      />
                    </div>
                  </div>

                  {/* Per-template toggles */}
                  <div className="border border-fergbutcher-gold-300 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-fergbutcher-black-900">Per-template automation</h4>
                    <ToggleRow
                      label="Order Received"
                      hint="Auto-send when an order is first created"
                      checked={emailAutoSettings.templateOrderReceived}
                      onChange={(v) => updateEmailSetting({ templateOrderReceived: v })}
                      disabled={savingEmailSettings}
                    />
                    <ToggleRow
                      label="Order Confirmed"
                      hint="Auto-send when an order status changes to 'Confirmed'"
                      checked={emailAutoSettings.templateOrderConfirmed}
                      onChange={(v) => updateEmailSetting({ templateOrderConfirmed: v })}
                      disabled={savingEmailSettings}
                    />
                    <ToggleRow
                      label="Collection Reminder"
                      hint="Scheduled: 9am the day before collection (runs automatically each day)"
                      checked={emailAutoSettings.templateCollectionReminder}
                      onChange={(v) => updateEmailSetting({ templateCollectionReminder: v })}
                      disabled={savingEmailSettings}
                    />
                  </div>

                  {/* From address */}
                  <div className="border border-fergbutcher-gold-300 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-fergbutcher-black-900">Sender address</h4>
                    <p className="text-xs text-fergbutcher-green-400">
                      These are read from server-side environment variables (RESEND_FROM_ADDRESS, RESEND_REPLY_TO).
                      The domain must be verified in Resend.
                    </p>
                    <div className="text-sm text-fergbutcher-green-700 bg-fergbutcher-gold-50 rounded p-2">
                      <div>From: <span className="font-medium">{emailAutoSettings.fromAddress}</span></div>
                      <div>Reply-to: <span className="font-medium">{emailAutoSettings.replyToAddress || emailAutoSettings.fromAddress}</span></div>
                    </div>
                  </div>

                  {/* Test email */}
                  <div className="border border-fergbutcher-gold-300 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-fergbutcher-black-900 flex items-center space-x-2">
                      <Send className="h-4 w-4 text-fergbutcher-green-600" />
                      <span>Send a test email</span>
                    </h4>
                    <p className="text-xs text-fergbutcher-green-400">
                      Verify the Resend integration end-to-end by sending a test email to your own address. This bypasses all automation toggles.
                    </p>
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        value={testEmailAddr}
                        onChange={(e) => setTestEmailAddr(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-3 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendTestEmail}
                        disabled={sendingTest}
                        className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span>{sendingTest ? 'Sending…' : 'Send Test'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent sends */}
                  <div className="border border-fergbutcher-gold-300 rounded-lg p-4">
                    <h4 className="font-medium text-fergbutcher-black-900 mb-3">Recent email activity</h4>
                    {recentEmails.length === 0 ? (
                      <p className="text-sm text-fergbutcher-green-400 text-center py-4">No emails sent yet</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recentEmails.map(e => (
                          <div key={e.id} className="flex items-center justify-between p-2 bg-fergbutcher-gold-50 rounded text-sm">
                            <div>
                              <span className="font-medium text-fergbutcher-black-900">{e.template_id}</span>
                              <span className="text-fergbutcher-green-400"> → {e.recipient}</span>
                              <p className="text-xs text-fergbutcher-green-400">{new Date(e.created_at).toLocaleString('en-NZ')}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'sent' ? 'bg-fergbutcher-green-100 text-fergbutcher-green-700' : 'bg-red-100 text-red-700'}`}>
                              {e.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-700 font-medium">Could not load email automation settings.</p>
                      <p className="text-red-600 text-sm mt-1">{emailSettingsError || 'The email-settings function returned no data.'}</p>
                      <p className="text-red-500 text-xs mt-2">Check the Netlify function logs (Functions &rarr; email-settings) and verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Netlify env vars.</p>
                    </div>
                  </div>
                </div>
              )}
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
                  <h4 className="font-medium text-fergbutcher-black-900 mb-3 flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-fergbutcher-green-600" />
                    <span>Sync Schedule</span>
                  </h4>
                  <p className="text-sm text-fergbutcher-green-400 mb-3">
                    Google Sheets syncs automatically once per hour. Use the "Sync Now" button above to sync immediately.
                  </p>
                  <div className="text-sm text-fergbutcher-green-400">
                    {lastSync ? (
                      <span>Last synced: {lastSync.toLocaleString('en-NZ')}</span>
                    ) : (
                      <span>Not yet synced this session</span>
                    )}
                  </div>
                </div>
              )}

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
                    {backupListLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 text-fergbutcher-gold-400 animate-spin" />
                      </div>
                    ) : backupList.length === 0 ? (
                      <p className="text-sm text-fergbutcher-green-400 text-center py-4">
                        No backups available
                      </p>
                    ) : (
                      backupList.slice(0, 5).map((backup) => (
                        <div key={backup.id} className="flex items-center justify-between p-2 bg-fergbutcher-gold-50 rounded">
                          <div>
                            <span className="text-sm font-medium text-fergbutcher-black-900">
                              {backup.type} Backup
                            </span>
                            <p className="text-xs text-fergbutcher-green-400">
                              {new Date(backup.created_at).toLocaleString('en-NZ')}
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
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Restore Progress Indicator */}
              {restoreProgress && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {restoreProgress.phase === 'error' ? (
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      ) : restoreProgress.phase === 'complete' ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Loader2 className="h-6 w-6 text-fergbutcher-green-600 animate-spin" />
                      )}
                      <h3 className="text-lg font-semibold text-fergbutcher-black-900">
                        {restoreProgress.phase === 'complete' ? 'Restore Complete' :
                         restoreProgress.phase === 'error' ? 'Restore Failed' : 'Restoring…'}
                      </h3>
                    </div>
                    <p className="text-sm text-fergbutcher-green-400 mb-3">{restoreProgress.message}</p>
                    {restoreProgress.total > 0 && restoreProgress.phase !== 'error' && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div
                          className="bg-fergbutcher-green-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((restoreProgress.current / restoreProgress.total) * 100)}%` }}
                        />
                      </div>
                    )}
                    {restoreProgress.total > 0 && (
                      <p className="text-xs text-fergbutcher-green-400 text-right">
                        {restoreProgress.current} / {restoreProgress.total}
                      </p>
                    )}
                    {restoreProgress.phase === 'complete' && (
                      <button
                        onClick={() => setRestoreProgress(null)}
                        className="mt-4 w-full bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sync Confirmation Modal */}
              {showSyncConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Sync className="h-6 w-6 text-fergbutcher-green-600" />
                      <h3 className="text-lg font-semibold text-fergbutcher-black-900">Sync to Google Sheets?</h3>
                    </div>
                    <p className="text-sm text-fergbutcher-green-400 mb-4">
                      Your data has been restored. Before syncing to Google Sheets, please review the restored data
                      to make sure nothing is missing. Once you're satisfied, sync to update the spreadsheet.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleConfirmSync}
                        className="flex-1 bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Sync className="h-4 w-4" />
                        <span>Sync Now</span>
                      </button>
                      <button
                        onClick={() => { setShowSyncConfirm(false); setPendingRestoreData(null); }}
                        className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Wait, I'll check first
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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

// ── Reusable toggle components ─────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${checked ? 'bg-fergbutcher-green-600' : 'bg-fergbutcher-gold-300'}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const ToggleRow: React.FC<{ label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ label, hint, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium text-fergbutcher-black-900">{label}</p>
      <p className="text-xs text-fergbutcher-green-400">{hint}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);
