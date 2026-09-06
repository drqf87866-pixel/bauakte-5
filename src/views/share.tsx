import { jsx } from 'hono/jsx';
import { Layout, Flash } from './layout';
import type { User, Project, ShareLink } from '../db/schema';

export function SharePage({
  user, project, shareLinks, baseUrl, ok,
}: {
  user: User;
  project: Project;
  shareLinks: ShareLink[];
  baseUrl: string;
  ok?: string | null;
}) {
  return (
    <Layout user={user} title={'Teilen - ' + project.name} active='projects'>
      <div class='mb-4 text-sm'>
        <a href={'/projects/' + project.id} class='text-amber-600 hover:underline font-semibold no-underline'>{project.name}</a>
        <span class='text-slate-400 mx-2'>/</span>
        <span class='text-slate-700 font-medium'>Teilen</span>
      </div>
      <h1 class='text-2xl font-bold mb-6 text-slate-900'>Projekt teilen</h1>
      <Flash ok={ok} />
      <div class='bg-white rounded-lg shadow-sm border p-5 mb-6'>
        <h2 class='font-bold text-lg mb-3 text-slate-900'>Neuen Einladungslink erstellen</h2>
        <p class='text-base text-slate-600 mb-4 font-medium'>
          Jeder mit dem Link kann sich registrieren und erhält vollen Zugriff auf das Projekt.
        </p>
        <form method='post' action={'/projects/' + project.id + '/share/create'}>
          <button type='submit'
            class='bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition text-base font-bold min-h-[48px] flex items-center gap-2 no-underline'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/></svg>
            Einladungslink generieren
          </button>
        </form>
      </div>
      {shareLinks.length > 0 && (
        <div class='space-y-3'>
          <h2 class='font-bold text-lg mb-3 text-slate-900'>Aktive Einladungslinks</h2>
          {shareLinks.map((link) => (
            <div key={link.id} class='bg-white rounded-lg shadow-sm border p-5 flex flex-col sm:flex-row sm:items-center gap-3'>
              <div class='flex-1 min-w-0 relative'>
                <label class='sr-only' for={'link-' + link.id}>Einladungslink</label>
                <input type='text' id={'link-' + link.id}
                  value={baseUrl + '/share/' + link.token}
                  readOnly
                  aria-label='Einladungslink – zum Kopieren antippen'
                  class='w-full text-sm text-amber-700 bg-amber-50 px-4 py-3 pr-10 rounded-lg border border-amber-300 text-base cursor-pointer'
                  onclick='this.select(); if(navigator.clipboard){navigator.clipboard.writeText(this.value)}else{document.execCommand("copy")}' />
                <svg class='shrink-0 absolute right-2 top-2.5 text-amber-400 pointer-events-none' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='9' width='13' height='13' rx='2' ry='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/></svg>
                <p class='text-xs text-slate-500 mt-1 font-medium'>
                  Erstellt am {new Date(link.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
              <form method='post' action={'/share/' + link.id + '/deactivate'} class='sm:ml-3 shrink-0'
                data-confirm-delete
                data-confirm-message='Diesen Einladungslink deaktivieren?'>
                <button type='submit'
                  class='text-sm font-bold text-red-700 hover:text-red-800 flex items-center gap-1'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>
                  Deaktivieren
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
