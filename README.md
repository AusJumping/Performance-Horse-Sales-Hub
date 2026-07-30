# Performance Horse Sales Hub

A full-stack web application for **Performance Horse Sales Australia & New Zealand** that automates the end-to-end workflow for listing, marketing, and selling performance horses.

---

## What It Does

### For Sellers (Public)
- Multi-step submission form (horse details, pricing, disciplines, health, media uploads)
- Digital signing for Listing Agreements and Bills of Sale via unique secure links
- Horse Search client portal for buyers/sellers to sign contracts

### For Staff (Admin)
- Dashboard with submission stats and recent activity
- Full submission pipeline with 13 workflow statuses
- Editable "Working Record" per submission (separate from the locked original data)
- Internal notes, media gallery, and status history per submission
- AI-generated content: master listing, short listing, social captions, hashtags, buyer summary, reel briefs, and more
- Google Drive integration — auto-creates folders and syncs files per horse
- Listing Agreement generation and two-party digital signing
- Horse Search contracts with two-party signing flow
- Bill of Sale generation and PDF download

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| AI | OpenAI GPT (via Replit AI Integrations) |
| API contract | OpenAPI 3 + Orval codegen |
| File uploads | Multer |
| Frontend routing | Wouter |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
artifacts/
  phs-hub/          # React + Vite frontend (served at /)
  api-server/       # Express API server (served at /api)
lib/
  api-spec/         # OpenAPI spec + Orval codegen config
  api-client-react/ # Generated React Query hooks
  api-zod/          # Generated Zod schemas
  db/               # Drizzle ORM schema + DB connection
  integrations-openai-ai-server/  # OpenAI server-side client
  integrations-openai-ai-react/   # OpenAI React hooks
scripts/            # Utility scripts
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (connection string in `DATABASE_URL`)

### Install dependencies

```bash
pnpm install
```

### Push database schema

```bash
pnpm --filter @workspace/db run push
```

### Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

### Start the frontend

```bash
pnpm --filter @workspace/phs-hub run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI proxy API key |
| `SESSION_SECRET` | Express session secret |
| `ADMIN_PASSWORD` | Admin dashboard password |
| `PORT` | Assigned per service |
| `BASE_PATH` | URL prefix for frontend routing |

### Email (SMTP)

| Variable | Description |
|---|---|
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | e.g. `587` |
| `SMTP_USER` | Sending Gmail address |
| `SMTP_FROM` | Display name + address |
| `SMTP_PASS` | Gmail App Password (not your account password) |
| `ALERT_EMAIL` | Internal email that receives new submission alerts |

> Gmail App Passwords require 2-Step Verification. Generate one at: https://myaccount.google.com/apppasswords

### Google Drive

The Google Drive integration uses OAuth (no separate API key needed). After connecting:

1. Go to **Admin → Settings** in the app
2. Set the **Root Drive Folder ID** from your Drive folder URL
3. Optionally set a **Search Folders** parent folder ID

---

## API Reference

All routes are prefixed with `/api`.

### Submissions

| Method | Route | Description |
|---|---|---|
| GET | `/submissions` | List all submissions |
| POST | `/submissions` | Create a new submission |
| GET | `/submissions/:id` | Get submission detail |
| PATCH | `/submissions/:id` | Update status / tags |
| PATCH | `/submissions/:id/working-record` | Update editable working record |
| POST | `/submissions/:id/approve` | Approve (→ approved_to_market) |
| POST | `/submissions/:id/publish` | Publish (→ live) |
| GET/POST | `/submissions/:id/notes` | Get / add internal notes |
| GET | `/submissions/:id/media` | List media files |
| GET | `/submissions/:id/ai-output` | Get AI-generated content |
| PATCH | `/submissions/:id/ai-output` | Update AI content |
| POST | `/submissions/:id/generate-ai` | Trigger AI generation |

### Dashboard

| Method | Route | Description |
|---|---|---|
| GET | `/dashboard/stats` | Summary counts by status |
| GET | `/dashboard/recent` | Recent submission activity |

### Media

| Method | Route | Description |
|---|---|---|
| POST | `/media/upload-url` | Pre-register a file upload |
| POST | `/media/upload/:mediaId` | Upload a file |
| GET | `/media/files/:filename` | Serve an uploaded file |
| DELETE | `/media/:mediaId` | Delete a file |

---

## Submission Status Workflow

```
new
 └→ awaiting_review
     └→ awaiting_seller_response
     └→ needs_more_information
     └→ ready_to_list
         └→ seller_review_sent
             └→ approved_to_market
                 └→ live
                     └→ viewing_pending
                     └→ sold_pending
                         └→ in_vetting
                             └→ sold
 └→ archived (from any status)
```

---

## AI Content Generation

All AI generation uses submitted horse data only — the system never invents facts.

Generated outputs per submission:

- **Master Listing** — comprehensive listing (~600 words)
- **Short Listing** — concise 150–200 word version
- **ProHorseMatch Listing** — structured bullet-point format
- **Social Caption** — Instagram/Facebook ready
- **Hashtags** — 20–30 relevant tags
- **Buyer Summary** — internal match-making notes
- **Key Selling Points** — 5–8 bullet points
- **Reel Overlay Text** — 6–8 lines for video reels
- **Reel Brief** — full production brief for reel creation

---

## Codegen

After making changes to `lib/api-spec/openapi.yaml`, regenerate the client hooks and Zod schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Typecheck

```bash
# Check all packages
pnpm run typecheck

# Check libs only
pnpm run typecheck:libs

# Check a specific package
pnpm --filter @workspace/phs-hub run typecheck
```

---

## License

Private — Performance Horse Sales Australia & New Zealand. All rights reserved.
