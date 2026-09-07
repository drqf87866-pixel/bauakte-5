import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import { getProjectById, getPhaseById, getUploadById, deleteUpload, updateUploadNotes, getPendingUploadsForProject } from '../db/queries';
import { deleteFile } from '../lib/r2';
import { runAiTagging, mergeAndSaveTags } from '../lib/upload';
import { requireAuth } from '../auth/middleware';
import { canAccessProject } from '../lib/auth';
import { isUploadStale } from '../components/upload/upload-meta';
import { UploadDetailPage } from '../views/upload-detail';

const uploadRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

function documentsUrl(projectId: string, phaseId: string, extra: string): string {
  return `/projects/${projectId}/documents?phases=${phaseId}&${extra}`;
}

// Upload detail page
uploadRoutes.get('/uploads/:uploadId', requireAuth, async (c) => {
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

  return c.html(
    <UploadDetailPage
      user={user}
      project={project}
      phase={phase}
      upload={upload}
      ok={c.req.query('ok')}
      error={c.req.query('error')}
    />
  );
});

// Edit upload notes
uploadRoutes.post('/uploads/:uploadId/notes', requireAuth, async (c) => {
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

  const form = await c.req.parseBody<{ notes: string }>();
  const notes = (form.notes || '').trim();
  await updateUploadNotes(c.env.DB, uploadId, notes);

  return c.redirect(`/uploads/${uploadId}?ok=notes-saved`);
});

// Edit upload tags
uploadRoutes.post('/uploads/:uploadId/tags', requireAuth, async (c) => {
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

  const form = await c.req.parseBody<{ manual_tags: string }>();
  const manualTags = (form.manual_tags || '').trim();
  await mergeAndSaveTags({ DB: c.env.DB }, uploadId, manualTags);

  return c.redirect(`/uploads/${uploadId}?ok=tags-saved`);
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

  return c.redirect(documentsUrl(phase.project_id, upload.phase_id, 'ok=deleted'));
});

// Retry AI auto-tagging for an upload
uploadRoutes.post('/uploads/:uploadId/retag', requireAuth, async (c) => {
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

  if (upload.type !== 'image') {
    return c.redirect(documentsUrl(phase.project_id, upload.phase_id, 'error=retag-not-image'));
  }

  await runAiTagging(c.env, {
    uploadId,
    type: upload.type,
    r2Key: upload.r2_key,
    mimeType: upload.mime_type,
  });

  const updated = await getUploadById(c.env.DB, uploadId);
  if (updated?.tag_status === 'failed') {
    return c.redirect(`/uploads/${uploadId}?error=retag-failed`);
  }
  return c.redirect(`/uploads/${uploadId}?ok=retagged`);
});

// Batch analyze all pending/failed images in a project
uploadRoutes.post('/projects/:projectId/batch-retag', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projectId = c.req.param('projectId')!;
  const project = await getProjectById(c.env.DB, projectId);
  if (!project) return c.notFound();
  if (!(await canAccessProject(c.env.DB, project, user.id))) {
    return c.text('Forbidden', 403);
  }

  const pending = await getPendingUploadsForProject(c.env.DB, projectId, 5);

  if (pending.length > 0) {
    // Analyse im Hintergrund ausführen – der Request antwortet sofort.
    // Bleibt das CPU-Budget (Free-Plan) erschöpft, bleiben Restbilder 'pending'
    // und können per erneutem Klick nachgearbeitet werden.
    c.executionCtx.waitUntil(
      (async () => {
        for (const upload of pending) {
          await runAiTagging(c.env, {
            uploadId: upload.id,
            type: upload.type,
            r2Key: upload.r2_key,
            mimeType: upload.mime_type,
          });
        }
      })()
    );
  }

  return c.redirect(`/projects/${projectId}?ok=batch-analyzed&n=${pending.length}`);
});

// JSON endpoint: poll tag_status for a list of uploads (auto-refresh)
uploadRoutes.get('/uploads/status', requireAuth, async (c) => {
  const idsParam = c.req.query('ids');
  if (!idsParam) return c.json({ statuses: {}, stale: {} });

  const ids = idsParam.split(',').filter(Boolean).slice(0, 50);
  const statuses: Record<string, string> = {};
  const stale: Record<string, boolean> = {};

  for (const id of ids) {
    const upload = await getUploadById(c.env.DB, id);
    if (upload) {
      statuses[id] = upload.tag_status;
      stale[id] = isUploadStale(upload);
    }
  }

  return c.json({ statuses, stale });
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
