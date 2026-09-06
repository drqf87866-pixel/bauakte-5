import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import {
  createProject,
  getProjectsForUser,
  getProjectById,
  getProjectStats,
  createPhasesForProject,
  getPhasesForProject,
  getUploadsForProject,
  deleteProjectCascade,
  addCollaborator,
} from '../db/queries';
import { deleteFile } from '../lib/r2';
import { validateProjectInput } from '../lib/validators';
import { requireAuth } from '../auth/middleware';
import { PHASE_NAMES } from '../db/schema';
import { DashboardPage, ProjectDetailPage, NewProjectPage } from '../views/projects';

const projectRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Dashboard - list all projects
projectRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projects = await getProjectsForUser(c.env.DB, user.id);
  const stats = await getProjectStats(c.env.DB, user.id);
  return c.html(<DashboardPage user={user} projects={projects} stats={stats} ok={c.req.query('ok')} />);
});

// New project form
projectRoutes.get('/new', requireAuth, (c) => {
  const user = c.get('user')!;
  return c.html(<NewProjectPage user={user} error={null} />);
});

// Create project
projectRoutes.post('/new', requireAuth, async (c) => {
  const user = c.get('user')!;
  const form = await c.req.parseBody<{ name: string; address: string; description: string }>();
  const name = (form.name || '').trim();
  const address = (form.address || '').trim();
  const description = (form.description || '').trim();

  const validation = validateProjectInput(name, address);
  if (!validation.valid) {
    return c.html(<NewProjectPage user={user} error={Object.values(validation.errors)[0]} />);
  }

  const projectId = crypto.randomUUID();
  const success = await createProject(c.env.DB, projectId, name, address, description, user.id);
  if (!success) {
    return c.html(<NewProjectPage user={user} error='Projekt konnte nicht erstellt werden' />);
  }

  // Create default phases
  await createPhasesForProject(c.env.DB, projectId, PHASE_NAMES);

  return c.redirect(`/projects/${projectId}?ok=project-created`);
});

// Project detail
projectRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('id')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) {
    return c.notFound();
  }
  // Check access
  if (project.owner_id !== user.id) {
    const collab = await addCollaborator(c.env.DB, projectId, user.id); // will no-op if already collaborator
  }
  const phases = await getPhasesForProject(c.env.DB, projectId);
  return c.html(
    <ProjectDetailPage user={user} project={project} phases={phases} ok={c.req.query('ok')} />
  );
});

// Delete project (cascades: uploads incl. R2 files, phases, share links, collaborators)
projectRoutes.post('/:id/delete', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('id')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project || project.owner_id !== user.id) {
    return c.redirect('/');
  }
  const uploads = await getUploadsForProject(c.env.DB, projectId);
  for (const upload of uploads) {
    await deleteFile(c.env.R2, upload.r2_key);
  }
  await deleteProjectCascade(c.env.DB, projectId);
  return c.redirect('/?ok=project-deleted');
});

export default projectRoutes;
