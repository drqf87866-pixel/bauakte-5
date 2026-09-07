import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, User } from './db/schema';
import { authMiddleware } from './auth/middleware';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import phaseRoutes from './routes/phases';
import uploadRoutes from './routes/uploads';
import shareRoutes from './routes/share';
import quickUploadRoutes from './routes/upload-quick';
import { NotFoundPage } from './views/not-found';

// Extend Hono context type
type AppEnv = {
  Bindings: Env;
  Variables: {
    user: User | null;
  };
};

const app = new Hono<AppEnv>();

// Security headers
app.use('*', async (c, next) => {
  await next();
  const res = c.res;
  const headers: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  // Only set CSP on HTML responses
  if (res.headers.get('content-type')?.includes('text/html')) {
    headers['Content-Security-Policy'] =
      "default-src 'self'; img-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; worker-src 'self'; object-src 'none'; frame-ancestors 'none'";
  }
  // Cache static CSS
  if (res.headers.get('content-type')?.includes('text/css')) {
    headers['Cache-Control'] = 'public, max-age=300';
  }
  for (const [key, value] of Object.entries(headers)) {
    if (!res.headers.has(key)) {
      res.headers.set(key, value);
    }
  }
});

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', authMiddleware);

// Mount routes
app.route('/', authRoutes);

// Account routes (password change, etc.)
app.route('/account', authRoutes);


app.route('/projects', projectRoutes);
app.route('/projects', phaseRoutes);
app.route('/projects', uploadRoutes);
app.route('/projects', shareRoutes);
app.route('/', uploadRoutes); // For /r2/:key
app.route('/', shareRoutes); // For /share/:token
app.route('/', quickUploadRoutes); // For /upload-quick

// Root redirect
app.get('/', (c) => {
  const user = c.get('user');
  if (user) {
    return c.redirect('/projects');
  }
  return c.redirect('/login');
});

// 404 handler
app.notFound((c) => {
  const user = c.get('user');
  return c.html(<NotFoundPage user={user} />, 404);
});

export default app;
