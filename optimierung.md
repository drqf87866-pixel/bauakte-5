# Optimierungsanalyse: Bauakte

## 📋 Projektüberblick

**Bauakte** ist eine React-basierte Single-Page-Anwendung zur Verwaltung von Bauprojekten. Sie bietet:
- Eine Übersicht aller Bauprojekte mit Such- und Filterfunktion
- Detaillierte Projektansichten mit Phasen, Aufgaben und Checklisten
- Eine Bildergalerie für Baufortschrittsfotos

**Tech-Stack:**
- React 19 + TypeScript
- Vite 6 (Build-Tool)
- Tailwind CSS (v3 Config, aber v4 als Dependency)
- Kein Routing (Single Page), kein State-Management (nur React useState)
- Keine Tests, kein Backend (alles hartcodierte Daten)

---

## 🔍 Gefundene Optimierungspotenziale

Nach Priorität sortiert (H = Hoch, M = Mittel, N = Niedrig):

---

### H1: Tailwind CSS v3 Config mit v4 Dependency

**Problem:** `package.json` deklariert `"tailwindcss": "^4.0.0"`, aber `tailwind.config.js` verwendet die v3-Syntax (`content` array, `theme.extend`). Tailwind v4 verwendet ein radikal anderes Konfigurationssystem (CSS-first Config, `@import "tailwindcss"`, kein tailwind.config.js mehr nötig).

**Betroffene Dateien:** `package.json`, `tailwind.config.js`, `postcss.config.js`, `src/index.css`

**Vorschlag:**
- Entweder: Tailwind auf v4 migrieren (CSS-first Config, `@theme` Direktiven)
- Oder: Tailwind auf v3.x fixieren (`"tailwindcss": "^3.4.0"`)
- **Empfehlung:** Auf v4 migrieren, da es zukunftssicherer ist

**Aufwand:** Mittel (~30 Min)

---

### H2: Fehlende Persistenz – Checklisten-Änderungen gehen verloren

**Problem:** In `Checklist.tsx` werden Tasks als `completed` markiert, aber diese Änderungen werden nirgendwo gespeichert – bei einem Reload sind alle Änderungen weg. Die App hat kein Backend und keinen localStorage.

**Betroffene Dateien:** `src/components/Checklist.tsx`

**Vorschlag:**
- localStorage als einfache Persistenz-Lösung einbauen
- Checklist-Status pro Projekt speichern (z.B. `bauakte-checklist-{projectId}`)
- Alternativ: Einen einfachen Custom Hook `usePersistedState` erstellen

**Aufwand:** Gering (~15 Min)

---

### H3: Fehlende Fehlerbehandlung

**Problem:** Es gibt keinen ErrorBoundary, kein Loading State, keine Fehlerbehandlung für:
- Bild laden fehlgeschlagen (`ImageGallery.tsx`, `ImageModal.tsx`)
- Kein `Suspense`-Boundary
- Kein try/catch für potenzielle Operationen

**Betroffene Dateien:** `src/App.tsx`, `src/components/ImageGallery.tsx`, `src/components/ImageModal.tsx`

**Vorschlag:**
- ErrorBoundary-Komponente um die App wrappen
- `onError`-Handler für Bilder (`onError={(e) => e.currentTarget.src = '/fallback.png'}`)
- Ladezustände für asynchrone Operationen vorbereiten

**Aufwand:** Gering (~20 Min)

---

### H4: Duplizierte Filterlogik

**Problem:** Die Filterlogik existiert an mehreren Stellen:
1. Inline in `App.tsx` (Projects nach `searchQuery` und `filterStatus` filtern)
2. Inline in `Sidebar.tsx` (nochmalige Filterung)
3. Als Custom Hook in `Hooks.tsx` (`useProjectFilter`), der aber nicht verwendet wird

**Betroffene Dateien:** `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/Hooks.tsx`

**Vorschlag:**
- Den existierenden `useProjectFilter`-Hook aus `Hooks.tsx` verwenden
- Oder die Filterlogik komplett nach App.tsx ziehen und nur die gefilterte Liste per Props weitergeben
- Sidebar sollte nur noch die bereits gefilterte Liste bekommen

