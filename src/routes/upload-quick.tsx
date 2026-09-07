import { Hono } from 'hono';
import type { Env, User, Phase } from '../db/schema';
import { getProjectsForUser as getProjectsByUser, getPhasesForProjects, getProjectById, getPhaseById } from '../db/queries';
import { handleUpload } from '../lib/upload';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';
import { QuickUploadPage } from '../views/upload-quick';

const quickUploadRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Show quick upload page
quickUploadRoutes.get('/upload-quick', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projects = await getProjectsByUser(c.env.DB, user.id);
  const projectIds = projects.map(p => p.id);
  const phasesMap = await getPhasesForProjects(c.env.DB, projectIds);
  const phasesByProject: Record<string, Phase[]> = {};
  for (const project of projects) {
    phasesByProject[project.id] = phasesMap.get(project.id) ?? [];
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

  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) {
    return c.redirect('/upload-quick?error=upload-failed');
  }

  try {
    await handleUpload(c.env, file, phaseId, user.id, notes, c.executionCtx);
  } catch (err) {
    console.error('Quick upload failed', err);
    return c.redirect('/upload-quick?error=upload-failed');
  }

  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=uploaded`);
});

export default quickUploadRoutes;
