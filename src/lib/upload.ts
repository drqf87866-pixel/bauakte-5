import type { Env, Upload } from '../db/schema';
import { createUpload, getUploadById, updateUploadAiResult } from '../db/queries';
import { uploadFile } from './r2';
import { analyzeImage, formatTags } from './ai-tags';

export interface UploadResult {
  uploadId: string;
  key: string;
  type: 'image' | 'video' | 'doc';
}

export interface AiTaggingTarget {
  uploadId: string;
  type: Upload['type'];
  r2Key: string;
  mimeType: string;
}

/**
 * Runs AI auto-tagging for a single upload and persists the result
 * (tags, description, status, error) in the database.
 * Never throws – failures are recorded as tag_status='failed'.
 *
 * If the upload already has manually-entered tags (set during upload),
 * those are merged with the AI-generated tags.
 */
export async function runAiTagging(
  env: Pick<Env, 'DB' | 'R2' | 'AI'>,
  target: AiTaggingTarget
): Promise<void> {
  if (target.type !== 'image') return;

  try {
    const object = await env.R2.get(target.r2Key);
    if (!object) {
      await updateUploadAiResult(env.DB, target.uploadId, {
        status: 'failed',
        error: 'R2-Datei nicht gefunden',
      });
      return;
    }

    const imageBuffer = await object.arrayBuffer();
    const result = await analyzeImage(env.AI, imageBuffer, target.mimeType);

    if (!result) {
      await updateUploadAiResult(env.DB, target.uploadId, {
        status: 'failed',
        error: 'Analyse konnte nicht verarbeitet werden',
      });
      return;
    }

    // Merge: bestehende manuelle Tags + neue KI-Tags
    const existing = await getUploadById(env.DB, target.uploadId);
    const existingTags = existing?.tags ? existing.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const aiTags = result.tags;
    const merged = formatTags([...existingTags, ...aiTags]);

    await updateUploadAiResult(env.DB, target.uploadId, {
      tags: merged,
      description: result.description.trim().slice(0, 300),
      status: 'done',
    });
  } catch (tagErr) {
    console.error('Auto-tagging failed for upload', target.uploadId, tagErr);
    await updateUploadAiResult(env.DB, target.uploadId, {
      status: 'failed',
      error: String(tagErr).slice(0, 300),
    });
  }
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
  initialTags: string = '',
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
    formatTags(initialTags.split(',').map(t => t.trim()).filter(Boolean)),
  );

  // AI auto-tagging for images
  if (type === 'image') {
    await runAiTagging(env, {
      uploadId,
      type,
      r2Key: key,
      mimeType: file.type,
    });
  }

  return { uploadId, key, type };
}
