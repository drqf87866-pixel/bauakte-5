# UI-Design-Analyse & 5 Verbesserungsvorschläge – Bauakte

## Kontext

Server-rendered Hono/JSX-App (Cloudflare Workers + D1 + R2), Tailwind via CDN, mobile-first,
deutsche Baustellen-Dokumentation. UI-Flächen: `src/views/{layout,projects,phases,auth,share,upload-quick}.tsx`
plus 404-Handler inline in `src/index.tsx:51-59`.

**Stärken (beibehalten):** konsistente 48px Touch-Targets, safe-area-Handling, deterministische
Avatare, Breadcrumb + Phasen-Chip-Navigation, klare Farbsprache (Slate = neutral, Amber = Akzent, Grün = fertig).

**Zentrale Schwächen (Belege):**
- Tailwind Play-CDN in Produktion → FOUC, ~100 KB JS zur Laufzeit: `src/views/layout.tsx:12`
- Kamera-FAB funktionslos: File-Input ohne Form/Action/Name, gewählte Datei geht verloren: `src/views/layout.tsx:67-75`; die existierende Seite `/upload-quick` ist aus keiner Navigation erreichbar
- Kein aktiver Nav-Zustand (kein `aria-current`, kein Highlight) in Bottom-Nav und Desktop-Nav
- Lösch-Confirm wirkungslos: `data-confirm-delete` ohne JS-Handler → Uploads werden sofort ohne Nachfrage gelöscht: `src/views/phases.tsx:150-156`; Projekt-Löschen-Route existiert (`src/routes/projects.tsx:76-85`), aber kein Button im UI
- Kein Feedback: keine Flash-/Success-Messages, `?error=no-file` (`src/routes/uploads.ts:25`) wird nirgends gerendert, kein Upload-Fortschritt/Disabled-State
- Zeichensatz-Mojibake sichtbar für Nutzer (â€“, wÃ¤hlen, erhÃ¤lt): `src/views/upload-quick.tsx:25,40,58`, `src/views/share.tsx:24`
- `scrollbar-hide`-Klasse verwendet, aber nirgends definiert: `src/views/phases.tsx:27`
- 404-Seite ohne Layout/Tailwind (unstylt, blaue Links statt Amber): `src/index.tsx:51-59`
- Fotos nicht voll anschaubar (kein Lightbox/Link auf `img`): `src/views/phases.tsx:119-122`
- Projektkarten ohne Fortschritt/Dokumentzahl; leere Zustände reiner Text: `src/views/projects.tsx:16-22,24-39`
- A11y: Fortschrittsbalken ohne `role="progressbar"`, Icon-Buttons teils ohne Label

---

## Die 5 Verbesserungsvorschläge

### 1. Produktionsreifes CSS statt Tailwind-Play-CDN (Performance & FOUC)
**Problem:** `cdn.tailwindcss.com` (layout.tsx:12) ist ein Runtime-JIT, offiziell nicht für Produktion. Folge: Flash of Unstyled Content, langsamer First Paint auf dem Handy (Baustelle = schlechtes Netz), keine Content-Hash-Caches.
**Lösung:**
- Tailwind als Build-Dependency (`tailwindcss` + CLI) aufnehmen; Input-CSS mit `@tailwind base/components/utilities` plus eigene Utilities (`scrollbar-hide`, s. Vorschlag 5).
- Build-Schritt in `package.json` (`build:css`), Output nach `public/app.css`, Einbindung via `<link rel='stylesheet' href='/app.css'>` in layout.tsx (statt `<script src=cdn>`).
- Wrangler: statische Assets servieren (Assets-Binding oder als Worker-Route), Cache-Header setzen.
**Dateien:** `package.json`, `src/views/layout.tsx`, neue `src/styles/app.css`, `wrangler.toml/jsonc`, ggf. CI-Build.
**Validierung:** `wrangler dev` lokal → kein FOUC beim Reload, Network-Tab zeigt CSS-Datei statt CDN-Script; `npm run build` verfälscht nichts.

### 2. Kamera-FAB reparieren + echte Navigation mit Aktiv-Zustand (Wayfinding)
**Problem:** Der wichtigste Mobile-Button (Kamera) tut nach der Dateiauswahl nichts (Input ohne Form). „Aufnahme" und `/upload-quick` sind verdrahtet aber unerreichbar; Nav zeigt nicht, wo man ist.
**Lösung:**
- FAB in layout.tsx als Link/Shortcut auf `/upload-quick` umbauen (bewährtes Muster: Button-Navigation statt bare Input). Optional: Quick-Upload-Seite öffnet direkt den File-Dialog (`autofocus`/kleines Inline-Script) für den „Kamera-zuerst"-Flow.
- Bottom-Nav: aktiven Zustand je Route rendern (Server kennt Pfad → `active`-Prop an Layout) mit `aria-current='page'`, amber Akzent für aktiv.
- Desktop-Nav um Links erweitern (Projekte, Schnell-Upload) statt nur Logo+User.
**Dateien:** `src/views/layout.tsx`, `src/views/upload-quick.tsx`, alle View-Aufrufer (Layout-Prop `active`).
**Validierung:** Manuell: Klick auf FAB → Quick-Upload öffnet, Upload endet in der richtigen Phase; aktiver Nav-Punkt sichtbar; Keyboard-Bedienung (Tab/Enter) funktioniert.

