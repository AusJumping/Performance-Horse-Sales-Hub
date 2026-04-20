# Performance Horse Sales Hub — Current System Audit

_Generated: Phase 0 audit prior to Phase 1 implementation_

---

## 1. Project Structure

```
/
├── artifacts/
│   ├── api-server/          Express REST API (Node + TypeScript)
│   ├── phs-hub/             React + Vite frontend
│   └── mockup-sandbox/      Component preview sandbox (dev only)
├── lib/
│   ├── db/                  Drizzle ORM schema + PostgreSQL client
│   ├── api-client-react/    Auto-generated React Query hooks (from OpenAPI)
│   ├── api-zod/             Auto-generated Zod validators
│   └── api-spec/            OpenAPI YAML spec + Orval codegen config
```

---

## 2. Frontend Routes (`artifacts/phs-hub`)

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `Home` | 11-step seller submission form |
| `/thank-you` | `ThankYou` | Post-submission confirmation + media upload |
| `/admin/login` | `AdminLogin` | HMAC-SHA256 password auth stored in sessionStorage |
| `/admin` | `Dashboard` | Stats cards + recent submissions |
| `/admin/submissions` | `SubmissionsList` | Paginated list with status + search filter |
| `/admin/submissions/:id` | `SubmissionDetail` | Full detail view |
| `/admin/submissions/:id/ai` | `AiEditor` | AI content editing |
| `/admin/settings/reel-templates` | `ReelTemplatesSettings` | Creatomate template config |

**Missing routes (planned for later phases):**
- `/horses/:id/eoi` — public EOI form (Phase 7)
- `/admin/submissions/:id/working-record` — working record edit (absorbed into detail)

---

## 3. Backend Routes (`artifacts/api-server`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/submissions` | List with status/search filters |
| POST | `/api/submissions` | Create new submission |
| GET | `/api/submissions/:id` | Full detail with media, AI output, notes |
| PATCH | `/api/submissions/:id` | Update status/tags |
| DELETE | `/api/submissions/:id` | Delete with GCS cleanup |
| POST | `/api/submissions/:id/approve` | Move to `approved` |
| POST | `/api/submissions/:id/publish` | Move to `published` |
| GET | `/api/submissions/:id/media` | List media files |
| GET | `/api/submissions/:id/notes` | List notes |
| POST | `/api/submissions/:id/notes` | Add note |
| GET | `/api/submissions/:id/ai-output` | Get AI output |
| PATCH | `/api/submissions/:id/ai-output` | Update AI fields |
| POST | `/api/submissions/:id/generate-ai` | Trigger AI generation |
| GET | `/api/dashboard/stats` | Count by status |
| GET | `/api/dashboard/recent` | 5 most recent |
| GET/PUT | `/api/media/serve/*` | Serve/upload media via GCS |
| GET | `/api/submissions/:id/pdf` | Generate PDF |
| POST/GET/etc | `/api/creatomate/*` | Reel render + polling + download |
| GET/POST/PATCH/DELETE | `/api/reel-templates` | Template CRUD |
| POST/GET | `/api/auth/*` | Admin login/logout |

**Missing endpoints (planned):**
- `PATCH /api/submissions/:id/working-record` — Phase 1
- `POST /api/submissions/:id/eois` — Phase 7
- `GET /api/submissions/:id/eois` — Phase 8
- `POST /api/submissions/:id/owner-response-cert` — Phase 2

---

## 4. Database Schema (PostgreSQL via Drizzle)

### `submissions`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| status | text | Currently: `new`, `processing`, `awaiting_review`, `approved`, `published` |
| horse_name | text | |
| breed | text | |
| age | text | |
| colour | text | |
| height | text | |
| sex | text | |
| asking_price | text | |
| location | text | |
| discipline | text | |
| seller_name | text | |
| seller_email | text | |
| seller_phone | text | |
| form_data | jsonb | Full raw form submission — ALL form fields |
| tags | text[] | AI-extracted classification tags |
| ai_generated | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Missing columns (to be added in Phase 1):**
- `seller_intent` text — "happy_to_proceed" or "would_like_to_speak"
- `working_record` jsonb — Sally's editable copy of the horse data
- `working_record_updated_at` timestamp

