import { Customer, Order } from '../types';

export type PendingWrite =
  | { kind: 'order'; id: string; payload: Order; queuedAt: string }
  | { kind: 'customer'; id: string; payload: Customer; queuedAt: string };

const STORAGE_KEY = 'fergbutcher_pending_writes';

const readQueue = (): PendingWrite[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as PendingWrite[] : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: PendingWrite[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const pendingWriteQueue = {
  list(kind?: PendingWrite['kind']): PendingWrite[] {
    const queue = readQueue();
    return kind ? queue.filter(item => item.kind === kind) : queue;
  },

  upsert(item: PendingWrite) {
    const queue = readQueue().filter(existing => !(existing.kind === item.kind && existing.id === item.id));
    writeQueue([...queue, item]);
  },

  remove(kind: PendingWrite['kind'], id: string) {
    writeQueue(readQueue().filter(item => !(item.kind === kind && item.id === id)));
  },

  count() {
    return readQueue().length;
  },
};
