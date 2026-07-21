// src/services/emailService.ts
// ============================================================
// Client-side wrapper for email automation. All Supabase access
// is proxied through the email-settings Netlify Function (server-side,
// service role key) so the browser never needs VITE_SUPABASE_* env vars.
// Sending itself goes through the separate send-email function.
// ============================================================

import { Order, Customer, EmailTemplate } from '../types';
import { generateEmailData, populateTemplate } from '../utils/emailUtils';

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

const SETTINGS_ENDPOINT = '/.netlify/functions/email-settings';
const SEND_EMAIL_ENDPOINT = '/.netlify/functions/send-email';

async function apiGet<T>(query: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${SETTINGS_ENDPOINT}?${query}`);
    const json = await res.json();
    if (!res.ok) {
      const error = json?.error || `HTTP ${res.status}`;
      console.error('[emailService] GET failed:', query, error);
      return { data: null, error };
    }
    return { data: json as T, error: null };
  } catch (err) {
    const error = (err as Error).message;
    console.error('[emailService] GET network error:', query, error);
    return { data: null, error };
  }
}

async function apiPost(url: string, body: unknown): Promise<{ success: boolean; data?: any }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { success: res.ok, data: json };
  } catch (err) {
    return { success: false, data: { error: (err as Error).message } };
  }
}

// ── Settings ────────────────────────────────────────────────
export const emailSettings = {
  async get(): Promise<EmailSettings | null> {
    const { data } = await apiGet<{ settings: EmailSettings | null }>('action=settings');
    return data?.settings ?? null;
  },

  async update(updates: Partial<EmailSettings>): Promise<boolean> {
    const { success } = await apiPost(`${SETTINGS_ENDPOINT}?action=settings`, updates);
    return success;
  },
};

// ── Email log ───────────────────────────────────────────────
export const emailLog = {
  async getForOrder(orderId: string): Promise<EmailLogEntry[]> {
    const { data } = await apiGet<{ entries: EmailLogEntry[] }>(`action=log&order_id=${encodeURIComponent(orderId)}`);
    return data?.entries ?? [];
  },

  async getRecent(limit = 20): Promise<EmailLogEntry[]> {
    const { data } = await apiGet<{ entries: EmailLogEntry[] }>(`action=log&limit=${limit}`);
    return data?.entries ?? [];
  },

  async wasSent(orderId: string, templateId: string): Promise<boolean> {
    const { data } = await apiGet<{ sent: boolean }>(
      `action=was_sent&order_id=${encodeURIComponent(orderId)}&template_id=${encodeURIComponent(templateId)}`
    );
    return data?.sent ?? false;
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
  const { success, data } = await apiPost(SEND_EMAIL_ENDPOINT, {
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
    templateId,
    orderId,
    customerId,
    sentBy,
  });
  if (!success || !data?.success) {
    return { success: false, error: data?.error || `HTTP error` };
  }
  return { success: true, messageId: data.messageId };
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

// ── Auto-send: used by addOrder/updateOrder to fire emails on ─
// creation/status-change without requiring OrderDetail to mount.
// Loads template from localStorage, checks automation settings,
// dedups via email_log, then sends. No-ops silently if disabled
// or already sent.
export async function autoSendOrderEmail(
  order: Order,
  customer: Customer,
  templateId: 'order-received' | 'order-confirmed',
  sentBy = 'Automation'
): Promise<SendEmailResult> {
  if (!customer.email) return { success: false, error: 'Customer has no email' };

  const settings = await emailSettings.get();
  if (!settings || !settings.automationEnabled) return { success: false, error: 'Automation disabled' };
  if (templateId === 'order-received' && !settings.templateOrderReceived) return { success: false, error: 'Template disabled' };
  if (templateId === 'order-confirmed' && !settings.templateOrderConfirmed) return { success: false, error: 'Template disabled' };

  const already = await emailLog.wasSent(order.id, templateId);
  if (already) return { success: false, error: 'Already sent' };

  let template: EmailTemplate | undefined;
  try {
    const saved = localStorage.getItem('fergbutcher_email_templates');
    if (saved) {
      const all: EmailTemplate[] = JSON.parse(saved);
      template = all.find(t => t.id === templateId);
    }
  } catch { /* fall through to undefined */ }
  if (!template) return { success: false, error: 'Template not found' };

  return sendTemplateEmail(template, order, customer, sentBy);
}

// ── Test email (for Settings "Send test email" button) ──────
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const subject = 'Fergbutcher — Test Email';
  const body = `This is a test email from the Fergbutcher order system.

If you're reading this, your Resend integration is working correctly.

Sent: ${new Date().toLocaleString('en-NZ')}`;
  return sendEmail(to, subject, body, 'test-email');
}