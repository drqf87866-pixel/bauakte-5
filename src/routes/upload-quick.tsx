import { Hono } from 'hono';
import type { Env, User } from '../db/schema';
import { getProjectsForUser as getProjectsByUser, getPhasesForProject, createUpload } from '../db/queries';
import { uploadFile } from '../lib/r2';
import { analyzeImage, formatTags } from '../lib/ai-tags';
import { updateUploadTags } from '../db/queries';
import { requireAuth } from '../auth/middleware';
import { QuickUploadPage } from '../views/upload-quick';

const quickUploadRoutes = new Hono<{ Bindings: Env; Variables: { user: User | null } }>();

// Show quick upload page
quickUploadRoutes.get('/upload-quick', requireAuth, async (c) => {
  const user = c.get('user')!;
  const projects = await getProjectsByUser(c.env.DB, user.id);
  const phasesByProject: Record<string, any[]> = {};
  for (const project of projects) {
    phasesByProject[project.id] = await getPhasesForProject(c.env.DB, project.id);
  }
  return c.html(<QuickUploadPage user={user} projects={projects} phasesByProject={phasesByProject} error={c.req.query('error')} />);
});

// Handle quick upload submission
quickUploadRoutes.post('/upload-quick', requireAuth, async (c) => {
  const user = c.get('user')!;
  const form = await c.req.parseBody<{ file: File; notes: string; phase_id: string; project_id: string }>();
  const file = form['file'] as unknown as File | undefined;
  const notes = (form.notes || '').trim();
  const phaseId = form.phase_id;
  const projectId = form.project_id;

  if (!file || !(file instanceof File) || !phaseId || !projectId) {
    return c.redirect('/upload-quick?error=missing-fields');
  }

  const uploadId = crypto.randomUUID();
  const { key, type } = await uploadFile(c.env.R2, file, phaseId, uploadId);

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
      console.error('Auto-tagging failed for quick upload', uploadId, tagErr);
    }
  }

  return c.redirect(`/projects/${projectId}/phases/${phaseId}?ok=uploaded`);
});

export default quickUploadRoutes;