// src/utils/migrateToDb.ts
// ============================================================
// ONE-TIME MIGRATION UTILITY
// Run this ONCE from the device that has all existing data.
// After migration, delete this file or remove the import.
//
// How to run:
//   1. Add this to your App.tsx temporarily:
//      import { runMigration } from './utils/migrateToDb';
//      // Inside App component, add a button:
//      <button onClick={runMigration}>Migrate to DB</button>
//   2. Click the button on the device with existing data
//   3. Watch the browser console for progress
//   4. Once complete, remove the button and this file
// ============================================================

import { customersApi, ordersApi, staffNotesApi } from '../hooks/useApi';
import type { Customer, Order, StaffNote } from '../types';

export async function runMigration(): Promise<void> {
  console.log('🚀 Starting migration from localStorage to MySQL...');
  const results = { customers: 0, orders: 0, notes: 0, errors: [] as string[] };

  // ── Migrate Customers ────────────────────────────────────
  try {
    const raw = localStorage.getItem('fergbutcher_customers');
    const localCustomers: Customer[] = raw ? JSON.parse(raw) : [];
    console.log(`Found ${localCustomers.length} customers in localStorage`);

    for (const customer of localCustomers) {
      try {
        await customersApi.save(customer);
        results.customers++;
        console.log(`  ✓ Customer: ${customer.firstName} ${customer.lastName}`);
      } catch (e: any) {
        const msg = `Customer ${customer.id}: ${e.message}`;
        results.errors.push(msg);
        console.error('  ✗', msg);
      }
    }
  } catch (e: any) {
    results.errors.push(`Customers read error: ${e.message}`);
    console.error('Failed to read customers from localStorage:', e);
  }

  // ── Migrate Orders ───────────────────────────────────────
  try {
    const raw = localStorage.getItem('fergbutcher_orders');
    const localOrders: Order[] = raw ? JSON.parse(raw) : [];
    console.log(`Found ${localOrders.length} orders in localStorage`);

    for (const order of localOrders) {
      try {
        await ordersApi.save(order);
        results.orders++;
        console.log(`  ✓ Order #${order.id}: ${order.collectionDate}`);
      } catch (e: any) {
        const msg = `Order ${order.id}: ${e.message}`;
        results.errors.push(msg);
        console.error('  ✗', msg);
      }
    }
  } catch (e: any) {
    results.errors.push(`Orders read error: ${e.message}`);
    console.error('Failed to read orders from localStorage:', e);
  }

  // ── Migrate Staff Notes ──────────────────────────────────
  try {
    const raw = localStorage.getItem('fergbutcher_staff_notes');
    const localNotes: StaffNote[] = raw ? JSON.parse(raw) : [];
    console.log(`Found ${localNotes.length} staff notes in localStorage`);

    for (const note of localNotes) {
      try {
        await staffNotesApi.save(note);
        results.notes++;
        console.log(`  ✓ Note: ${note.staffName} on order #${note.orderId}`);
      } catch (e: any) {
        const msg = `Note ${note.id}: ${e.message}`;
        results.errors.push(msg);
        console.error('  ✗', msg);
      }
    }
  } catch (e: any) {
    results.errors.push(`Notes read error: ${e.message}`);
    console.error('Failed to read staff notes from localStorage:', e);
  }

  // ── Summary ──────────────────────────────────────────────
  console.log('\n✅ Migration complete!');
  console.log(`   Customers migrated: ${results.customers}`);
  console.log(`   Orders migrated:    ${results.orders}`);
  console.log(`   Notes migrated:     ${results.notes}`);
  if (results.errors.length) {
    console.warn(`   Errors (${results.errors.length}):`, results.errors);
    alert(`Migration complete with ${results.errors.length} errors. Check the browser console for details.`);
  } else {
    alert(`Migration complete! ✓ ${results.customers} customers, ${results.orders} orders, ${results.notes} notes moved to the database.`);
  }
}
