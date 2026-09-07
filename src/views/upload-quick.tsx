import { Layout, Flash } from './layout';
import type { User, Project, Phase } from '../db/schema';
import { SelectField, InputField, FileInputField } from '../components/ui/input';
import { Button } from '../components/ui/button';

/**
 * The actual upload form, shared by two places:
 *  - the full /upload-quick page (no-JS fallback / direct link)
 *  - the global quick-upload bottom sheet, which fetches this fragment on demand
 *    (see GET /upload-quick?fragment=1 in routes/upload-quick.tsx and layout.tsx)
 *
 * `data-ajax-form` opts this specific form into the fetch/XHR submit-with-progress
 * handling in layout.tsx instead of a full page POST — see the delegated 'submit' handler.
 * `data-qu-project` / `data-qu-phase` are hooks for the generic project→phase filter
 * delegation in layout.tsx (fixes the phase list otherwise showing every project's phases).
 */
export function QuickUploadForm({
  projects, phasesByProject, error,
}: {
  projects: Project[];
  phasesByProject: Record<string, Phase[]>;
  error?: string | null;
}) {
  return (
    <>
      <Flash error={error} />
      <form method='post' action='/upload-quick' encType='multipart/form-data'
        data-upload-form data-ajax-form class='space-y-4'>
        <SelectField name='project_id' id='project_id' label='Projekt' required data-qu-project>
          <option value=''>– Projekt w&auml;hlen –</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </SelectField>

        {/* Phase options for every project are all present at once (simplest to render server-side);
            the data-qu-project/data-qu-phase delegation in layout.tsx hides the ones that don't
            belong to the selected project, fixing the previous "shows every phase of every project" bug. */}
        <SelectField name='phase_id' id='phase_id' label='Bauphase' required data-qu-phase>
          <option value=''>– Phase w&auml;hlen –</option>
          {projects.map((p) => (
            (phasesByProject[p.id] || []).map((ph) => (
              <option key={ph.id} value={ph.id} data-project={p.id} class='phase-option'>
                {ph.name}
              </option>
            ))
          ))}
        </SelectField>

        <FileInputField name='file' id='qu-file' label='Datei'
          accept='image/*,video/*,.pdf,.doc,.docx'
          capture='environment'
          required />

        <InputField type='text' name='notes' id='qu-notes' placeholder='Kurze Beschreibung…' label='Notiz (optional)' />

        <InputField type='text' name='manual_tags' id='qu-manual_tags'
          placeholder='z. B. Heizung, Heizkörper, Erdgeschoss'
          label='Eigene Tags (optional, Komma-getrennt)'
          hint='Werden mit den KI-Tags zusammengeführt.' />

        {/* Filled in by XHR upload progress (see layout.tsx); empty/hidden otherwise */}
        <div data-upload-progress hidden class='space-y-1'>
          <div class='h-2 rounded-full bg-stone-200 overflow-hidden'>
            <div data-upload-progress-fill class='h-full bg-accent transition-all' style={{ width: '0%' }}></div>
          </div>
          <p data-upload-progress-label class='text-xs text-stone-500 font-medium text-center'>Wird hochgeladen…</p>
        </div>

        <Button type='submit' variant='primary' class='w-full'>Hochladen</Button>
      </form>

      <p class='text-xs text-stone-500 mt-4 text-center font-medium flex items-center justify-center gap-1'>
        Dateien werden automatisch per KI getaggt
        <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><rect x='8' y='2' width='8' height='4' rx='1' ry='1'/><line x1='9' y1='12' x2='15' y2='12'/><line x1='9' y1='16' x2='15' y2='16'/></svg>
      </p>
    </>
  );
}

export function QuickUploadPage({
  user, projects, phasesByProject, error,
}: {
  user: User;
  projects: Project[];
  phasesByProject: Record<string, Phase[]>;
  error?: string | null;
}) {
  return (
    <Layout user={user} title='Schnell-Upload' active='upload-quick'>
      <div class='max-w-lg mx-auto'>
        <h1 class='text-2xl font-bold mb-6 flex items-center gap-2'>
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg>
          Schnell-Upload
        </h1>
        <QuickUploadForm projects={projects} phasesByProject={phasesByProject} error={error} />
      </div>
    </Layout>
  );
}
