import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import { getProjectsForUser as getProjectsByUser, getPhasesForProject } from '../db/queries';
import { handleUpload } from '../lib/upload';
import { requireAuth } from '../auth/middleware';
import { QuickUploadPage } from '../views/upload-quick';

const quickUploadRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Show quick upload page
quickUploadRoutes.get('/upload-quick', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projects = await getProjectsByUser(c.env.DB, user.id);
  const phasesByProject: Record<string, any[]> = {};
  for (const project of projects) {
    phasesByProject[project.id] = await getPhasesForProject(c.env.DB, project.id);
  }
  return c.html(<QuickUploadPage user={user} projects={projects} phasesByProject={phasesByProject} error={c.req.query('error')} />);
});

// Handle quick upload submission
quickUploadRoutes.post('/upload-quick', requireAuth, async (c) => {
  const user = c.get('user')!;
  const form = await c.req.parseBody<{ file: File; notes: string; phase_id: string; project_id: string }>();
  const file = form['file'] as unknown as File | undefined;
  const notes = (form.notes || '').trim();
  const phaseId = form.phase_id;
  const projectId = form.project_id;

  if (!file || !(file instanceof File) || !phaseId || !projectId) {
    return c.redirect('/upload-quick?error=missing-fields');
  }

  try {
    await handleUpload(c.env, file, phaseId, user.id, notes);
  } catch (err) {
    console.error('Quick upload failed', err);
    return c.redirect('/upload-quick?error=upload-failed');
  }

  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=uploaded`);
});

export default quickUploadRoutes;
