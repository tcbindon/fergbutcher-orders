import { Customer, Order } from '../types';
import { customersApi, ordersApi } from '../hooks/useApi';

interface BackupData {
  customers: Customer[];
  orders: Order[];
  timestamp: string;
  version: string;
}

export interface BackupMeta {
  id: string;
  type: string;
  created_at: string;
}

const BACKUPS_ENDPOINT = '/.netlify/functions/backups';
const LEGACY_BACKUP_KEY = 'fergbutcher_backups';
const MIGRATION_FLAG_KEY = 'fergbutcher_backups_migrated';
const MAX_BACKUPS = 30;

async function apiGet<T>(query: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BACKUPS_ENDPOINT}?${query}`);
    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json?.error || `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

async function apiPost<T>(action: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BACKUPS_ENDPOINT}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json?.error || `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

async function apiDelete(action: string, id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch(`${BACKUPS_ENDPOINT}?action=${action}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json?.error || `HTTP ${res.status}` };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

class BackupService {
  private backupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAutoBackup();
    this.migrateLegacyBackups();
  }

  // Initialize automatic daily backups at 8:30 PM
  initializeAutoBackup() {
    const scheduleNextBackup = () => {
      const now = new Date();
      const backup830PM = new Date();
      backup830PM.setHours(20, 30, 0, 0);

      if (now > backup830PM) {
        backup830PM.setDate(backup830PM.getDate() + 1);
      }

      const timeUntilBackup = backup830PM.getTime() - now.getTime();

      this.backupTimer = setTimeout(() => {
        this.performAutoBackup();
        scheduleNextBackup();
      }, timeUntilBackup);
    };

    scheduleNextBackup();
  }

  private async performAutoBackup() {
    try {
      const [customers, orders] = await Promise.all([
        customersApi.getAll(),
        ordersApi.getAll(),
      ]);

      if (customers.length > 0 || orders.length > 0) {
        await this.createBackup(customers, orders, 'automatic');
      }
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  }

  async createBackup(customers: Customer[], orders: Order[], type: 'manual' | 'automatic' = 'manual'): Promise<boolean> {
    const { error } = await apiPost('create', {
      customers,
      orders,
      type,
      version: '1.0.0-beta',
    });
    if (error) {
      console.error('Backup creation failed:', error);
      return false;
    }
    return true;
  }

  async getBackupList(): Promise<BackupMeta[]> {
    const { data, error } = await apiGet<{ backups: BackupMeta[] }>(`action=list&limit=${MAX_BACKUPS}`);
    if (error || !data?.backups) return [];
    return data.backups.map((b) => ({
      id: b.id,
      type: b.type === 'automatic' ? 'Automatic' : 'Manual',
      created_at: b.created_at,
    }));
  }

  async restoreFromBackup(backupId: string): Promise<{ customers: Customer[]; orders: Order[] } | null> {
    const { data, error } = await apiGet<{ backup: BackupData }>(`action=get&id=${encodeURIComponent(backupId)}`);
    if (error || !data?.backup) {
      console.error('Restore failed:', error);
      return null;
    }
    return {
      customers: data.backup.customers,
      orders: data.backup.orders,
    };
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    const { success } = await apiDelete('delete', backupId);
    return success;
  }

  // Export data to JSON file (unchanged — works from in-memory data)
  exportToFile(customers: Customer[], orders: Order[]): void {
    const backupData: BackupData = {
      customers,
      orders,
      timestamp: new Date().toISOString(),
      version: '1.0.0-beta',
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
  }

  // Import data from JSON file (unchanged — returns parsed data for the caller to write)
  async importFromFile(file: File): Promise<{ customers: Customer[]; orders: Order[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const backupData: BackupData = JSON.parse(content);

          if (!backupData.customers || !backupData.orders || !backupData.timestamp) {
            throw new Error('Invalid backup file format');
          }

          resolve({
            customers: backupData.customers,
            orders: backupData.orders,
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  getNextBackupTime(): Date {
    const now = new Date();
    const next830PM = new Date();
    next830PM.setHours(20, 30, 0, 0);

    if (now > next830PM) {
      next830PM.setDate(next830PM.getDate() + 1);
    }

    return next830PM;
  }

  // One-time migration of legacy localStorage backups to Supabase
  private async migrateLegacyBackups() {
    if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

    try {
      const stored = localStorage.getItem(LEGACY_BACKUP_KEY);
      if (!stored) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
        return;
      }

      const backups: Record<string, BackupData> = JSON.parse(stored);
      const entries = Object.entries(backups);
      if (entries.length === 0) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
        return;
      }

      const payload = entries.map(([id, data]) => ({
        type: id.startsWith('automatic') ? 'automatic' : 'manual',
        customers: data.customers,
        orders: data.orders,
        timestamp: data.timestamp,
        version: data.version || '1.0.0-beta',
      }));

      const { error } = await apiPost('migrate', { backups: payload });
      if (!error) {
        localStorage.removeItem(LEGACY_BACKUP_KEY);
        localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
        console.log(`Migrated ${payload.length} legacy backups to Supabase`);
      }
    } catch (err) {
      console.error('Legacy backup migration failed:', err);
    }
  }

  cleanup() {
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
      this.backupTimer = null;
    }
  }
}

export const backupService = new BackupService();
export default backupService;
