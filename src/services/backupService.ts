import { Customer, Order } from '../types';

interface BackupData {
  customers: Customer[];
  orders: Order[];
  timestamp: string;
  version: string;
}

class BackupService {
  private readonly BACKUP_KEY = 'fergbutcher_backups';
  private readonly MAX_BACKUPS = 30; // Keep 30 days of backups
  private backupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAutoBackup();
  }

  // Initialize automatic daily backups at 8:30 PM
  initializeAutoBackup() {
    const scheduleNextBackup = () => {
      const now = new Date();
      const backup830PM = new Date();
      backup830PM.setHours(20, 30, 0, 0); // 8:30 PM

      // If it's already past 8:30 PM today, schedule for tomorrow
      if (now > backup830PM) {
        backup830PM.setDate(backup830PM.getDate() + 1);
      }

      const timeUntilBackup = backup830PM.getTime() - now.getTime();

      this.backupTimer = setTimeout(() => {
        this.performAutoBackup();
        // Schedule the next backup for tomorrow
        scheduleNextBackup();
      }, timeUntilBackup);

      console.log(`Next automatic backup scheduled for: ${backup830PM.toLocaleString('en-NZ')}`);
    };

    scheduleNextBackup();
  }

  // Perform automatic backup
  private async performAutoBackup() {
    try {
      const customers = this.getStoredCustomers();
      const orders = this.getStoredOrders();
      
      if (customers.length > 0 || orders.length > 0) {
        await this.createBackup(customers, orders, 'automatic');
        console.log('Automatic backup completed successfully');
      }
    } catch (error) {
      console.error('Automatic backup failed:', error);
      this.logError('Automatic backup failed', error);
    }
  }

  // Create a backup
  async createBackup(customers: Customer[], orders: Order[], type: 'manual' | 'automatic' = 'manual'): Promise<boolean> {
    try {
      const backupData: BackupData = {
        customers,
        orders,
        timestamp: new Date().toISOString(),
        version: '1.0.0-beta'
      };

      const backups = this.getStoredBackups();
      const backupId = `${type}_${Date.now()}`;
      
      backups[backupId] = backupData;

      // Clean up old backups (keep only MAX_BACKUPS)
      this.cleanupOldBackups(backups);

      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
      
      this.logInfo(`${type.charAt(0).toUpperCase() + type.slice(1)} backup created successfully`);
      return true;
    } catch (error) {
      console.error('Backup creation failed:', error);
      this.logError('Backup creation failed', error);
      return false;
    }
  }

  // Export data to JSON file
  exportToFile(customers: Customer[], orders: Order[]): void {
    try {
      const backupData: BackupData = {
        customers,
        orders,
        timestamp: new Date().toISOString(),
        version: '1.0.0-beta'
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fergbutcher-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      this.logInfo('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      this.logError('Export failed', error);
      throw error;
    }
  }

  // Import data from JSON file
  async importFromFile(file: File): Promise<{ customers: Customer[], orders: Order[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const backupData: BackupData = JSON.parse(content);
          
          // Validate backup data structure
          if (!backupData.customers || !backupData.orders || !backupData.timestamp) {
            throw new Error('Invalid backup file format');
          }

          this.logInfo('Data imported successfully');
          resolve({
            customers: backupData.customers,
            orders: backupData.orders
          });
        } catch (error) {
          console.error('Import failed:', error);
          this.logError('Import failed', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        const error = new Error('Failed to read file');
        this.logError('File read failed', error);
        reject(error);
      };

      reader.readAsText(file);
    });
  }

  // Get list of available backups
  getBackupList(): Array<{ id: string, timestamp: string, type: string }> {
    const backups = this.getStoredBackups();
    return Object.entries(backups)
      .map(([id, data]) => ({
        id,
        timestamp: data.timestamp,
        type: id.startsWith('automatic') ? 'Automatic' : 'Manual'
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Restore from backup
  restoreFromBackup(backupId: string): { customers: Customer[], orders: Order[] } | null {
    try {
      const backups = this.getStoredBackups();
      const backup = backups[backupId];
      
      if (!backup) {
        throw new Error('Backup not found');
      }

      this.logInfo(`Data restored from backup: ${backup.timestamp}`);
      return {
        customers: backup.customers,
        orders: backup.orders
      };
    } catch (error) {
      console.error('Restore failed:', error);
      this.logError('Restore failed', error);
      return null;
    }
  }

  // Get next backup time
  getNextBackupTime(): Date {
    const now = new Date();
    const next830PM = new Date();
    next830PM.setHours(20, 30, 0, 0);
    
    if (now > next830PM) {
      next830PM.setDate(next830PM.getDate() + 1);
    }
    
    return next830PM;
  }

  // Helper methods
  private getStoredCustomers(): Customer[] {
    try {
      const stored = localStorage.getItem('fergbutcher_customers');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredOrders(): Order[] {
    try {
      const stored = localStorage.getItem('fergbutcher_orders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredBackups(): Record<string, BackupData> {
    try {
      const stored = localStorage.getItem(this.BACKUP_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private cleanupOldBackups(backups: Record<string, BackupData>) {
    const backupEntries = Object.entries(backups);
    if (backupEntries.length > this.MAX_BACKUPS) {
      // Sort by timestamp and keep only the most recent
      const sortedBackups = backupEntries
        .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.MAX_BACKUPS);
      
      // Clear the backups object and repopulate with recent ones
      Object.keys(backups).forEach(key => delete backups[key]);
      sortedBackups.forEach(([id, data]) => {
        backups[id] = data;
      });
    }
  }

  private logInfo(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
    this.saveLog('INFO', message);
  }

  private logError(message: string, error: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error);
    this.saveLog('ERROR', `${message}: ${error?.message || error}`);
  }

  private saveLog(level: string, message: string) {
    try {
      const logs = JSON.parse(localStorage.getItem('fergbutcher_logs') || '[]');
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message
      });
      
      // Keep only last 100 log entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('fergbutcher_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  }

  // Cleanup method for component unmounting
  cleanup() {
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
      this.backupTimer = null;
    }
  }
}

export const backupService = new BackupService();
export default backupService;