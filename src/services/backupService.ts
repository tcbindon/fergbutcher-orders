import { Customer, Order, StaffNote } from '../types';
import { customersApi, ordersApi, staffNotesApi } from '../hooks/useApi';

interface BackupData {
  customers: Customer[];
  orders: Order[];
  staffNotes?: StaffNote[];
  timestamp: string;
  version: string;
}

export interface BackupMeta {
  id: string;
  type: string;
  created_at: string;
}

export interface RestoreData {
  customers: Customer[];
  orders: Order[];
  staffNotes: StaffNote[];
}

export interface RestoreProgress {
  phase: 'safety-backup' | 'clear' | 'insert' | 'complete' | 'error';
  message: string;
  current: number;
  total: number;
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
  // Server-side scheduled backups run 4x daily (8am, 12pm, 4pm, 8pm NZ time)
  // via the Netlify scheduled-backup function. No client-side timer needed.

  constructor() {
    this.migrateLegacyBackups();
  }

  async createBackup(
    customers: Customer[],
    orders: Order[],
    type: 'manual' | 'automatic' = 'manual',
    staffNotes?: StaffNote[],
  ): Promise<boolean> {
    const notes = staffNotes ?? await staffNotesApi.getAll().catch(() => []);
    const { error } = await apiPost('create', {
      customers,
      orders,
      staffNotes: notes,
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

  async restoreFromBackup(backupId: string): Promise<RestoreData | null> {
    const { data, error } = await apiGet<{ backup: BackupData }>(`action=get&id=${encodeURIComponent(backupId)}`);
    if (error || !data?.backup) {
      console.error('Restore failed:', error);
      return null;
    }
    return {
      customers: data.backup.customers,
      orders: data.backup.orders,
      staffNotes: data.backup.staffNotes ?? [],
    };
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    const { success } = await apiDelete('delete', backupId);
    return success;
  }

  /**
   * Safe restore: auto-backups current live data, clears all existing rows
   * one at a time, then inserts backup rows one at a time. Reports progress
   * via the callback so the UI can show a progress bar.
   */
  async safeRestore(
    backupId: string,
    onProgress?: (progress: RestoreProgress) => void,
  setAllCustomers: (c: Customer[]) => Promise<boolean>,
    setAllOrders: (o: Order[]) => Promise<boolean>,
    setAllStaffNotes?: (n: StaffNote[]) => Promise<boolean>,
  ): Promise<{ success: boolean; error?: string; safetyBackupId?: string }> {
    const report = (p: RestoreProgress) => onProgress?.(p);

    // 1. Fetch the backup snapshot
    const backupData = await this.restoreFromBackup(backupId);
    if (!backupData) {
      report({ phase: 'error', message: 'Could not load the backup snapshot.', current: 0, total: 0 });
      return { success: false, error: 'Could not load the backup snapshot.' };
    }

    // 2. Auto-create a safety backup of current live data
    report({ phase: 'safety-backup', message: 'Creating a safety backup of your current data…', current: 0, total: 1 });
    let safetyBackupId: string | undefined;
    try {
      const [currentCustomers, currentOrders, currentNotes] = await Promise.all([
        customersApi.getAll(),
        ordersApi.getAll(),
        staffNotesApi.getAll(),
      ]);
      if (currentCustomers.length > 0 || currentOrders.length > 0 || currentNotes.length > 0) {
        const { data } = await apiPost<{ id: string }>('create', {
          customers: currentCustomers,
          orders: currentOrders,
          staffNotes: currentNotes,
          type: 'manual',
          version: '1.0.0-beta',
        });
        safetyBackupId = data?.id;
      }
    } catch (err) {
      console.error('Safety backup failed (continuing with restore):', err);
    }

    // 3. Clear existing live data — staff notes first, then orders, then customers
    report({ phase: 'clear', message: 'Clearing existing staff notes…', current: 0, total: 0 });
    try {
      const existingNotes = await staffNotesApi.getAll();
      for (let i = 0; i < existingNotes.length; i++) {
        await staffNotesApi.delete(existingNotes[i].id);
        report({ phase: 'clear', message: `Clearing staff notes…`, current: i + 1, total: existingNotes.length });
      }
    } catch (err) {
      const msg = `Failed to clear staff notes: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: 0, total: 0 });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'clear', message: 'Clearing existing orders…', current: 0, total: 0 });
    try {
      const existingOrders = await ordersApi.getAll();
      for (let i = 0; i < existingOrders.length; i++) {
        await ordersApi.delete(existingOrders[i].id);
        report({ phase: 'clear', message: `Clearing orders…`, current: i + 1, total: existingOrders.length });
      }
    } catch (err) {
      const msg = `Failed to clear orders: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: 0, total: 0 });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'clear', message: 'Clearing existing customers…', current: 0, total: 0 });
    try {
      const existingCustomers = await customersApi.getAll();
      for (let i = 0; i < existingCustomers.length; i++) {
        await customersApi.delete(existingCustomers[i].id);
        report({ phase: 'clear', message: `Clearing customers…`, current: i + 1, total: existingCustomers.length });
      }
    } catch (err) {
      const msg = `Failed to clear customers: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: 0, total: 0 });
      return { success: false, error: msg, safetyBackupId };
    }

    // 4. Insert backup data — customers first, then orders, then staff notes
    const totalInserts = backupData.customers.length + backupData.orders.length + backupData.staffNotes.length;
    let inserted = 0;

    report({ phase: 'insert', message: 'Inserting customers…', current: 0, total: totalInserts });
    try {
      for (let i = 0; i < backupData.customers.length; i++) {
        await customersApi.save(backupData.customers[i]);
        inserted++;
        report({ phase: 'insert', message: 'Inserting customers…', current: inserted, total: totalInserts });
      }
    } catch (err) {
      const msg = `Failed to insert customer: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: inserted, total: totalInserts });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'insert', message: 'Inserting orders…', current: inserted, total: totalInserts });
    try {
      for (let i = 0; i < backupData.orders.length; i++) {
        await ordersApi.save(backupData.orders[i]);
        inserted++;
        report({ phase: 'insert', message: 'Inserting orders…', current: inserted, total: totalInserts });
      }
    } catch (err) {
      const msg = `Failed to insert order: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: inserted, total: totalInserts });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'insert', message: 'Inserting staff notes…', current: inserted, total: totalInserts });
    try {
      for (let i = 0; i < backupData.staffNotes.length; i++) {
        await staffNotesApi.save(backupData.staffNotes[i]);
        inserted++;
        report({ phase: 'insert', message: 'Inserting staff notes…', current: inserted, total: totalInserts });
      }
    } catch (err) {
      const msg = `Failed to insert staff note: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: inserted, total: totalInserts });
      return { success: false, error: msg, safetyBackupId };
    }

    // 5. Update in-memory state via the provided setters
    await setAllCustomers(backupData.customers);
    await setAllOrders(backupData.orders);
    if (setAllStaffNotes) {
      await setAllStaffNotes(backupData.staffNotes);
    }

    report({ phase: 'complete', message: 'Restore complete.', current: totalInserts, total: totalInserts });
    return { success: true, safetyBackupId };
  }

  // Export data to JSON file (unchanged — works from in-memory data)
  exportToFile(customers: Customer[], orders: Order[], staffNotes?: StaffNote[]): void {
    const backupData: BackupData = {
      customers,
      orders,
      staffNotes,
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

  // Import data from JSON file (returns parsed data including staff notes)
  async importFromFile(file: File): Promise<RestoreData> {
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
            staffNotes: backupData.staffNotes ?? [],
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
        staffNotes: data.staffNotes ?? [],
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

  /**
   * Safe restore from data (file import): same as safeRestore but takes
   * the snapshot data directly instead of a backup ID.
   */
  async safeRestoreFromData(
    backupData: RestoreData,
    onProgress?: (progress: RestoreProgress) => void,
    setAllCustomers: (c: Customer[]) => Promise<boolean>,
    setAllOrders: (o: Order[]) => Promise<boolean>,
    setAllStaffNotes?: (n: StaffNote[]) => Promise<boolean>,
  ): Promise<{ success: boolean; error?: string; safetyBackupId?: string }> {
    const report = (p: RestoreProgress) => onProgress?.(p);

    // 1. Auto-create a safety backup of current live data
    report({ phase: 'safety-backup', message: 'Creating a safety backup of your current data…', current: 0, total: 1 });
    let safetyBackupId: string | undefined;
    try {
      const [currentCustomers, currentOrders, currentNotes] = await Promise.all([
        customersApi.getAll(),
        ordersApi.getAll(),
        staffNotesApi.getAll(),
      ]);
      if (currentCustomers.length > 0 || currentOrders.length > 0 || currentNotes.length > 0) {
        const { data } = await apiPost<{ id: string }>('create', {
          customers: currentCustomers,
          orders: currentOrders,
          staffNotes: currentNotes,
          type: 'manual',
          version: '1.0.0-beta',
        });
        safetyBackupId = data?.id;
      }
    } catch (err) {
      console.error('Safety backup failed (continuing with restore):', err);
    }

    // 2. Clear existing live data — staff notes first, then orders, then customers
    report({ phase: 'clear', message: 'Clearing existing staff notes…', current: 0, total: 0 });
    try {
      const existingNotes = await staffNotesApi.getAll();
      for (let i = 0; i < existingNotes.length; i++) {
        await staffNotesApi.delete(existingNotes[i].id);
        report({ phase: 'clear', message: 'Clearing staff notes…', current: i + 1, total: existingNotes.length });
      }
    } catch (err) {
      const msg = `Failed to clear staff notes: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: 0, total: 0 });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'clear', message: 'Clearing existing orders…', current: 0, total: 0 });
    try {
      const existingOrders = await ordersApi.getAll();
      for (let i = 0; i < existingOrders.length; i++) {
        await ordersApi.delete(existingOrders[i].id);
        report({ phase: 'clear', message: 'Clearing orders…', current: i + 1, total: existingOrders.length });
      }
    } catch (err) {
      const msg = `Failed to clear orders: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: 0, total: 0 });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'clear', message: 'Clearing existing customers…', current: 0, total: 0 });
    try {
      const existingCustomers = await customersApi.getAll();
      for (let i = 0; i < existingCustomers.length; i++) {
        await customersApi.delete(existingCustomers[i].id);
        report({ phase: 'clear', message: 'Clearing customers…', current: i + 1, total: existingCustomers.length });
      }
    } catch (err) {
      const msg = `Failed to clear customers: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: 0, total: 0 });
      return { success: false, error: msg, safetyBackupId };
    }

    // 3. Insert backup data — customers first, then orders, then staff notes
    const totalInserts = backupData.customers.length + backupData.orders.length + backupData.staffNotes.length;
    let inserted = 0;

    report({ phase: 'insert', message: 'Inserting customers…', current: 0, total: totalInserts });
    try {
      for (let i = 0; i < backupData.customers.length; i++) {
        await customersApi.save(backupData.customers[i]);
        inserted++;
        report({ phase: 'insert', message: 'Inserting customers…', current: inserted, total: totalInserts });
      }
    } catch (err) {
      const msg = `Failed to insert customer: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: inserted, total: totalInserts });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'insert', message: 'Inserting orders…', current: inserted, total: totalInserts });
    try {
      for (let i = 0; i < backupData.orders.length; i++) {
        await ordersApi.save(backupData.orders[i]);
        inserted++;
        report({ phase: 'insert', message: 'Inserting orders…', current: inserted, total: totalInserts });
      }
    } catch (err) {
      const msg = `Failed to insert order: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: inserted, total: totalInserts });
      return { success: false, error: msg, safetyBackupId };
    }

    report({ phase: 'insert', message: 'Inserting staff notes…', current: inserted, total: totalInserts });
    try {
      for (let i = 0; i < backupData.staffNotes.length; i++) {
        await staffNotesApi.save(backupData.staffNotes[i]);
        inserted++;
        report({ phase: 'insert', message: 'Inserting staff notes…', current: inserted, total: totalInserts });
      }
    } catch (err) {
      const msg = `Failed to insert staff note: ${(err as Error).message}`;
      report({ phase: 'error', message: msg, current: inserted, total: totalInserts });
      return { success: false, error: msg, safetyBackupId };
    }

    // 4. Update in-memory state
    await setAllCustomers(backupData.customers);
    await setAllOrders(backupData.orders);
    if (setAllStaffNotes) {
      await setAllStaffNotes(backupData.staffNotes);
    }

    report({ phase: 'complete', message: 'Restore complete.', current: totalInserts, total: totalInserts });
    return { success: true, safetyBackupId };
  }

  cleanup() {
  }
}

export const backupService = new BackupService();
export default backupService;
