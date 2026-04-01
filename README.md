# ❄️ AC Operations — Sejuk Sejuk Service System

A role-based AC service operations management system that digitises the full service workflow from order creation to manager review, with AI-powered operational intelligence.

---

## What Was Built

**Sejuk Sejuk Operations** is a single-page application that simulates the internal operations system for a fictional air-conditioning service company with 5 branches and 40+ field technicians. The system supports three distinct user roles, each with their own workflow:

### Role-Based Workflows

| Role | Capabilities |
|------|-------------|
| **Admin** | Create service orders, assign technicians, manage all orders (CRUD), filter by status/service type, auto-generated order numbers |
| **Technician** | View assigned jobs, start jobs, record completion details (work done, extra charges, remarks, up to 6 photos), WhatsApp appointment scheduling & feedback requests |
| **Manager** | KPI dashboard with revenue metrics, technician leaderboard, AI-powered operations query assistant, workflow supervisor with automated quality checks |

### Core Workflow

```
Admin creates order → Technician receives assignment → Technician completes job
→ WhatsApp notification to customer → Manager reviews → Dashboard updates metrics
```

**Order Status Pipeline:** `new` → `assigned` → `in_progress` → `job_done` → `reviewed` → `closed`

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | UI framework with strict typing |
| **Routing** | React Router DOM v7 | Client-side routing with role-based navigation |
| **Styling** | Tailwind CSS 3 + PostCSS | Utility-first responsive design |
| **Build Tool** | Vite 6 | Fast dev server and production bundler |
| **Database** | Supabase (PostgreSQL) | Real-time database with typed queries |
| **File Storage** | Supabase Storage | Job photo uploads (`job-photos` bucket) |
| **AI** | NVIDIA Nemotron (via nano-gpt API) | Natural language query parsing & response formatting |
| **Notifications** | WhatsApp Deep Links (`wa.me`) | Pre-filled customer messages via deep links |

---

## Architecture Decisions

### 1. No Real Authentication — Mock Role Switcher

Real authentication was not required by the assessment spec. Instead, a [`AuthProvider`](src/contexts/AuthContext.tsx:60) wraps the app with 6 hardcoded mock users (1 admin, 1 manager, 4 technicians). The current role is derived from the URL path prefix (`/admin/*`, `/manager/*`, `/technician/*`), and a dropdown in the [`Layout`](src/components/Layout.tsx:46) header allows instant role switching for demonstration purposes.

**Rationale:** Keeps the focus on business logic rather than auth infrastructure. The URL-based role detection avoids race conditions between state and navigation.

### 2. Minimal Database Schema — 3 Tables