### 3. Feedback & Sicherheit: Bestätigungen, Flash-Messages, Upload-Status
**Problem:** Destruktive Aktionen ohne echte Bestätigung; nach Aktionen kein sichtbares Ergebnis; Fehler-Query-Params versanden; große Video-Uploads ohne Status.
**Lösung:**
- Kleines globales Inline-Script in layout.tsx: `data-confirm-delete` → `confirm('Wirklich löschen?')`; damit bestehendes Attribut in phases.tsx sofort wirksam.
- Lösch-Button für Projekt in der Detail-Ansicht ergänzen (Route existiert bereits), ebenfalls mit Confirm; nur für Owner rendern.
- Flash-Messages via kurzlebigen Cookie (oder Redirect-Query `?ok=...`): Success-Banner nach Upload/Löschen/Link-Erstellung; `?error=no-file` in PhaseDetailPage als roten Banner rendern.
- Upload-Form: beim Submit Button disablen + „Wird hochgeladen…" (10 Zeilen Inline-JS), `aria-busy` auf Form.
**Dateien:** `src/views/layout.tsx`, `src/views/phases.tsx`, `src/views/projects.tsx`, `src/views/share.tsx`, `src/routes/{uploads,projects,share}.tsx`.
**Validierung:** Upload-Löschen fragt nach; Projekt löschen möglich + bestätigt; nach Upload erscheint Success-Banner; leeres Formular zeigt Fehlermeldung; Doppelklick während Upload unmöglich.

### 4. Dokumente erlebbar machen: Lightbox, informativere Karten & Empty-States
**Problem:** Fotos lassen sich nicht groß ansehen (img ohne Link), Projektkarten zeigen nur Name/Datum (kein Fortschritt, keine Dokumentzahl) – schlechte Entscheidungsgrundlage „welches Projekt öffne ich". Empty-States sind reiner Text ohne Handlungsaufforderung.
**Lösung:**
- Bild-Karten mit `<a href='/r2/{key}' target='_blank' rel='noopener'>` um das Bild wrappen (simpel, no-JS) – oder minimal Lightbox per `<dialog>`-Element.
- Projektkarte: Phasen-Fortschritt (x/8, Mini-Fortschrittsbalken) und Dokumentzahl ergänzen (Queries `getPhasesForProject`/Count existieren bzw. leicht ergänzbar).
- Empty-States mit Icon + Primär-Aktion (Dashboard: „Projekt anlegen"-Button statt nur Link; Dokumente: Hinweis auf Upload-Formular/„Aufnahme").
**Dateien:** `src/views/phases.tsx`, `src/views/projects.tsx`, `src/db/queries.ts`, `src/routes/projects.tsx`.
**Validierung:** Foto antippen öffnet Vollbild; Dashboard-Karte zeigt Fortschritt + Anzahl; neue Projekte/leere Phasen zeigen geführte Empty-States.

### 5. Konsistenz-Polish: Encoding-Fix, 404 in Layout, Scrollbar & A11y
**Problem:** Kaputte Umlaute/Pfeile in UI-Texten (Mojibake), ungestylte 404, sichtbare Scrollbar in der Phasen-Leiste (Klasse fehlt), fehlende A11y-Basics, inkonsistente Akzentfarbe (blau im 404 vs. amber sonstwo).
**Lösung:**
- upload-quick.tsx/share.tsx als UTF-8 neu speichern; Texte korrigieren („– Projekt wählen –", „→", „Beschreibung…", „erhält").
- 404-Handler: `<NotFoundPage>`-View mit Layout (import aus views) statt Inline-HTML; Akzent amber statt blue.
- `scrollbar-hide` als Utility definieren (in Vorschlag-1-CSS bzw. Inline-`<style>`: `.scrollbar-hide::-webkit-scrollbar{display:none}` + `scrollbar-width:none`).
- A11y: Fortschrittsbalken `role='progressbar' aria-valuenow/min/max`, Icon-only-Buttons mit `aria-label` (Logout hat title – ergänzen), Copy-Input mit Label, Status-Badges nicht nur farbcodiert (Text steht schon – gut).
**Dateien:** `src/views/upload-quick.tsx`, `src/views/share.tsx`, `src/index.tsx` (neuer View), `src/views/{layout,phases,projects}.tsx`.
**Validierung:** `rg "Ã|â€" src/views` liefert keine Treffer; 404-URL gestylt; Phasen-Leiste ohne Scrollbar; DevTools-Lighthouse A11y ohne kritische Befunde.

---

## Empfohlene Umsetzungsreihenfolge

1. Vorschlag 5 (Quick Wins, Encoding-Fix dringend – sichtbarer Textschaden)
2. Vorschlag 2 (Kamera-FAB = Kernfunktion der App)
3. Vorschlag 3 (Datensicherheit + Feedback)
4. Vorschlag 4 (Wert für Nutzer)
5. Vorschlag 1 (Build-Infrastruktur, größter Einzelaufwand, danach alle Styles-Punkte konsolidiert)

*Alternative:* Vorschlag 1 zuerst, wenn ohnehin ein Build-Setup eingeführt wird – dann scrollbar-hide dort miterledigen.

## Risiken / Hinweise

- Vorschlag 1 ändert die Asset-Lieferung (wrangler config) – deploy-spezifisch testen.
- Encoding-Fix: Dateien müssen wirklich als UTF-8 gespeichert werden (Editor-Kodierung prüfen), sonst erneuter Mojibake.
- Flash-Messages: Implementierung klein halten (Query-Param reicht für MVP); kein neuer State nötig.
- Alle Änderungen sind reine UI-/Route-Anpassungen; DB-Schema bleibt unverändert (Dokumentzahl-Query kommt neu in queries.ts hinzu).

## Out of Scope

- Client-Framework/Hydration (App bleibt server-rendered)
- Echte Offline-/PWA-Fähigkeit (Service Worker)
- Umbau der Auth-UI über Marketing-Polish hinaus
- Mehrbenutzer-Rollenkonzept im Share-Bereich (nur UI-Aspekt betrachtet)

## Offene Fragen

Keine blockierenden – Umsetzungsreihenfolge kann vom Nutzer nach Priorität verschoben werden.
