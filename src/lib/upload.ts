import type { Env } from '../db/schema';
import { createUpload, updateUploadTags } from '../db/queries';
import { uploadFile } from './r2';
import { analyzeImage, formatTags } from './ai-tags';

export interface UploadResult {
  uploadId: string;
  key: string;
  type: 'image' | 'video' | 'doc';
}

/**
 * Uploads a file, creates a DB record, and triggers AI auto-tagging for images.
 * Shared between phase upload and quick upload routes.
 */
export async function handleUpload(
  env: Pick<Env, 'DB' | 'R2' | 'AI'>,
  file: File,
  phaseId: string,
  userId: string,
  notes: string,
): Promise<UploadResult> {
  const uploadId = crypto.randomUUID();
  const { key, type } = await uploadFile(env.R2, file, phaseId, uploadId);

  await createUpload(
    env.DB,
    uploadId,
    phaseId,
    userId,
    file.name,
    type,
    key,
    file.type,
    file.size,
    notes,
  );

  // AI auto-tagging for images (error-tolerant)
  if (type === 'image') {
    try {
      const object = await env.R2.get(key);
      if (object) {
        const imageBuffer = await object.arrayBuffer();
        const result = await analyzeImage(env.AI, imageBuffer, file.type);
        if (result && result.tags.length > 0) {
          const tagsStr = formatTags(result.tags);
          await updateUploadTags(env.DB, uploadId, tagsStr);
        }
      }
    } catch (tagErr) {
      console.error('Auto-tagging failed for upload', uploadId, tagErr);
    }
  }

  return { uploadId, key, type };
}
