# CareLocker 🏥🔐
### Patient Document Management & Insurance Query Automation Platform

CareLocker is an enterprise healthcare SaaS application built for hospital billing, TPA desk staff, and insurance operations teams. It streamlines patient document storage, analyzes medical records using multimodal AI, extracts discrete requirements from insurer query letters, matches requirements against existing vault documents, and drafts patient-friendly notifications.

---

## 📑 Table of Contents
1. [Architecture & Technology Stack](#-architecture--technology-stack)
2. [Stage 1: Foundation & Vault](#-stage-1-foundation--vault)
3. [Stage 2: Complete AI Processing Engine](#-stage-2-complete-ai-processing-engine)
4. [Folder Structure](#-folder-structure)
5. [Database Migrations](#-database-migrations)
6. [Setup & Environment Variables](#-setup--environment-variables)
7. [Running the Test Suite](#-running-the-test-suite)
8. [First Admin Account Guide](#-first-admin-account-guide)
9. [Future Stage 3 Roadmap](#-future-stage-3-roadmap)

---

## 🏗 Technology Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS (Custom palette: Crisp White, Light Lavender `#8462e7`, Reddish Peach `#ea4f3f`, Clean Slate Grey)
- **Icons**: Lucide React
- **Database & Storage**: Supabase PostgreSQL & Private Supabase Storage (`patient-documents`)
- **Authentication**: Supabase Auth (Email & Password, Session Cookies via `@supabase/ssr`)
- **AI Processing Engine (Stage 2)**: Google Gemini API (Multimodal SDK `@google/genai` & `@google/generative-ai`)
- **Schema Validation**: Zod runtime validation
- **CSV Processing**: PapaParse

---

## 🚀 Stage 1: Foundation & Vault

- **Staff Authentication**: Role-based access control with `Admin` and `Agent` roles.
- **Route Protection**: Next.js Edge Middleware guarding `/dashboard`, `/patients`, `/settings`.
- **Patient Management**: Searchable directory, masked contact info toggle, manual creation with code generator (`PAT-YYYY-XXX`), and bulk CSV import.
- **Document Locker**: Multi-file drag & drop, 9 medical categories, validation, short-lived signed URLs (5-minute expiry), and admin deletion.

---

## 🤖 Stage 2: Complete AI Processing Engine

### Feature 1 — Document Understanding
- Whenever medical documents (PDFs, JPG, PNG) are uploaded to the vault, the server retrieves the file from private Supabase Storage.
- Gemini multimodal AI analyzes clinical and billing contents without hallucinations.
- Extracts:
  - Document type & category
  - Patient identifiers (hospital ID, UHID, policy number, claim number)
  - Crucial dates (admission, discharge, bill, report dates)
  - Hospital name & treating consultant
  - Total billing amounts (claimed, paid, discounts)
  - Clinical diagnoses, surgical procedures, and key findings
  - Insurance claim relevance
- Validated with Zod and saved in `documents.ai_summary` (JSONB).
- Viewable in the UI via the **"AI Summary"** button on any document.

### Feature 2 — Query Requirement Extraction
- Upload insurer query letters from Star Health, Medi Assist, Care Health, HDFC Ergo, etc.
- Gemini multimodal parses the original PDF/image.
- Extracts every distinct requirement, preserving the **exact verbatim text**.
- Maps each requirement to the expected document category and context reason.
- Saved into `query_points`.

### Feature 3 — Document Matching Adjudication
- Compares each query requirement against all patient document summaries.
- Adjudication rules:
  - **Never marks available by category alone**. Verifies factual content, dates, and invoice details.
  - Returns `available` only when satisfied with verifiable evidence quotes.
  - **Multi-document support**: Satisfied across multiple separate files (e.g. OT surgical note + Anesthesia log).
  - Returns `missing` if the item is absent from the vault.
  - Returns `needs_review` if wording is ambiguous, contradictory, or requires consultant justification.
  - Includes confidence score (0.0 to 1.0) and forensic reasoning.

### Feature 4 — Results UI
- Query letter dashboard in patient profile with real-time status transitions: `uploaded` → `extracting` → `matching` → `completed` / `failed`.
- Summary scoreboard: Total, Available, Missing, and Needs Review counts.
- Interactive requirements list with status badges, category tags, evidence blockquotes, medical reasoning, and clickable supporting document pills opening secure preview modals.
- Safe retry button (`/api/queries/[id]/reprocess`) to re-evaluate letters idempotently.

### Feature 5 — Patient Notification Draft
- Automatically drafts an empathetic, plain-language patient request.
- **Requests ONLY genuinely missing items**; excludes available and uncertain (`needs_review`) items.
- In-app preview with 1-click **"Copy Message"**, **"Regenerate Draft"**, and **"Edit Draft"**.
- Prepares for automated WhatsApp/Email dispatch in Stage 3.

---

## 📁 Folder Structure

```
carelocker/
├── scripts/
│   ├── seed.mjs                                 # Synthetic DB seeder
│   └── test-stage2.ts                           # Comprehensive Stage 2 test suite
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx                # Staff login & admin setup guide
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx               # Analytics dashboard
│   │   │   ├── patients/page.tsx                # Directory & CSV import
│   │   │   ├── patients/[id]/page.tsx           # Profile, Locker & Query History
│   │   │   └── settings/page.tsx                # RBAC & Gemini status
│   │   ├── api/
│   │   │   ├── documents/route.ts               # Upload & AI analysis trigger
│   │   │   ├── documents/[id]/analyze/route.ts  # Manual re-analyze endpoint
│   │   │   ├── queries/route.ts                 # Upload & pipeline trigger
│   │   │   ├── queries/[id]/route.ts            # Query details & admin delete
│   │   │   ├── queries/[id]/draft/route.ts      # Regenerate & edit draft message
│   │   │   └── queries/[id]/reprocess/route.ts  # Safe retry mechanism
│   ├── components/
│   │   ├── documents/
│   │   │   ├── DocumentList.tsx                 # Locker table with AI Summary button
│   │   │   └── DocumentSummaryModal.tsx         # AI Clinical Summary viewer
│   │   └── queries/
│   │       ├── QueryLetterUploader.tsx          # Query letter upload modal
│   │       └── QueryLetterDetail.tsx            # Adjudication cards & draft message
│   ├── lib/
│   │   ├── gemini/
│   │   │   ├── client.ts                        # Gemini SDK & multimodal caller
│   │   │   ├── schemas.ts                       # Zod validation schemas
│   │   │   ├── documentUnderstanding.ts         # Feature 1: Clinical extractor
│   │   │   ├── queryExtraction.ts               # Feature 2: Requirements extractor
│   │   │   ├── documentMatching.ts              # Feature 3: Forensic matcher
│   │   │   ├── messageDrafting.ts               # Feature 5: Patient message drafter
│   │   │   └── pipeline.ts                      # Pipeline orchestrator
│   └── types/
│       ├── database.ts                          # Supabase PostgreSQL schema
│       └── index.ts                             # Application types
└── supabase/
    └── migrations/
        ├── 20261104000001_initial_schema.sql    # Stage 1 tables & RLS
        └── 20261104000002_stage2_query_matching.sql # Stage 2 status & multi-doc support
```

---

## ⚙ Setup & Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stage 2: Google Gemini Multimodal AI
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
```

Execute both migrations in Supabase SQL Editor:
1. `supabase/migrations/20261104000001_initial_schema.sql`
2. `supabase/migrations/20261104000002_stage2_query_matching.sql`

---

## 🧪 Running the Test Suite

Execute the Stage 2 AI validation test suite:

```bash
npm test
```

Runs 18 unit tests validating:
- Feature 1: Document understanding schema & clinical/billing extraction
- Feature 2: Query requirement separation, verbatim text preservation
- Feature 3: Multi-document matching, evidence quotes, ambiguous `needs_review`
- Feature 5: Patient message drafting requesting **only missing items**

---

## 🔑 First Admin Account Guide

1. Go to **Supabase Console → Authentication → Users → Add User**.
2. Enter email (e.g. `admin@carelocker.health`) and password.
3. In SQL Editor, run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', full_name = 'Hospital Administrator'
   WHERE email = 'admin@carelocker.health';
   ```
4. Log in at `http://localhost:3000/login`.

---

## 🔮 Future Stage 3 Roadmap

- **Twilio WhatsApp Sandbox**: Direct 1-click dispatch of the generated patient draft message.
- **Nodemailer / Gmail SMTP**: Automated email notification dispatch.
- **Delivery Webhooks**: Real-time status tracking (`sent`, `delivered`, `read`) in `messages`.
