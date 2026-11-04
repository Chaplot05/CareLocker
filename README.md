# CareLocker 🏥🔐
### Patient Document Management & Insurance Query Automation Platform

CareLocker is an enterprise healthcare SaaS application built for hospital billing, TPA desk staff, and insurance operations teams. It streamlines patient document storage, validates claim documentation against insurer queries, and prepares automated communications to resolve query letters rapidly.

---

## 📑 Table of Contents
1. [Architecture & Technology Stack](#-architecture--technology-stack)
2. [Stage 1 Implementation Overview](#-stage-1-implementation-overview)
3. [Folder Structure](#-folder-structure)
4. [Database Design & Migrations](#-database-design--migrations)
5. [Setup & Installation](#-setup--installation)
6. [How to Create the First Admin Account](#-how-to-create-the-first-admin-account)
7. [Running the Synthetic Seeder](#-running-the-synthetic-seeder)
8. [Security & Role-Based Access Control](#-security--role-based-access-control)
9. [Future Stage 2 Roadmap](#-future-stage-2-roadmap)

---

## 🏗 Technology Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS (Custom palette: Crisp White, Light Lavender `#8462e7`, Reddish Peach `#ea4f3f`, Clean Slate Grey)
- **Icons**: Lucide React
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (Email & Password, Session Cookies via `@supabase/ssr`)
- **Storage**: Private Supabase Storage Bucket (`patient-documents`) with short-lived Signed URLs
- **CSV Processing**: PapaParse with runtime schema validation via Zod
- **Deployment**: Vercel ready

---

## 🚀 Stage 1 Implementation Overview

### 1. Staff Authentication & Access Control
- Staff login with email and password via Supabase Auth.
- Two distinct roles: **Admin** (full permissions including document & patient deletion) and **Agent** (daily operations, uploads, viewing).
- Protected dashboard routes via Next.js Edge Middleware (`/dashboard`, `/patients`, `/settings`).
- Zero public self-registration (staff accounts must be provisioned through authorized channels).
- No secrets exposed to client-side code.

### 2. Patient Directory Management
- Searchable patient listing by full name, unique patient code, or email.
- Register individual patients with automatic code generator (`PAT-YYYY-XXX`).
- Edit patient contact details and demographics.
- Masked phone numbers and email addresses in UI with a one-click reveal toggle for privacy.
- Bulk CSV Import with client-side preview, validation against duplicate patient codes in DB and file, and error reporting.

### 3. Patient Document Locker
- Upload single or multiple files in drag-and-drop zone.
- Supported file types: **PDF, JPG, JPEG, PNG** (up to 20MB per file).
- 9 distinct healthcare document categories:
  - `Discharge Summary`
  - `Hospital Bill`
  - `Investigation Reports`
  - `Policy Copy`
  - `KYC`
  - `Consultation Papers`
  - `Pharmacy Bills`
  - `Cancelled Cheque`
  - `Other`
- Private storage in Supabase Storage bucket (`patient-documents`) with **zero public URLs**.
- Temporary signed URL generation (5-minute expiry) for inline document preview and download.
- Role-restricted deletion (Admin only) with confirmation dialog.

### 4. Audit Logging & History
- Persistent audit logs recording all patient creations, updates, document uploads, document deletions, and CSV imports with user ID and timestamp.
- Query history section on patient profile ready for Stage 2 AI matching.

---

## 📁 Folder Structure

```
carelocker/
├── public/                     # Static assets
├── scripts/
│   └── seed.mjs                # Standalone synthetic database seeder script
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/          # Staff login page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/      # Main dashboard with live statistics & recent uploads
│   │   │   ├── patients/       # Patients directory & search
│   │   │   │   ├── [id]/       # Individual patient profile, locker, & query tabs
│   │   │   │   │   └── edit/   # Edit patient details
│   │   │   │   └── new/        # Register new patient
│   │   │   ├── settings/       # Staff profile, RBAC guide & setup info
│   │   │   └── layout.tsx      # Dashboard shell with persistent sidebar
│   │   ├── api/
│   │   │   ├── auth/           # Staff login & signout routes
│   │   │   ├── documents/      # Upload and delete document endpoints
│   │   │   │   └── [id]/       # Temporary signed URL generator
│   │   │   └── patients/       # Patient CRUD and CSV bulk import
│   │   │       ├── [id]/
│   │   │       └── import/
│   │   ├── globals.css         # Tailwind & custom color styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Root redirect to /dashboard
│   ├── components/
│   │   ├── common/             # Modal, ConfigAlert, UI elements
│   │   ├── documents/          # DocumentUploader, DocumentList
│   │   ├── layout/             # Sidebar, Header
│   │   └── patients/           # PatientForm, CsvImportModal
│   ├── lib/
│   │   ├── supabase/           # Server, Client, Admin, and Middleware helpers
│   │   └── utils.ts            # Formatting, masking, and badge styling
│   ├── middleware.ts           # Route protection middleware
│   └── types/
│       ├── database.ts         # Supabase PostgreSQL schema definitions
│       └── index.ts            # Application & UI models
├── supabase/
│   ├── migrations/
│   │   └── 20261104000001_initial_schema.sql  # Complete Stage 1 migration SQL
│   └── seed.sql                # Synthetic seed SQL for SQL Editor
├── .env.example                # Variable names template
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 🗄 Database Design & Migrations

The database migration is located at:
`supabase/migrations/20261104000001_initial_schema.sql`

It provisions:

| Table | Purpose | RLS Access |
|---|---|---|
| `profiles` | Staff users (`admin` or `agent`) linked to `auth.users` | Read: Staff, Update: Self or Admin |
| `patients` | Patient demographics, contact info, unique `patient_code` | Read/Write: Staff, Delete: Admin |
| `documents` | Metadata for uploaded medical documents, private file path | Read/Upload: Staff, Delete: Admin |
| `query_letters` | Insurance queries uploaded from TPAs / insurers | Read/Write: Staff |
| `query_points` | Specific document requirements & match decisions | Read/Write: Staff |
| `messages` | Patient notification logs (WhatsApp / Email) | Read/Write: Staff |
| `audit_logs` | Security trail of all user actions and operations | Read/Write: Authenticated Staff |

### Storage Bucket:
- Bucket name: `patient-documents`
- Visibility: **Private** (`public: false`)
- Allowed MIME types: `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`
- Max file size: 20 MB

---

## ⚙ Setup & Installation

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Configure Environment Variables
Create a file named `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run Database Migrations in Supabase
1. Open your Supabase Dashboard → **SQL Editor**.
2. Copy and paste the contents of `supabase/migrations/20261104000001_initial_schema.sql`.
3. Click **Run**. This creates all tables, triggers, Row Level Security policies, indexes, and the private storage bucket.

---

## 🔑 How to Create the First Admin Account

To keep the application secure and prevent open public registrations:

1. In Supabase Dashboard, navigate to **Authentication → Users**.
2. Click **Add user** → **Create user**.
3. Enter your administrator email and a strong password (e.g. `admin@carelocker.health`).
4. Next, open the **SQL Editor** in Supabase and execute:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', full_name = 'Hospital Administrator'
   WHERE email = 'admin@carelocker.health';
   ```
5. You can now log into CareLocker at `http://localhost:3000/login` with full administrator privileges!

---

## 🧪 Running the Synthetic Seeder

To seed realistic Indian hospital insurance cases (Star Health, Medi Assist query letters, synthetic patients, and documents):

### Option A: Using the Node script
```bash
npm run seed
```

### Option B: Using SQL Editor
Copy and execute `supabase/seed.sql` in your Supabase SQL Editor.

---

## 🛡 Security & Role-Based Access Control

- **Row Level Security (RLS)** is enabled on all tables.
- **Signed URLs**: Documents are stored in a private bucket with zero public permissions. Temporary signed URLs expire in 5 minutes.
- **Data Masking**: Phone numbers and emails are masked in the UI (`+91 982•• ••521`) to protect sensitive patient records.
- **Audit Logging**: Every patient creation, update, document upload, and document deletion is logged in `audit_logs`.

---

## 🔮 Future Stage 2 Roadmap

The database schema and architecture are pre-built to support the upcoming stages without restructuring:

1. **Google Gemini AI Integration**:
   - Extract text from insurance query letters.
   - Automatically identify missing requirements and populate `query_points`.
   - Match insurer queries against patient's existing `documents`.
2. **Automated Messaging**:
   - Twilio WhatsApp Sandbox integration.
   - Nodemailer with Gmail SMTP.
   - Record notifications directly into the `messages` table.
