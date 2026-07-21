# 🗺️ Project Journey: Learning Tracking Dashboard

Welcome to the official developer log and history of the **Learning Tracking Dashboard**. This document captures the complete evolution of this application — from initial design goals through critical technical roadblocks, strategic resolutions, and architectural breakthroughs — outlining how a basic outline grew into a high-fidelity, resilient, full-stack tracker designed specifically for competitive exam tracking (like the **GATE + Placement Dual-Block Master Plan**).

---

## 🏗️ Architectural Overview

The portal is designed as a secure, full-stack, single-page application:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (SPA)                              │
│  React 19, Router v7, Recharts, Framer Motion, Lucide, Tailwind v4     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS REST / API
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS SERVER (API)                          │
│  TypeScript proxy compiled with esbuild to dist/server.cjs             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ├──────────────────┬──────────────────┐
                                   ▼ API Proxies       ▼ SDK              ▼ REST Proxy
┌──────────────────────────────────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│               FIREBASE SERVICES               │ │  GEMINI 2.5 API  │ │  GOOGLE DRIVE    │
│  Firestore (NoSQL Database) & Authentication  │ │  AI Syllabus     │ │  REST Endpoints  │
│  Security Rules safeguarding student timelines│ │  Importer        │ │  (OAuth Linker)  │
└──────────────────────────────────────────────┘ └──────────────────┘ └─────────────────┘
```

---

## 📅 Chronological Milestone Roadmap

```text
┌────────────────────────────────────────────────────────┐
│  Phase 1: Dual-Block Planner & Core Interface          │ (Core Layout)
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Phase 2: Transition to Durable Cloud Storage           │ (Firebase & Firestore)
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Phase 3: Time Tracking & Gemini AI Study Plan Importer │ (Stopwatch + Server-Side GenAI)
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Phase 4: Google Drive REST API Proxy & Cloud Linker    │ (Secure OAuth Proxying)
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Phase 5: Full-Stack Packaging & Verification           │ (Production Bundling)
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  Phase 6: Hardening, Refactoring & Defect Extermination │ (Current Phase)
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Development Log

### Phase 1: Dual-Block Planner & Core Interface
* **Functional Goal**: Build an immersive, visual learning tracker specialized for Indian engineers targeting the GATE exam alongside corporate placement training (the "GATE + Placement Dual-Block Master Plan").
* **Deliverables**:
  - Structured dashboard divided into two core prep categories.
  - Interactive drag-and-drop study kanban boards.
  - Visual analytics dashboard tracking total learning hours by subject and daily progress.
  - Interactive daily calendar view allowing students to record custom log entries.
* **Technical Choices**: Styled with Tailwind CSS (later upgraded to **Tailwind CSS v4**, enabling transparent accent color variables like `--custom-accent`), powered by `recharts` for charts, and `motion` for staggered animation effects.

### Phase 2: Transition to Durable Cloud Storage (Firebase & Firestore)
* **Functional Goal**: Upgrade the dashboard from a fragile, single-session `localStorage` setup into a persistent, multi-device cloud workspace.
* **Steps Taken**:
  1. Bootstrapped Firestore database and Firebase Authentication.
  2. Created `/firebase-blueprint.json` describing the relational collection hierarchy:
     - `/users/{userId}/dashboards`
     - `/users/{userId}/subjects`
     - `/users/{userId}/tasks`
  3. Formulated precise collection permissions inside `/firestore.rules` preventing unauthorized user cross-reads.
* **Critical Issues Encountered**:
  - **Issue**: Firebase read/write actions were continuously failing on client streams and server endpoints with `GrpcConnection Code: 5 NOT_FOUND`.
  - **Investigation**: The Firestore database instance had not been provisioned in the Google Cloud environment yet.
  - **Resolution**:
    - Paused the application development context.
    - Successfully requested terms approval in the AI Studio environment.
    - Invoked the `set_up_firebase` tool with `userConfirmedTermsAcceptedInUI: true`, successfully provisioning the database `ai-studio-learningtracking-aaba5e61-aac7-4f66-a3c0-a8ee20689932`.
    - Deployed security rules using `deploy_firebase` to complete the secure cloud handshakes.

