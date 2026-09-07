import { Layout, Flash } from './layout';
import type { Project, Phase, Upload, User } from '../db/schema';
import type { ProjectTagWithCount, PhaseMediaCount } from '../db/queries';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { InputField } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';
import { ProjectTabs } from '../components/layout/project-tabs';
import { PhaseActionPanel } from '../components/upload/phase-panel';
import { UploadCaption, TagChips, AiStatusIndicator } from '../components/upload/upload-meta';

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

function documentsUrl(
  baseUrl: string,
  activePhases: string[],
  activeTag: string | undefined,
  q: string | undefined,
  toggle?: string,
): string {
  let nextPhases = activePhases;
  if (toggle !== undefined && toggle !== '__clear_tag__') {
    nextPhases = activePhases.includes(toggle)
      ? activePhases.filter(id => id !== toggle)
      : [...activePhases, toggle];
  }
  let nextTag: string | undefined = activeTag;
  if (toggle === '__clear_tag__' || toggle === activeTag) nextTag = undefined;

  return baseUrl + qs({
    phases: nextPhases.length > 0 ? nextPhases : undefined,
    tag: nextTag,
    q: q && q.length > 0 ? q : undefined,
  });
}

export function ProjectDocumentsPage({
  user, project, phases, mediaCounts, tags, uploads,
  uploadTotal, uploadPage, uploadTotalPages,
  activePhases, activeTag, q, ok, error,
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
  error?: string | null;
}) {
  const countMap = new Map(mediaCounts.map(m => [m.phase_id, m.count]));
  const baseUrl = '/projects/' + project.id + '/documents';
  const isOwner = project.owner_id === user.id;
  const focusedPhase = activePhases.length === 1
    ? phases.find(p => p.id === activePhases[0])
    : undefined;

  return (
    <Layout user={user} title={'Dokumente - ' + project.name} active='projects'>
      <Breadcrumb items={[{ label: project.name, href: '/projects/' + project.id }, { label: 'Dokumente' }]} />

      {/* Tabs and filter bar stick together as one unit while scrolling the grid */}
      <div class='sticky top-0 z-30 -mx-4 px-4 pt-1 bg-stone-50/95 backdrop-blur border-b border-stone-200 mb-4'>
        <ProjectTabs projectId={project.id} active='documents' isOwner={isOwner} />

        <div class='pb-3'>
          <form method='get' action={baseUrl} class='mb-3'>
            {activePhases.length > 0 && <input type='hidden' name='phases' value={activePhases.join(',')} />}
            {activeTag && <input type='hidden' name='tag' value={activeTag} />}
            <InputField type='search' name='q' id='q'
              placeholder='Suche in Dateiname, Notiz, KI-Beschreibung, Tags…'
              value={q || ''} />
          </form>

          {tags.length > 0 && (
            <div class='flex flex-wrap gap-2 mb-3'>
              <a href={documentsUrl(baseUrl, activePhases, activeTag, q, '__clear_tag__')}
                class={'px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                  (!activeTag ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300')}>
                Alle Tags
              </a>
              {tags.map(t => (
                <a key={t.tag} href={documentsUrl(baseUrl, activePhases, activeTag, q, t.tag)}
                  class={'px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                    (activeTag === t.tag ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300')}>
                  {t.tag} <span class={'ml-1 text-xs ' + (activeTag === t.tag ? 'opacity-75' : 'text-stone-500')}>{t.count}</span>
                </a>
              ))}
            </div>
          )}

          <div class='flex overflow-x-auto gap-2 -mx-4 px-4 snap-x scrollbar-hide'>
            <a href={documentsUrl(baseUrl, [], activeTag, q)}
              aria-current={activePhases.length === 0 ? 'page' : undefined}
              class={'snap-start shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition ' +
                (activePhases.length === 0
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-700 border border-stone-300 hover:border-stone-400')}>
              Alle Phasen
            </a>
            {phases.map(p => {
              const isActive = activePhases.includes(p.id);
              const count = countMap.get(p.id) || 0;
              return (
                <a key={p.id} href={documentsUrl(baseUrl, activePhases, activeTag, q, p.id)}
                  aria-current={isActive ? 'page' : undefined}
                  class={'snap-start shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition relative ' +
                    (isActive
                      ? 'bg-stone-900 text-white'
                      : p.status === 'completed'
                        ? 'bg-white text-stone-700 border border-success hover:border-success'
                        : 'bg-white text-stone-700 border border-stone-300 hover:border-stone-400')}>
                  {p.name} <span class={'ml-1 text-xs ' + (isActive ? 'opacity-75' : 'text-stone-500')}>{count}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      {/* Exactly one phase selected: show its status/notes/upload actions inline */}
      {focusedPhase && <PhaseActionPanel project={project} phase={focusedPhase} />}

      <h2 class='font-bold text-lg mb-3 text-stone-900'>
        Dokumente ({uploadTotal})
      </h2>

      {uploads.length === 0 ? (
        <div class='empty-state'>
          <svg class='mx-auto mb-3 text-stone-300' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>
          <p class='font-bold text-stone-900'>
            {q ? <>Keine Treffer f&uuml;r &bdquo;{q}&ldquo;</> : activeTag ? <>Keine Medien mit Tag &bdquo;{activeTag}&ldquo;</> : focusedPhase ? 'Noch keine Dokumente in dieser Phase' : 'Noch keine Medien'}
          </p>
          {(q || activeTag) && (
            <p class='text-sm text-stone-600 font-medium mt-1'>
              <a href={baseUrl} class='text-accent hover:underline font-semibold'>Filter zur&uuml;cksetzen</a>
            </p>
          )}
        </div>
      ) : (
        <div class='grid gap-3 grid-cols-2 lg:grid-cols-4 lightbox-group'>
          {uploads.map(upload => {
            const phase = phases.find(p => p.id === upload.phase_id);
            const caption = upload.notes || upload.ai_description || upload.filename;
            return (
              <div key={upload.id} class='bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col' style='box-shadow: 0 1px 2px rgba(181,80,46,0.04), 0 12px 26px -16px rgba(120,72,40,0.2);'>
                {upload.type === 'image' ? (
                  <a href={'/r2/' + upload.r2_key} data-lightbox data-full-src={'/r2/' + upload.r2_key} data-caption={caption}
                    class='block cursor-zoom-in' aria-label={'Foto ' + upload.filename + ' in voller Größe öffnen'}>
                    <img src={'/r2/' + upload.r2_key}
                      alt={upload.notes || upload.filename}
                      class='w-full h-40 sm:h-56 object-cover' loading='lazy' data-img-fallback />
                  </a>
                ) : upload.type === 'video' ? (
                  <a href={'/r2/' + upload.r2_key} target='_blank' rel='noopener'
                    class='w-full h-40 sm:h-56 bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium gap-2 no-underline hover:bg-stone-200 transition'>
                    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><polygon points='23 7 16 12 23 17 23 7'/><rect x='1' y='5' width='15' height='14' rx='2' ry='2'/></svg>
                    Video
                  </a>
                ) : (
                  <a href={'/r2/' + upload.r2_key} target='_blank' rel='noopener'
                    class='w-full h-40 sm:h-56 bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium gap-2 no-underline hover:bg-stone-200 transition'>
                    <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/></svg>
                    Dokument
                  </a>
                )}
                <div class='p-3 flex flex-col flex-1'>
                  <div class='flex items-center gap-2 mb-1'>
                    {phase && !focusedPhase && (
                      <a href={documentsUrl(baseUrl, [], activeTag, undefined, phase.id)}
                        class='text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-semibold no-underline hover:bg-stone-300'>
                        {phase.name}
                      </a>
                    )}
                    <span class='text-xs text-stone-500 font-medium ml-auto'>{new Date(upload.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                  <a href={'/uploads/' + upload.id} class='text-sm font-bold truncate text-stone-900 hover:text-accent no-underline hover:underline'>
                    {upload.filename}
                  </a>
                  <UploadCaption upload={upload} />
                  <TagChips upload={upload} limit={3} />
                  <AiStatusIndicator upload={upload} />
                  <div class='flex items-center justify-end mt-auto pt-2'>
                    <form method='post' action={'/uploads/' + upload.id + '/delete'} class='inline'
                      data-confirm-delete
                      data-confirm-message='Dieses Dokument wirklich löschen?'>
                      <button type='submit' class='btn-ghost btn-sm text-error hover:bg-error-light'>Löschen</button>
                    </form>
                  </div>
                </div>
              </div>
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

      {/* Auto-Refresh: poll for pending uploads, reload when done */}
      {uploads.some(u => u.type === 'image' && (u.tag_status === 'pending' || u.tag_status === 'failed')) && (() => {
        const pendingIds = uploads
          .filter(u => u.type === 'image' && (u.tag_status === 'pending'))
          .map(u => u.id);
        if (pendingIds.length === 0) return null;
        const idsParam = pendingIds.join(',');
        return (
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var ids = '${idsParam}'.split(',').filter(Boolean);
              if (!ids.length) return;
              var timer = setInterval(function() {
                fetch('/uploads/status?ids=' + ids.join(','))
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    var remaining = ids.filter(function(id) {
                      return data.statuses[id] === 'pending';
                    });
                    if (remaining.length === 0) {
                      clearInterval(timer);
                      window.location.reload();
                    }
                  })
                  .catch(function() {});
              }, 4000);
            })();
          `}} />
        );
      })()}
    </Layout>
  );
}
