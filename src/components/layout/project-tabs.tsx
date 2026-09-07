export type ProjectTab = 'overview' | 'documents' | 'share';

interface ProjectTabsProps {
  projectId: string;
  active: ProjectTab;
  isOwner: boolean;
}

/**
 * In-project segmented navigation (Übersicht · Dokumente · Teilen).
 * Once a project is open, this is how you move around inside it — no more
 * jumping between separate top-level pages for phases/gallery.
 *
 * Not sticky on its own: pages that need a sticky header wrap it themselves
 * (see ProjectDocumentsPage, which sticks the tabs together with its filter bar).
 */
export function ProjectTabs({ projectId, active, isOwner }: ProjectTabsProps) {
  const base = '/projects/' + projectId;
  const tabs: { key: ProjectTab; label: string; href: string }[] = [
    { key: 'overview', label: 'Übersicht', href: base },
    { key: 'documents', label: 'Dokumente', href: base + '/documents' },
  ];
  if (isOwner) {
    tabs.push({ key: 'share', label: 'Teilen', href: base + '/share' });
  }
  return (
    <nav class='flex gap-1 overflow-x-auto scrollbar-hide' aria-label='Projekt-Bereiche'>
      {tabs.map(tab => (
        <a key={tab.key} href={tab.href}
          aria-current={active === tab.key ? 'page' : undefined}
          class={'shrink-0 px-4 py-3 min-h-[48px] flex items-center text-sm font-bold no-underline border-b-2 transition ' +
            (active === tab.key
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-600 hover:text-slate-900')}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