### Phase 3: Time Tracking & Gemini AI Study Plan Importer
* **Functional Goal**: Empower users to paste complex text timetables or upload screenshots of hand-drawn revision schedules, converting them into structured database tasks instantly — while also giving them precise, real-time control over their study sessions.
* **AI Importer Solution**:
  - Registered a server-side route `/api/dashboard/import` utilizing `@google/genai`.
  - Fed inputs directly to the Gemini 2.5 Flash model with a rigid schema prompt to structure subjects, tasks, weightages, and key concepts as JSON.
  - Parsed the result and seeded it straight into the user's active Firestore collections.
* **Time Tracking Additions**:
  - **Active Ticking Stopwatch**: A persistent, precise stopwatch logs exact study session durations directly to the database.
  - **Inactivity Safeguards**: Session monitors watch for user input, surfacing a warning overlay after 14 minutes of inactivity and automatically writing the session and logging the user out after 15 minutes to protect private study data.
  - **Dynamic Analytics Visualization**: Hand-coded responsive metrics using `Recharts`, showing current syllabus coverage percentages and remaining tracks.

### Phase 4: Google Drive REST API Proxy & Cloud Linker
* **Functional Goal**: Study materials are often heavy, making local server uploads suboptimal. We wanted to allow users to link files directly from their own Google Drive accounts while keeping client file transfers fast.
* **The Iframe & CORS Roadblock**:
  - **Problem**: Due to strict browser sandboxing inside iframes and OAuth restrictions, direct cross-origin calls to googleapis.com from the client-side would fail or leak tokens.
  - **Strategic Resolution (The Server Proxy Pattern)**:
    1. **Client Auth**: Integrated Firebase Google Login with Google Drive scopes (`drive`, `drive.file`, `drive.readonly`). When authorized, the client safely stores the user access token inside browser `sessionStorage`.
    2. **Express API Proxy**: Created secure routes inside `server.ts`:
       - `GET /api/drive/list`: Relays search queries to Google Drive's REST list endpoints using the client-provided Bearer token.
       - `POST /api/drive/upload`: Receives base64-encoded local attachments, wraps them in a standard `multipart/related` stream, posts them to Google Drive on behalf of the user, and returns the public `webViewLink`.
    3. **Time Tracker UI**: Designed an embedded Google Drive file explorer modal. Users can now search their actual Drive, select any PDF/slides/doc, and instantly attach its direct link to an active study task.

### Phase 5: Full-Stack Packaging & Verification
* **Functional Goal**: Guarantee absolute runtime stability, bundle integrity, and ultra-fast application cold starts.
* **Deliverables**:
  - Formulated correct TypeScript compilation settings to verify types via `tsc --noEmit`.
  - Configured `esbuild` server compiler to package the Express backend as a bundled CommonJS file (`dist/server.cjs`), eliminating ES module path resolution errors during Node launches.
  - Successfully verified dev server reboots and production compiles with zero errors or warnings.

### Phase 6: Hardening, Refactoring & Defect Extermination (Current Phase)
> **Objective:** Transition the prototype into an enterprise-ready, resilient applet, purging hardcoded states.
* **Removed Hardcoded Mock Data**: Audited and cleared all frontend mock lists. Tied history, settings, and task states to fetch directly from the live Firestore database.
* **Created Database Failover Mechanism**: Engineered offline resilience. If the database connection drops or a query fails, the portal catches the exception and reads from `/src/features/profile/mock_failover.json` seamlessly.
* **Overhauled "Add Subject Track" form**:
  * Replaced text-based input timeline span fields with a native interactive Date Range controller.
  * Added float/integer validation rules to "Syllabus Weightage Marks" to reject invalid string entries.
  * Created a "Categorized Resource Builder" where resource URLs are classified by type (`Video`, `Book`, `Other`), checked for duplicates, and saved as chips.
* **Created Cross-Origin Routing Interceptor**: Prevented inside-iframe routing breaks. Implemented an interstitial warning modal when an external link is clicked, offering options to proceed in a safe new window or dismiss.
* **Refined Live History Feeds & Hover States**:
  * Enabled real-time long polling on logs so updates stream immediately without page reloads.
  * Updated tooltips in the history feed to show exact login intervals cleanly:
    ```text
    Login - HH:MM:SS
    Logout - HH:MM:SS
    ```
