import { Layout, Flash } from './layout';
import type { User, Project, Phase } from '../db/schema';
import type { ProjectStatsMap, PhaseMediaCount, TopTagItem } from '../db/queries';
import { Button } from '../components/ui/button';
import { InputField, TextareaField } from '../components/ui/input';
import { Alert } from '../components/ui/alert';
import { ProgressBar } from '../components/ui/progress-bar';
import { ProjectTabs } from '../components/layout/project-tabs';

export function DashboardPage({
  user, projects, stats, ok,
}: {
  user: User;
  projects: Project[];
  stats: ProjectStatsMap;
  ok?: string | null;
}) {
  return (
    <Layout user={user} title="Dashboard" active="projects">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3">
        <h1 class="text-2xl font-bold text-stone-900">Meine Projekte</h1>
        <Button href="/projects/new" variant="primary" class="w-full md:w-auto">
          <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neues Projekt
        </Button>
      </div>
      <Flash ok={ok} />
      {projects.length === 0 ? (
        <div class="empty-state">
          <svg class="mx-auto mb-4 text-stone-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <p class="text-lg mb-2 font-bold text-stone-900">Noch keine Projekte vorhanden</p>
          <p class="text-stone-600 font-medium mb-6">
            Lege dein erstes Bauprojekt an und dokumentiere alle 8 Bauphasen mit Fotos und Notizen.
          </p>
          <Button href="/projects/new" variant="primary">
            <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Erstes Projekt anlegen
          </Button>
        </div>
      ) : (
        <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
          {projects.map((project) => {
            const s = stats[project.id];
            const progress = s && s.totalPhases > 0
              ? Math.round((s.completedPhases / s.totalPhases) * 100)
              : 0;
            return (
              <a href={"/projects/" + project.id}
                class="card-interactive min-h-[80px]"
                aria-label={project.name + (project.address ? ", " + project.address : "") + " \u2013 " + (s ? s.completedPhases + "/" + s.totalPhases + " Phasen" : "Neu")}>
                <div class="flex items-start justify-between mb-2">
                  <h2 class="text-lg font-bold text-stone-900">{project.name}</h2>
                </div>
                {project.address && (
                  <p class="text-sm text-stone-700 mb-2 font-medium">{project.address}</p>
                )}
                {s && (
                  <div class="mt-3 pt-3 border-t border-stone-100">
                    <div class="flex items-center justify-between text-sm text-stone-600 font-medium mb-1.5">
                      <span>{s.completedPhases}/{s.totalPhases} Phasen &middot; {progress}%</span>
                      <span class="flex items-center gap-1">
                        <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                        {s.uploadCount} {s.uploadCount === 1 ? "Dokument" : "Dokumente"}
                      </span>
                    </div>
                    <ProgressBar value={s.completedPhases} max={s.totalPhases} size="sm" />
                  </div>
                )}
                {!s && (
                  <p class="text-sm text-stone-600 font-medium">
                    Erstellt am {new Date(project.created_at).toLocaleDateString("de-DE")}
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
    <Layout user={user} title="Neues Projekt" active="projects">
      <div class="max-w-lg mx-auto">
        <h1 class="text-2xl font-bold mb-6 text-stone-900">Neues Bauprojekt</h1>
        {error && <Alert type="error">{error}</Alert>}
        <form method="post" action="/projects/new" class="space-y-5">
          <InputField type="text" name="name" id="name" label="Projektname *" required />
          <InputField type="text" name="address" id="address" label="Adresse" />
          <TextareaField name="description" id="description" label="Beschreibung" rows={3} />
          <Alert type="warning">
            <strong>Hinweis:</strong> Beim Anlegen werden automatisch die 8 Bauphasen angelegt.
          </Alert>
          <Button type="submit" variant="primary" class="w-full">Projekt anlegen</Button>
        </form>
      </div>
    </Layout>
  );
}

/**
 * Project "Übersicht" (workspace home): progress, phase status at a glance, manage actions.
 * No document grid here anymore — that's the "Dokumente" tab (project-documents.tsx). This
 * split replaces the old ProjectDetailPage, which mixed both into one page.
 */
export function ProjectOverviewPage({
  user, project, phases, mediaCounts, topTags, pendingCount, ok,
}: {
  user: User;
  project: Project;
  phases: Phase[];
  mediaCounts: PhaseMediaCount[];
  topTags: TopTagItem[];
  pendingCount: number;
  ok?: string | null;
}) {
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const totalPhases = phases.length;
  const isOwner = project.owner_id === user.id;
  const countMap = new Map(mediaCounts.map(m => [m.phase_id, m.count]));
  const documentsUrl = '/projects/' + project.id + '/documents';
  const totalMedia = mediaCounts.reduce((sum, m) => sum + m.count, 0);

  return (
    <Layout user={user} title={project.name} active='projects'>
      <div class='mb-4'>
        <h1 class='text-2xl font-bold text-stone-900'>{project.name}</h1>
        {project.address && <p class='text-stone-700 font-medium'>{project.address}</p>}
        {project.description && <p class='text-stone-600 mt-1'>{project.description}</p>}
      </div>

      <div class='mb-4'>
        <ProjectTabs projectId={project.id} active='overview' isOwner={isOwner} />
      </div>

      <Flash ok={ok} />

      <div class='card mb-6'>
        <ProgressBar value={completedPhases} max={totalPhases} label='Fortschritt' />
      </div>

      {/* KI-Insights */}
      {(topTags.length > 0 || pendingCount > 0) && (
        <div class='card mb-6'>
          <div class='flex items-center gap-2 mb-3'>
            <svg class='text-accent' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='currentColor'><path d='M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z'/></svg>
            <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide'>KI-Insights</h2>
          </div>

          {pendingCount > 0 && (
            <div class='flex items-center justify-between gap-3 mb-3 p-3 bg-accent-light rounded-xl border border-[#f3e4c4]'>
              <div class='flex items-center gap-2'>
                <svg class='animate-spin shrink-0 text-accent' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'><path d='M21 12a9 9 0 1 1-6.219-8.56'/></svg>
                <span class='text-sm font-semibold text-[#8a6a1f]'>
                  {pendingCount} {pendingCount === 1 ? 'Bild wartet' : 'Bilder warten'} auf Analyse
                </span>
              </div>
              <form method='post' action={'/projects/' + project.id + '/batch-retag'} class='inline shrink-0'>
                <button type='submit'
                  class='text-xs font-semibold bg-accent text-[#3a2c12] px-3 py-1.5 rounded-xl hover:bg-[#b3872f] transition cursor-pointer border-0'>
                  Alle analysieren
                </button>
              </form>
            </div>
          )}

          {topTags.length > 0 && (
            <div>
              <p class='text-xs text-stone-500 font-medium mb-2'>Häufigste Tags ({totalMedia} Dokumente)</p>
              <div class='flex flex-wrap gap-1.5'>
                {topTags.map(t => (
                  <a key={t.tag}
                    href={documentsUrl + '?tag=' + encodeURIComponent(t.tag)}
                    class='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 no-underline transition'>
                    {t.tag}
                    <span class='text-stone-400'>{t.count}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div class='mb-6'>
        <div class='flex items-center justify-between mb-3'>
          <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide'>Bauphasen</h2>
          <a href={documentsUrl} class='text-sm text-accent font-semibold no-underline hover:underline'>Alle Dokumente &rarr;</a>
        </div>
        <div class='grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'>
          {phases.map(function (phase) {
            const count = countMap.get(phase.id) || 0;
            return (
              <a key={phase.id} href={documentsUrl + '?phases=' + phase.id}
                class={'flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-3 min-h-[72px] text-center no-underline transition relative ' +
                  (phase.status === 'completed'
                    ? 'bg-white text-stone-700 border-success hover:shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:shadow-sm')}>
                <span class='text-sm font-bold leading-tight'>{phase.name}</span>
                <span class='text-xs font-medium opacity-75'>{count} Medien</span>
                {phase.status === 'completed' && <svg class='shrink-0 absolute top-1 right-1 text-success' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>}
              </a>
            );
          })}
        </div>
      </div>

      <div class='card'>
        <h2 class='font-bold text-sm text-stone-600 uppercase tracking-wide mb-3'>Verwalten</h2>
        <div class='flex flex-wrap gap-2'>
          {isOwner && (
            <Button href={'/projects/' + project.id + '/share'} variant='secondary'>
              <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><line x1='8.59' y1='13.51' x2='15.42' y2='17.49'/><line x1='15.41' y1='6.51' x2='8.59' y2='10.49'/></svg>
              Teilen
            </Button>
          )}
          {isOwner && (
            <form method='post' action={'/projects/' + project.id + '/delete'} data-confirm-delete data-confirm-message='Projekt inkl. aller Phasen und Dokumente endgültig löschen?'>
              <Button type='submit' variant='danger-outline'>
                <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>
                Löschen
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}

