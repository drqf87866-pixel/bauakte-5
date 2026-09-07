import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import { getProjectById, getPhaseById, getUploadById, deleteUpload } from '../db/queries';
import { deleteFile } from '../lib/r2';
import { handleUpload } from '../lib/upload';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';

const uploadRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Upload file to phase
uploadRoutes.post('/:projectId/phases/:phaseId/upload', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();

  const form = await c.req.parseBody<{ file: File; notes: string }>();
  const file = form['file'] as unknown as File | undefined;
  const notes = (form.notes || '').trim();

  if (!file || !(file instanceof File)) {
    return c.redirect(`/projects/${projectId}/phases/${phaseId}?error=no-file`);
  }

  try {
    await handleUpload(c.env, file, phaseId, user.id, notes, c.executionCtx);
  } catch (err) {
    console.error('Upload failed', err);
    return c.redirect(`/projects/${projectId}/phases/${phaseId}?error=upload-failed`);
  }

  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=uploaded`);
});

// Delete upload
uploadRoutes.post('/uploads/:uploadId/delete', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uploadId = c.req.param('uploadId')!;
  const upload = await getUploadById(c.env.DB, uploadId);
  if (!upload) return c.notFound();

  const phase = await getPhaseById(c.env.DB, upload.phase_id);
  if (!phase) return c.notFound();

  const project = await getProjectById(c.env.DB, phase.project_id);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }

  await deleteFile(c.env.R2, upload.r2_key);
  await deleteUpload(c.env.DB, uploadId);

  return c.redirect(`/projects/${phase.project_id}/phases/${upload.phase_id}?ok=deleted`);
});

// Serve R2 file (requires auth + project access)
uploadRoutes.get('/r2/:key{.+}', requireAuth, async (c) => {
  const user = c.get('user')!;
  const key = c.req.param('key');
  if (!key) return c.notFound();

  // Extract phaseId from key pattern: uploads/{phaseId}/{uploadId}.{ext}
  const parts = key.split('/');
  if (parts.length < 3 || parts[0] !== 'uploads') {
    return c.notFound();
  }
  const phaseId = parts[1];

  // Verify user has access to the project containing this upload
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase) return c.notFound();

  const projectId = phase.project_id;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();

  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }

  const object = await c.env.R2.get(key);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=31536000');

  return new Response(object.body, {
    headers,
  });
});

export default uploadRoutes;
