# Bauakte-5 – AI Assistant Guide

## Project Overview

Cloudflare Workers application for construction progress documentation. Users can create projects with 8 standardized construction phases, upload media (images, videos, PDFs), and use AI-powered auto-tagging.

## Tech Stack

- **Runtime**: Cloudflare Workers with `nodejs_compat` flag
- **Framework**: Hono v4.13.7 with server-side JSX (hono/jsx)
- **Language**: TypeScript v7.0.2 (strict mode, ES2022, ESM)
- **Styling**: Tailwind CSS v4.3.3 (CSS-first config, no tailwind.config.js)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (object storage)
- **AI**: Cloudflare Workers AI (Llama 3.2 Vision)
- **Local Dev**: Custom Node.js setup with @hono/node-server + tsx + better-sqlite3

## Key Commands

```bash
# Start local dev server (port 3000)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test

# Run all checks (lint + typecheck + test)
npm run check

# Build for production
npm run build

# Deploy to Cloudflare Workers
npm run deploy

# Run database migrations locally
npm run db:migrate:local
```

## Architecture

### Entry Point
- `src/index.tsx` – Main Hono app with route mounting

### Local Development
- `src/lib/local-dev.ts` – Creates local environment with D1 (better-sqlite3), R2 (filesystem), AI (stub)
- `src/lib/d1-adapter.ts` – D1 adapter wrapping better-sqlite3
- Local dev runs via `@hono/node-server`, NOT wrangler dev

### Database
- Schema defined in `src/db/schema.ts`
- Queries in `src/db/queries.ts`
- Migrations in `migrations/*.sql` (auto-discovered by migration scripts)
- Tables: users, sessions, projects, phases, uploads, share_links, project_collaborators

### Routes
- `src/routes/auth.tsx` – Authentication (login, register, logout, password change)
- `src/routes/projects.tsx` – Project CRUD
- `src/routes/phases.tsx` – Phase management
- `src/routes/uploads.ts` – Media uploads (R2 storage)
- `src/routes/share.tsx` – Project sharing via invite links
- `src/routes/upload-quick.tsx` – Quick upload endpoint

### Views
- All views use server-side JSX (hono/jsx)
- Located in `src/views/`
- Use Tailwind CSS classes directly (no CSS modules)

## Testing

- Framework: Vitest
- Test files: `src/**/*.test.ts`
- Run tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

## Code Style

- Formatter: Prettier (config in `.prettierrc`)
- Linter: ESLint with flat config (`eslint.config.js`)
- Indentation: 2 spaces
- Quotes: single quotes
- Semicolons: yes
- Trailing commas: all

## Important Patterns

### Environment Bindings
The app expects these bindings in the environment:
- `DB`: D1Database
- `R2`: R2Bucket
- `AI`: Ai (Workers AI)

### Auth Flow
- Session-based authentication
- Sessions stored in `sessions` table
- `authMiddleware` in `src/auth/middleware.ts` checks session on every request
- Current user available via `c.get('user')` in route handlers

### File Uploads
- Files stored in R2 with keys like `uploads/{phaseId}/{uploadId}.{ext}`
- Metadata stored in `uploads` table
- AI auto-tagging happens asynchronously after upload

## Common Tasks

### Adding a New Database Table
1. Create migration file: `migrations/NNNN_table_name.sql`
2. Add interface to `src/db/schema.ts`
3. Add query functions to `src/db/queries.ts`
4. Run migrations: `npm run db:migrate:local`

### Adding a New Route
1. Create route file: `src/routes/route-name.tsx`
2. Define routes using Hono router
3. Mount in `src/index.tsx`: `app.route('/path', routeNameRoutes)`
4. Create view component in `src/views/` if needed

### Adding a New Tailwind Class
Tailwind v4 uses `@source inline(...)` to detect classes. If you use a dynamic class, add it to the inline source list in `src/styles/app.css`.

## Deployment

Before deploying:
1. Ensure D1 database exists: `wrangler d1 create bauakte-5`
2. Update `database_id` in `wrangler.jsonc` with the actual UUID
3. Ensure R2 bucket exists: `wrangler r2 bucket create bauakte-5`
4. Set `SESSION_SECRET`: `wrangler secret put SESSION_SECRET`
5. Run migrations: `npm run db:migrate`
6. Deploy: `npm run deploy`