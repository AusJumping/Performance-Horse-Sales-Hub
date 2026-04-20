# Performance Horse Sales Automation Hub

## Overview

Full-stack web application for Performance Horse Sales Australia and New Zealand. Automates the post-submission workflow after sellers submit their horse details.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/phs-hub)
- **Backend**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **AI**: OpenAI via Replit AI Integrations (gpt-5)
- **API codegen**: Orval (from OpenAPI spec)
- **File uploads**: Multer (stored at /tmp/phs-uploads)
- **Routing**: Wouter (frontend)

## Structure

```text
artifacts/
  phs-hub/          # React + Vite frontend (served at /)
  api-server/       # Express API server (served at /api)
lib/
  api-spec/         # OpenAPI spec + Orval codegen config
  api-client-react/ # Generated React Query hooks
  api-zod/          # Generated Zod schemas
  db/               # Drizzle ORM schema + DB connection
  integrations-openai-ai-server/ # OpenAI server-side client
  integrations-openai-ai-react/  # OpenAI React hooks
```

## Features

### Public Submission Form (/)
- 9-step multi-step form replicating the existing BoloForms seller form exactly
- All original fields, options, wording, and required/optional logic preserved
- Sections: Contact Info, Horse Details, Price & Sale, Discipline & Level, Competition History, Training, Temperament, Health, Rider Suitability, Media Uploads, Additional Info, Declaration
- File upload for photos, videos, documents
- Mobile-responsive with progress indicator

### Admin Dashboard (/admin)
- Overview stats: total, awaiting review, published, recent activity
- Submissions list with status filtering and search
- Detailed submission view with original data, media gallery, notes
- Expanded status workflow (13 statuses): new → awaiting_review → awaiting_seller_response → needs_more_information → ready_to_list → seller_review_sent → approved_to_market → live → viewing_pending → sold_pending → in_vetting → sold → archived
- Seller intent displayed on detail page header (happy_to_proceed / would_like_to_speak)
- Working Record tab: Sally's editable internal copy of submission data (used for AI generation)
- Locked Original Submission tab: read-only original seller data (cannot be edited)

### AI Content Generation
- Triggered from admin submission detail page
- Uses OpenAI gpt-5 via Replit AI Integrations (no user API key needed)
- Generates: Master Listing, Short Listing, ProHorseMatch Listing, Social Caption, Hashtags, Buyer Summary, Key Selling Points, Reel Overlay Text, Reel Brief
- All content based only on submitted data — never invents facts
- Editable in the AI Content Editor page

## Database Schema

Tables:
- `submissions` — core record with status, top-level fields, formData JSON (locked), workingRecord JSON (editable), sellerIntent
- `ai_outputs` — all AI-generated content linked to a submission
- `media_files` — uploaded file metadata
- `notes` — internal staff notes per submission
- `status_history` — audit trail of status changes

Key design principles:
- `form_data` is LOCKED after creation — never edits original seller submission
- `working_record` is Sally's editable internal copy — AI generation reads from here
- `seller_intent` is extracted at submission time: "happy_to_proceed" | "would_like_to_speak"

## API Routes (all under /api)

- GET/POST /submissions — list and create
- GET/PATCH /submissions/:id — get detail and update status/tags
- PATCH /submissions/:id/working-record — update Sally's editable working record
- POST /submissions/:id/approve — approve (sets to approved_to_market)
- POST /submissions/:id/publish — publish (sets to live)
- GET/POST /submissions/:id/notes — notes
- GET /submissions/:id/media — list media
- GET /submissions/:id/ai-output — get AI output
- PATCH /submissions/:id/ai-output — update AI output
- POST /submissions/:id/generate-ai — trigger AI generation
- GET /dashboard/stats — dashboard summary
- GET /dashboard/recent — recent submissions
- POST /media/upload-url — pre-register file upload
- POST /media/upload/:mediaId — actual file upload
- GET /media/files/:filename — serve uploaded files
- DELETE /media/:mediaId — delete file

## AI Prompt System

Prompt templates in `artifacts/api-server/src/routes/ai.ts`:
- masterListingPrompt — comprehensive listing (600 words max)
- shortListingPrompt — concise 150-200 word listing
- proHorseMatchPrompt — structured bullet-point listing
- socialCaptionPrompt — Instagram/Facebook caption
- hashtagsPrompt — 20-30 relevant hashtags
- buyerSummaryPrompt — internal buyer-match summary
- keySellingPointsPrompt — 5-8 key selling points
- reelOverlayPrompt — 6-8 text overlay lines for reels
- reelBriefPrompt — full reel production brief
- tagExtractionPrompt — internal classification tags

All prompts include strict AI rules: never invent facts, only use submitted data.

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI proxy URL (auto-set)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI proxy key (auto-set)
- `PORT` — assigned per artifact
- `BASE_PATH` — routing prefix for frontend

## Running Locally

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/phs-hub run dev
```

## Codegen

After changing openapi.yaml:
```bash
pnpm --filter @workspace/api-spec run codegen
```
