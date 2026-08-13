// Server-Side Central EmailService for CSV Auditor Pro
// Supports Resend API as Primary Provider and Gmail / Gateway as Optional Fallback Provider

import { Resend } from 'resend';

export type EmailType = 
  | 'compliance' 
  | 'team_invitation' 
  | 'audit_notification' 
  | 'password_reset' 
  | 'contact_support' 
  | 'report' 
  | 'billing' 
  | 'test' 
  | 'general';

export type EmailStatus = 
  | 'queued' 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'failed' 
  | 'bounced' 
  | 'complained';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  emailType?: EmailType;
  fromName?: string;
  fromEmail?: string;
  maxRetries?: number;
  useFallbackIfResendFails?: boolean;
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  provider: 'resend' | 'gmail_api' | 'compliance_gateway';
  messageId?: string;
  status: EmailStatus;
  message: string;
  errorCode?: string;
  retryCount: number;
  timestamp: string;
  details?: any;
}

export interface EmailLogEntry {
  id: string;
  provider: 'resend' | 'gmail_api' | 'compliance_gateway';
  recipient: string;
  sender: string;
  subject: string;
  emailType: EmailType;
  status: EmailStatus;
  providerMessageId?: string;
  createdTimestamp: number;
  sentTimestamp?: number;
  failureReason?: string;
  retryCount: number;
  htmlBody?: string;
}

// In-Memory Email Delivery Logs Cache for Server & Local Environment
const memoryEmailLogs: EmailLogEntry[] = [];
const MAX_LOG_HISTORY = 200;

export function getEmailLogs(): EmailLogEntry[] {
  return [...memoryEmailLogs];
}

export function logEmailDelivery(entry: EmailLogEntry): void {
  const existingIdx = memoryEmailLogs.findIndex(l => l.id === entry.id);
  if (existingIdx >= 0) {
    memoryEmailLogs[existingIdx] = { ...memoryEmailLogs[existingIdx], ...entry };
  } else {
    memoryEmailLogs.unshift(entry);
    if (memoryEmailLogs.length > MAX_LOG_HISTORY) {
      memoryEmailLogs.pop();
    }
  }
}

// Helper: Extract safe error text without leaking API keys
export function sanitizeEmailErrorMessage(error: any): string {
  if (!error) return 'An unexpected email dispatch error occurred.';
  let msg = typeof error === 'string' ? error : error.message || error.error || JSON.stringify(error);
  
  // Scrub possible API keys from error string
  msg = msg.replace(/re_[a-zA-Z0-9_-]{20,}/g, 're_***');
  msg = msg.replace(/AIzaSy[a-zA-Z0-9_-]{30,}/g, 'AIzaSy***');
  
  return msg;
}

// Helper: Email Validation
export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed);
}

// Central Resend Client Instance Getter (Lazy Initialized to Avoid Cold Crash if Key Missing)
let resendClientInstance: Resend | null = null;

function getResendClient(): { client: Resend | null; error?: string } {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { 
      client: null, 
      error: 'Email provider is not configured. RESEND_API_KEY environment variable is missing.' 
    };
  }

  if (!resendClientInstance) {
    try {
      resendClientInstance = new Resend(apiKey.trim());
    } catch (err) {
      return { client: null, error: `Failed to initialize Resend client: ${sanitizeEmailErrorMessage(err)}` };
    }
  }

  return { client: resendClientInstance };
}

