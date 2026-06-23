import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (Firebase Auth linked via uid)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('Admin'),
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

// 4. Team Members table
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'Owner' | 'Admin' | 'Editor' | 'Viewer'
  status: text('status').notNull(), // 'active' | 'invited'
  avatar: text('avatar'),
});
