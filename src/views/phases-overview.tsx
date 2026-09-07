import { Layout, Flash } from './layout';
import type { Phase } from '../db/schema';
import type { ProjectPhaseOverview } from '../db/queries';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Badge } from '../components/ui/badge';
import { ProgressBar } from '../components/ui/progress-bar';

type StatusFilter = 'all' | 'in_progress' | 'completed';

export function PhasesOverviewPage({
  user, items, status, ok, error,
}: {
  user: { id: string; name: string; email: string };
  items: ProjectPhaseOverview[];
  status: StatusFilter;
  ok?: string | null;
  error?: string | null;
}) {
  return (
    <Layout user={user as never} title="Phasen" active="phases">
      <Breadcrumb items={[{ label: 'Phasen-Übersicht' }]} />
      <div class='flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3'>
        <div>
          <h1 class='text-2xl font-bold text-slate-900'>Phasen-Übersicht</h1>
          <p class='text-sm text-slate-600 font-medium mt-1'>
            Alle Bauphasen deiner Projekte auf einen Blick.
          </p>
        </div>
      </div>

      <Flash ok={ok} error={error} />

      <PhaseStatusFilter current={status} />

      {items.length === 0 ? (
        <div class='empty-state'>
          <svg class='mx-auto mb-3 text-slate-300' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><line x1='8' y1='6' x2='21' y2='6'/><line x1='8' y1='12' x2='21' y2='12'/><line x1='8' y1='18' x2='21' y2='18'/></svg>
          <p class='font-bold text-slate-900'>Noch keine Projekte</p>
          <p class='text-sm text-slate-600 font-medium mt-1'>
            Lege ein Projekt an, um Phasen zu dokumentieren.
          </p>
        </div>
      ) : (
        <div class='space-y-6'>
          {items.map(item => (
            <ProjectPhaseSection key={item.project.id} item={item} status={status} />
          ))}
        </div>
      )}
    </Layout>
  );
}

function PhaseStatusFilter({ current }: { current: StatusFilter }) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'in_progress', label: 'In Arbeit' },
    { value: 'completed', label: 'Abgeschlossen' },
  ];
  return (
    <div class='flex flex-wrap gap-2 mb-6' role='tablist' aria-label='Status-Filter'>
      {options.map(o => (
        <a key={o.value} href={o.value === 'all' ? '/phases' : '/phases?status=' + o.value}
          role='tab'
          aria-current={current === o.value ? 'page' : undefined}
          class={'px-4 py-2 rounded-full text-sm font-semibold no-underline transition min-h-[40px] flex items-center ' +
            (current === o.value
              ? 'bg-slate-900 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}>
          {o.label}
        </a>
      ))}
    </div>
  );
}

function ProjectPhaseSection({
  item, status,
}: {
  item: ProjectPhaseOverview;
  status: StatusFilter;
}) {
  const visiblePhases = item.phases.filter(p => status === 'all' || p.status === status);
  if (visiblePhases.length === 0) return null;
  const progress = item.progress;
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  return (
    <section class='card'>
      <div class='flex items-start justify-between gap-3 mb-3'>
        <div class='min-w-0'>
          <h2 class='text-lg font-bold text-slate-900 truncate'>{item.project.name}</h2>
          {item.project.address && (
            <p class='text-sm text-slate-600 font-medium truncate'>{item.project.address}</p>
          )}
        </div>
        <a href={'/projects/' + item.project.id + '/gallery'}
          class='text-sm text-accent font-semibold no-underline hover:underline shrink-0 min-h-[40px] flex items-center gap-1'>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>
          Galerie
        </a>
      </div>
      <div class='mb-4'>
        <ProgressBar value={progress.completed} max={progress.total} size='sm'
          label={progress.completed + ' / ' + progress.total + ' Phasen (' + progressPct + '%)'} />
      </div>
      <ul class='divide-y divide-slate-100 -mx-5'>
        {visiblePhases.map(phase => (
          <PhaseRow key={phase.id}
            projectId={item.project.id}
            phase={phase}
            mediaCount={item.mediaCounts[phase.id] || 0} />
        ))}
      </ul>
    </section>
  );
}

function PhaseRow({
  projectId, phase, mediaCount,
}: {
  projectId: string;
  phase: Phase;
  mediaCount: number;
}) {
  return (
    <li>
      <a href={'/projects/' + projectId + '/phases/' + phase.id}
        class='flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition no-underline'>
        <span class={'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' +
          (phase.status === 'completed'
            ? 'bg-success text-white'
            : 'bg-slate-200 text-slate-700')}>
          {phase.status === 'completed' ? (
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>
          ) : (
            phase.sort_order
          )}
        </span>
        <div class='flex-1 min-w-0'>
          <div class='flex items-center gap-2'>
            <span class='font-semibold text-slate-900 truncate'>{phase.name}</span>
            {phase.status === 'completed' && <Badge variant='success'>Abgeschlossen</Badge>}
          </div>
          {phase.notes ? (
            <p class='text-xs text-slate-600 line-clamp-1 mt-0.5'>{phase.notes}</p>
          ) : (
            <p class='text-xs text-slate-400 italic mt-0.5'>Keine Notiz</p>
          )}
        </div>
        <span class='text-xs text-slate-500 font-medium shrink-0 hidden sm:inline'>
          {mediaCount} {mediaCount === 1 ? 'Medium' : 'Medien'}
        </span>
        <svg class='shrink-0 text-slate-400' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
      </a>
    </li>
  );
}
