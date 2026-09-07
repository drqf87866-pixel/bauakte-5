import type { Upload } from '../../db/schema';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

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
    <p class={'text-xs mt-1 line-clamp-2 ' + (caption.fromAi ? 'text-stone-500 italic' : 'text-stone-600')}>
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
        <span class='text-xs text-stone-400 font-semibold self-center' title={tags.slice(limit).join(', ')}>
          +{hidden}
        </span>
      )}
    </div>
  );
}

/**
 * Wie lange ein Upload höchstens 'pending' bleiben sollte, bevor wir die
 * automatische KI-Analyse als "hängengeblieben" behandeln (z.B. weil der
 * Worker das Free-Plan-CPU-Limit gerissen hat, bevor env.AI.run() erreicht
 * wurde – dabei greift der try/catch in runAiTagging nicht, tag_status bleibt
 * sonst für immer 'pending'). Es gibt keine updated_at-Spalte, daher wird
 * created_at als Referenz genutzt.
 */
export const AI_STALE_THRESHOLD_MS = 90_000;

export function isUploadStale(upload: Pick<Upload, 'tag_status' | 'created_at'>): boolean {
  if (upload.tag_status !== 'pending') return false;
  return Date.now() - new Date(upload.created_at).getTime() > AI_STALE_THRESHOLD_MS;
}

/** Shows the async AI-tagging status of an image upload (pending spinner / stale hint / failed + retry). */
export function AiStatusIndicator({ upload }: { upload: Upload }) {
  if (upload.type !== 'image' || upload.tag_status === 'done' || upload.tag_status === 'none') {
    return null;
  }
  if (upload.tag_status === 'pending' && !isUploadStale(upload)) {
    return (
      <div class='flex items-center gap-1.5 mt-2'>
        <svg class='animate-spin shrink-0 text-accent' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'><path d='M21 12a9 9 0 1 1-6.219-8.56'/></svg>
        <span class='text-xs font-semibold text-[#8a6a1f]'>Wird analysiert&hellip;</span>
      </div>
    );
  }
  if (upload.tag_status === 'pending') {
    // Stale: die Analyse hängt vermutlich fest (z.B. CPU-Limit gerissen).
    return (
      <div class='flex items-center justify-between gap-2 mt-2'>
        <span class='text-xs font-semibold text-[#8a6a1f] truncate'>
          Analyse dauert ungewöhnlich lange
        </span>
        <form method='post' action={'/uploads/' + upload.id + '/retag'} class='inline shrink-0'>
          <Button type='submit' variant='secondary' size='sm'>Erneut analysieren</Button>
        </form>
      </div>
    );
  }
  return (
    <div class='flex items-center justify-between gap-2 mt-2'>
      <span class='text-xs font-semibold text-error truncate' title={upload.tag_error || undefined}>
        Analyse fehlgeschlagen
      </span>
      <form method='post' action={'/uploads/' + upload.id + '/retag'} class='inline shrink-0'>
        <Button type='submit' variant='secondary' size='sm'>Erneut analysieren</Button>
      </form>
    </div>
  );
}

/**
 * Client-side Auto-Refresh für 'pending' Uploads: pollt /uploads/status alle
 * 4s. Bricht ab (statt für immer zu pollen), sobald der Server einen Upload
 * als "stale" meldet, oder spätestens nach MAX_ATTEMPTS – ein erneuter Reload
 * zeigt dann den serverseitig berechneten Stale-Hinweis inkl. Retry-Button
 * (siehe isUploadStale/AiStatusIndicator oben).
 */
export function PendingUploadPoller({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  const idsParam = ids.join(',');
  return (
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        var ids = '${idsParam}'.split(',').filter(Boolean);
        if (!ids.length) return;
        var attempts = 0;
        var MAX_ATTEMPTS = 20; // ~80s bei 4s-Intervall
        var timer = setInterval(function() {
          attempts++;
          fetch('/uploads/status?ids=' + ids.join(','))
            .then(function(r) { return r.json(); })
            .then(function(data) {
              var remaining = ids.filter(function(id) {
                return data.statuses[id] === 'pending';
              });
              var stale = ids.some(function(id) {
                return data.stale && data.stale[id];
              });
              if (remaining.length === 0 || stale || attempts >= MAX_ATTEMPTS) {
                clearInterval(timer);
                window.location.reload();
              }
            })
            .catch(function() {});
        }, 4000);
      })();
    `}} />
  );
}
