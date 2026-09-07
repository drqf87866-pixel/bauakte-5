import { jsx } from 'hono/jsx';
import { Layout, Flash } from './layout';
import type { User, Project, Phase, Upload } from '../db/schema';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { InputField, FileInputField } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';

export function PhaseDetailPage({
  user, project, phase, allPhases, uploads, uploadTotal, uploadPage, uploadTotalPages,
  allTags, activeTag, error, ok,
}: {
  user: User;
  project: Project;
  phase: Phase;
  allPhases: Phase[];
  uploads: Upload[];
  uploadTotal?: number;
  uploadPage?: number;
  uploadTotalPages?: number;
  allTags?: string[];
  activeTag?: string;
  error?: string | null;
  ok?: string | null;
}) {
  const currentIndex = allPhases.findIndex(p => p.id === phase.id);
  const prevPhase = currentIndex > 0 ? allPhases[currentIndex - 1] : null;
  const nextPhase = currentIndex < allPhases.length - 1 ? allPhases[currentIndex + 1] : null;
  const phaseBaseUrl = '/projects/' + project.id + '/phases/' + phase.id;
  const paginationBaseUrl = activeTag ? phaseBaseUrl + '?tag=' + encodeURIComponent(activeTag) : phaseBaseUrl;

  return (
    <Layout user={user} title={phase.name + ' - ' + project.name} active='projects'>
      <Breadcrumb items={[
        { label: project.name, href: '/projects/' + project.id },
        { label: phase.name },
      ]} />

      <Flash error={error} ok={ok} />

      {/* Horizontal scrollable phase navigation */}
      <div class='flex overflow-x-auto gap-2 pb-3 mb-4 -mx-4 px-4 snap-x scrollbar-hide'>
        {allPhases.map((p) => (
          <a href={'/projects/' + project.id + '/phases/' + p.id}
            aria-current={p.id === phase.id ? 'page' : undefined}
            class={'snap-start shrink-0 px-4 py-2 rounded-full text-sm font-bold min-h-[48px] flex items-center no-underline transition ' +
              (p.id === phase.id
                ? 'bg-slate-900 text-white shadow-md'
                : p.status === 'completed'
                  ? 'bg-success text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}>
            {p.sort_order}. {p.name}
          </a>
        ))}
      </div>

      <div class='card mb-6'>
        <div class='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
          <div>
            <h1 class='text-2xl font-bold text-slate-900'>{phase.name}</h1>
            <p class='text-sm text-slate-600 font-medium mt-1'>
              Phase {phase.sort_order} von {allPhases.length}
            </p>
          </div>
          <div class='w-full md:w-auto'>
            {phase.status === 'in_progress' && (
              <form method='post' action={'/projects/' + project.id + '/phases/' + phase.id + '/complete'}>
                <Button type='submit' variant='success' class='w-full md:w-auto'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>
                  Phase abschlie&szlig;en
                </Button>
              </form>
            )}
            {phase.status === 'completed' && (
              <span class='block w-full md:w-auto text-center bg-success text-white px-4 py-3 rounded-lg text-base font-bold min-h-[48px] flex items-center justify-center gap-2'>
                <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>
                Abgeschlossen
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prev/Next navigation for desktop fallback */}
      <div class='hidden md:flex justify-between mb-6'>
        {prevPhase ? (
          <a href={'/projects/' + project.id + '/phases/' + prevPhase.id}
            class='text-sm text-accent hover:underline font-semibold no-underline'>
            &larr; {prevPhase.name}
          </a>
        ) : <div />}
        {nextPhase ? (
          <a href={'/projects/' + project.id + '/phases/' + nextPhase.id}
            class='text-sm text-accent hover:underline font-semibold no-underline'>
            {nextPhase.name} &rarr;
          </a>
        ) : <div />}
      </div>

      <div class='card mb-6'>
        <h2 class='font-bold text-lg mb-3 text-slate-900'>Dokumentation hinzuf&uuml;gen</h2>
        <form method='post'
          action={'/projects/' + project.id + '/phases/' + phase.id + '/upload'}
          encType='multipart/form-data'
          data-upload-form
          aria-label='Dokument hochladen'
          class='space-y-4'>
          <FileInputField name='file' id='file' label='Datei ausw&auml;hlen (Foto, Video, PDF)'
            accept='image/*,video/*,.pdf,.doc,.docx'
            capture='environment'
            required />
          <InputField type='text' name='notes' id='notes' placeholder='Kurze Beschreibung...' label='Notiz' />
          <Button type='submit' variant='primary'>Hochladen</Button>
        </form>
      </div>

      <h2 class='font-bold text-lg mb-3 text-slate-900'>Dokumente ({uploadTotal ?? uploads.length})</h2>

      {/* Tag filter bar */}
      {allTags && allTags.length > 0 && (
        <div class='flex flex-wrap gap-2 mb-4'>
          <a href={phaseBaseUrl}
            class={'px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
              (!activeTag ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}>
            Alle
          </a>
          {allTags.map(tag => (
            <a key={tag} href={phaseBaseUrl + '?tag=' + encodeURIComponent(tag)}
              class={'px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                (activeTag === tag ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}>
              {tag}
            </a>
          ))}
        </div>
      )}

      {uploads.length === 0 ? (
        <div class='empty-state'>
          <svg class='mx-auto mb-3 text-slate-300' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg>
          <p class='font-bold text-slate-900'>Noch keine Dokumente vorhanden</p>
          <p class='text-sm text-slate-600 font-medium mt-1'>
            Lade &uuml;ber das Formular oben ein Foto, Video oder PDF hoch.
          </p>
        </div>
      ) : (
        <div class='grid gap-3 grid-cols-2 lg:grid-cols-3'>
          {uploads.map((upload) => (
            <div key={upload.id} class='bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col'>
              {upload.type === 'image' ? (
                <a href={'/r2/' + upload.r2_key} target='_blank' rel='noopener'
                  class='block' aria-label={'Foto ' + upload.filename + ' in voller Gr\u00f6\u00dfe \u00f6ffnen'}>
                  <img src={'/r2/' + upload.r2_key}
                    alt={upload.notes ? upload.notes : upload.filename}
                    class='w-full h-32 sm:h-48 object-cover' loading='lazy'
                    data-img-fallback />
                </a>
              ) : upload.type === 'video' ? (
                <div class='w-full h-32 sm:h-48 bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium gap-2'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='2' width='20' height='20' rx='2.18' ry='2.18'/><line x1='7' y1='2' x2='7' y2='22'/><line x1='17' y1='2' x2='17' y2='22'/><line x1='2' y1='12' x2='22' y2='12'/><line x1='2' y1='7' x2='7' y2='7'/><line x1='17' y1='7' x2='22' y2='7'/><line x1='17' y1='17' x2='22' y2='17'/><line x1='2' y1='17' x2='7' y2='17'/><line x1='17' y1='17' x2='22' y2='17'/></svg>
                  Video
                </div>
              ) : (
                <div class='w-full h-32 sm:h-48 bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium gap-2'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/></svg>
                  Dokument
                </div>
              )}
              <div class='p-3 flex flex-col flex-1'>
                <p class='text-sm font-bold truncate text-slate-900'>{upload.filename}</p>
                {upload.notes && (
                  <p class='text-xs text-slate-600 mt-1 line-clamp-2'>{upload.notes}</p>
                )}
                {upload.tags && (
                  <div class='flex flex-wrap gap-1 mt-2'>
                    {upload.tags.split(',').map((tag) => (
                      <Badge key={tag.trim()} variant='tag'>{tag.trim()}</Badge>
                    ))}
                  </div>
                )}
                <div class='flex items-center justify-between mt-auto pt-2 gap-2'>
                  <span class='text-xs text-slate-500 font-medium'>
                    {new Date(upload.created_at).toLocaleDateString('de-DE')}
                  </span>
                  <form method='post' action={'/uploads/' + upload.id + '/delete'} class='inline'
                    data-confirm-delete
                    data-confirm-message='Dieses Dokument wirklich l\u00f6schen?'>
                    <Button type='submit' variant='danger' size='sm'>L\u00f6schen</Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {uploadTotalPages && uploadTotalPages > 1 && (
        <Pagination currentPage={uploadPage ?? 1} totalPages={uploadTotalPages}
          baseUrl={paginationBaseUrl} />
      )}
    </Layout>
  );
}
