import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, User } from '../db/schema';
import { createUser, getUserByEmail, getUserWithPassword, updateUserPassword, deleteUserSessions, createPasswordResetToken, getPasswordResetToken, markResetTokenUsed } from '../db/queries';
import { hashPassword, verifyPassword, createUserSession, destroySession } from '../lib/auth';
import { validateRegistrationInput, validateLoginInput, validatePasswordChangeInput } from '../lib/validators';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, PasswordChangePage } from '../views/auth';
import { requireAuth } from '../auth/middleware';

const authRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

authRoutes.get('/login', (c) => {
  return c.html(<LoginPage error={null} ok={c.req.query('ok')} />);
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

// Forgot password
authRoutes.get('/forgot-password', (c) => {
  return c.html(<ForgotPasswordPage />);
});

authRoutes.post('/forgot-password', async (c) => {
  const form = await c.req.parseBody<{ email: string }>();
  const email = (form.email || '').trim().toLowerCase();

  const user = await getUserByEmail(c.env.DB, email);
  if (!user) {
    // Don't reveal whether the email exists
    return c.html(<ForgotPasswordPage ok='reset-link-sent' />);
  }

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '');
  await createPasswordResetToken(c.env.DB, crypto.randomUUID(), user.id, token, expiresAt);

  const baseUrl = new URL(c.req.url).origin;
  const resetLink = baseUrl + '/reset-password/' + token;

  // Since there's no email infrastructure, show the link directly on the page
  return c.html(<ForgotPasswordPage resetLink={resetLink} />);
});

// Reset password
authRoutes.get('/reset-password/:token', async (c) => {
  const token = c.req.param('token')!;
  const resetToken = await getPasswordResetToken(c.env.DB, token);
  if (!resetToken) {
    return c.html(<ForgotPasswordPage error='Dieser Link ist ungültig oder abgelaufen.' />);
  }
  return c.html(<ResetPasswordPage token={token} />);
});

authRoutes.post('/reset-password/:token', async (c) => {
  const token = c.req.param('token')!;
  const resetToken = await getPasswordResetToken(c.env.DB, token);
  if (!resetToken) {
    return c.html(<ForgotPasswordPage error='Dieser Link ist ungültig oder abgelaufen.' />);
  }

  const form = await c.req.parseBody<{ password: string; confirmPassword: string }>();
  const password = form.password || '';
  const confirmPassword = form.confirmPassword || '';

  if (password.length < 8) {
    return c.html(<ResetPasswordPage token={token} error='Passwort muss mindestens 8 Zeichen lang sein.' />);
  }
  if (password !== confirmPassword) {
    return c.html(<ResetPasswordPage token={token} error='Die Passwörter stimmen nicht überein.' />);
  }

  const hashedPassword = await hashPassword(password);
  await updateUserPassword(c.env.DB, resetToken.user_id, hashedPassword);
  await markResetTokenUsed(c.env.DB, resetToken.id);
  await deleteUserSessions(c.env.DB, resetToken.user_id);

  return c.redirect('/login?ok=password-reset');
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
