import type { Project, Phase } from '../../db/schema';
import { Button } from '../ui/button';
import { FileInputField, InputField, TextareaField } from '../ui/input';

function PhaseNotesEditor({
  phaseId, projectId, notes,
}: {
  phaseId: string;
  projectId: string;
  notes: string;
}) {
  return (
    <details class='mt-4 pt-4 border-t border-slate-100 group'>
      <summary class={'flex items-center justify-between gap-2 cursor-pointer list-none rounded-lg px-3 py-2 -mx-3 min-h-[48px] hover:bg-slate-50 transition ' +
        (notes ? '' : 'text-accent')}>
        <span class='flex items-center gap-2 font-semibold text-slate-800 text-sm'>
          <svg class='shrink-0 text-slate-500' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='9' y1='13' x2='15' y2='13'/><line x1='9' y1='17' x2='13' y2='17'/></svg>
          {notes ? 'Phasen-Notiz' : 'Notiz hinzufügen'}
          {/* Visible on all screen sizes (previously hidden on mobile) so a note is never invisible */}
          {notes && <span class='inline-flex w-1.5 h-1.5 rounded-full bg-accent' aria-hidden='true'></span>}
        </span>
        <span class='flex items-center gap-2 text-xs font-semibold text-slate-500'>
          {notes && <span class='hidden sm:inline line-clamp-1 max-w-xs text-slate-500'>{notes}</span>}
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
 * status (abschließen/wieder öffnen), notes editor, and the upload form.
 * Replaces the old standalone PhaseDetailPage — same actions, now inline instead of a separate page.
 */
export function PhaseActionPanel({ project, phase }: { project: Project; phase: Phase }) {
  return (
    <div class='card mb-6'>
      <div class='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
        <div>
          <h2 class='text-xl font-bold text-slate-900'>{phase.name}</h2>
          <p class='text-sm text-slate-600 font-medium mt-1'>Phase {phase.sort_order}</p>
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
              <span class='block w-full md:w-auto text-center bg-success text-white px-4 py-3 rounded-lg text-base font-bold min-h-[48px] flex items-center justify-center gap-2'>
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

      <div class='mt-4 pt-4 border-t border-slate-100'>
        <h3 class='font-bold text-base mb-3 text-slate-900'>Dokumentation hinzuf&uuml;gen</h3>
        <form method='post'
          action={'/projects/' + project.id + '/phases/' + phase.id + '/upload'}
          encType='multipart/form-data'
          data-upload-form
          aria-label='Dokument hochladen'
          class='space-y-4'>
          <FileInputField name='file' id={'file-' + phase.id} label='Datei ausw&auml;hlen (Foto, Video, PDF)'
            accept='image/*,video/*,.pdf,.doc,.docx'
            capture='environment'
            required />
          <InputField type='text' name='notes' id={'notes-' + phase.id} placeholder='Kurze Beschreibung...' label='Notiz' />
          <InputField type='text' name='manual_tags' id={'manual_tags-' + phase.id}
            placeholder='z. B. Heizung, Heizkörper, Erdgeschoss'
            label='Eigene Tags (optional, Komma-getrennt)'
            hint='Werden mit den KI-Tags zusammengeführt.' />
          <div class='flex justify-center pt-2'>
            <Button type='submit' variant='primary' class='w-full sm:w-auto'>Hochladen</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
