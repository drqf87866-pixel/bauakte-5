import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  getProjectById,
  getPhaseById,
  completePhase,
  reopenPhase,
  updatePhaseNotes,
} from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';

const phaseRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

function documentsUrl(projectId: string, phaseId: string, extra?: string): string {
  return `/projects/${projectId}/documents?phases=${phaseId}${extra ? '&' + extra : ''}`;
}

// Back-compat: the standalone phase-detail page is gone — a phase is now just a filter
// on the merged "Dokumente" view, which also shows the phase's status/notes/upload actions
// inline when exactly one phase is selected.
phaseRoutes.get('/:projectId/phases/:phaseId', requireAuth, (c) => {
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const tag = c.req.query('tag');
  return c.redirect(documentsUrl(projectId, phaseId, tag ? `tag=${encodeURIComponent(tag)}` : undefined), 301);
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
  return c.redirect(documentsUrl(projectId, phaseId, 'ok=phase-completed'));
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
  return c.redirect(documentsUrl(projectId, phaseId, 'ok=phase-reopened'));
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
  return c.redirect(documentsUrl(projectId, phaseId, 'ok=phase-note-saved'));
});

export default phaseRoutes;
