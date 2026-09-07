import type { Project, Phase } from '../../db/schema';
import { Button } from '../ui/button';
import { TextareaField } from '../ui/input';

function PhaseNotesEditor({
  phaseId, projectId, notes,
}: {
  phaseId: string;
  projectId: string;
  notes: string;
}) {
  return (
    <details class='mt-4 pt-4 border-t border-stone-100 group'>
      <summary class={'flex items-center justify-between gap-2 cursor-pointer list-none rounded-lg px-3 py-2 -mx-3 min-h-[48px] hover:bg-stone-50 transition ' +
        (notes ? '' : 'text-accent')}>
        <span class='flex items-center gap-2 font-semibold text-stone-800 text-sm'>
          <svg class='shrink-0 text-stone-500' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='9' y1='13' x2='15' y2='13'/><line x1='9' y1='17' x2='13' y2='17'/></svg>
          {notes ? 'Phasen-Notiz' : 'Notiz hinzufügen'}
          {/* Visible on all screen sizes (previously hidden on mobile) so a note is never invisible */}
          {notes && <span class='inline-flex w-1.5 h-1.5 rounded-full bg-accent' aria-hidden='true'></span>}
        </span>
        <span class='flex items-center gap-2 text-xs font-semibold text-stone-500'>
          {notes && <span class='hidden sm:inline line-clamp-1 max-w-xs text-stone-500'>{notes}</span>}
          <svg class='shrink-0 transition group-open:rotate-180' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>
        </span>
      </summary>
      <form method='post'
        action={'/projects/' + projectId + '/phases/' + phaseId + '/notes'}
        class='mt-3 space-y-3'>
        <TextareaField id={'phase-notes-' + phaseId} name='notes'
          label='Notiz (z. B. Fortschritt, offene Punkte, Ansprechpartner)'
          rows={4}
          value={notes} />
        <div class='flex flex-wrap gap-2'>
          <Button type='submit' variant='primary' size='sm'>Speichern</Button>
          <Button type='reset' variant='ghost' size='sm'>Zur&uuml;cksetzen</Button>
        </div>
      </form>
    </details>
  );
}

/**
 * Contextual panel for exactly one focused phase within the merged "Dokumente" view:
 * status (abschließen/wieder öffnen) and the notes editor.
 * Dokumente werden ausschließlich über die Schnell-Upload-Erfassung erfasst –
 * der Button hier öffnet die Schnell-Upload-Sheet mit vorausgewählter Phase.
 * Replaces the old standalone PhaseDetailPage — same actions, now inline instead of a separate page.
 */
export function PhaseActionPanel({ project, phase }: { project: Project; phase: Phase }) {
  return (
    <div class='card mb-6'>
      <div class='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
        <div>
          <h2 class='text-xl font-bold text-stone-900'>{phase.name}</h2>
          <p class='text-sm text-stone-600 font-medium mt-1'>Phase {phase.sort_order}</p>
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
            <div class='flex flex-col sm:flex-row gap-2 w-full md:w-auto'>
              <span class='block w-full md:w-auto text-center bg-success text-white px-4 py-3 rounded-xl text-base font-semibold min-h-[48px] flex items-center justify-center gap-2'>
                <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>
                Abgeschlossen
              </span>
              <form method='post' action={'/projects/' + project.id + '/phases/' + phase.id + '/reopen'}>
                <Button type='submit' variant='secondary' class='w-full md:w-auto'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='1 4 1 10 7 10'/><path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10'/></svg>
                  Wieder &ouml;ffnen
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <PhaseNotesEditor phaseId={phase.id} projectId={project.id} notes={phase.notes} />

      <div class='mt-4 pt-4 border-t border-stone-100'>
        <button type='button' data-quick-upload-trigger
          class='w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-[#3a2c12] font-semibold text-base cursor-pointer hover:bg-[#b3872f] transition min-h-[48px]'>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
          Dokument/Foto hinzuf&uuml;gen
        </button>
      </div>
    </div>
  );
}
