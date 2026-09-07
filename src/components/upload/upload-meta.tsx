import type { Upload } from '../../db/schema';
import { Badge } from '../ui/badge';

export function uploadTags(upload: Upload): string[] {
  if (!upload.tags) return [];
  return upload.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function uploadCaption(upload: Upload): { text: string; fromAi: boolean } {
  if (upload.notes) return { text: upload.notes, fromAi: false };
  if (upload.ai_description) return { text: upload.ai_description, fromAi: true };
  return { text: '', fromAi: false };
}

export function UploadCaption({ upload }: { upload: Upload }) {
  const caption = uploadCaption(upload);
  if (!caption.text) return null;
  return (
    <p class={'text-xs mt-1 line-clamp-2 ' + (caption.fromAi ? 'text-slate-500 italic' : 'text-slate-600')}>
      {caption.fromAi && (
        <svg class='inline-block mr-1 text-accent -mt-0.5' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z'/></svg>
      )}
      {caption.text}
    </p>
  );
}

export function TagChips({ upload, limit }: { upload: Upload; limit?: number }) {
  const tags = uploadTags(upload);
  if (tags.length === 0) return null;
  const shown = limit ? tags.slice(0, limit) : tags;
  const hidden = tags.length - shown.length;
  return (
    <div class='flex flex-wrap gap-1 mt-2'>
      {shown.map((tag) => <Badge key={tag} variant='tag'>{tag}</Badge>)}
      {hidden > 0 && (
        <span class='text-xs text-slate-400 font-semibold self-center' title={tags.slice(limit).join(', ')}>
          +{hidden}
        </span>
      )}
    </div>
  );
}