### `ai_outputs`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| submission_id | int FK | |
| master_listing | text | Long-form listing copy |
| short_listing | text | |
| pro_horse_match_listing | text | |
| social_caption | text | |
| hashtags | text | |
| buyer_summary | text | |
| key_selling_points | text | |
| reel_overlay_text | text | |
| reel_brief | text | |
| short_captions | text | |
| ai_tags | text | |
| generated_at | timestamp | |
| updated_at | timestamp | |

**Missing (planned for Phase 2+):**
- `owner_response_cert` text — Phase 2
- `owner_response_cert_status` text — Phase 2
- `horse_description` text — Phase 3
- `horse_description_status` text — Phase 3

### `media_files`
Standard: id, submission_id, filename, original_name, mime_type, size, url, storage_path, media_type, uploaded_at.

### `notes`
Simple: id, submission_id, content, created_at.

### `status_history`
id, submission_id, from_status, to_status, changed_at.

### `reel_templates`
Full Creatomate template config with configurable field names, API version, logo URL.

---

## 5. Authentication

- Password stored as `ADMIN_PASSWORD` env secret
- Login: POST `/api/auth/login` with password, returns HMAC-SHA256 token
- Token stored in `sessionStorage` as `phs_admin_token`
- All admin routes protected by `AdminGuard` component
- No user accounts or roles — single-user system

---

## 6. AI Generation

- Provider: OpenAI (`gpt-5`) via Replit AI Integrations proxy
- Input: raw `formData` (to be migrated to `workingRecord` in Phase 1)
- Generates in parallel: master listing, short listing, ProHorseMatch, social caption, short captions, hashtags, buyer summary, key selling points, reel overlay text, reel brief, tags
- Strict AI rules: no invented facts, no breeding/history claims, omit missing data
- On generation: auto-sets status to `awaiting_review`

---

## 7. Media Storage

- Replit Object Storage (GCS-backed)
- Upload via presigned PUT URLs
- Serve via `/api/media/serve/objects/uploads/:uuid`
- Download via presigned GET URLs
- Delete via presigned DELETE URLs
- Media types: photo, video, document

---

## 8. Creatomate Integration

- Fully functional reel generation
- Configurable templates stored in DB
- Supports images + text fields + logo
- Download proxy route prevents CORS issues
- Status polling built in

---

## 9. What Is Incomplete

| Feature | Status | Phase |
|---------|--------|-------|
| Seller intent field | Not built | Phase 1 |
| Locked original submission | Not enforced | Phase 1 |
| Working record (Sally's editable copy) | Not built | Phase 1 |
| Expanded status set | Partial (5 statuses only) | Phase 1 |
| Owner Response Certificate | Not built | Phase 2 |
| Horse Description (ORC-based) | Not built | Phase 3 |
| Seller approval pack | Not built | Phase 4 |
| Cost/listing agreement | Not built | Phase 5 |
| Google Drive integration | Not built | Phase 6 |
| EOI public form | Not built | Phase 7 |
| EOI dashboard workflow | Not built | Phase 8 |
| EOI summary document | Not built | Phase 9 |
| Email draft templates (Gmail) | Not built | Phase 10 |
| Media reel workflow refinement | Partial | Phase 11 |

---

## 10. Technical Debt

1. **Status is free-text** — no enum constraint. Adding new values is safe, but old values (`approved`, `published`) need to co-exist with new ones.
2. **AI uses raw formData** — should use `workingRecord` after Phase 1.
3. **No seller email confirmation** — seller gets no acknowledgement after submitting.
4. **No EOI data model** — needs full schema design.
5. **OpenAPI spec partially out of date** — new endpoints added directly without spec update.
6. **No Google integration yet** — Phase 6 dependency.

---

## 11. Recommended Order of Work

1. ✅ Phase 0 — Audit (this document)
2. → Phase 1 — Seller intent, working record, expanded statuses
3. → Phase 2 — Owner Response Certificate
4. → Phase 3 — Horse Description (from ORC)
5. → Phase 4 — Seller approval workflow
6. → Phase 7 — EOI public form (can run parallel to Phase 5/6)
7. → Phase 8 — EOI dashboard
8. → Phase 5 — Cost/listing agreement
9. → Phase 6 — Google Drive (requires Google Cloud setup)
10. → Phase 9 — EOI summary
11. → Phase 10 — Communication helpers (Gmail drafts)
12. → Phase 11 — Reel workflow refinement
