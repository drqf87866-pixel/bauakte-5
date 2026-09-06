import { Hono } from 'hono';
import type { Env, User, Upload } from '../db/schema';
import { getProjectById, getPhaseById, createUpload, getUploadsForPhase, getUploadById, deleteUpload } from '../db/queries';
import { uploadFile, deleteFile } from '../lib/r2';
import { analyzeImage, formatTags } from '../lib/ai-tags';
import { updateUploadTags } from '../db/queries';
import { requireAuth } from '../auth/middleware';

const uploadRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Upload file to phase
uploadRoutes.post('/:projectId/phases/:phaseId/upload', requireAuth, async (c) => {
  const user = c.get('user')!;
  const { projectId, phaseId } = c.req.param() as { projectId: string; phaseId: string };
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  const phase = await getPhaseById(c.env.DB, phaseId);
  if (!phase || phase.project_id !== projectId) return c.notFound();

  const form = await c.req.parseBody<{ file: File; notes: string }>();
  const file = form['file'] as unknown as File | undefined;
  const notes = (form.notes || '').trim();

  if (!file || !(file instanceof File)) {
    return c.redirect(`/projects/${projectId}/phases/${phaseId}?error=no-file`);
  }

  const uploadId = crypto.randomUUID();
  let key: string;
  let type: 'image' | 'video' | 'doc';
  try {
    ({ key, type } = await uploadFile(c.env.R2, file, phaseId, uploadId));
  } catch (err) {
    console.error('R2 upload failed', err);
    return c.redirect(`/projects/${projectId}/phases/${phaseId}?error=upload-failed`);
  }

  await createUpload(
    c.env.DB,
    uploadId,
    phaseId,
    user.id,
    file.name,
    type,
    key,
    file.type,
    file.size,
    notes
  );

  // KI-Auto-Tagging for images (error-tolerant)
  if (type === 'image') {
    try {
      const object = await c.env.R2.get(key);
      if (object) {
        const imageBuffer = await object.arrayBuffer();
        const result = await analyzeImage(c.env.AI, imageBuffer, file.type);
        if (result && result.tags.length > 0) {
          const tagsStr = formatTags(result.tags);
          await updateUploadTags(c.env.DB, uploadId, tagsStr);
        }
      }
    } catch (tagErr) {
      // Tagging errors don't block the upload
      console.error('Auto-tagging failed for upload', uploadId, tagErr);
    }
  }

  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=uploaded`);
});

// Delete upload
uploadRoutes.post('/uploads/:uploadId/delete', requireAuth, async (c) => {
  const user = c.get('user')!;
  const uploadId = c.req.param('uploadId')!;
  const upload = await getUploadById(c.env.DB, uploadId);
  if (!upload) return c.notFound();

  // Find project ID from phase
  const phase = await getPhaseById(c.env.DB, upload.phase_id);
  if (!phase) return c.notFound();

  await deleteFile(c.env.R2, upload.r2_key);
  await deleteUpload(c.env.DB, uploadId);

  return c.redirect(`/projects/${phase.project_id}/phases/${upload.phase_id}?ok=deleted`);
});

// Serve R2 file
uploadRoutes.get('/r2/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.R2.get(key);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, {
    headers,
  });
});

export default uploadRoutes;