* **Smart Kanban Column Edge-Scrolling**: Added vertical drag-scroll support so cards can be dragged toward columns longer than the viewport.

---

## 🧠 Key Engineering Challenges & Resolutions

| Challenge | Root Cause | Engineering Resolution |
| :--- | :--- | :--- |
| **Firestore Code 5 NOT_FOUND** | Cloud Firestore instance was not yet provisioned in Google Cloud. | Triggered Firebase Setup UI Flow, obtained project-wide provisioning, and deployed security rules. |
| **CORS / Sandboxed Google APIs** | Browser cross-origin limitations inside iframe-wrapped previews. | Implemented a secure Express API gateway proxy routing through the server-side to execute Google REST operations. |
| **Sensitive Access Tokens** | Storing OAuth access tokens on the server raises serious security/leak hazards. | Kept tokens isolated to client `sessionStorage` and passed them on-demand via the proxy's standard Bearer Authorization headers. |
| **Node ESM path resolution** | Custom backend imports failing in standard ES modules execution. | Bundled `server.ts` to a self-contained `dist/server.cjs` script via `esbuild` during the build phase. |

### 1. Database State Synchronization
* **The Problem:** Direct, un-synchronized mutations inside component states would cause visual state drifts when switching tabs.
* **The Resolution:** Centralized state fetches inside `/src/pages/DashboardPage.tsx`. Standardized the API pipeline so every critical mutation (e.g., stopping active trackers, deleting tasks, updating subject parameters) automatically invokes a database POST request to persist the operation, followed by a silent dashboard reload.

### 2. Clunky Kanban Drag-and-Drop Column Scrolling
* **The Problem:** In longer columns, users couldn't easily drag cards to items lower in the list because the scrollbars were locked during HTML5 active drag states.
* **The Resolution:** Implemented a math-driven scroll-velocity algorithm inside `handleColumnDragOver`:
  ```typescript
  const container = e.currentTarget.querySelector(".overflow-y-auto") as HTMLDivElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const threshold = 70; // Active edge borders
    const scrollSpeed = 15;
    if (relativeY < threshold && relativeY >= 0) {
      const ratio = (threshold - relativeY) / threshold;
      container.scrollTop -= scrollSpeed * ratio; // Smooth upward scroll
    } else if (rect.height - relativeY < threshold && relativeY <= rect.height) {
      const ratio = (threshold - (rect.height - relativeY)) / threshold;
      container.scrollTop += scrollSpeed * ratio; // Smooth downward scroll
    }
  }
  ```
  This creates a highly responsive, natural scrolling feel when re-prioritizing tasks.

### 3. Cross-Origin Redirect Interception
* **The Problem:** Direct anchor tags with external URLs inside an embedded AI Studio iframe could lead to CSP violations or completely disrupt the developer sandbox context on click.
* **The Resolution:** Developed a custom routing interceptor. Configured clicking study resources to record the target address in a modal hook (`activeInterceptLink`) rather than executing immediately. The overlay explains the navigation context and offers explicit options: *"Proceed to New Tab"* (opening the resource securely via a window hook with `rel="noopener noreferrer"`) or *"Go Back"* (safely remaining in the portal).

### 4. Interactive Timeline Range Pickers
* **The Problem:** Plain-text inputs for timelines were error-prone, letting users type erratic placeholders like "sometime in September".
* **The Resolution:** Upgraded inputs to dual calendar selectors, generating clean "YYYY-MM-DD" structures and calculating active study days automatically.

---

## 🌟 Future Opportunities & Developer Reflections
Building the **Learning Tracking Dashboard** highlighted the value of robust state management and defensive offline design. By prioritizing clean layouts, instant user interactions, database integrity, and thorough input validation, we have built a highly reliable tool for mastering exam preparation.

Looking ahead:
- **Automated Re-Seeding**: Use Gemini to analyze real-time study velocity and dynamically re-schedule pending study blocks in Firestore.
- **Drive Version Tracking**: Poll attached Google Drive documents to notify the user if a shared classroom PDF is updated.