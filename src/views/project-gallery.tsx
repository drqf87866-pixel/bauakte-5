import { Layout, Flash } from './layout';
import type { Project, Phase, Upload, User } from '../db/schema';
import type { ProjectTagWithCount, PhaseMediaCount } from '../db/queries';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { InputField } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';
import { UploadCaption, TagChips } from '../components/upload/upload-meta';

function qs(params: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      parts.push(k + '=' + encodeURIComponent(v.join(',')));
    } else {
      parts.push(k + '=' + encodeURIComponent(v));
    }
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function galleryUrl(
  baseUrl: string,
  activePhases: string[],
  activeTag: string | undefined,
  q: string | undefined,
  tagToToggle?: string,
): string {
  let nextPhases = activePhases;
  if (tagToToggle !== undefined) {
    if (activePhases.includes(tagToToggle)) {
      nextPhases = activePhases.filter(id => id !== tagToToggle);
    } else {
      nextPhases = [...activePhases, tagToToggle];
    }
  }
  let nextTag: string | undefined = activeTag;
  if (tagToToggle === '__clear_tag__') nextTag = undefined;
  else if (tagToToggle === activeTag) nextTag = undefined;

  return baseUrl + qs({
    phases: nextPhases.length > 0 ? nextPhases : undefined,
    tag: nextTag,
    q: q && q.length > 0 ? q : undefined,
  });
}

