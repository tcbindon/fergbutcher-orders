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

const SIGNATURE_IMG_URL = 'https://orders.fergbutcher.com/Official_Ferg_Signatures_(3.png';

function buildHtml(bodyText: string): string {
  const bodyHtml = bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 36px;color:#333333;font-size:15px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:0;">
          <img src="${SIGNATURE_IMG_URL}" alt="Fergbutcher signature" width="600" style="display:block;width:100%;max-width:600px;border:0;">
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
    html: buildHtml(body),
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

// ── Test email (for Settings "Send test email" button) ──────
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const subject = 'Fergbutcher — Test Email';
  const body = `This is a test email from the Fergbutcher order system.

If you're reading this, your Resend integration is working correctly.

Sent: ${new Date().toLocaleString('en-NZ')}`;
  return sendEmail(to, subject, body, 'test-email');
}