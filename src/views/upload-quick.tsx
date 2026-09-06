import { jsx, Fragment } from 'hono/jsx';
import { Layout, Flash } from './layout';
import type { User, Project, Phase } from '../db/schema';

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

        <Flash error={error} />

        <form method='post' action='/upload-quick' encType='multipart/form-data' data-upload-form class='bg-white rounded-lg shadow-sm border p-5 space-y-4'>
          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='project_id'>Projekt</label>
            <select name='project_id' id='project_id' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base'>
              <option value=''>– Projekt wählen –</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='phase_id'>Bauphase</label>
            <select name='phase_id' id='phase_id' required
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base'>
              <option value=''>– Phase wählen –</option>
              {projects.map((p) => (
                (phasesByProject[p.id] || []).map((ph) => (
                  <option key={ph.id} value={ph.id} data-project={p.id} class='phase-option'>
                    {p.name} → {ph.name}
                  </option>
                ))
              ))}
            </select>
          </div>

          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='file'>Datei</label>
            <input type='file' name='file' id='file'
              accept='image/*,video/*,.pdf,.doc,.docx'
              capture='environment'
              required
              class='w-full text-base text-slate-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-bold file:bg-amber-500 file:text-slate-900 hover:file:bg-amber-400 file:min-h-[48px] file:cursor-pointer min-h-[48px]' />
          </div>

          <div>
            <label class='block text-base font-semibold mb-2 text-slate-800' for='notes'>Notiz (optional)</label>
            <input type='text' name='notes' id='notes' placeholder='Kurze Beschreibung…'
              class='w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[48px] text-base' />
          </div>

          <button type='submit'
            class='w-full bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition text-base font-bold min-h-[48px]'>
            Hochladen
          </button>
        </form>

        <p class='text-xs text-slate-500 mt-4 text-center font-medium flex items-center justify-center gap-1'>
          Dateien werden automatisch per KI getaggt
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><rect x='8' y='2' width='8' height='4' rx='1' ry='1'/><line x1='9' y1='12' x2='15' y2='12'/><line x1='9' y1='16' x2='15' y2='16'/></svg>
        </p>
      </div>
    </Layout>
  );
}
