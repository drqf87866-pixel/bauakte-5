# UX-Verbesserungsplan – Bauakte 5

Zielsetzung: Aus einer funktionalen SSR-Bauphasen-App eine App mit konsistentem Feedback, klarer Fehlerbehandlung und vollständiger A11y machen. Reihenfolge nach Nutzer-Impact.

## 1. Übersicht aller Verbesserungen

| # | Titel | Datei / Bereich | Änderung | Aufwand | Risiko |
|---|---|---|---|---|---|
| **F1** | Login-Redirect reparieren | `routes/auth.tsx:6,16-46`, `views/auth.tsx:6-13` | GET liest `?redirect=`, gibt es an View weiter; POST liest es und redirected dorthin (gegen Open-Redirect: gleicher Origin) | **S** | N (CSRF via SameSite=Lax ok) |
| **F2** | 403/404 als gestylte Page | `routes/phases.tsx:24`, `routes/projects.tsx:72`, `routes/uploads.ts:18,54,86`, `routes/share.tsx:24,58`, `index.tsx:81` | Statt `c.text('Forbidden', 403)` → `ForbiddenPage` mit Layout. Neue View `views/error.tsx`. `notFound` auch für nicht-eingeloggte User → `/login` mit Redirect | **M** | N |
| **F3** | Quick-Upload Empty-State | `views/upload-quick.tsx:6-60`, neue Komponente `EmptyStateProjects` | Wenn `projects.length === 0`: nur Hinweis + Button "Erstes Projekt anlegen" | **S** | N |
| **F4** | Quick-Upload 2-Step-Picker | `views/upload-quick.tsx`, neue Route `routes/api/phases-for-project.ts` | Phase-Select wird via dynamischem `<select>` ersetzt: erst Projekt wählen, dann Phase per Fetch nachladen. Fallback ohne JS: progressive enhancement | **M** | N |
| **F5** | Echte Upload-Progressbar | `views/layout.tsx:68-80`, `views/phases.tsx`, `views/upload-quick.tsx`, neue `views/components/upload-progress.ts` | Mit `fetch()` + `ReadableStream` statt `<form>` für Upload, XHR `upload.onprogress` für Progress, Spinner + %-Anzeige, Abbort-Button | **L** | M (Mobile-Browser-Support) |
| **F6** | AI-Tagging Indikator + Retry | `views/phases.tsx:174-179`, neue Route `POST /uploads/:id/retag` | Tile zeigt "Wird analysiert…" Badge solange `tag_status='pending'`. Neuer `tag_status`-Spaltenwert; Retry-Button bei `failed`. Kleines DB-Migration nötig | **L** | M |
| **F7** | Copy-to-Clipboard Feedback | `views/share.tsx:47` | Inline-JS ergänzen um Toast `<Alert role='status'>Kopiert!</Alert>` für 2s, oder neue kleine Komponente `CopyButton` | **S** | N |
| **F8** | Phase wieder öffnen | `routes/phases.tsx:52-64`, `views/phases.tsx:66-79` | Neuer Endpoint `POST /projects/:pid/phases/:phaseId/reopen` + Button "Wieder öffnen" auf completed Phasen | **S** | N |
| **F9** | Session-Expiry Flash | `routes/auth/middleware.ts:15-20` (oder wo `requireAuth` lebt) | Bei Redirect zu `/login` → `?reason=session-expired`; `LoginPage` zeigt entsprechenden Warn-Alert aus `FLASH_MESSAGES` | **S** | N |
| **F10** | Alle Feldfehler anzeigen | `routes/auth.tsx:23,60,113`, `routes/projects.tsx:47`, `views/auth.tsx`, `views/projects.tsx` | Statt `Object.values(errors)[0]` → `errors`-Objekt an View geben, in `InputField.error` rendern | **M** | N |
| **F11** | Inline-Validierung aktivieren | `components/ui/input.tsx:26,39,50,63`, alle Forms | `aria-invalid` + `aria-describedby` wiring, Fokus auf erstes Fehlerfeld nach Submit (Server-side redirect) | **S** | N |
| **F12** | Dateigröße + MIME-Limit | `routes/uploads.ts`, `routes/upload-quick.tsx`, `lib/upload.ts` | Server validiert `Content-Length` (< 100 MB default) + Whitelist `image/*,video/*,application/pdf`; HTML-Input mit `max` Hinweis; Fehler via `?error=file-too-large` etc. | **M** | N |
| **A1** | Control-Center als Dialog | `components/layout/control-center.tsx`, `views/layout.tsx:94-111` | `role='dialog'`, `aria-modal='true'`, Fokus-Trap (kleine Util), ESC-Handler, Restore-Fokus auf Trigger beim Schließen | **M** | N |
| **A2** | Breadcrumb Semantik | `components/ui/breadcrumb.tsx` | `<nav aria-label='Brotkrumen'><ol>…</ol></nav>`, `aria-current='page'` auf letztem Item | **S** | N |
| **A3** | Pagination a11y | `components/ui/pagination.tsx` | Aktive Seite mit `aria-current='page'`, semantische Labels `Vorherige Seite`/`Nächste Seite` | **S** | N |
| **M1** | Safe-Area Padding | `views/layout.tsx:259`, `styles/app.css:104-112` | `<main>`-Padding dynamisch via CSS: `padding-bottom: calc(6rem + env(safe-area-inset-bottom))` statt hartem `pb-24` | **S** | N |
| **M2** | Pill-Strip Auto-Scroll | `views/phases.tsx:42-55` | Inline-Script scrollt aktives Pill in Viewport beim Mount, Fade-Gradienten an Scroll-Enden via CSS | **S** | N |
| **M3** | Desktop-FAB | `components/layout/nav-desktop.tsx` | Quick-Upload als runder Button mit Akzent-Farbe im Desktop-Nav (visuelles Äquivalent zum Mobile-FAB) | **S** | N |
| **N1** | Projekt-Suche | `routes/projects.tsx`, `views/projects.tsx` | Suchfeld im Dashboard, Filter via `?q=` in Query (simple LIKE) | **M** | N |
| **N2** | Dashboard-Tabs Eigene/Geteilt | `routes/projects.tsx`, `views/projects.tsx` | Tab-Filter oben: `Alle`/`Eigene`/`Geteilt mit mir`; Server gibt entsprechend gefilterte Liste zurück | **M** | N |
| **N3** | AI-Beschreibung anzeigen | `views/phases.tsx:174-179`, `db/queries.ts` (Insert) | Wenn `notes` leer, zeige truncated `description` als Fallback-Text auf Tile | **S** | N |

