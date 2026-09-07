# KI-Tagging: Nutzung im Frontend – Analyse & Umsetzungsplan

Ziel: Die von Workers AI (Llama 3.2 Vision) erzeugten Informationen (Tags **und** Beschreibung)
wirklich nutzbar machen. Bisher wird nur ein Teil der Daten gespeichert und ein Großteil im
Frontend gar nicht angezeigt.

> **Status:** Schritte 1–9 (siehe unten) sind umgesetzt – Migration, Persistenz der KI-Beschreibung,
> Status/Retry in der Phase-Ansicht sowie Tags in der Projekt-Übersicht.

## 1. Ist-Zustand

| Schritt | Datei | Ergebnis |
|---|---|---|
| Bildanalyse | `src/lib/ai-tags.ts` | erzeugt `{ tags, description }` (3–8 Tags, deutsche Beschreibung ≤ 20 Wörter) |
| Speicherung | `src/lib/upload.ts:53-56` | speichert **nur `tags`** (`updateUploadTags`), `description` wird **verworfen** |
| DB-Spalten | `migrations/0002_add_tags.sql` | nur `uploads.tags` |
| Phase-View | `views/phases.tsx:173-179` | Tag-Badges unter jedem Tile |
| Phase-View Filter | `views/phases.tsx:120-135` | Tag-Pills zum Filtern (`?tag=`) |
| Projekt-Übersicht | `views/projects.tsx:223-261` | Tag-Filter vorhanden, aber **keine Tags/Badges auf den Tiles** |

**Kernprobleme:**
1. Die KI-**Beschreibung** wird erzeugt und weggeworfen.
2. Es gibt keinen **Status**, ob Tagging läuft / fehlgeschlagen / fertig ist → Nutzer:innen
   sehen nur zufällig leere Kacheln.
3. In der **Projekt-Übersicht** fehlen Tags auf den Kacheln komplett (nur Phase + Datum + Filename).

## 2. Zielbild

- Jeder Upload besitzt in der DB: `tags`, `ai_description`, `tag_status`, `tag_error`.
- Upload-Tile (Phase): zeigt **Beschreibung** (Fallback, wenn keine Notiz), **Tag-Badges** und
  bei laufender/fehlgeschlagener Analyse einen **Status-Indikator** + **Retry-Button**.
- Upload-Kachel (Projekt-Übersicht): zeigt kompakte Tag-Chips + Beschreibungs-Fallback.
- Neue Route `POST /uploads/:id/retag` zum erneuten Analysieren (z. B. wenn Tagging fehlschlug).

### 2.1 `tag_status`-Semantik

| Wert | Bedeutung |
|---|---|
| `pending` | Bild hochgeladen, Analyse läuft noch / ist geplant |
| `done` | Analyse erfolgreich, Tags + Beschreibung gespeichert |
| `failed` | Analyse fehlgeschlagen (Fehlermeldung in `tag_error`) |
| `none` | nicht anwendbar (Video/Dokument, kein Bild) |

## 3. Umsetzungs-Schritte

### Schritt 1 – DB-Migration `migrations/0003_add_ai_metadata.sql`

```sql
ALTER TABLE uploads ADD COLUMN ai_description TEXT NOT NULL DEFAULT '';
ALTER TABLE uploads ADD COLUMN tag_status   TEXT NOT NULL DEFAULT 'none';
ALTER TABLE uploads ADD COLUMN tag_error     TEXT NOT NULL DEFAULT '';

-- Backfill bestehender Daten
UPDATE uploads SET tag_status = 'done'
  WHERE tag_status = 'none' AND type = 'image' AND tags != '';
UPDATE uploads SET tag_status = 'pending'
  WHERE tag_status = 'none' AND type = 'image' AND tags = '';
```

Zusätzlich: Migrationstooling auf Tracking umgestellt (`scripts/migrate-core.mjs` mit
`d1_migrations`-Tabelle) – `db:migrate`/`db:migrate:local` wenden nur ausstehende
Migrationen an; bereits migrierte DBs via `--mark 0001_init.sql,0002_add_tags.sql`
als Baseline setzen.

### Schritt 2 – Schema-Types (`src/db/schema.ts`)

- Neuer Typ `TagStatus = 'pending' | 'done' | 'failed' | 'none'`
- `Upload` um `ai_description: string`, `tag_status: TagStatus`, `tag_error: string` erweitern.

### Schritt 3 – Queries (`src/db/queries.ts`)

- `createUpload`: setzt `tag_status` (Bild → `pending`, sonst → `none`).
- `updateUploadTags` → ersetzen durch `updateUploadAiResult(db, id, { tags, description, status, error })`.

### Schritt 4 – Persistenz der KI-Daten (`src/lib/upload.ts`)

- Neue wiederverwendbare Funktion `runAiTagging(env, { uploadId, type, r2Key, mimeType })`:
  - lädt Bild aus R2, ruft `analyzeImage` auf,
  - schreibt bei Erfolg `tags` + `ai_description` + `tag_status='done'`,
  - schreibt bei Fehler `tag_status='failed'` + `tag_error`.
- `handleUpload`: nutzt `runAiTagging` im `waitUntil`-Block.

### Schritt 5 – Retry-Route (`src/routes/uploads.ts`)

- `POST /uploads/:uploadId/retag` (Auth + Projekt-Zugriff wie Delete):
  - nur Bilder, sonst Fehler-Flash,
  - führt `runAiTagging` synchron aus,
  - Redirect zurück mit `?ok=retagged` bzw. `?error=retag-failed`.
- Flash-Messages in `src/views/layout.tsx` ergänzen.

### Schritt 6 – Phase-View (`src/views/phases.tsx`)

- Unter dem Filename: `notes` **oder** (Fallback) `ai_description` anzeigen.
  KI-Text mit kleinem „KI“-Marker/Symbol kennzeichnen.
- Bei `type === 'image'`:
  - `pending` → amber Badge „Wird analysiert…“ (Spinner)
  - `failed` → roter Hinweis + Button „Erneut analysieren“ (→ Retag-Route), `title={tag_error}`
  - `done`/`none` → kein Extra-Badge (Tags/Beschreibung sprechen für sich)

### Schritt 7 – Projekt-Übersicht (`src/views/projects.tsx`)

- Auf jeder Kachel zusätzlich zum Filename:
  - bis zu 3 Tag-Chips (+ ggf. „+n“)
  - Beschreibungs-Fallback (`notes || ai_description`)
- Kachel bleibt ein `<a>` (keine verschachtelten Links) → Chips sind statische Spans.

### Schritt 8 – Tests

- `src/lib/upload.test.ts` (neu):
  - `runAiTagging` Erfolgsfall → Status `done`, Tags + Beschreibung geschrieben
  - `runAiTagging` Fehlerfall (AI wirft / liefert kein JSON) → Status `failed` + `tag_error`
- Migration lokal einmal durchspielen (`npm run db:migrate:local`) als Smoke-Test.

### Schritt 9 – Verify

- `npm run lint`, `npm run typecheck`, `npm test`.

## 4. Bewusst NICHT in diesem Schritt (spätere Ideen)

- **Suche** über `tags`/`ai_description` (`?q=`) in Dashboard & Projekt.
- **Tag-Cloud / Statistik** („Wie viele Dämmungs-Fotos?“) in der Projekt-Übersicht.
- **Auto-Refresh/WebSocket** nach abgeschlossener Analyse (aktuell Reload genügt).
- **Manuelles Bearbeiten** der KI-Tags im Frontend (aktuell nur Retry).
- **Bewertung** der Tag-Qualität / Feedback-Loop fürs Prompting.
