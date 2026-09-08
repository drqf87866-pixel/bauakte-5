# Bauakte 5

Eine **Cloudflare Workers**-basierte Webapp zur Baufortschritts-Dokumentation. Erfassung und Verwaltung von Bauprojekten mit Phasen, Medien-Uploads (Bilder, Videos, PDFs), KI-gestütztem Auto-Tagging und Projekt-Sharing.

## Tech-Stack

| Technologie | Zweck |
|---|---|
| **Cloudflare Workers** | Serverless Runtime |
| **Hono v4** | Web-Framework mit serverseitigem JSX |
| **TypeScript v5** (strict) | Typsichere Entwicklung |
| **Tailwind CSS v4** | CSS-First Styling |
| **D1 (SQLite)** | Datenbank (Cloudflare) |
| **R2 Object Storage** | Datei-/Medienspeicher |
| **Cloudflare Workers AI** | KI-Auto-Tagging (Llama 3.2 Vision) |
| **Vitest** | Testing |
| **ESLint** (flat config) | Linting |
| **Prettier** | Code-Formatierung |

## Features

- **Authentifizierung** – Registrierung/Login mit Session-Management
- **Projekte verwalten** – CRUD für Bauprojekte mit Adresse und Beschreibung
- **8 standardisierte Bauphasen** – Werden automatisch pro Projekt angelegt (Rohbau, Dach & Fassade, etc.)
- **Medien-Uploads** – Bilder, Videos und PDFs pro Phase (mit R2-Speicher)
- **KI-Auto-Tagging** – Automatische Bildanalyse und Verschlagwortung via Llama 3.2 Vision
- **Paginierung** – Uploads werden seitenweise dargestellt (20 pro Seite)
- **Projekt-Sharing** – Einladungslinks zum Teilen von Projekten mit anderen Nutzern
- **Mobile-First** – Responsives Design mit Bottom-Navigation auf Mobilgeräten
- **Schnell-Upload** – Direkter Upload von unterwegs mit Projekt-/Phasenauswahl
- **Barrierefreiheit** – ARIA-Labels, Screenreader-Unterstützung, semantische Rollen
- **Sicherheit** – CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy

## Voraussetzungen