// Helper to Format Plain Text to Professional HTML Email
function formatHtmlEmailBody(title: string, bodyText: string, customHtml?: string): string {
  if (customHtml && customHtml.trim()) {
    return customHtml;
  }

  const paragraphs = (bodyText || '')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/\n\n+/)
    .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 640px; margin: 32px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #2563eb;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; tracking: -0.5px;">
            <span style="color: #3b82f6;">CSV Auditor</span> Pro
          </h1>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
            ${title}
          </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 32px;">
          ${paragraphs}
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <p style="margin: 0 0 6px 0; font-weight: 600;">CSV Auditor Pro Automated Email Delivery System</p>
          <p style="margin: 0;">Secured with Enterprise Transactional Dispatch &bull; Confidential</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Primary Email Sending Function via Resend API with Controlled Retry Logic
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const timestamp = new Date().toISOString();
  const logId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const emailType = options.emailType || 'general';
  
  // 1. Validate Recipients
  const rawRecipient = (options.to || '').trim();
  if (!rawRecipient) {
    const res: EmailResult = {
      success: false,
      provider: 'resend',
      status: 'failed',
      message: 'Recipient email address cannot be empty.',
      errorCode: 'INVALID_RECIPIENT',
      retryCount: 0,
      timestamp
    };
    logEmailDelivery({
      id: logId,
      provider: 'resend',
      recipient: 'unknown',
      sender: options.fromEmail || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
      subject: options.subject || '(No Subject)',
      emailType,
      status: 'failed',
      createdTimestamp: Date.now(),
      failureReason: res.message,
      retryCount: 0
    });
    return res;
  }

  const recipients = rawRecipient.split(/[,;\n\r]+/).map(r => r.trim()).filter(Boolean);
  const invalidRecipients = recipients.filter(r => !isValidEmailAddress(r));
  if (invalidRecipients.length > 0) {
    const res: EmailResult = {
      success: false,
      provider: 'resend',
      status: 'failed',
      message: `Invalid recipient address: ${invalidRecipients.join(', ')}. Must be valid address (e.g. name@domain.com).`,
      errorCode: 'INVALID_RECIPIENT_FORMAT',
      retryCount: 0,
      timestamp
    };
    logEmailDelivery({
      id: logId,
      provider: 'resend',
      recipient: rawRecipient,
      sender: options.fromEmail || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
      subject: options.subject || '(No Subject)',
      emailType,
      status: 'failed',
      createdTimestamp: Date.now(),
      failureReason: res.message,
      retryCount: 0
    });
    return res;
  }

  // 2. Validate Subject & Body
  const sanitizedSubject = (options.subject || '').replace(/[\r\n]+/g, ' ').trim();
  if (!sanitizedSubject) {
    return {
      success: false,
      provider: 'resend',
      status: 'failed',
      message: 'Subject line cannot be empty.',
      errorCode: 'EMPTY_SUBJECT',
      retryCount: 0,
      timestamp
    };
  }

  if (!options.body && !options.html) {
    return {
      success: false,
      provider: 'resend',
      status: 'failed',
      message: 'Email content body cannot be empty.',
      errorCode: 'EMPTY_BODY',
      retryCount: 0,
      timestamp
    };
  }

  // 3. Sender Address & Name Setup
  const fromName = options.fromName || process.env.EMAIL_FROM_NAME || 'CSV Auditor Pro';
  const fromAddress = options.fromEmail || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
  const formattedFrom = `${fromName} <${fromAddress}>`;

  // Construct HTML
  const finalHtml = formatHtmlEmailBody(sanitizedSubject, options.body, options.html);

  // Initial Log Entry (queued / sending)
  const logEntry: EmailLogEntry = {
    id: logId,
    provider: 'resend',
    recipient: recipients.join(', '),
    sender: formattedFrom,
    subject: sanitizedSubject,
    emailType,
    status: 'sending',
    createdTimestamp: Date.now(),
    retryCount: 0,
    htmlBody: finalHtml
  };
  logEmailDelivery(logEntry);

  // 4. Resend Client Check
  const { client, error: clientErr } = getResendClient();
  if (!client) {
    logEntry.status = 'failed';
    logEntry.failureReason = clientErr || 'Email provider is not configured.';
    logEmailDelivery(logEntry);

    return {
      success: false,
      provider: 'resend',
      status: 'failed',
      message: clientErr || 'Email provider is not configured.',
      errorCode: 'RESEND_NOT_CONFIGURED',
      retryCount: 0,
      timestamp
    };
  }

  // 5. Attempt Dispatch via Resend API with controlled retries
  const maxRetries = options.maxRetries ?? 2; // total attempts = 1 + maxRetries (3 max)
  let attempt = 0;
  let lastErrorMsg = '';

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await client.emails.send({
        from: formattedFrom,
        to: recipients,
        subject: sanitizedSubject,
        html: finalHtml,
        text: options.body || sanitizedSubject,
      });

      if (response.error) {
        const errorText = sanitizeEmailErrorMessage(response.error);
        lastErrorMsg = errorText;

        // Check if error is permanent (unauthorized key, unverified domain, invalid email)
        const isPermanent = 
          errorText.toLowerCase().includes('unauthorized') ||
          errorText.toLowerCase().includes('invalid api key') ||
          errorText.toLowerCase().includes('domain') ||
          errorText.toLowerCase().includes('not verified') ||
          errorText.toLowerCase().includes('validation_error');

        if (isPermanent || attempt > maxRetries) {
          logEntry.status = 'failed';
          logEntry.failureReason = errorText;
          logEntry.retryCount = attempt - 1;
          logEmailDelivery(logEntry);

          return {
            success: false,
            provider: 'resend',
            status: 'failed',
            message: `Resend API Error: ${errorText}`,
            errorCode: 'RESEND_DISPATCH_FAILED',
            retryCount: attempt - 1,
            timestamp,
            details: response.error
          };
        }

        // Wait before transient retry
        await new Promise(res => setTimeout(res, 500 * attempt));
        continue;
      }

      // Success!
      const messageId = response.data?.id || `resend_${Date.now()}`;
      logEntry.status = 'sent';
      logEntry.providerMessageId = messageId;
      logEntry.sentTimestamp = Date.now();
      logEntry.retryCount = attempt - 1;
      logEmailDelivery(logEntry);

      return {
        success: true,
        provider: 'resend',
        messageId,
        status: 'sent',
        message: `Email successfully delivered to ${recipients.join(', ')} via Resend Transactional Engine.`,
        retryCount: attempt - 1,
        timestamp,
        details: { resendId: messageId }
      };

    } catch (err: any) {
      lastErrorMsg = sanitizeEmailErrorMessage(err);
      if (attempt > maxRetries) {
        logEntry.status = 'failed';
        logEntry.failureReason = lastErrorMsg;
        logEntry.retryCount = attempt - 1;
        logEmailDelivery(logEntry);

        return {
          success: false,
          provider: 'resend',
          status: 'failed',
          message: `Network/Server Exception: ${lastErrorMsg}`,
          errorCode: 'RESEND_NETWORK_ERROR',
          retryCount: attempt - 1,
          timestamp
        };
      }
      await new Promise(res => setTimeout(res, 500 * attempt));
    }
  }

  return {
    success: false,
    provider: 'resend',
    status: 'failed',
    message: lastErrorMsg || 'Email dispatch failed after retry attempts.',
    errorCode: 'RETRIES_EXHAUSTED',
    retryCount: maxRetries,
    timestamp
  };
}

// Dedicated helper functions required by specification:

export async function sendComplianceEmail(options: Omit<EmailOptions, 'emailType'>): Promise<EmailResult> {
  return sendEmail({ ...options, emailType: 'compliance' });
}

export async function sendTeamInvitation(options: Omit<EmailOptions, 'emailType'>): Promise<EmailResult> {
  return sendEmail({ ...options, emailType: 'team_invitation' });
}

export async function sendAuditNotification(options: Omit<EmailOptions, 'emailType'>): Promise<EmailResult> {
  return sendEmail({ ...options, emailType: 'audit_notification' });
}

export async function sendPasswordRelatedNotification(options: Omit<EmailOptions, 'emailType'>): Promise<EmailResult> {
  return sendEmail({ ...options, emailType: 'password_reset' });
}

export async function sendContactNotification(options: Omit<EmailOptions, 'emailType'>): Promise<EmailResult> {
  return sendEmail({ ...options, emailType: 'contact_support' });
}

export async function sendReportEmail(options: Omit<EmailOptions, 'emailType'>): Promise<EmailResult> {
  return sendEmail({ ...options, emailType: 'report' });
}
