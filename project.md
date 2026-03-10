# VaxCess Project Diary

This document tracks all the steps, changes, and progress made on the VaxCess backend project. 

### Step 1: Foundation & PostgreSQL Schema
* **Status**: Completed
* **Details**: Scaffolding of the project structure using Node.js and TypeScript. Developed a detailed PostgreSQL database schema (`src/db/schema.sql`) specifically modeling Caregivers, Children, Schedules, and Payments to support offline capability and duplicate-payment prevention. Configured local containerized PostgreSQL database using `docker-compose.yml`.

### Step 2: Core Logic Engine
* **Status**: Completed
* **Details**: Created the standard Ghana EPI vaccination models (`src/core/metadata.ts`). Built the dynamic `schedule-engine.ts` to map baseline vaccination dates for newborns and to handle recalculating the remaining schedule ("sliding window") when a prerequisite vaccine is administered late.

### Step 3: Core Services 
* **Status**: Completed
* **Details**: 
  * **Incentives**: Developed `incentive-service.ts` logic mapping idempotency keys to strictly avoid Mobile Money (MoMo) duplicate payments.
  * **Voice Reminders**: Implemented `voice-service.ts` connecting to Africa's Talking API for phone calls with local language fallbacks (Twi, Dagbani, Hausa).
  * **Offline Sync**: Implemented `sync-service.ts` integrating deterministic Last-Write-Wins (LWW) resolution rules for delayed offline sync events coming from local-first devices.

### Step 4: Express API Integration
* **Status**: Completed
* **Details**: Exposed core logic through REST endpoints using Express.js (`src/index.ts`). Created `vaccine.ts` routes and webhook callbacks for Africa's Talking call connection events (`webhooks.ts`).

### Step 5: Troubleshooting Dev Environment
* **Status**: Completed
* **Details**: Fixed a `ts-node` type declaration error so `npm run dev` successfully parses our custom `./src/types/africastalking.d.ts` module interface.

### Step 6: PostgreSQL Integration
* **Status**: Completed
* **Details**: 
  * Booted the local PostgreSQL database using Docker Compose.
  * Implemented an robust connection pool (`src/db/index.ts`) using the `pg` library.
  * Replaced the mock database interactions in the incentive execution with actual Postgres SQL queries (`src/services/incentive-service.ts`).
  * Created operational endpoints to register and list Caregivers and Children (`src/routes/caregivers.ts` and `src/routes/children.ts`), dynamically generating vaccination schedules directly bound to their unique IDs inside Postgres upon creation.

### Step 7: System Security & Hardening
* **Status**: Completed
* **Details**:
  * **Brute Force & DDoS**: Applied `express-rate-limit` globally (100 requests / 15-minute window) to prevent automated exhaustion.
  * **Header Security**: Integrated `helmet` into the Express chain to strip fingerprinting headers and apply XSS protections.
  * **Authentication**: Expanded the PostgreSQL schema with a `Health_Workers` table.
  * **Authorization**: Created `src/routes/auth.ts` containing a secure login mechanism utilizing `bcryptjs` password hashing and stateless JSON Web Tokens (`jsonwebtoken`). Guarded all sensitive API routes (e.g., child registration, scheduling) via a custom `requireAuth` middleware.

### Step 8: Offline Sync Expansion
* **Status**: Completed
* **Details**:
  * **Data Tracking**: Injected `updated_at` columns and Postgres-level triggers into `schema.sql` on all major tables to strictly track temporal changes independently of the client device.
  * **Sync Handlers**: Implemented `src/routes/sync.ts` containing `GET /pull` and `POST /push` endpoints adhering to a strict WatermelonDB-style synchronization protocol.
  * **Conflict Handling**: Integrated the Deterministic LWW strategy straight into the SQL `pg` pool, validating against existing server logic before applying offline changes. 
  * **Incentive Cascade**: Built an event trigger that spawns MoMo incentive payments automatically when a synchronized batch payload pushes a pending schedule to `COMPLETED`.

### Step 9: Core Logic Engine Testing
* **Status**: Completed
* **Details**:
  * **Jest Framework Setup**: Installed `jest` and `ts-jest` for TypeScript-native execution.
  * **Schedule Engine Proof**: Wrote `schedule-engine.test.ts` to strictly verify that initializing a child generates mathematically sound windows based on Ghana's EPI metadata (e.g., verifying Penta 1 strictly lands 42 days post-DOB). Further tested the delay recalibrator to ensure if a dose is delayed, the 28-day minimum gap for subsequent equivalent-series doses shifts properly.
  * **Sync Collision Proof**: Wrote `sync-service.test.ts` to mathematically prove the Deterministic LWW conflict resolution engine. Successfully tested logical permutations where offline devices push stale conflicting data against a server that has already progressed statuses, verifying that the system acts conservatively and rejects downgrading a server's completed state. All assertions passed.

