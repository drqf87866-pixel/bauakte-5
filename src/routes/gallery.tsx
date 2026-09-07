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
import { ProjectGalleryPage } from '../views/project-gallery';

const galleryRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

galleryRoutes.get('/projects/:id/gallery', requireAuth, async (c) => {
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
    <ProjectGalleryPage
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
    />
  );
});

export default galleryRoutes;