**Aufwand:** Gering (~10 Min)

---

### M1: Keine Performance-Optimierungen

**Problem:**
- `useMemo` fehlt für die gefilterte Projektliste in `App.tsx`
- `useCallback` fehlt für Event-Handler
- Kein `React.memo` für Komponenten, die häufig neu rendern (StatusBadge, ProgressBar, SearchBar)

**Betroffene Dateien:** `src/App.tsx` und alle Komponenten

**Vorschlag:**
- `useMemo` für die gefilterte Liste (verhindert Neuberechnung bei jedem Render)
- `React.memo` für kleine, häufig gerenderte Komponenten (StatusBadge, ProgressBar, EmptyState)
- `useCallback` für Event-Handler, die als Props weitergegeben werden

**Aufwand:** Gering (~15 Min)

---

### M2: Kein Lazy Loading / Code Splitting

**Problem:** Alle Komponenten werden in einem Bundle geladen, obwohl sie nicht alle gleichzeitig sichtbar sind. Besonders `ImageModal.tsx` wird erst bei Benutzerinteraktion benötigt.

**Betroffene Dateien:** `src/App.tsx`

**Vorschlag:**
- `React.lazy()` für `ImageModal.tsx` (wird erst bei Klick gebraucht)
- `React.lazy()` für `ProjectDetails.tsx` und `ImageGallery.tsx` (werden erst bei Projektauswahl gebraucht)
- `<Suspense>` mit Fallback in App.tsx

**Aufwand:** Gering (~15 Min)

---

### M3: Keine Barrierefreiheit (A11y)

**Problem:**
- Keine ARIA-Attribute (z.B. `aria-label` für SearchBar, FilterBar)
- Keine Tastaturnavigation (Modal kann nicht mit Tab geschlossen werden)
- Keine `role`-Attribute für interaktive Elemente
- Kein `sr-only` für Screenreader-Texte

**Betroffene Dateien:** Alle Komponenten

**Vorschlag:**
- `aria-label` für SearchBar und FilterBar hinzufügen
- `role="dialog"` und `aria-modal="true"` für ImageModal
- Tastaturunterstützung für Modal (Escape ist schon da, Tab-Fokus fehlt)
- `role="progressbar"` für ProgressBar mit `aria-valuenow`

**Aufwand:** Mittel (~30 Min)

---

### M4: Ineffizientes State-Management

**Problem:** `App.tsx` hat drei `useState`-Hooks, aber die Daten fließen nur von oben nach unten. Das ist für die aktuelle Größe okay, aber:
- Keine zentrale State-Verwaltung (Context, Zustand, etc.)
- Props werden durch mehrere Ebenen durchgereicht (Prop Drilling)
- `selectedProject` wird von mehreren Komponenten indirekt beeinflusst

**Betroffene Dateien:** `src/App.tsx`

**Vorschlag:**
- Für die aktuelle Größe reicht `useState` – aber bei Erweiterung auf React Context umsteigen
- Alternativ: Zustand oder Jotai für skalierbares State-Management
- **Vorläufig:** Keine Änderung nötig, nur als Beobachtung festhalten

**Aufwand:** Keiner (Beobachtung)

---

### M5: Keine Tests

**Problem:** Keine Test-Frameworks in `package.json`, keine Test-Dateien im Projekt.

**Vorschlag:**
- Vitest + React Testing Library aufsetzen
- Unit-Tests für die Filterlogik (`useProjectFilter`)
- Komponententests für StatusBadge, ProgressBar, SearchBar
- Einen einfachen Smoke-Test für App.tsx

**Aufwand:** Hoch (~2h)

---

### M6: TypeScript könnte strikter sein

**Problem:**
- `tsconfig.json` hat `"strict": false` (kein strict mode)
- `filterStatus` in App.tsx ist `string` statt `'all' | 'active' | 'completed' | 'on-hold'`
- `searchQuery` ist `string` statt `string | undefined`

**Betroffene Dateien:** `tsconfig.json`, `src/App.tsx`

**Vorschlag:**
- `"strict": true` in tsconfig.json aktivieren
- Engere Typen für Filter-Status verwenden
- TypeScript-Errors nach Aktivierung von strict mode fixen

