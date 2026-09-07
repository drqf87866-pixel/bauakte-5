import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  getProjectById,
  getPhaseById,
  getPhasesForProject,
  getUploadsForPhasePaginated,
  getPhaseTags,
  completePhase,
  reopenPhase,
  updatePhaseNotes,
} from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';
import { PhaseDetailPage } from '../views/phases';

const phaseRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Phase detail with uploads
phaseRoutes.get('/:projectId/phases/:phaseId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();
  const allPhases = await getPhasesForProject(c.env.DB, projectId);
  const page = parseInt(c.req.query('page') || '1', 10);
  const activeTag = c.req.query('tag') || undefined;
  const { uploads, total, totalPages } = await getUploadsForPhasePaginated(c.env.DB, phaseId, page, activeTag);
  const allTags = await getPhaseTags(c.env.DB, phaseId);
  return c.html(
    <PhaseDetailPage
      user={user}
      project={project}
      phase={phase}
      allPhases={allPhases}
      uploads={uploads}
      uploadTotal={total}
      uploadPage={page}
      uploadTotalPages={totalPages}
      allTags={allTags}
      activeTag={activeTag}
      error={c.req.query('error')}
      ok={c.req.query('ok')}
    />
  );
});

// Complete phase
phaseRoutes.post('/:projectId/phases/:phaseId/complete', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();
  await completePhase(c.env.DB, phaseId);
  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=phase-completed`);
});

// Reopen a completed phase
phaseRoutes.post('/:projectId/phases/:phaseId/reopen', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();
  await reopenPhase(c.env.DB, phaseId);
  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=phase-reopened`);
});

// Save a free-text note for the phase
phaseRoutes.post('/:projectId/phases/:phaseId/notes', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();
  const form = await c.req.parseBody<{ notes: string }>();
  const notes = (form.notes || '').trim().slice(0, 4000);
  await updatePhaseNotes(c.env.DB, phaseId, notes);
  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=phase-note-saved`);
});

export default phaseRoutes;
