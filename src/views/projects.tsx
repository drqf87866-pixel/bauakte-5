import { jsx, Fragment } from 'hono/jsx';
import { Layout, Flash } from './layout';
import type { User, Project, Phase, Upload } from '../db/schema';
import type { ProjectStatsMap } from '../db/queries';

export function DashboardPage({
  user, projects, stats, ok,
}: {
  user: User;
  projects: Project[];
  stats: ProjectStatsMap;
  ok?: string | null;
}) {
  return (
    <Layout user={user} title='Dashboard' active='projects'>
      <div class='flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3'>
        <h1 class='text-2xl font-bold text-slate-900'>Meine Projekte</h1>
        <a href='/projects/new'
          class='flex items-center justify-center gap-2 w-full md:w-auto text-center bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition min-h-[48px] font-semibold text-base no-underline'>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
          Neues Projekt
        </a>
      </div>
      <Flash ok={ok} />
      {projects.length === 0 ? (
        <div class='text-center py-16 px-4 bg-white rounded-lg border border-dashed border-slate-300'>
          <svg class='mx-auto mb-4 text-slate-300' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
          <p class='text-lg mb-2 font-bold text-slate-900'>Noch keine Projekte vorhanden</p>
          <p class='text-slate-600 font-medium mb-6'>
            Lege dein erstes Bauprojekt an und dokumentiere alle 8 Bauphasen mit Fotos und Notizen.
          </p>
          <a href='/projects/new'
            class='inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition min-h-[48px] font-semibold text-base no-underline'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
            Erstes Projekt anlegen
          </a>
        </div>
      ) : (
        <div class='grid gap-4 grid-cols-1 md:grid-cols-2'>
          {projects.map((project) => {
            const s = stats[project.id];
            const progress = s && s.totalPhases > 0
              ? Math.round((s.completedPhases / s.totalPhases) * 100)
              : 0;
            return (
              <a href={'/projects/' + project.id}
                class='block bg-white rounded-lg shadow-sm border p-5 hover:shadow-md transition no-underline min-h-[80px]'
                aria-label={project.name + (project.address ? ', ' + project.address : '') + ' – ' + (s ? s.completedPhases + '/' + s.totalPhases + ' Phasen' : 'Neu')}>
                <div class='flex items-start justify-between mb-2'>
                  <h2 class='text-lg font-bold text-slate-900'>{project.name}</h2>
                </div>
                {project.address && (
                  <p class='text-sm text-slate-700 mb-2 font-medium'>{project.address}</p>
                )}
                {s && (
                  <div class='mt-3 pt-3 border-t border-slate-100'>
                    <div class='flex items-center justify-between text-sm text-slate-600 font-medium mb-1.5'>
                      <span>{s.completedPhases}/{s.totalPhases} Phasen · {progress}%</span>
                      <span class='flex items-center gap-1'>
                        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/></svg>
                        {s.uploadCount} {s.uploadCount === 1 ? 'Dokument' : 'Dokumente'}
                      </span>
                    </div>
                    <div class='w-full bg-slate-200 rounded-full h-1.5'
                      role='progressbar'
                      aria-label={'Fortschritt ' + project.name}
                      aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                      <div class='bg-green-700 h-1.5 rounded-full' style={{ width: progress + '%' }} />
                    </div>
                  </div>
                )}
                {!s && (
                  <p class='text-sm text-slate-600 font-medium'>
                    Erstellt am {new Date(project.created_at).toLocaleDateString('de-DE')}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

export function NewProjectPage({ user, error }: { user: User; error: string | null }) {
  return (
    <Layout user={user} title='Neues Projekt' active='projects'>
      <div class='max-w-lg mx-auto'>
        <h1 class='text-2xl font-bold mb-6 text-slate-900'>Neues Bauprojekt</h1>
        {error && (
          <div class='bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-4 font-medium text-base'>{error}</div>
        )}
        <form method='post' action='/projects/new' class='space-y-5'>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='name'>Projektname *</label>
            <input type='text' name='name' id='name' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='address'>Adresse</label>
            <input type='text' name='address' id='address'
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='description'>Beschreibung</label>
            <textarea name='description' id='description' rows={3}
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base' />
          </div>
          <div class='bg-amber-50 border-2 border-amber-300 rounded-lg p-4 text-base text-slate-900 font-medium'>
            <strong>Hinweis:</strong> Beim Anlegen werden automatisch die 8 Bauphasen angelegt.
          </div>
          <button type='submit'
            class='w-full bg-slate-900 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition min-h-[48px] text-base font-bold'>
            Projekt anlegen
          </button>
        </form>
      </div>
    </Layout>
  );
}

export function ProjectDetailPage({
  user, project, phases, ok,
}: {
  user: User;
  project: Project;
  phases: Phase[];
  ok?: string | null;
}) {
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const totalPhases = phases.length;
  const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
  const isOwner = project.owner_id === user.id;

  return (
    <Layout user={user} title={project.name} active='projects'>
      <div class='mb-6'>
        <div class='flex flex-col md:flex-row items-start justify-between gap-3'>
          <div>
            <h1 class='text-2xl font-bold text-slate-900'>{project.name}</h1>
            {project.address && (
              <p class='text-slate-700 font-medium'>{project.address}</p>
            )}
            {project.description && (
              <p class='text-slate-600 mt-1'>{project.description}</p>
            )}
          </div>
          <div class='flex flex-wrap gap-2'>
            <a href={'/projects/' + project.id + '/share'}
              class='min-h-[48px] px-4 py-2 text-base bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition font-semibold no-underline flex items-center gap-2'>
              <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49'/></svg>
              Teilen
            </a>
            {isOwner && (
              <form method='post' action={'/projects/' + project.id + '/delete'}
                data-confirm-delete
                data-confirm-message='Projekt inkl. aller Phasen und Dokumente endgültig löschen?'>
                <button type='submit'
                  class='min-h-[48px] px-4 py-2 text-base bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition font-semibold flex items-center gap-2'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>
                  Löschen
                </button>
              </form>
            )}
          </div>
        </div>
        <Flash ok={ok} />
        <div class='mt-4 bg-white rounded-lg shadow-sm border p-4'>
          <div class='flex justify-between text-sm text-slate-700 mb-1 font-semibold'>
            <span>Fortschritt</span>
            <span>{completedPhases}/{totalPhases} Phasen ({progress}%)</span>
          </div>
          <div class='w-full bg-slate-200 rounded-full h-3'
            role='progressbar'
            aria-label='Projektfortschritt'
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div class='bg-green-700 h-3 rounded-full transition-all'
              style={{ width: progress + '%' }} />
          </div>
        </div>
      </div>
      <div class='space-y-3'>
        {phases.map((phase) => (
          <a href={'/projects/' + project.id + '/phases/' + phase.id}
            aria-label={'Phase ' + phase.sort_order + ': ' + phase.name + (phase.status === 'completed' ? ' (Erledigt)' : ' (In Arbeit)')}
            class={'block rounded-lg shadow-sm border p-5 hover:shadow-md transition no-underline min-h-[64px] ' +
              (phase.status === 'completed' ? 'border-green-700 bg-green-50' : 'bg-white')}>
            <div class='flex items-center justify-between'>
              <div class='flex items-center gap-3'>
                <span class='text-lg font-bold text-slate-800'>{phase.sort_order}.</span>
                <div>
                  <h3 class='font-bold text-slate-900 text-base'>{phase.name}</h3>
                  {phase.status === 'completed' && phase.completed_at && (
                    <p class='text-sm text-green-800 font-medium'>
                      Abgeschlossen am {new Date(phase.completed_at).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
              <span class={'text-sm px-3 py-1.5 rounded-full font-bold ' +
                (phase.status === 'completed'
                  ? 'bg-green-700 text-white'
                  : 'bg-amber-500 text-slate-900')}>
                {phase.status === 'completed' ? 'Erledigt' : 'In Arbeit'}
              </span>
            </div>
          </a>
        ))}
      </div>
    </Layout>
  );
}
