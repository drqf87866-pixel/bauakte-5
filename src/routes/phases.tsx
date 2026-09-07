import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  getProjectById,
  getPhaseById,
  getPhasesForProject,
  getUploadsForPhasePaginated,
  getPhaseTags,
  completePhase,
} from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { PhaseDetailPage } from '../views/phases';

const phaseRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Phase detail with uploads
phaseRoutes.get('/:projectId/phases/:phaseId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
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
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();
  await completePhase(c.env.DB, phaseId);
  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=phase-completed`);
});

export default phaseRoutes;