### Step 10: System Logging & Error Observability
* **Status**: Completed
* **Details**:
  * **Logger Setup**: Integrated `winston` as our structured logging backbone (`src/utils/logger.ts`), configured to emit colorised `stdout` logs in development while streaming machine-readable JSON payloads into persistent files (`logs/combined.log` and `logs/error.log`) for aggregation via Datadog or ELK.
  * **Network Observability**: Instantiated the `morgan` HTTP tracker to capture route entry/exit latency and pipe it into Winston.
  * **Unified Exception Handling**: Replaced individual `res.status(500)` block catches with an Express root-level `globalErrorHandler`. Any unhandled exception now bubbles up, gets its stack trace silently recorded to disk by Winston for post-mortem debugging, and returns a sanitized "Internal Server Error" JSON block to the frontend to prevent vector surface bleeding.
  * **Refactoring**: Eradicated remaining generic `console.error` and `console.log` invocations from routing functions and the Postgres query wrapper in favor of the controlled `logger` subsystem.

### Step 11: Administrative Dashboard (Frontend)
* **Status**: Completed
* **Details**:
  * **React Architecture**: Scaffolded a brand new Vite React SPA (`admin-dashboard/`) utilizing Tailwind CSS v4 and `lucide-react` for premium typography, iconography, and glassmorphism styling logic.
  * **Network Layer**: Configured Axios HTTP Interceptors (`src/api.ts`) pointing to the Express backend proxy. The interceptor securely plucks the JWT from `localStorage` and injects it as a `Bearer` token into all outgoing Authorization headers, while gracefully booting unauthorized 401 requests back to the Login gateway.
  * **Auth State Engine**: Engineered a global React Context (`AuthContext.tsx`) wrapper dictating JWT lifecycle, alongside a `<ProtectedRoute />` wrapper logic handling route sandboxing.
  * **Login Portal**: Designed a sleek, modernized Login viewport parsing JWT payloads directly into State. 
  * **Dashboard Ecosystem**: Constructed the focal administrative shell featuring a perpetual sidebar and a main data canvas. The Data Table leverages a new `GET /api/auth/workers` backend route to dynamically search, filter, and render registered healthcare staff status within a seamless UX loop.

### Step 12: Production Docker Orchestration
* **Status**: Completed
* **Details**: 
  * **Backend Runtime**: Containerized the Node.js API within a lightweight Alpine Dockerfile, transpiling the TypeScript context into efficient CommonJS code for bare-metal execution.
  * **Frontend Reverse Proxy**: Established a multi-stage Dockerfile for the Admin Dashboard. React is compiled statically via Vite, and then shipped into a high-performance `nginx:alpine` image. The `nginx.conf` handles frontend route rewrites and reverse-proxies all `/api` traffic internally to the Backend, negating domain CORS complexity.
  * **Unified Orchestration**: Configured `docker-compose.yml` to spin up the `db`, `backend`, and `frontend` arrays simultaneously, ensuring the Backend awaits a successful Database healthcheck before mounting its network.

### Step 13: Airtable Data Migration & UI Restructure
* **Status**: Completed
* **Details**:
  * **Migration Tool**: Created a robust `migrate-airtable.ts` script to extract external Airtable records globally. It maps deeply nested array fields (e.g. Vaccines Due) and normalizes messy data types into the structured PostgreSQL relational format.
  * **UI Refactor**: Redesigned `Registry.tsx` to handle a much larger volume of Patient data with client-side searching. Created a dedicated `ChildDetail.tsx` view for individual patient profiles, featuring an interactive mapping of upcoming schedules into `OVERDUE`, `DUE SOON`, and `FUTURE` epochs.
  
### Step 14: Analytics & Actionable UI
* **Status**: Completed
* **Details**:
  * **Data Visualization**: Integrated `recharts` into the React frontend to map dynamic aggregated PostgreSQL counts (`/api/analytics/charts`) into visual timeline bar graphs and categorical pie distributions on the main Dashboard.
  * **Interactivity**: Built a persistent `<EditChildModal />` allowing Health Workers to dynamically update underlying DB records. Engineered a transactional `PATCH` endpoint allowing manual completion of scheduled vaccines directly from the Patient Timeline UI element.

### Step 15: Authentication & Security Hardening (RBAC)
* **Status**: Completed
* **Details**:
  * **Database**: Altered the PostgreSQL schema to mandate an `ADMIN` or `WORKER` role for `Health_Workers`, deploying an initial master seed.
  * **Backend Guardrails**: Engineered a strict `requireAdmin` Express middleware to sandbox all sensitive mutation endpoints (registration, schedule alteration, child updates) from lower-privileged actors.
  * **Frontend Experience**: Upgraded the `AuthContext` engine to decode and store `role` claims from the JWT. The UI now dynamically suppresses creation flags, modal triggers, and action buttons for any authenticated personnel lacking explicit `ADMIN` clearance.
