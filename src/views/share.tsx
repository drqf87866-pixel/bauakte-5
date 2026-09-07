import { Layout, Flash } from './layout';
import type { User, Project, ShareLink } from '../db/schema';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { ProjectTabs } from '../components/layout/project-tabs';

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
      <Breadcrumb items={[
        { label: project.name, href: '/projects/' + project.id },
        { label: 'Teilen' },
      ]} />
      <div class='mb-4'>
        <ProjectTabs projectId={project.id} active='share' isOwner={true} />
      </div>
      <h1 class='text-2xl font-bold mb-6 text-stone-900'>Projekt teilen</h1>
      <Flash ok={ok} />
      <div class='card mb-6'>
        <h2 class='font-bold text-lg mb-3 text-stone-900'>Neuen Einladungslink erstellen</h2>
        <p class='text-base text-stone-600 mb-4 font-medium'>
          Jeder mit dem Link kann sich registrieren und erh&auml;lt vollen Zugriff auf das Projekt.
        </p>
        <form method='post' action={'/projects/' + project.id + '/share/create'}>
          <Button type='submit' variant='primary'>
            <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/></svg>
            Einladungslink generieren
          </Button>
        </form>
      </div>
      {shareLinks.length > 0 && (
        <div class='space-y-3'>
          <h2 class='font-bold text-lg mb-3 text-stone-900'>Aktive Einladungslinks</h2>
          {shareLinks.map((link) => (
            <div key={link.id} class='card flex flex-col sm:flex-row sm:items-center gap-3'>
              <div class='flex-1 min-w-0 relative'>
                <label class='sr-only' for={'link-' + link.id}>Einladungslink</label>
                <input type='text' id={'link-' + link.id}
                  value={baseUrl + '/share/' + link.token}
                  readOnly
                  aria-label='Einladungslink – zum Kopieren antippen'
                  class='w-full text-sm text-[#8a6a1f] bg-accent-light px-4 py-3 pr-10 rounded-xl border border-[#f3e4c4] text-base cursor-pointer'
                  data-copy-link />
                <svg class='shrink-0 absolute right-2 top-2.5 text-accent pointer-events-none' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='9' width='13' height='13' rx='2' ry='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/></svg>
                <p class='text-xs text-stone-500 mt-1 font-medium'>
                  Erstellt am {new Date(link.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
              <form method='post' action={'/share/' + link.id + '/deactivate'} class='sm:ml-3 shrink-0'
                data-confirm-delete
                data-confirm-message='Diesen Einladungslink deaktivieren?'>
                <Button type='submit' variant='ghost' size='sm'>
                  <svg class='shrink-0' aria-hidden='true' xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>
                  Deaktivieren
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
