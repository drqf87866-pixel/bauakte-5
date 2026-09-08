import { Layout, Flash } from './layout';
import type { Upload, Phase, Project, User } from '../db/schema';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { uploadCaption, isUploadStale, PendingUploadPoller } from '../components/upload/upload-meta';

function documentsUrl(projectId: string): string {
  return '/projects/' + projectId + '/documents';
}

export function UploadDetailPage({
  user, project, phase, upload, ok, error,
}: {
  user: User;
  project: Project;
  phase: Phase;
  upload: Upload;
  ok?: string | null;
  error?: string | null;
}) {
  const caption = uploadCaption(upload);
  const manualTags = upload.manual_tags
    ? upload.manual_tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];
  const aiTags = upload.ai_tags
    ? upload.ai_tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <Layout user={user} title={upload.filename + ' – ' + project.name} active='projects'>
      <Breadcrumb items={[
        { label: project.name, href: documentsUrl(project.id) },
        { label: phase.name, href: documentsUrl(project.id) + '?phases=' + phase.id },
        { label: upload.filename },
      ]} />

      <Flash ok={ok} error={error} />

      <div class='grid gap-6 lg:grid-cols-[1fr_340px]'>
        {/* Linke Spalte: Bild */}
        <div>
          {upload.type === 'image' ? (
            <a href={'/r2/' + upload.r2_key} target='_blank' rel='noopener'
              class='block rounded-xl overflow-hidden bg-stone-100 border border-stone-200'
              aria-label={'Foto in voller Größe öffnen'}>
              <img src={'/r2/' + upload.r2_key}
                alt={upload.notes || upload.filename}
                class='w-full object-contain max-h-[70vh]' loading='lazy' />
            </a>
          ) : upload.type === 'video' ? (
            <video controls class='w-full rounded-xl bg-stone-900 max-h-[70vh]' aria-label='Video: {upload.filename}'>
              <source src={'/r2/' + upload.r2_key} type={upload.mime_type} />
              Dein Browser unterstützt kein Video-Tag.
            </video>
          ) : upload.mime_type === 'application/pdf' ? (
            <embed src={'/r2/' + upload.r2_key} type='application/pdf' class='w-full h-[70vh] rounded-xl border border-stone-200' aria-label='PDF: {upload.filename}' />
          ) : (
            <div class='rounded-xl bg-stone-100 flex items-center justify-center h-64 lg:h-80 border border-stone-200'>
              <svg class='text-stone-400' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/></svg>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Metadaten & Bearbeiten */}
        <div class='space-y-5'>
          {/* Datei-Info */}
          <div>
            <h1 class='text-xl font-bold text-stone-900 truncate'>{upload.filename}</h1>
            <p class='text-sm text-stone-500 font-medium mt-1'>
              {phase.name} · {new Date(upload.created_at).toLocaleDateString('de-DE')}
              {' '}&middot;{' '}{(upload.file_size / 1024).toFixed(0)} KB
            </p>
          </div>

          {/* KI-Beschreibung */}
          {caption.text && (
            <div class='card'>
              <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide mb-2'>
                {caption.fromAi ? 'KI-Beschreibung' : 'Notiz'}
              </h2>
              <p class={'text-sm ' + (caption.fromAi ? 'text-stone-600 italic' : 'text-stone-800')}>
                {caption.fromAi && (
                  <svg class='inline-block mr-1 text-accent -mt-0.5' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z'/></svg>
                )}
                {caption.text}
              </p>
            </div>
          )}

          {/* Notiz bearbeiten */}
          <form method='post' action={'/uploads/' + upload.id + '/notes'} class='card'>
            <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide mb-2'>Notiz</h2>
            <textarea name='notes' rows={2}
              class='w-full text-sm border border-stone-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent'
              placeholder='Kurze Notiz zum Bild…'>{upload.notes}</textarea>
            <div class='mt-2 text-right'>
              <Button type='submit' variant='secondary' size='sm'>Speichern</Button>
            </div>
          </form>

          {/* Manuelle Tags */}
          <div class='card'>
            <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide mb-2'>Tags bearbeiten</h2>
            <form method='post' action={'/uploads/' + upload.id + '/tags'}>
              <input type='text' name='manual_tags'
                value={manualTags.join(', ')}
                class='w-full text-sm border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent'
                placeholder='Komma-getrennt: Rohbau, Beton, Dach…' />
              <p class='text-xs text-stone-400 mt-1'>Werden mit den KI-Tags zusammengeführt</p>
              <div class='mt-2 text-right'>
                <Button type='submit' variant='secondary' size='sm'>Speichern</Button>
              </div>
            </form>
          </div>

          {/* KI-Tags (nur anzeigen, falls vorhanden) */}
          {aiTags.length > 0 && (
            <div class='card'>
              <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide mb-2'>
                <svg class='inline-block mr-1 text-accent -mt-0.5' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z'/></svg>
                KI-Tags
              </h2>
              <div class='flex flex-wrap gap-1'>
                {aiTags.map(t => <Badge key={t} variant='tag'>{t}</Badge>)}
              </div>
            </div>
          )}

          {/* Status */}
          {upload.type === 'image' && upload.tag_status !== 'done' && upload.tag_status !== 'none' && (
            <div class='card'>
              <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide mb-2'>KI-Status</h2>
              {upload.tag_status === 'pending' && !isUploadStale(upload) && (
                <div class='flex items-center gap-2'>
                  <svg class='animate-spin shrink-0 text-accent' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'><path d='M21 12a9 9 0 1 1-6.219-8.56'/></svg>
                  <span class='text-sm font-semibold text-[#8a6a1f]'>Wird analysiert&hellip;</span>
                </div>
              )}
              {upload.tag_status === 'pending' && isUploadStale(upload) && (
                <div class='space-y-2'>
                  <p class='text-sm font-semibold text-[#8a6a1f]'>
                    Analyse dauert ungewöhnlich lange
                  </p>
                  <form method='post' action={'/uploads/' + upload.id + '/retag'} class='inline'>
                    <Button type='submit' variant='secondary' size='sm'>Erneut analysieren</Button>
                  </form>
                </div>
              )}
              {upload.tag_status === 'failed' && (
                <div class='space-y-2'>
                  <p class='text-sm font-semibold text-error' title={upload.tag_error || undefined}>
                    Analyse fehlgeschlagen
                  </p>
                  <form method='post' action={'/uploads/' + upload.id + '/retag'} class='inline'>
                    <Button type='submit' variant='secondary' size='sm'>Erneut analysieren</Button>
                  </form>
                </div>
              )}
            </div>
          )}
          {upload.type === 'image' && upload.tag_status === 'pending' && !isUploadStale(upload) && (
            <PendingUploadPoller ids={[upload.id]} />
          )}

          {/* Aktionen */}
          <div class='flex flex-wrap gap-2'>
            {upload.type === 'image' && (
              <form method='post' action={'/uploads/' + upload.id + '/retag'} class='inline'>
                <Button type='submit' variant='ghost' size='sm'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='23 4 23 10 17 10'/><path d='M20.49 15A9 9 0 1 1 14.33 3.57L23 10'/></svg>
                  KI-Analyse wiederholen
                </Button>
              </form>
            )}
            <form method='post' action={'/uploads/' + upload.id + '/delete'}
              class='inline'
              data-confirm-delete
              data-confirm-message='Dieses Dokument wirklich löschen?'>
              <Button type='submit' variant='danger-outline' size='sm'>Löschen</Button>
            </form>
            <Button href={documentsUrl(project.id) + '?phases=' + phase.id} variant='ghost' size='sm'>
              Zurück zur Phase
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
