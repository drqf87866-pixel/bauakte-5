import { jsx } from 'hono/jsx';
import { Layout, Flash } from './layout';
import type { User, Project, Phase } from '../db/schema';
import type { ProjectStatsMap } from '../db/queries';
import { Button } from '../components/ui/button';
import { InputField, TextareaField } from '../components/ui/input';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { ProgressBar } from '../components/ui/progress-bar';

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
        <Button href='/projects/new' variant='primary' class='w-full md:w-auto'>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
          Neues Projekt
        </Button>
      </div>
      <Flash ok={ok} />
      {projects.length === 0 ? (
        <div class='empty-state'>
          <svg class='mx-auto mb-4 text-slate-300' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
          <p class='text-lg mb-2 font-bold text-slate-900'>Noch keine Projekte vorhanden</p>
          <p class='text-slate-600 font-medium mb-6'>
            Lege dein erstes Bauprojekt an und dokumentiere alle 8 Bauphasen mit Fotos und Notizen.
          </p>
          <Button href='/projects/new' variant='primary'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
            Erstes Projekt anlegen
          </Button>
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
                class='card-interactive min-h-[80px]'
                aria-label={project.name + (project.address ? ', ' + project.address : '') + ' \u2013 ' + (s ? s.completedPhases + '/' + s.totalPhases + ' Phasen' : 'Neu')}>
                <div class='flex items-start justify-between mb-2'>
                  <h2 class='text-lg font-bold text-slate-900'>{project.name}</h2>
                </div>
                {project.address && (
                  <p class='text-sm text-slate-700 mb-2 font-medium'>{project.address}</p>
                )}
                {s && (
                  <div class='mt-3 pt-3 border-t border-slate-100'>
                    <div class='flex items-center justify-between text-sm text-slate-600 font-medium mb-1.5'>
                      <span>{s.completedPhases}/{s.totalPhases} Phasen &middot; {progress}%</span>
                      <span class='flex items-center gap-1'>
                        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/></svg>
                        {s.uploadCount} {s.uploadCount === 1 ? 'Dokument' : 'Dokumente'}
                      </span>
                    </div>
                    <ProgressBar value={s.completedPhases} max={s.totalPhases} size='sm' />
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
        {error && <Alert type='error'>{error}</Alert>}
        <form method='post' action='/projects/new' class='space-y-5'>
          <InputField type='text' name='name' id='name' label='Projektname *' required />
          <InputField type='text' name='address' id='address' label='Adresse' />
          <TextareaField name='description' id='description' label='Beschreibung' rows={3} />
          <Alert type='warning'>
            <strong>Hinweis:</strong> Beim Anlegen werden automatisch die 8 Bauphasen angelegt.
          </Alert>
          <Button type='submit' variant='primary' class='w-full'>Projekt anlegen</Button>
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
            <Button href={'/projects/' + project.id + '/share'} variant='secondary'>
              <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49'/></svg>
              Teilen
            </Button>
            {isOwner && (
              <form method='post' action={'/projects/' + project.id + '/delete'}
                data-confirm-delete
                data-confirm-message='Projekt inkl. aller Phasen und Dokumente endgültig löschen?'>
                <Button type='submit' variant='danger-outline'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>
                  L&ouml;schen
                </Button>
              </form>
            )}
          </div>
        </div>
        <Flash ok={ok} />
        <div class='card mt-4'>
          <ProgressBar value={completedPhases} max={totalPhases}
            label={'Fortschritt'} />
        </div>
      </div>
      <div class='space-y-3'>
        {phases.map((phase) => (
          <a href={'/projects/' + project.id + '/phases/' + phase.id}
            aria-label={'Phase ' + phase.sort_order + ': ' + phase.name + (phase.status === 'completed' ? ' (Erledigt)' : ' (In Arbeit)')}
            class={'card-interactive min-h-[64px] ' +
              (phase.status === 'completed' ? 'border-success bg-success-light' : '')}>
            <div class='flex items-center justify-between'>
              <div class='flex items-center gap-3'>
                <span class='text-lg font-bold text-slate-800'>{phase.sort_order}.</span>
                <div>
                  <h3 class='font-bold text-slate-900 text-base'>{phase.name}</h3>
                  {phase.status === 'completed' && phase.completed_at && (
                    <p class='text-sm text-success font-medium'>
                      Abgeschlossen am {new Date(phase.completed_at).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={phase.status === 'completed' ? 'success' : 'progress'}>
                {phase.status === 'completed' ? 'Erledigt' : 'In Arbeit'}
              </Badge>
            </div>
          </a>
        ))}
      </div>
    </Layout>
  );
}
