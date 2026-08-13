import { pgTable, serial, text, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

// 1. Users table (Firebase Auth linked via uid)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('Admin'),
  plan: text('plan').default('free'), // 'free' | 'pro' | 'enterprise'
  subscriptionStatus: text('subscription_status').default('active'), // 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused'
  subscriptionId: text('subscription_id'), // Paddle Subscription ID
  customerId: text('customer_id'), // Paddle Customer ID
  billingCycle: text('billing_cycle').default('monthly'), // 'monthly' | 'yearly'
  renewalDate: text('renewal_date'),
  trialEndsAt: text('trial_ends_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. CSV Files table
export const files = pgTable('files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  status: text('status').notNull(), // 'pending' | 'auditing' | 'completed' | 'failed'
  score: integer('score').notNull().default(100),
  headers: jsonb('headers').notNull(), // Array of header strings
  rows: jsonb('rows').notNull(), // Array of records
  cleanedRows: jsonb('cleaned_rows'), // Array of cleaned records
  ownerId: text('owner_id').notNull(), // Owner's firebase uid
  issues: jsonb('issues').notNull(), // Array of compliance issues
});

// 3. Audit Activities timeline table
export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  action: text('action').notNull(),
  timestamp: text('timestamp').notNull(),
  fileName: text('file_name'),
});

// 4. Enterprise Organizations table (Phase 1)
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(), // Organization ID (e.g. 'org-enterprise-root')
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(), // Firebase UID of the owner
  ownerEmail: text('owner_email'),
  subscriptionPlan: text('subscription_plan').notNull().default('enterprise'),
  status: text('status').notNull().default('active'), // 'active' | 'suspended' | 'trial' | 'past_due' | 'canceled'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  maxSeats: integer('max_seats').default(15),
  description: text('description'),
});

// 4b. Enterprise Organization Members table (Phase 1)
export const organizationMembers = pgTable('organization_members', {
  uid: text('uid').notNull(), // Firebase Auth UID (Primary Identity)
  organizationId: text('organization_id').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('Member'), // 'Owner' | 'Admin' | 'Member'
  status: text('status').notNull().default('active'), // 'active' | 'invited' | 'suspended'
  joinedAt: text('joined_at').notNull(),
  lastActive: text('last_active').notNull(),
  avatar: text('avatar'),
});

// 4c. Team Members table (Legacy compatibility)
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'Owner' | 'Admin' | 'Editor' | 'Viewer'
  status: text('status').notNull(), // 'active' | 'invited'
  avatar: text('avatar'),
});

// 5. Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  paddleSubscriptionId: text('paddle_subscription_id').notNull().unique(),
  paddleCustomerId: text('paddle_customer_id').notNull(),
  plan: text('plan').notNull(), // 'pro' | 'enterprise'
  status: text('status').notNull(), // 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused'
  priceAmount: integer('price_amount').notNull().default(4900), // in cents ($49.00)
  currency: text('currency').notNull().default('USD'),
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  currentPeriodStart: text('current_period_start').notNull(),
  currentPeriodEnd: text('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  trialEndsAt: text('trial_ends_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 6. Invoices table
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subscriptionId: text('subscription_id'),
  paddleInvoiceId: text('paddle_invoice_id').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull(), // 'paid' | 'failed' | 'refunded' | 'pending'
  invoicePdfUrl: text('invoice_pdf_url'),
  paymentMethod: text('payment_method').default('Card'),
  createdAt: text('created_at').notNull(),
});

// 7. Transactions table
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  paddleTransactionId: text('paddle_transaction_id').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull(), // 'completed' | 'failed' | 'refunded'
  paymentMethod: text('payment_method').default('Card'),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

// 8. Webhook Events Audit Log table
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(),
  paddleEventId: text('paddle_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  signatureVerified: boolean('signature_verified').default(true),
  processedAt: text('processed_at').notNull(),
});

// 9. Usage Tracking table
export const usageTracking = pgTable('usage_tracking', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  periodMonth: text('period_month').notNull(), // 'YYYY-MM'
  auditCount: integer('audit_count').notNull().default(0),
  rowsProcessed: integer('rows_processed').notNull().default(0),
  storageUsedBytes: integer('storage_used_bytes').notNull().default(0),
  apiCallsCount: integer('api_calls_count').notNull().default(0),
  lastResetAt: text('last_reset_at').notNull(),
});

// 10. Plans definition table
export const plans = pgTable('plans', {
  id: text('id').primaryKey(), // 'free', 'pro', 'enterprise'
  name: text('name').notNull(),
  priceMonthly: integer('price_monthly').notNull(), // in cents
  priceYearly: integer('price_yearly').notNull(),
  features: jsonb('features').notNull(),
});