- [Node.js](https://nodejs.org/) v22 oder höher (siehe `.nvmrc`)
- [pnpm](https://pnpm.io/installation) v12 oder höher
- [Cloudflare-Konto](https://dash.cloudflare.com/) für D1, R2 und Workers AI
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (wird über devDependencies installiert)

Verwende [nvm](https://github.com/nvm-sh/nvm) oder [nvm-windows](https://github.com/coreybutler/nvm-windows) für einfaches Node-Version-Management:

```bash
nvm use  # Verwendet die Version aus .nvmrc
```

## Installation & Setup

```bash
# Abhängigkeiten installieren
pnpm install

# Datenbank-Migrationen lokal anwenden
pnpm run db:migrate:local

# Entwicklungsserver starten (lokaler Node.js-Server, NICHT wrangler dev)
pnpm run dev
```

Die App läuft standardmäßig unter `http://localhost:8788` (den aktuellen Port zeigt die Konsolenausgabe an).

> **Hinweis:** Der Dev-Server nutzt `wrangler dev` mit lokal emulierten Bindings (D1, R2, Images) über miniflare. Das AI-Binding greift auch lokal auf die Remote-Workers-AI-API zu.

### Umgebungsvariablen

Lokale Secrets (z. B. `SESSION_SECRET`) liegen in `.dev.vars` (gitignored). Für die Produktion werden Secrets über `wrangler secret put` gesetzt (siehe unten).

## Verfügbare Scripts

| Script | Beschreibung |
|---|---|
| `pnpm run dev` | Entwicklungsserver starten (Wrangler) |
| `pnpm run build` | Produktions-Build (CSS) erstellen |
| `pnpm run deploy` | Build + Deploy zu Cloudflare Workers (ohne DB-Migration) |
| `pnpm test` | Tests ausführen (Vitest) |
| `pnpm run lint` | Linting (ESLint) |
| `pnpm run typecheck` | TypeScript-Prüfung (`tsc --noEmit`) |
| `pnpm run format` | Code-Formatierung mit Prettier |
| `pnpm run db:migrate` | Migrationen manuell auf die D1-Produktionsdatenbank anwenden |
| `pnpm run db:migrate:local` | Migrationen auf die lokale D1-Datenbank anwenden |
| `pnpm run types` | Wrangler-Type-Definitionen generieren |

## Projektstruktur

```
├── src/
│   ├── auth/             # Auth-Middleware (Session-Prüfung)
│   ├── db/               # Datenbank-Schema, Queries & Tests
│   ├── lib/              # Hilfsfunktionen (Auth, R2, Upload, AI-Tags, Validatoren) & Tests
│   ├── routes/           # Routen-Definitionen (Auth, Projekte, Phasen, Uploads, Share, Quick-Upload)
│   ├── views/            # Seiten-Komponenten (JSX-Views)
│   ├── styles/           # Tailwind CSS-Quelldatei
│   └── index.tsx         # App-Einstiegspunkt mit Hono-Router
├── migrations/           # SQL-Migrationen (D1)
├── public/               # Statische Assets (kompiliertes app.css)
├── wrangler.jsonc        # Wrangler-Konfiguration
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── .prettierrc
```

## Datenbank

Die App nutzt **Cloudflare D1** (SQLite-Datenbank) mit folgenden Tabellen:

- **`users`** – Nutzer mit E-Mail, Name und gehashtem Passwort
- **`sessions`** – Sitzungen mit Ablaufdatum
- **`projects`** – Bauprojekte mit Name, Adresse, Beschreibung, Besitzer
- **`phases`** – 8 standardisierte Bauphasen pro Projekt (sortierbar, mit Status)
- **`uploads`** – Medien-Dateien (Bilder/Videos/PDFs) mit R2-Key, MIME-Typ, Tags
- **`share_links`** – Einladungslinks mit Token
- **`project_collaborators`** – Projekt-Mitarbeiter (viele-zu-viele)

## Testing

Das Projekt verwendet **Vitest** für Unit-Tests (56 Tests in 4 Dateien).

```bash
# Alle Tests ausführen
pnpm test

# Tests im Watch-Modus
pnpm test -- --watch

# Mit Coverage-Bericht
pnpm test -- --coverage
```

Die Tests decken folgende Bereiche ab:
- **Database Queries** – Mock-basierte CRUD-Tests (`src/db/queries.test.ts`)
- **Validatoren** – E-Mail-, Passwort- und Formularvalidierung (`src/lib/validators.test.ts`)
- **Upload-Hilfsfunktionen** – Datei-/MIME-Typ-Validierung (`src/lib/upload.test.ts`)
- **AI-Tags** – Tagging-Logik und Fehlerbehandlung (`src/lib/ai-tags.test.ts`)

## Deployment

Das Deployment erfolgt automatisch über die **native Cloudflare Workers Git Integration** bei jedem Push auf den `main`-Branch. Der Build-Prozess führt `pnpm run build && wrangler deploy` aus — Datenbank-Migrationen sind davon ausgenommen. Cloudflare Builds erkennt pnpm automatisch anhand der `pnpm-lock.yaml` bzw. des `packageManager`-Felds in der `package.json`.

```bash
# Manuelles Deployment (für Tests)
pnpm run deploy
```

Vor dem ersten Deployment müssen folgende Cloudflare-Ressourcen eingerichtet sein:
- **D1-Datenbank** mit dem Binding `DB`
- **R2-Bucket** mit dem Binding `R2`
- **Workers AI** mit dem Binding `AI`

## Produktiv-Umgebung (Cloudflare)

Für den Betrieb auf Cloudflare Workers müssen folgende Ressourcen und Konfigurationen eingerichtet werden:

### 1. Ressourcen anlegen

```bash
# D1-Datenbank erstellen
wrangler d1 create bauakte-5

# R2-Bucket erstellen
wrangler r2 bucket create bauakte-5
```

Nach dem Anlegen der D1-Datenbank erhältst du eine `database_id`, die in der `wrangler.jsonc` eingetragen werden muss.

### 2. Secrets setzen

```bash
# SESSION_SECRET – sicherer Zufallsstring zur Session-Cookie-Signierung
wrangler secret put SESSION_SECRET
```

Generiere einen starken Schlüssel, z.B. mit:
```bash
openssl rand -base64 32
```

### 3. Bindings & Environment Variables

Alle Bindings (`DB`, `R2`, `AI`) sind bereits in der `wrangler.jsonc` konfiguriert.  
Die `database_id` muss nach dem Erstellen der D1-Datenbank aktualisiert werden.

Environment-Variablen können im Cloudflare-Dashboard gesetzt werden:

### 4. Datenbank-Migrationen

Migrationen werden **nicht** automatisch beim Deployment ausgeführt. Der Runner
(`scripts/migrate-core.mjs`) legt eine Tabelle `d1_migrations` an, erfasst dort alle
angewendeten Migrationen und führt bei jedem Lauf **nur ausstehende** aus – mehrfaches
Ausführen ist dadurch gefahrlos.

```bash
# Migrationen auf die Produktions-DB anwenden (nur ausstehende)
pnpm run db:migrate

# Lokal auf die Entwicklungs-DB anwenden
pnpm run db:migrate:local

# Upgrade-Pfad: DBs, die VOR dem Tracking-Runner migriert wurden (0001+0002 liegen
# bereits an, aber ohne Tracking) – einmalig als Baseline markieren:
pnpm run db:migrate -- --mark 0001_init.sql,0002_add_tags.sql
# Lokal entsprechend: pnpm run db:migrate:local -- --mark 0001_init.sql,0002_add_tags.sql
```

> **Hinweis:** `wrangler d1 execute` gegen die Remote-DB läuft mit dem OAuth-Token aus
> `wrangler login` bei Datei-Importen teils in einen Auth-Fehler (Code 10000). In dem
> Fall mit einem API-Token arbeiten: `CLOUDFLARE_API_TOKEN` setzen (Dashboard → My
> Profile → API Tokens, z. B. Vorlage „Edit Cloudflare Workers“) und den Befehl erneut
> ausführen.

### 5. Deployment

Das Deployment erfolgt automatisch via Git Integration bei Push auf `main`.
Für ein manuelles Deployment:

```bash
pnpm run deploy
```

### Übersicht aller Konfigurationswerte

| Konfiguration | Typ | Beispielwert | Beschreibung |
|---|---|---|---|
| `DB` | D1 Binding | `database_id = "abc123..."` | SQLite-Datenbank für alle Daten |
| `R2` | R2 Bucket Binding | `bucket_name = "bauakte-5"` | Datei-/Medienspeicher |
| `AI` | Workers AI | (automatisch) | KI-Bildanalyse (Llama 3.2 Vision) |
| `SESSION_SECRET` | Secret (via CLI) | `openssl rand -base64 32` | Session-Cookie-Signierung |

Lokal wird `SESSION_SECRET` über `.dev.vars` bereitgestellt (vom Wrangler-Dev-Server automatisch geladen).

## Lizenz

MIT