export function ProjectGalleryPage({
  user, project, phases, mediaCounts, tags, uploads,
  uploadTotal, uploadPage, uploadTotalPages,
  activePhases, activeTag, q, ok,
}: {
  user: User;
  project: Project;
  phases: Phase[];
  mediaCounts: PhaseMediaCount[];
  tags: ProjectTagWithCount[];
  uploads: Upload[];
  uploadTotal: number;
  uploadPage: number;
  uploadTotalPages: number;
  activePhases: string[];
  activeTag?: string;
  q?: string;
  ok?: string | null;
}) {
  const countMap = new Map(mediaCounts.map(m => [m.phase_id, m.count]));
  const baseUrl = '/projects/' + project.id + '/gallery';
  const phaseBaseUrl = '/projects/' + project.id;

  return (
    <Layout user={user} title={'Galerie - ' + project.name} active='projects'>
      <Breadcrumb items={[
        { label: project.name, href: phaseBaseUrl },
        { label: 'Galerie' },
      ]} />

      <div class='flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4'>
        <div>
          <h1 class='text-2xl font-bold text-slate-900'>Galerie</h1>
          <p class='text-sm text-slate-600 font-medium mt-1'>
            {uploadTotal} {uploadTotal === 1 ? 'Medium' : 'Medien'} {activeTag ? <>mit Tag <span class='text-slate-900 font-bold'>{activeTag}</span></> : null}{q ? <> · Suche „{q}"</> : null}
          </p>
        </div>
        <a href={phaseBaseUrl} class='text-sm text-accent font-semibold no-underline hover:underline min-h-[40px] flex items-center'>
          &larr; Zur&uuml;ck zum Projekt
        </a>
      </div>

      <Flash ok={ok} />

      {/* Sticky Filter-Bar */}
      <div class='sticky top-0 z-30 -mx-4 px-4 py-3 bg-slate-50/95 backdrop-blur border-b border-slate-200 mb-4'>
        <form method='get' action={baseUrl} class='mb-3'>
          {activePhases.length > 0 && <input type='hidden' name='phases' value={activePhases.join(',')} />}
          {activeTag && <input type='hidden' name='tag' value={activeTag} />}
          <InputField type='search' name='q' id='q'
            placeholder='Suche in Dateiname, Notiz, KI-Beschreibung, Tags…'
            value={q || ''} />
        </form>

        {/* Tag-Chips */}
        {tags.length > 0 && (
          <div class='flex flex-wrap gap-2 mb-3'>
            <a href={galleryUrl(baseUrl, activePhases, activeTag, q, '__clear_tag__')}
              class={'px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                (!activeTag ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}>
              Alle Tags
            </a>
            {tags.map(t => (
              <a key={t.tag}
                href={galleryUrl(baseUrl, activePhases, activeTag, q, t.tag)}
                class={'px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                  (activeTag === t.tag
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}>
                {t.tag} <span class={'ml-1 text-xs ' + (activeTag === t.tag ? 'opacity-75' : 'text-slate-500')}>{t.count}</span>
              </a>
            ))}
          </div>
        )}

        {/* Phase-Multi-Filter */}
        <div class='flex overflow-x-auto gap-2 -mx-4 px-4 snap-x scrollbar-hide'>
          <a href={galleryUrl(baseUrl, [], activeTag, q)}
            aria-current={activePhases.length === 0 ? 'page' : undefined}
            class={'snap-start shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
              (activePhases.length === 0
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400')}>
            Alle Phasen
          </a>
          {phases.map(p => {
            const isActive = activePhases.includes(p.id);
            const count = countMap.get(p.id) || 0;
            return (
              <a key={p.id} href={galleryUrl(baseUrl, activePhases, activeTag, q, p.id)}
                aria-current={isActive ? 'page' : undefined}
                class={'snap-start shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                  (isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400')}>
                {p.name} <span class={'ml-1 text-xs ' + (isActive ? 'opacity-75' : 'text-slate-500')}>{count}</span>
              </a>
            );
          })}
        </div>
      </div>

      {uploads.length === 0 ? (
        <div class='empty-state'>
          <svg class='mx-auto mb-3 text-slate-300' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>
          <p class='font-bold text-slate-900'>
            {q ? <>Keine Treffer f&uuml;r &bdquo;{q}&ldquo;</> : activeTag ? <>Keine Medien mit Tag &bdquo;{activeTag}&ldquo;</> : 'Noch keine Medien'}
          </p>
          {(q || activeTag) && (
            <p class='text-sm text-slate-600 font-medium mt-1'>
              <a href={baseUrl} class='text-accent hover:underline font-semibold'>Filter zur&uuml;cksetzen</a>
            </p>
          )}
        </div>
      ) : (
        <div class='grid gap-3 grid-cols-2 lg:grid-cols-4'>
          {uploads.map(upload => {
            const phase = phases.find(p => p.id === upload.phase_id);
            return (
              <a key={upload.id} href={'/r2/' + upload.r2_key} target='_blank' rel='noopener'
                aria-label={upload.filename + ' in voller Größe öffnen'}
                class='bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col no-underline hover:shadow-md transition group'>
                {upload.type === 'image' ? (
                  <img src={'/r2/' + upload.r2_key}
                    alt={upload.notes || upload.filename}
                    class='w-full h-40 sm:h-56 object-cover' loading='lazy' data-img-fallback />
                ) : upload.type === 'video' ? (
                  <div class='w-full h-40 sm:h-56 bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium gap-2'>
                    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><polygon points='23 7 16 12 23 17 23 7'/><rect x='1' y='5' width='15' height='14' rx='2' ry='2'/></svg>
                    Video
                  </div>
                ) : (
                  <div class='w-full h-40 sm:h-56 bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium gap-2'>
                    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/></svg>
                    Dokument
                  </div>
                )}
                <div class='p-3 flex flex-col flex-1'>
                  <div class='flex items-center gap-2 mb-1'>
                    {phase && <span class='text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold'>{phase.name}</span>}
                    <span class='text-xs text-slate-500 font-medium ml-auto'>{new Date(upload.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                  <p class='text-sm font-bold truncate text-slate-900'>{upload.filename}</p>
                  <UploadCaption upload={upload} />
                  <TagChips upload={upload} limit={3} />
                </div>
              </a>
            );
          })}
        </div>
      )}

      {uploadTotalPages > 1 && (
        <Pagination currentPage={uploadPage} totalPages={uploadTotalPages}
          baseUrl={baseUrl + qs({
            phases: activePhases.length > 0 ? activePhases.join(',') : undefined,
            tag: activeTag,
            q: q && q.length > 0 ? q : undefined,
          })} />
      )}
    </Layout>
  );
}
