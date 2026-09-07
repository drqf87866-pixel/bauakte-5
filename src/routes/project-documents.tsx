import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  getProjectById,
  getPhasesForProject,
  getMediaCountsByPhase,
  getProjectTagsWithCounts,
  getUploadsForProjectPaginated,
} from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';
import { ProjectDocumentsPage } from '../views/project-documents';

const documentsRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Merged documents view: replaces the old separate gallery + per-phase pages.
// A phase is just a filter now — selecting exactly one shows its status/notes/upload actions inline.
documentsRoutes.get('/projects/:id/documents', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('id')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phases = await getPhasesForProject(c.env.DB, projectId);
  const mediaCounts = await getMediaCountsByPhase(c.env.DB, projectId);

  const rawPhases = c.req.query('phases');
  const activePhases = rawPhases ? rawPhases.split(',').filter(Boolean) : [];
  const activeTag = c.req.query('tag') || undefined;
  const q = c.req.query('q')?.trim() || undefined;
  const page = parseInt(c.req.query('page') || '1', 10);

  const { uploads, total, totalPages } = await getUploadsForProjectPaginated(
    c.env.DB,
    projectId,
    { phaseIds: activePhases.length > 0 ? activePhases : undefined, tag: activeTag, q, page }
  );
  const tags = await getProjectTagsWithCounts(
    c.env.DB,
    projectId,
    activePhases.length > 0 ? activePhases : undefined
  );

  return c.html(
    <ProjectDocumentsPage
      user={user}
      project={project}
      phases={phases}
      mediaCounts={mediaCounts}
      tags={tags}
      uploads={uploads}
      uploadTotal={total}
      uploadPage={page}
      uploadTotalPages={totalPages}
      activePhases={activePhases}
      activeTag={activeTag}
      q={q}
      ok={c.req.query('ok')}
      error={c.req.query('error')}
    />
  );
});

// Back-compat: old bookmarked/shared "/gallery" and "/phases/:phaseId" URLs still work.
documentsRoutes.get('/projects/:id/gallery', (c) => {
  const projectId = c.req.param('id')!;
  const query = new URL(c.req.url).search;
  return c.redirect(`/projects/${projectId}/documents${query}`, 301);
});

export default documentsRoutes;
