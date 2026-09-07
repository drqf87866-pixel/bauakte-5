import { Layout, Flash } from './layout';
import type { User, Project, Phase, Upload } from '../db/schema';
import type { ProjectStatsMap, PhaseMediaCount } from '../db/queries';
import { Button } from '../components/ui/button';
import { InputField, TextareaField } from '../components/ui/input';
import { Alert } from '../components/ui/alert';
import { ProgressBar } from '../components/ui/progress-bar';
import { Pagination } from '../components/ui/pagination';
import { UploadCaption, TagChips } from '../components/upload/upload-meta';

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
        <h1 class="text-2xl font-bold text-slate-900">Meine Projekte</h1>
        <Button href="/projects/new" variant="primary" class="w-full md:w-auto">
          <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neues Projekt
        </Button>
      </div>
      <Flash ok={ok} />
      {projects.length === 0 ? (
        <div class="empty-state">
          <svg class="mx-auto mb-4 text-slate-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <p class="text-lg mb-2 font-bold text-slate-900">Noch keine Projekte vorhanden</p>
          <p class="text-slate-600 font-medium mb-6">
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
                  <h2 class="text-lg font-bold text-slate-900">{project.name}</h2>
                </div>
                {project.address && (
                  <p class="text-sm text-slate-700 mb-2 font-medium">{project.address}</p>
                )}
                {s && (
                  <div class="mt-3 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between text-sm text-slate-600 font-medium mb-1.5">
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
                  <p class="text-sm text-slate-600 font-medium">
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
        <h1 class="text-2xl font-bold mb-6 text-slate-900">Neues Bauprojekt</h1>
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

function qs(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') parts.push(k + '=' + encodeURIComponent(v));
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function phaseFilterUrl(
  baseUrl: string,
  phaseId: string,
  activePhases: string[],
  activeTag?: string
): string {
  const includes = activePhases.includes(phaseId);
  const next = includes
    ? activePhases.filter(id => id !== phaseId)
    : [...activePhases, phaseId];
  return baseUrl + qs({
    phases: next.length > 0 ? next.join(',') : undefined,
    tag: activeTag,
  });
}

function tagFilterUrl(
  baseUrl: string,
  tag: string | undefined,
  activePhases: string[],
  activeTag?: string
): string {
  return baseUrl + qs({
    phases: activePhases.length > 0 ? activePhases.join(',') : undefined,
    tag: tag === activeTag ? undefined : tag,
  });
}

function galleryPaginationBaseUrl(
  baseUrl: string,
  activePhases: string[],
  activeTag?: string
): string {
  return baseUrl + qs({
    phases: activePhases.length > 0 ? activePhases.join(',') : undefined,
    tag: activeTag,
  });
}

export function ProjectDetailPage({
  user, project, phases, mediaCounts, uploads, uploadTotal, uploadPage, uploadTotalPages,
  allTags, activePhases, activeTag, ok,
}: {
  user: User;
  project: Project;
  phases: Phase[];
  mediaCounts: PhaseMediaCount[];
  uploads: Upload[];
  uploadTotal: number;
  uploadPage: number;
  uploadTotalPages: number;
  allTags: string[];
  activePhases: string[];
  activeTag?: string;
  ok?: string | null;
}) {
  const completedPhases = phases.filter(p => p.status === "completed").length;
  const totalPhases = phases.length;
  const isOwner = project.owner_id === user.id;
  const countMap = new Map(mediaCounts.map(m => [m.phase_id, m.count]));
  const totalMedia = mediaCounts.reduce((sum, m) => sum + m.count, 0);
  const baseUrl = "/projects/" + project.id;
  const isAllPhases = activePhases.length === 0;
  return (
    <Layout user={user} title={project.name} active="projects">
      <div class="mb-6">
        <div class="flex flex-col md:flex-row items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.address && <p class="text-slate-700 font-medium">{project.address}</p>}
            {project.description && <p class="text-slate-600 mt-1">{project.description}</p>}
          </div>
          <div class="flex flex-wrap gap-2">
            {isOwner && <Button href={baseUrl + "/share"} variant="secondary">
              <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Teilen
            </Button>}
            <Button href={baseUrl + "/gallery"} variant="primary">
              <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Galerie
            </Button>
            {isOwner && <form method="post" action={baseUrl + "/delete"} data-confirm-delete data-confirm-message="Projekt inkl. aller Phasen und Dokumente endgültig löschen?">
              <Button type="submit" variant="danger-outline">
                <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Löschen
              </Button>
            </form>}
          </div>
        </div>
        <Flash ok={ok} />
        <div class="card mt-4">
          <ProgressBar value={completedPhases} max={totalPhases} label="Fortschritt" />
        </div>
      </div>
      <div class="mb-6">
        <h2 class="font-bold text-sm text-slate-600 mb-3 uppercase tracking-wide">Bauphasen filtern</h2>
        <div class="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          <a href={baseUrl + qs({ tag: activeTag })} aria-current={isAllPhases ? "page" : undefined}
            class={"flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-3 min-h-[72px] text-center no-underline transition " + (isAllPhases ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:shadow-sm")}>
            <span class="text-sm font-bold leading-tight">Alle</span>
            <span class="text-xs font-medium opacity-75">{totalMedia} Medien</span>
          </a>
          {phases.map(function(phase) {
            const count = countMap.get(phase.id) || 0;
            const isActive = activePhases.includes(phase.id);
            return (
              <a key={phase.id} href={phaseFilterUrl(baseUrl, phase.id, activePhases, activeTag)} aria-current={isActive ? "page" : undefined}
                class={"flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-3 min-h-[72px] text-center no-underline transition relative " + (isActive ? "bg-slate-900 text-white border-slate-900 shadow-md" : phase.status === "completed" ? "bg-white text-slate-700 border-success hover:border-success hover:shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:shadow-sm")}>
                <span class="text-sm font-bold leading-tight">{phase.name}</span>
                <span class="text-xs font-medium opacity-75">{count} Medien</span>
                {phase.status === "completed" && <svg class={"shrink-0 absolute top-1 right-1 " + (isActive ? "text-white" : "text-success")} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </a>
            );
          })}
        </div>
      </div>
      {allTags.length > 0 && <div class="mb-6">
        <div class="flex flex-wrap gap-2">
          <a href={baseUrl + qs({ phases: activePhases.length > 0 ? activePhases.join(",") : undefined })}
            class={"px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition " + (!activeTag ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}>Alle</a>
          {allTags.map(function(tag) {
            return <a key={tag} href={tagFilterUrl(baseUrl, tag, activePhases, activeTag)}
              class={"px-3 py-1.5 rounded-full text-sm font-semibold no-underline transition " + (activeTag === tag ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}>{tag}</a>;
          })}
        </div>
      </div>}
      <h2 class="font-bold text-lg mb-3 text-slate-900">Dokumente ({uploadTotal})</h2>
      {uploads.length === 0 ? <div class="empty-state">
        <svg class="mx-auto mb-3 text-slate-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <p class="font-bold text-slate-900">{activePhases.length === 1 ? "Keine Dokumente in dieser Phase" : "Keine Dokumente vorhanden"}</p>
        <p class="text-sm text-slate-600 font-medium mt-1">{activePhases.length === 1 ? <>Gehe zur <a href={baseUrl + "/phases/" + activePhases[0]} class="text-accent hover:underline font-semibold">Phase</a> und lade ein Foto, Video oder PDF hoch.</> : "Wähle eine Phase aus oder lade über den Schnell-Upload Dokumente hoch."}</p>
      </div> : <div class="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {uploads.map(function(upload) {
          const phase = phases.find(function(p) { return p.id === upload.phase_id; });
          return <a key={upload.id} href={baseUrl + "/phases/" + upload.phase_id}
            class="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col no-underline hover:shadow-md transition group">
            {upload.type === "image" ? <div class="relative">
              <img src={"/r2/" + upload.r2_key} alt={upload.notes ? upload.notes : upload.filename} class="w-full h-32 sm:h-48 object-cover" loading="lazy" data-img-fallback />
            </div> : upload.type === "video" ? <div class="w-full h-32 sm:h-48 bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium gap-2">
              <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>
              Video
            </div> : <div class="w-full h-32 sm:h-48 bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium gap-2">
              <svg class="shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              Dokument
            </div>}
            <div class="p-3 flex flex-col flex-1">
              <div class="flex items-center gap-2 mb-1">
                {phase && <span class="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">{phase.name}</span>}
                <span class="text-xs text-slate-500 font-medium ml-auto">{new Date(upload.created_at).toLocaleDateString("de-DE")}</span>
              </div>
              <p class="text-sm font-bold truncate text-slate-900">{upload.filename}</p>
              <UploadCaption upload={upload} />
              <TagChips upload={upload} limit={3} />
            </div>
          </a>;
        })}
      </div>}
      {uploadTotalPages && uploadTotalPages > 1 && <Pagination currentPage={uploadPage ?? 1} totalPages={uploadTotalPages} baseUrl={galleryPaginationBaseUrl(baseUrl, activePhases, activeTag)} />}
    </Layout>
  );
}