## 2. Vorgeschlagene Phasen (Iterationen)

### Phase 1 – Foundations (1-2 Tage, alle Quick Wins)
F1, F2, F3, F7, F8, F9, A2, A3, M1, M2, M3, N3
- Fokus: keine neuen Abhängigkeiten, nur Pattern-Fixes.
- Tests: Redirect-Logik (F1), ForbiddenPage-Render (F2), Phase-Reopen (F8), Session-Flash (F9), Breadcrumb-Snapshot-Test (A2).

### Phase 2 – Forms & Validation (1 Tag)
F10, F11, F12
- Fokus: Validatoren erweitern, Server-Validierungs-Pattern vereinheitlichen, eine zentrale Error-Utility.
- Tests: Validatoren (bestehen schon in `src/lib/validators.test.ts`) – neue Cases für MIME + Größe; Form-View-Tests für Field-Errors.

### Phase 3 – Quick Upload neu (1 Tag)
F4 + A1
- Fokus: API-Route `/api/projects/:id/phases` + JSX mit progressivem Enhancement.
- Tests: API-Route, Empty-State-View, Control-Center-Dialog-Snapshot.

### Phase 4 – Upload Progress + AI Status (2-3 Tage, größte Brocken)
F5, F6
- Neue DB-Migration (`tag_status`-Spalte + `tag_error`-Text).
- Neue Komponente `UploadProgress`, Umbau des Upload-Flows auf `fetch()`.
- Tests: AI-Tag-Retry-Route, DB-Migration per `migrate-local.mjs`, View-Snapshots für Progress-States.

### Phase 5 – Neue Features (optional, nach Diskussion)
N1, N2
- Nur falls darauf Wert gelegt wird; dafür ist eventuell eine eigene UX-Diskussion sinnvoll.

## 3. Tests-Strategie

- **Unit (Vitest)**: bestehende Tests in `src/db/queries.test.ts`, `src/lib/validators.test.ts`, `src/lib/avatar.test.ts` werden erweitert.
- **View-Snapshots**: optional `@testing-library/preact` (oder bestehendes React-Testing-Pattern) für JSX. Aktuell gibt es **keine View-Tests** – wird mit F2/F8/A2 minimal aufgebaut.
- **Migrationstests**: Für F6 neue `migrations/NNN_add_tag_status.sql` + Test, dass `db:migrate:local` durchläuft.
- **Manuelle QA-Liste** (am Ende): Mobile-Safari PWA-Install, große Datei-Upload, Session-Expiry, Share-Link-Annahme.

## 4. Empfohlener Start

Wenn sofort losgelegt werden soll, wird **Phase 1 + Phase 2** als erster Block vorgeschlagen (13 von 21 Verbesserungen, alle niedrigen Aufwands und ohne DB-Migration). Phase 4 (Upload-Progress) kann als separates Feature-PR kommen, weil dort der größte Umbau passiert.
