import { Context, Next } from 'hono';
import type { Env, User } from '../db/schema';
import { getCurrentUser } from '../lib/auth';

// Add user to context if authenticated
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: User | null } }>, next: Next) {
  const cookieHeader = c.req.header('Cookie') || null;
  const db = c.env.DB;
  const user = await getCurrentUser(db, cookieHeader);
  c.set('user', user);
  await next();
}

// Require authentication - redirects to login if not authenticated
export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: User | null } }>, next: Next) {
  const user = c.get('user');
  if (!user) {
    return c.redirect('/login');
  }
  await next();
}
