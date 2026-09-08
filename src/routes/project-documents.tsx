import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  getProjectById,
  getPhasesForProject,
  getMediaCountsByPhase,
  getProjectTagsWithCounts,
  getUploadsForProjectPaginated,
  getUploadById,
  deleteUploads,
  moveUploadsToPhase,
} from '../db/queries';
import { deleteFiles } from '../lib/r2';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';
import { ProjectDocumentsPage } from '../views/project-documents';

const documentsRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Merged documents view: replaces the old separate gallery + per-phase pages.
// A phase is just a filter now — selecting exactly one shows its status/notes/upload actions inline.
// NOTE: paths here are relative — this router is mounted with app.route('/projects', documentsRoutes)
// in index.tsx, which prepends '/projects' itself. (The previous gallery.tsx repeated '/projects' in
// its own path on top of that mount prefix, which made Hono register it at the doubled
// '/projects/projects/:id/gallery' — the actual '/projects/:id/gallery' links 404'd. Verified via a
// standalone Hono repro; not something to reintroduce here.)
documentsRoutes.get('/:id/documents', requireAuth, async (c) => {
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

// Batch delete uploads
documentsRoutes.post('/:id/batch-delete', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('id')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }

  const form = await c.req.parseBody<{ upload_ids: string }>();
  const idsParam = form.upload_ids || '';
  const ids = idsParam.split(',').filter(Boolean);

  if (ids.length === 0) {
    return c.redirect(`/projects/${projectId}/documents`);
  }

  // Get R2 keys before deleting
  const keys: string[] = [];
  for (const id of ids) {
    const upload = await getUploadById(c.env.DB, id);
    if (upload) keys.push(upload.r2_key);
  }

  await deleteFiles(c.env.R2, keys);
  await deleteUploads(c.env.DB, ids);

  return c.redirect(`/projects/${projectId}/documents?ok=deleted`);
});

// Batch move uploads to another phase
documentsRoutes.post('/:id/batch-move', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('id')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }

  const form = await c.req.parseBody<{ upload_ids: string; target_phase_id: string }>();
  const idsParam = form.upload_ids || '';
  const ids = idsParam.split(',').filter(Boolean);
  const targetPhaseId = form.target_phase_id;

  if (ids.length === 0 || !targetPhaseId) {
    return c.redirect(`/projects/${projectId}/documents`);
  }

  await moveUploadsToPhase(c.env.DB, ids, targetPhaseId);

  return c.redirect(`/projects/${projectId}/documents?ok=phase-moved`);
});

// Back-compat: old bookmarked/shared "/gallery" and "/phases/:phaseId" URLs still work.
documentsRoutes.get('/:id/gallery', (c) => {
  const projectId = c.req.param('id')!;
  const query = new URL(c.req.url).search;
  return c.redirect(`/projects/${projectId}/documents${query}`, 301);
});

export default documentsRoutes;
