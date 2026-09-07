import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, User } from '../db/schema';
import { createUser, getUserByEmail, getUserById, getUserWithPassword, updateUserPassword, deleteUserSessions } from '../db/queries';
import { hashPassword, verifyPassword, createUserSession, destroySession } from '../lib/auth';
import { validateRegistrationInput, validateLoginInput, validatePasswordChangeInput } from '../lib/validators';
import { LoginPage, RegisterPage, PasswordChangePage } from '../views/auth';
import { requireAuth } from '../auth/middleware';

const authRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

authRoutes.get('/login', (c) => {
  return c.html(<LoginPage error={null} />);
});

authRoutes.post('/login', async (c) => {
  const form = await c.req.parseBody<{ email: string; password: string }>();
  const email = (form.email || '').trim().toLowerCase();
  const password = form.password || '';

  const validation = validateLoginInput(email, password);
  if (!validation.valid) {
    return c.html(<LoginPage error={Object.values(validation.errors)[0]} />);
  }

  const user = await getUserByEmail(c.env.DB, email);
  if (!user) {
    return c.html(<LoginPage error="Ungültige E-Mail oder Passwort" />);
  }

  const valid = await verifyPassword(password, user.hashed_password);
  if (!valid) {
    return c.html(<LoginPage error="Ungültige E-Mail oder Passwort" />);
  }

  const sessionId = await createUserSession(c.env.DB, user.id);
  setCookie(c, 'session', sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return c.redirect('/');
});

authRoutes.get('/register', (c) => {
  return c.html(<RegisterPage error={null} />);
});

authRoutes.post('/register', async (c) => {
  const form = await c.req.parseBody<{ email: string; password: string; name: string }>();
  const email = (form.email || '').trim().toLowerCase();
  const password = form.password || '';
  const name = (form.name || '').trim();

  const validation = validateRegistrationInput(email, password, name);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0];
    return c.html(<RegisterPage error={firstError} />);
  }

  // Check if email already exists
  const existing = await getUserByEmail(c.env.DB, email);
  if (existing) {
    return c.html(<RegisterPage error="Diese E-Mail ist bereits registriert" />);
  }

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();
  const success = await createUser(c.env.DB, userId, email, name, hashedPassword);
  if (!success) {
    return c.html(<RegisterPage error="Registrierung fehlgeschlagen. Bitte versuche es erneut." />);
  }

  const sessionId = await createUserSession(c.env.DB, userId);
  setCookie(c, 'session', sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.redirect('/');
});

authRoutes.post('/logout', async (c) => {
  await destroySession(c.env.DB, c.req.header('Cookie') || null);
  deleteCookie(c, 'session', { path: '/' });
  return c.redirect('/login');
});

// Password change
authRoutes.get('/account/password', requireAuth, (c) => {
  return c.html(<PasswordChangePage />);
});

authRoutes.post('/account/password', requireAuth, async (c) => {
  const user = c.get('user')!;
  const form = await c.req.parseBody<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();
  const currentPassword = form.currentPassword || '';
  const newPassword = form.newPassword || '';
  const confirmPassword = form.confirmPassword || '';

  const validation = validatePasswordChangeInput(currentPassword, newPassword, confirmPassword);
  if (!validation.valid) {
    return c.html(<PasswordChangePage error={Object.values(validation.errors)[0]} />);
  }

  // Verify current password
  const userWithPassword = await getUserWithPassword(c.env.DB, user.id);
  if (!userWithPassword) {
    return c.html(<PasswordChangePage error='Benutzer nicht gefunden' />);
  }

  const valid = await verifyPassword(currentPassword, userWithPassword.hashed_password);
  if (!valid) {
    return c.html(<PasswordChangePage error='Aktuelles Passwort ist falsch' />);
  }

  // Hash new password and update
  const hashedPassword = await hashPassword(newPassword);
  const success = await updateUserPassword(c.env.DB, user.id, hashedPassword);
  if (!success) {
    return c.html(<PasswordChangePage error='Passwort konnte nicht gespeichert werden' />);
  }

  // Invalidate other sessions (keep current one)
  await deleteUserSessions(c.env.DB, user.id);

  // Re-create current session (since we deleted all sessions for this user)
  const sessionId = await createUserSession(c.env.DB, user.id);
  setCookie(c, 'session', sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.redirect('/projects?ok=password-changed');
});

export default authRoutes;
