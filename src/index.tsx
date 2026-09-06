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
import { getCurrentUser } from './lib/auth';
import { NotFoundPage } from './views/not-found';

// Extend Hono context type
type AppEnv = {
  Bindings: Env;
  Variables: {
    user: User | null;
  };
};

const app = new Hono<AppEnv>();

// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', authMiddleware);

// Mount routes
app.route('/', authRoutes);


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
  return c.html(<NotFoundPage />, 404);
});

export default app;
