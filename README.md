# Robot Cooks Drawings

AI-generated A4 vector drawings — generate, export as PDF, store, and search semantically.

## Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 14 (App Router) |
| Hosting | Netlify |
| Database | Supabase (Postgres + pgvector) |
| Storage | Supabase Storage |
| AI | Google Gemini API (server-side only) |
| Language | TypeScript |
| Package manager | pnpm |
| Styling | Tailwind CSS |

---

## Required Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it | Exposed to client? |
|---|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | **Never** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API | Yes (safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API | **Never** |
| `DEFAULT_OWNER_ID` | Any UUID (for single-user mode) | No |

---

## Supabase Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Enable pgvector

In the Supabase SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Run migrations

Run each file in order in the Supabase SQL editor:

```
supabase/migrations/001_enable_extensions.sql
supabase/migrations/002_create_tables.sql
supabase/migrations/003_create_search_function.sql
supabase/migrations/004_storage_buckets.sql
```

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 4. Verify storage buckets

In the Supabase dashboard → Storage, confirm three buckets were created:
- `drawings-svg`
- `drawings-pdf`
- `drawings-thumb`

If they were not created by the SQL migration (some Supabase plans restrict storage API access via SQL), create them manually via the dashboard with **Public: off**.

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Google Chrome installed at `/Applications/Google Chrome.app` (for PDF generation on macOS)
  - Or set `PUPPETEER_EXECUTABLE_PATH` to your Chrome binary path

### Install dependencies

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env.local
# Fill in all values
```

### Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Pages

| Path | Description |
|---|---|
| `/` | Home |
| `/create` | Generate and save drawings |
| `/library` | Browse and search saved drawings |
| `/drawing/[id]` | Drawing detail, metadata, download, find similar |

---

## Netlify Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/robot-cooks-drawings.git
git push -u origin main
```

### 2. Import to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. **Add new site → Import an existing project**
3. Connect your GitHub repository
4. Netlify will auto-detect build settings from `netlify.toml`:
   - Build command: `pnpm build`
   - Publish directory: `.next`
   - Plugin: `@netlify/plugin-nextjs`

### 3. Set environment variables

In Netlify → Site → Environment variables, add all variables from `.env.example`.

**Critical**: `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be server-only variables (do not prefix with `NEXT_PUBLIC_`).

### 4. Deploy

Trigger a deploy from the Netlify dashboard or push to your main branch.

---

## Architecture Notes

### Security

- `GEMINI_API_KEY` is only used in server-side code (`lib/gemini.ts`, `app/api/**/route.ts`)
- `SUPABASE_SERVICE_ROLE_KEY` is only used in `lib/supabase/server.ts`
- Client-side code only uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only, scoped by RLS)
- All file downloads go through short-lived signed URLs generated server-side

### Save Pipeline

When you click **Save** on the Create page:

1. SVG → PDF via Puppeteer/Chromium (server-side)
2. SVG → PNG thumbnail via Puppeteer (server-side)
3. Gemini extracts structured metadata JSON from the SVG
4. Gemini generates a 768-dimensional embedding vector
5. SVG, PDF, and thumbnail are uploaded to Supabase Storage
6. `drawings`, `drawing_metadata`, and `drawing_embeddings` rows are inserted

### Semantic Search

- Query text is embedded with `text-embedding-004` (768 dimensions)
- pgvector `IVFFLAT` cosine index is used for approximate nearest-neighbor search
- The `match_drawings` SQL function joins drawings + metadata and returns similarity scores

### PDF Generation

- Uses `puppeteer-core` + `@sparticuz/chromium` for Netlify/Lambda compatibility
- Locally uses system Chrome (configure via `PUPPETEER_EXECUTABLE_PATH`)
- Renders SVG in a headless browser at A4 physical dimensions

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── generate/route.ts       # POST: generate SVG via Gemini
│   │   ├── save/route.ts           # POST: full save pipeline
│   │   ├── search/route.ts         # POST: semantic search
│   │   ├── drawings/[id]/route.ts  # GET: drawing detail
│   │   ├── drawings/[id]/similar/  # POST: find similar
│   │   └── files/signed-url/       # POST: get signed storage URL
│   ├── create/page.tsx             # /create page
│   ├── library/page.tsx            # /library page
│   ├── drawing/[id]/page.tsx       # /drawing/[id] page
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── gemini.ts                   # Gemini: generate, metadata, embed
│   ├── pdf.ts                      # Puppeteer: SVG to PDF + thumbnail
│   ├── storage.ts                  # Supabase Storage helpers
│   ├── types.ts                    # Shared TypeScript types
│   └── supabase/
│       ├── client.ts               # Client-side Supabase (anon key)
│       └── server.ts               # Server-side Supabase (service role)
├── netlify/
│   └── functions/                  # Standalone Netlify Function variants
├── supabase/
│   └── migrations/                 # SQL migrations (run in order)
├── .env.example
├── netlify.toml
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Manual Setup Checklist

- [ ] Create Supabase project
- [ ] Enable `vector` extension in Supabase SQL editor
- [ ] Run all 4 SQL migrations in order
- [ ] Verify 3 storage buckets exist (drawings-svg, drawings-pdf, drawings-thumb)
- [ ] Get Gemini API key from Google AI Studio
- [ ] Fill in `.env.local`
- [ ] `pnpm install`
- [ ] `pnpm dev` — verify app runs locally
- [ ] Push to GitHub
- [ ] Import project to Netlify
- [ ] Set all environment variables in Netlify dashboard
- [ ] Deploy and verify `/create`, `/library`, `/drawing/[id]`
