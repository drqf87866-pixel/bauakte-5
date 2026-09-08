import { Layout, Flash } from './layout';
import type { Project, Phase, Upload, User } from '../db/schema';
import type { ProjectTagWithCount, PhaseMediaCount } from '../db/queries';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { InputField } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';
import { ProjectTabs } from '../components/layout/project-tabs';
import { PhaseActionPanel } from '../components/upload/phase-panel';
import { UploadCaption, TagChips, AiStatusIndicator, PendingUploadPoller, isUploadStale } from '../components/upload/upload-meta';


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

      {/* Batch selection bar */}
      <div id='batch-bar' class='hidden fixed bottom-0 left-0 right-0 z-50 bg-stone-900 text-white px-4 py-3 shadow-lg md:bottom-auto md:top-20 md:left-auto md:right-4 md:w-auto md:rounded-xl md:max-w-lg' role='toolbar' aria-label='Batch-Aktionen'>
        <form method='post' id='batch-form-delete' class='hidden' action={'/projects/' + project.id + '/batch-delete'} data-confirm-delete data-confirm-message='Ausgewählte Dokumente wirklich löschen?'></form>
        <form method='post' id='batch-form-move' class='hidden' action={'/projects/' + project.id + '/batch-move'}></form>
        <div class='flex items-center gap-3'>
          <span id='batch-count' class='text-sm font-semibold shrink-0'>0 ausgewählt</span>
          <div class='flex-1'></div>
          <button type='button' id='batch-delete-btn' class='text-sm font-semibold px-3 py-1.5 rounded-lg bg-error text-white hover:bg-[#a83a31] transition border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed' disabled>
            <svg class='inline-block mr-1 shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>
            Löschen
          </button>
          <select id='batch-move-select' class='text-sm rounded-lg px-2 py-1.5 border-0 bg-stone-800 text-white font-semibold cursor-pointer disabled:opacity-40' disabled aria-label='Verschieben nach…'>
            <option value=''>Verschieben nach…</option>
            {phases.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type='button' id='batch-clear-btn' class='text-sm px-2 py-1.5 rounded-lg text-stone-400 hover:text-white transition border-0 bg-transparent cursor-pointer' aria-label='Auswahl aufheben'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
          </button>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var selected = new Set();
          var bar = document.getElementById('batch-bar');
          var countEl = document.getElementById('batch-count');
          var deleteBtn = document.getElementById('batch-delete-btn');
          var moveSelect = document.getElementById('batch-move-select');
          var clearBtn = document.getElementById('batch-clear-btn');
          var deleteForm = document.getElementById('batch-form-delete');
          var moveForm = document.getElementById('batch-form-move');
          if (!bar || !countEl || !deleteBtn || !moveSelect || !clearBtn || !deleteForm || !moveForm) return;

          function updateBar() {
            var n = selected.size;
            if (n > 0) {
              bar.classList.remove('hidden');
              bar.classList.add('flex');
              countEl.textContent = n + ' ausgewählt';
              deleteBtn.disabled = false;
              moveSelect.disabled = false;
            } else {
              bar.classList.add('hidden');
              bar.classList.remove('flex');
              deleteBtn.disabled = true;
              moveSelect.disabled = true;
            }
          }

          document.addEventListener('change', function(e) {
            var cb = e.target;
            if (!cb || cb.type !== 'checkbox' || !cb.hasAttribute('data-batch-select')) return;
            if (cb.checked) { selected.add(cb.value); } else { selected.delete(cb.value); }
            updateBar();
          });

          deleteBtn.addEventListener('click', function() {
            if (selected.size === 0) return;
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'upload_ids';
            input.value = Array.from(selected).join(',');
            deleteForm.appendChild(input);
            deleteForm.dataset.confirmed = '1';
            deleteForm.requestSubmit();
          });

          moveSelect.addEventListener('change', function() {
            var targetPhase = moveSelect.value;
            if (!targetPhase || selected.size === 0) return;
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'upload_ids';
            input.value = Array.from(selected).join(',');
            moveForm.appendChild(input);
            var phaseInput = document.createElement('input');
            phaseInput.type = 'hidden';
            phaseInput.name = 'target_phase_id';
            phaseInput.value = targetPhase;
            moveForm.appendChild(phaseInput);
            moveForm.requestSubmit();
          });

          clearBtn.addEventListener('click', function() {
            selected.clear();
            document.querySelectorAll('[data-batch-select]').forEach(function(cb) { cb.checked = false; });
            moveSelect.value = '';
            updateBar();
          });
        })();
      `}} />
      <div class='flex items-center justify-between mb-3'>
        <h2 class='font-bold text-lg text-stone-900'>
          Dokumente ({uploadTotal})
        </h2>
      </div>

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
              <div key={upload.id} class='bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col relative' style='box-shadow: 0 1px 2px rgba(181,80,46,0.04), 0 12px 26px -16px rgba(120,72,40,0.2);'>
                <label class='absolute top-2 left-2 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-lg flex items-center justify-center cursor-pointer hover:bg-white transition'>
                  <input type='checkbox' value={upload.id} data-batch-select class='w-4 h-4 rounded border-stone-400 text-brand focus:ring-brand cursor-pointer' aria-label={upload.filename + ' auswählen'} />
                </label>
                {upload.type === 'image' ? (
                  <a href={'/r2/' + upload.r2_key} data-lightbox data-full-src={'/r2/' + upload.r2_key} data-caption={caption}
                    class='block cursor-zoom-in' aria-label={'Foto ' + upload.filename + ' in voller Größe öffnen'}>
                    <img src={'/r2/' + upload.r2_key}
                      alt={upload.notes || upload.filename}
                      class='w-full h-40 sm:h-56 object-cover' loading='lazy' data-img-fallback />
                  </a>
                ) : upload.type === 'video' ? (
                  <video controls class='w-full h-40 sm:h-56 object-cover bg-stone-900' aria-label={'Video: ' + upload.filename} preload='metadata'>
                    <source src={'/r2/' + upload.r2_key} type={upload.mime_type} />
                  </video>
                ) : upload.mime_type === 'application/pdf' ? (
                  <a href={'/r2/' + upload.r2_key} target='_blank' rel='noopener'
                    class='w-full h-40 sm:h-56 bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-medium gap-2 no-underline hover:bg-stone-200 transition relative'>
                    <embed src={'/r2/' + upload.r2_key + '#view=FitH&navpanes=0'} type='application/pdf' class='absolute inset-0 w-full h-full object-cover' aria-label={'PDF: ' + upload.filename} />
                    <span class='relative z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold'>PDF</span>
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

      {/* Auto-Refresh: poll for pending (nicht bereits hängengebliebene) uploads, reload when done/stale */}
      <PendingUploadPoller ids={uploads
        .filter(u => u.type === 'image' && u.tag_status === 'pending' && !isUploadStale(u))
        .map(u => u.id)} />
    </Layout>
  );
}
