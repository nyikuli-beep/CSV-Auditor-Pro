import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string, role?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || null,
        role: role || 'Admin',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: name || null,
          role: role || 'Admin',
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed for getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
