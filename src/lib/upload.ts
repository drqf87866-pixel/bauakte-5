import type { Env, Upload } from '../db/schema';
import { createUpload, getUploadById, updateUploadAiResult, updateUploadTags } from '../db/queries';
import { uploadFile } from './r2';
import { analyzeImage, formatTags, MAX_AI_IMAGE_BYTES } from './ai-tags';

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
 * The image is streamed from R2 into the Images binding, which downscales it
 * to a small JPEG for the AI call (the resize runs outside the Worker CPU budget).
 *
 * Merges existing manual_tags with freshly generated AI tags.
 * When retagging, previous ai_tags are replaced; manual_tags are kept.
 */
export async function runAiTagging(
  env: Pick<Env, 'DB' | 'R2' | 'AI' | 'IMAGES'>,
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

    if (object.size > MAX_AI_IMAGE_BYTES) {
      await updateUploadAiResult(env.DB, target.uploadId, {
        status: 'failed',
        error: 'Bild ist zu groß für die KI-Analyse (max. 20 MB)',
      });
      return;
    }

    const result = await analyzeImage(
      env,
      object.body,
      target.mimeType
    );

    if (!result) {
      await updateUploadAiResult(env.DB, target.uploadId, {
        status: 'failed',
        error: 'Analyse konnte nicht verarbeitet werden',
      });
      return;
    }

    // Bestehende manuelle Tags beibehalten, KI-Tags neu erzeugen
    const existing = await getUploadById(env.DB, target.uploadId);
    const manualTags = existing?.manual_tags
      ? existing.manual_tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const manualSet = new Set(manualTags.map(t => t.toLowerCase()));
    const newAiTags = result.tags.filter(t => !manualSet.has(t.toLowerCase()));
    const merged = formatTags([...manualTags, ...newAiTags]);

    await updateUploadAiResult(env.DB, target.uploadId, {
      tags: merged,
      aiTags: formatTags(newAiTags),
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
 * Merges manual_tags (user-edited) with current ai_tags into the denormalized `tags` column.
 * Use after editing manual_tags on the detail page.
 */
export async function mergeAndSaveTags(
  db: Pick<Env, 'DB'>,
  uploadId: string,
  newManualTags: string
): Promise<void> {
  const upload = await getUploadById(db.DB, uploadId);
  if (!upload) return;
  const aiTags = upload.ai_tags.split(',').map(t => t.trim()).filter(Boolean);
  const manualTags = newManualTags.split(',').map(t => t.trim()).filter(Boolean);
  const merged = formatTags([...manualTags, ...aiTags]);
  await updateUploadTags(db.DB, uploadId, formatTags(manualTags), merged);
}

/**
 * Uploads a file, creates a DB record, and triggers AI auto-tagging for images.
 * Shared between phase upload and quick upload routes.
 *
 * When `ctx` is provided (request ExecutionContext), auto-tagging runs in the
 * background via `ctx.waitUntil` so the upload responds immediately; the UI
 * already polls tag_status ('pending' → spinner / 'done' / 'failed' + retry).
 * Without `ctx` (e.g. in tests) tagging runs inline.
 */
export interface WaitUntil {
  waitUntil(promise: Promise<unknown>): void;
}

export async function handleUpload(
  env: Pick<Env, 'DB' | 'R2' | 'AI' | 'IMAGES'>,
  file: File,
  phaseId: string,
  userId: string,
  notes: string,
  initialTags: string = '',
  ctx?: WaitUntil,
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
    const target: AiTaggingTarget = {
      uploadId,
      type,
      r2Key: key,
      mimeType: file.type,
    };
    if (ctx) {
      ctx.waitUntil(runAiTagging(env, target));
    } else {
      await runAiTagging(env, target);
    }
  }

  return { uploadId, key, type };
}
