import { Layout, Flash } from './layout';
import type { User, Project, Phase } from '../db/schema';
import { SelectField, InputField, FileInputField } from '../components/ui/input';
import { Button } from '../components/ui/button';

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

        <form method='post' action='/upload-quick' encType='multipart/form-data' data-upload-form class='card space-y-4'>
          <SelectField name='project_id' id='project_id' label='Projekt' required>
            <option value=''>– Projekt w&auml;hlen –</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SelectField>

          <SelectField name='phase_id' id='phase_id' label='Bauphase' required>
            <option value=''>– Phase w&auml;hlen –</option>
            {projects.map((p) => (
              (phasesByProject[p.id] || []).map((ph) => (
                <option key={ph.id} value={ph.id} data-project={p.id} class='phase-option'>
                  {p.name} &rarr; {ph.name}
                </option>
              ))
            ))}
          </SelectField>

          <FileInputField name='file' id='file' label='Datei'
            accept='image/*,video/*,.pdf,.doc,.docx'
            capture='environment'
            required />

          <InputField type='text' name='notes' id='notes' placeholder='Kurze Beschreibung…' label='Notiz (optional)' />

          <Button type='submit' variant='primary' class='w-full'>Hochladen</Button>
        </form>

        <p class='text-xs text-slate-500 mt-4 text-center font-medium flex items-center justify-center gap-1'>
          Dateien werden automatisch per KI getaggt
          <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><rect x='8' y='2' width='8' height='4' rx='1' ry='1'/><line x1='9' y1='12' x2='15' y2='12'/><line x1='9' y1='16' x2='15' y2='16'/></svg>
        </p>
      </div>
    </Layout>
  );
}