**Aufwand:** Mittel (~30 Min)

---

### N1: Kein ESLint / Prettier Setup

**Problem:** Keine Linter- oder Formatter-Konfiguration im Projekt. Der Code hat inkonsistente Formatierung.

**Vorschlag:**
- ESLint mit React + TypeScript Regeln aufsetzen
- Prettier mit konsistenten Regeln
- Husky + lint-staged für Pre-Commit-Hooks

**Aufwand:** Mittel (~30 Min)

---

### N2: Bildoptimierung

**Problem:**
- Bilder in `ImageGallery.tsx` werden ohne Optimierung geladen
- Kein Lazy Loading (`loading="lazy"` fehlt)
- Kein Fallback-Bild bei Fehlern
- Keine responsiven Bildgrößen (srcset)

**Betroffene Dateien:** `src/components/ImageGallery.tsx`, `src/components/ImageModal.tsx`

**Vorschlag:**
- `loading="lazy"` für Galerie-Bilder
- `onError`-Fallback für alle Bilder
- CSS `object-fit: cover` für konsistente Bilddarstellung

**Aufwand:** Gering (~10 Min)

---

### N3: Hooks.tsx ist falsch benannt

**Problem:** Die Datei heißt `Hooks.tsx` (mit `.tsx` statt `.ts`), obwohl sie kein JSX enthält – nur einen Custom Hook.

**Betroffene Dateien:** `src/components/Hooks.tsx`

**Vorschlag:**
- Nach `src/hooks/useProjectFilter.ts` verschieben (`.ts` statt `.tsx`)
- Importe in allen Dateien aktualisieren

**Aufwand:** Gering (~5 Min)

---

### N4: Keine Umgebungsvariablen

**Problem:** Es gibt keine `.env`-Dateien und keine Verwendung von `import.meta.env`. Die App ist nicht konfigurierbar.

**Vorschlag:**
- `.env.example` anlegen mit möglichen Konfigurationswerten
- `VITE_APP_TITLE` für den Seitentitel
- Vorbereitung für zukünftige API-URL

**Aufwand:** Gering (~5 Min)

---

## 📊 Zusammenfassung der Prioritäten

| Prio | Thema | Aufwand | Impact |
|------|-------|---------|--------|
| H1 | Tailwind v3 vs v4 | ~30 Min | Build-Stabilität |
| H2 | Checklist-Persistenz | ~15 Min | User Experience |
| H3 | Fehlerbehandlung | ~20 Min | Robustheit |
| H4 | Duplizierte Filterlogik | ~10 Min | Code-Qualität |
| M1 | Performance (useMemo/memo) | ~15 Min | Performance |
| M2 | Lazy Loading | ~15 Min | Ladezeit |
| M3 | Barrierefreiheit | ~30 Min | Accessibility |
| M4 | State-Management | – | Beobachtung |
| M5 | Tests | ~2h | Qualitätssicherung |
| M6 | TypeScript strict | ~30 Min | Typsicherheit |
| N1 | ESLint/Prettier | ~30 Min | Code-Qualität |
| N2 | Bildoptimierung | ~10 Min | UX/Performance |
| N3 | Hooks-Datei umbenennen | ~5 Min | Code-Organisation |
| N4 | Umgebungsvariablen | ~5 Min | Konfigurierbarkeit |

---

## 💡 Empfohlene Reihenfolge der Umsetzung

1. **Tailwind-Konfiguration fixen** (H1) – Grundlage für alles Weitere
2. **Duplizierte Filterlogik entfernen** (H4) – Kleiner, schneller Fix
3. **Fehlerbehandlung** (H3) + **Bildoptimierung** (N2) – Sofortige Verbesserung
4. **Checklist-Persistenz** (H2) – Größter UX-Gewinn
5. **Performance-Optimierungen** (M1) + **Lazy Loading** (M2)
6. **TypeScript strict mode** (M6) – Typen bereinigen
7. **Barrierefreiheit** (M3)
8. **ESLint/Prettier** (N1) + **Hooks umbenennen** (N3) + **Env-Vars** (N4)
9. **Tests** (M5) – Fundament für zukünftige Entwicklung
