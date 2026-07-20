// src/services/emailService.ts
// ============================================================
// Client-side wrapper for the send-email Netlify Function.
// Talks to Supabase directly for settings + email log reads.
// Gracefully degrades when VITE_SUPABASE_* env vars are missing
// (e.g. on Netlify if they haven't been set yet) so the rest of
// the app still loads.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, Customer, EmailTemplate } from '../types';
import { generateEmailData, populateTemplate } from '../utils/emailUtils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Lazy-init the client so a missing env var doesn't crash the app
// at module-load time. Methods check for null and return safe defaults.
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabase;
  } catch {
    return null;
  }
}

export interface EmailSettings {
  automationEnabled: boolean;
  templateOrderReceived: boolean;
  templateOrderConfirmed: boolean;
  templateCollectionReminder: boolean;
  fromAddress: string;
  replyToAddress: string | null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailLogEntry {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  template_id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  resend_message_id: string | null;
  error: string | null;
  sent_by: string | null;
  created_at: string;
}

const SEND_EMAIL_ENDPOINT = '/.netlify/functions/send-email';

// ── Settings ────────────────────────────────────────────────
export const emailSettings = {
  async get(): Promise<EmailSettings | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error || !data) return null;
    return {
      automationEnabled: data.automation_enabled,
      templateOrderReceived: data.template_order_received,
      templateOrderConfirmed: data.template_order_confirmed,
      templateCollectionReminder: data.template_collection_reminder,
      fromAddress: data.from_address,
      replyToAddress: data.reply_to_address,
    };
  },

  async update(updates: Partial<EmailSettings>): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.automationEnabled !== undefined) dbUpdates.automation_enabled = updates.automationEnabled;
    if (updates.templateOrderReceived !== undefined) dbUpdates.template_order_received = updates.templateOrderReceived;
    if (updates.templateOrderConfirmed !== undefined) dbUpdates.template_order_confirmed = updates.templateOrderConfirmed;
    if (updates.templateCollectionReminder !== undefined) dbUpdates.template_collection_reminder = updates.templateCollectionReminder;
    if (updates.fromAddress !== undefined) dbUpdates.from_address = updates.fromAddress;
    if (updates.replyToAddress !== undefined) dbUpdates.reply_to_address = updates.replyToAddress;

    const { error } = await sb
      .from('email_settings')
      .update(dbUpdates)
      .eq('id', 1);
    return !error;
  },
};

// ── Email log ───────────────────────────────────────────────
export const emailLog = {
  async getForOrder(orderId: string): Promise<EmailLogEntry[]> {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('email_log')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as EmailLogEntry[];
  },

  async getRecent(limit = 20): Promise<EmailLogEntry[]> {
    const sb = getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('email_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as EmailLogEntry[];
  },

  async wasSent(orderId: string, templateId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    const { count, error } = await sb
      .from('email_log')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('template_id', templateId)
      .eq('status', 'sent');
    if (error) return false;
    return (count ?? 0) > 0;
  },
};

// ── Send via Netlify Function ───────────────────────────────
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  templateId: string,
  orderId?: string,
  customerId?: string,
  sentBy?: string
): Promise<SendEmailResult> {
  try {
    const res = await fetch(SEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
        templateId,
        orderId,
        customerId,
        sentBy,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, error: json.error || `HTTP ${res.status}` };
    }
    return { success: true, messageId: json.messageId };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── High-level: send a populated template for an order ──────
export async function sendTemplateEmail(
  template: EmailTemplate,
  order: Order,
  customer: Customer,
  sentBy?: string
): Promise<SendEmailResult> {
  if (!customer.email) {
    return { success: false, error: 'Customer has no email address' };
  }
  const emailData = generateEmailData(order, customer);
  const subject = populateTemplate(template.subject, emailData);
  const body = populateTemplate(template.body, emailData);
  return sendEmail(
    customer.email,
    subject,
    body,
    template.id,
    order.id,
    customer.id,
    sentBy
  );
}

// ── Test email (for Settings "Send test email" button) ──────
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const subject = 'Fergbutcher — Test Email';
  const body = `This is a test email from the Fergbutcher order system.

If you're reading this, your Resend integration is working correctly.

Sent: ${new Date().toLocaleString('en-NZ')}`;
  return sendEmail(to, subject, body, 'test-email');
}
