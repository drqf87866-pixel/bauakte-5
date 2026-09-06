import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  getProjectById,
  getShareLinksForProject,
  createShareLink,
  getShareLinkByToken,
  deactivateShareLink,
  addCollaborator,
} from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { SharePage } from '../views/share';

const shareRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Share management page
shareRoutes.get('/:projectId/share', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('projectId')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  const shareLinks = await getShareLinksForProject(c.env.DB, projectId);
  const baseUrl = new URL(c.req.url).origin;
  return c.html(
    <SharePage user={user} project={project} shareLinks={shareLinks} baseUrl={baseUrl} ok={c.req.query('ok')} />
  );
});

// Create share link
shareRoutes.post('/:projectId/share/create', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('projectId')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project || project.owner_id !== user.id) {
    return c.redirect('/');
  }

  const linkId = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  await createShareLink(c.env.DB, linkId, projectId, token, user.id);
  return c.redirect(`/projects/${projectId}/share?ok=link-created`);
});

// Deactivate share link
shareRoutes.post('/share/:linkId/deactivate', requireAuth, async (c) => {
  const user = c.get('user')!;
  const linkId = c.req.param('linkId')!;
  await deactivateShareLink(c.env.DB, linkId);
  const referer = c.req.header('Referer') || '/';
  return c.redirect(referer);
});

// Accept share link (public route - redirects to login if needed)
shareRoutes.get('/share/:token', async (c) => {
  const token = c.req.param('token')!;
  const shareLink = await getShareLinkByToken(c.env.DB, token);
  if (!shareLink) {
    return c.notFound();
  }

  // Check if user is logged in
  const user = c.get('user');
  if (!user) {
    // Store token in cookie and redirect to login
    const loginUrl = `/login?redirect=/share/${token}`;
    return c.redirect(loginUrl);
  }

  // Add user as collaborator
  await addCollaborator(c.env.DB, shareLink.project_id, user.id);

  // Redirect to project
  return c.redirect(`/projects/${shareLink.project_id}`);
});

export default shareRoutes;
