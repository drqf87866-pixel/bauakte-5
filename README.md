# Bauakte 5

Eine **Cloudflare Workers**-basierte Webapp zur Baufortschritts-Dokumentation. Erfassung und Verwaltung von Bauprojekten mit Phasen, Medien-Uploads (Bilder, Videos, PDFs), KI-gestütztem Auto-Tagging und Projekt-Sharing.

## Tech-Stack

| Technologie | Zweck |
|---|---|
| **Cloudflare Workers** | Serverless Runtime |
| **Hono v4** | Web-Framework mit serverseitigem JSX |
| **TypeScript v7** (strict) | Typsichere Entwicklung |
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

- [Node.js](https://nodejs.org/) v20 oder höher (siehe `.nvmrc`)
- npm (wird mit Node.js installiert)
- [Cloudflare-Konto](https://dash.cloudflare.com/) für D1, R2 und Workers AI
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (wird über devDependencies installiert)

Verwende [nvm](https://github.com/nvm-sh/nvm) oder [nvm-windows](https://github.com/coreybutler/nvm-windows) für einfaches Node-Version-Management:

```bash
nvm use  # Verwendet die Version aus .nvmrc
```

## Installation & Setup

```bash
# Abhängigkeiten installieren
npm install

# Datenbank-Migrationen lokal anwenden
npm run db:migrate:local

# Entwicklungsserver starten (lokaler Node.js-Server, NICHT wrangler dev)
npm run dev
```

Die App läuft standardmäßig unter `http://localhost:3000`.

> **Hinweis:** Der lokale Dev-Server nutzt einen eigenen Node.js-Server mit better-sqlite3 (D1-Emulation) und Dateisystem-Stubs (R2). Für Tests mit echten Cloudflare-Bindings kann `wrangler dev` separat verwendet werden (Port 8788).

### Umgebungsvariablen

Kopiere `.env.example` als `.env` und passe die Werte an. Die wichtigsten Variablen sind `APP_TITLE` und `PUBLIC_URL`.

## Verfügbare Scripts

| Script | Beschreibung |
|---|---|
| `npm run dev` | Entwicklungsserver starten (Wrangler) |
| `npm run build` | Produktions-Build (CSS) erstellen |
| `npm run deploy` | Build + Deploy zu Cloudflare Workers |
| `npm test` | Tests ausführen (Vitest) |
| `npm run lint` | TypeScript-Prüfung (`tsc --noEmit`) |
| `npm run format` | Code-Formatierung mit Prettier |
| `npm run db:migrate` | Migrationen auf die D1-Produktionsdatenbank anwenden |
| `npm run db:migrate:local` | Migrationen auf die lokale D1-Datenbank anwenden |
| `npm run types` | Wrangler-Type-Definitionen generieren |

## Projektstruktur

```
├── src/
│   ├── auth/             # Auth-Middleware (Session-Prüfung)
│   ├── db/               # Datenbank-Schema, Queries & Tests
│   ├── lib/              # Hilfsfunktionen (Auth, Avatar, R2, AI-Tags, Validatoren) & Tests
│   ├── routes/           # Routen-Definitionen (Auth, Projekte, Phasen, Uploads, Share, Quick-Upload)
│   ├── views/            # Seiten-Komponenten (JSX-Views)
│   ├── styles/           # Tailwind CSS-Quelldatei
│   └── index.tsx         # App-Einstiegspunkt mit Hono-Router
├── migrations/           # SQL-Migrationen (D1)
├── public/               # Statische Assets (kompiliertes app.css)
├── wrangler.toml         # Wrangler-Konfiguration
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

Das Projekt verwendet **Vitest** für Unit-Tests (25 Tests).

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus
npm test -- --watch

# Mit Coverage-Bericht
npm test -- --coverage
```

Die Tests decken folgende Bereiche ab:
- **Database Queries** – Mock-basierte CRUD-Tests (`src/db/queries.test.ts`)
- **Validatoren** – E-Mail-, Passwort- und Formularvalidierung (`src/lib/validators.test.ts`)
- **Avatar-Hilfsfunktionen** – Initialen, deterministische Farben (`src/lib/avatar.test.ts`)

## Deployment

```bash
# In Produktion deployen
npm run deploy
```

Vor dem Deployment müssen folgende Cloudflare-Ressourcen eingerichtet sein:
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

Nach dem Anlegen der D1-Datenbank erhältst du eine `database_id`, die in der `wrangler.toml` eingetragen werden muss.

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

Die folgenden Bindings müssen in der `wrangler.toml` konfiguriert werden:

```toml
# D1-Datenbank
[[d1_databases]]
binding = "DB"
database_name = "bauakte-5"
database_id = "<deine-database-id>"

# R2-Bucket
[[r2_buckets]]
binding = "R2"
bucket_name = "bauakte-5"

# Workers AI (keine Konfiguration nötig – wird automatisch bereitgestellt)
```

Environment-Variablen können entweder in der `wrangler.toml` oder im Cloudflare-Dashboard gesetzt werden:

```toml
[vars]
ENV = { APP_TITLE = "Bauakte", PUBLIC_URL = "https://bauakte-5.drqf87866.workers.dev" }
```

### 4. Initiale Migration ausführen

```bash
# Migrationen auf die Produktions-DB anwenden
npm run db:migrate
```

### 5. Deployment

```bash
npm run deploy
```

### Übersicht aller Konfigurationswerte

| Konfiguration | Typ | Beispielwert | Beschreibung |
|---|---|---|---|
| `DB` | D1 Binding | `database_id = "abc123..."` | SQLite-Datenbank für alle Daten |
| `R2` | R2 Bucket Binding | `bucket_name = "bauakte-5"` | Datei-/Medienspeicher |
| `AI` | Workers AI | (automatisch) | KI-Bildanalyse (Llama 3.2 Vision) |
| `SESSION_SECRET` | Secret (via CLI) | `openssl rand -base64 32` | Session-Cookie-Signierung |
| `ENV.APP_TITLE` | Environment Var | `"Bauakte"` | App-Titel im Browser-Tab |
| `ENV.PUBLIC_URL` | Environment Var | `"https://bauakte-5.drqf87866.workers.dev"` | Öffentliche URL der App |

## Lizenz

MIT