The schema ([`001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql:1)) deliberately uses only 3 tables:

- **`technicians`** — Name, phone, branch, active status
- **`users`** — Mock user entries linked to technicians via `technician_id`
- **`orders`** — Full order lifecycle with status enum constraint, pricing, completion fields, and photo URLs

**Rationale:** A lean schema reduces migration complexity and keeps queries straightforward. The `users.technician_id` foreign key elegantly links mock auth to technician data.

### 3. Auto-Generated Order Numbers via PostgreSQL Function

Order numbers follow the format `{PREFIX}{DDMM}-{SEQ}` (e.g., `REP0104-001`). A PostgreSQL function [`get_next_order_number()`](supabase/migrations/003_add_order_number_generation.sql:16) generates these atomically in the database, ensuring no collisions even under concurrent inserts.

**Rationale:** Database-side generation is more reliable than client-side sequencing and handles timezone correctly (configured for `Asia/Kuala_Lumpur`).

### 4. Two-Phase AI Processing with Graceful Degradation

The AI assistant in [`aiAssistant.ts`](src/lib/aiAssistant.ts:1) uses a two-phase architecture:

```
Phase 1: Natural Language → Structured Query Parameters (AI or regex fallback)
Phase 2: Database Results → Natural Language Response (AI or template fallback)
```

When no AI API key is configured, the system falls back to a regex-based [`aiQueryParser.ts`](src/lib/aiQueryParser.ts:1) for Phase 1 and template string formatting for Phase 2. This ensures the system is fully functional even without AI.

**Rationale:** Graceful degradation guarantees the demo always works. The regex fallback handles the most common question patterns, while AI adds nuance and conversational memory.

### 5. Responsive Layout with Mobile-First Technician View

The [`Layout`](src/components/Layout.tsx:46) component uses a desktop sidebar + mobile bottom navigation pattern. Technician pages (Jobs, Profile) are specifically designed for mobile-first field usage with large tap targets, card-based layouts, and minimal scrolling.

**Rationale:** The assessment specified that technicians primarily use mobile devices in the field, so the technician portal prioritises speed and simplicity.

### 6. WhatsApp Deep Links Over API Integration

Rather than integrating a WhatsApp Business API (which requires approval and costs money), the system uses [`generateWhatsAppLink()`](src/lib/whatsapp.ts:17) to create `wa.me` URLs with pre-filled messages. Two message templates are provided: appointment scheduling and post-completion feedback requests.

**Rationale:** Zero-cost, no API keys needed, and works immediately on any device with WhatsApp installed.

---

## AI Integration

The system integrates AI in three distinct features, all using the NVIDIA Nemotron model via the nano-gpt API:

### Feature 1: AI Operations Query Assistant ([`AIQueryPage`](src/pages/manager/AIQueryPage.tsx:29))

A chat-based interface where managers ask natural language questions about operational data. The system supports **conversation memory** — the last 10 messages are passed to both the parsing and formatting phases, enabling follow-up questions like *"How much revenue for this order?"* after asking about a specific job.

**Supported intents:**

| Intent | Example Question |
|--------|-----------------|
| List jobs | "What jobs did Ali complete last week?" |
| Count jobs | "How many jobs were completed today?" |
| Top technician | "Which technician completed the most jobs this week?" |
| Revenue | "What's the total revenue this month?" |
| Follow-up | "How much revenue for this order?" |

**Processing pipeline:** Question → AI parses intent/technician/date/service → Supabase query → AI formats natural language response → Displayed in chat

### Feature 2: Workflow Supervisor ([`aiWorkflowSupervisor.ts`](src/lib/aiWorkflowSupervisor.ts:1))

An automated quality assurance system that checks completed jobs for three types of issues:

| Check | Condition | Severity |
|-------|-----------|----------|
| **Price overrun** | `final_amount > quoted_price × 1.5` | 🔴 High |
| **Missing photos** | `photo_urls` array is empty | 🟡 Medium |
| **Missing work description** | `work_done` is null or empty | 🔵 Low |

AI optionally generates a 2–3 sentence executive summary of all detected alerts.

### Feature 3: Operational Insight ([`aiOperationalInsight.ts`](src/lib/aiOperationalInsight.ts:1))

Managers can ask freeform questions about technician workload distribution for the current week. The system fetches aggregated data (jobs completed, total revenue, average job value per technician) and sends it to AI for analysis and actionable recommendations.

---

## Challenges & Assumptions

### Assumptions Made

- **Single-page demo:** The system is a demonstration prototype, not a production application. Mock authentication is sufficient.
- **Malaysian context:** Phone numbers, currency (RM), date formats, and customer addresses are all Malaysian. Order numbers use `Asia/Kuala_Lumpur` timezone.
- **Sequential order numbers per day:** The `get_next_order_number()` function generates sequences per service type per day (e.g., `REP0104-001`, `REP0104-002`). This assumes manageable daily volume.
- **Manual status transitions:** There is no automatic status change (e.g., auto-close after review period). All transitions are manual.
- **WhatsApp via deep link:** Customer notification relies on the technician/admin manually clicking a link rather than an automated push notification.

### Challenges Encountered

- **AI response reliability:** LLM responses can be unpredictable. The system wraps all AI calls in try/catch with regex/template fallbacks. The `temperature: 0.1` setting on the parsing phase keeps structured output consistent.
- **Conversation context management:** Passing full chat history to the AI increases token usage. The system limits this to the last 10 messages to balance context quality against cost.
- **Role-based navigation sync:** Switching roles requires coordinating React state with URL-based routing. The solution derives `currentRole` from `location.pathname` in a `useEffect` and explicitly sets it during [`switchRole()`](src/contexts/AuthContext.tsx:83) to prevent timing issues.
- **Photo upload UX:** File uploads to Supabase Storage are sequential (one at a time) to keep error handling simple. This trades upload speed for reliability.

---

## Known Limitations

### Authentication & Security
- **No real authentication.** Anyone can switch to any role. No JWT, no session management, no row-level security enforcement on the frontend.

### Data & Business Logic
- **No real-time updates.** Data is fetched on page load and after mutations. There is no Supabase real-time subscription, so multiple users won't see each other's changes without refreshing.
- **No pagination.** Order lists load all records. This works for demo data (20 orders) but will not scale to production volumes.
- **No payment recording.** The assessment mentioned optional payment tracking (amount, method, receipt photo), which was not implemented.
- **Technicians list page is a placeholder.** The [`/admin/technicians`](src/App.tsx:12) route shows a "Coming Soon" stub.
- **Reports page is a placeholder.** The [`/manager/reports`](src/App.tsx:28) route shows a "Coming Soon" stub.

### AI Features
- **Limited intent coverage.** Only 4 intents are supported (list_jobs, count_jobs, top_technician, revenue). Complex queries like "Compare Ali and Bala's performance" or "Which service type generates the most revenue?" are not handled.
- **No multi-language support.** The AI parser and regex fallback both assume English questions. Malay-language queries (common in Malaysia) are not supported.
- **Weekly data only for Operational Insight.** The workload analysis feature only fetches current-week data (Monday–Sunday). Historical comparisons are not available.
- **AI availability is binary.** If the API key is missing or the API is unreachable, all AI features degrade to template-based responses. There is no partial degradation or retry logic.

### UX & Technical Debt
- **No optimistic UI updates.** All mutations wait for Supabase confirmation before updating the UI, which can feel slow on high-latency connections.
- **Photo previews use Data URLs.** Photo previews use `FileReader.readAsDataURL()`, which loads the entire image into memory. Large photos may cause performance issues on low-end mobile devices.
- **No error boundary.** React component errors are not caught by an error boundary, so a single component crash can break the entire page.
- **No unit or integration tests.** The project has no test infrastructure configured.
