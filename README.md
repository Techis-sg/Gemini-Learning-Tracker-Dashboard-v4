# 📊 Learning Tracking Dashboard

A comprehensive, production-ready, full-stack learning tracking portal engineered specifically for academic tracks, mock preparations, and placement milestones (such as the **GATE + Placement Dual-Block Master Plan**). The system combines state-of-the-art task management, real-time stopwatches, interactive Kanban workflows, AI-assisted planning, deep Google Drive integration, and a persistent audit trail.

---

## 🎨 Visual Identity & Architecture

This application employs a modern full-stack architecture featuring a **React 19 + Vite** client-side Single Page Application (SPA) communicating with an **Express (Node.js)** backend compiled via **esbuild** into standalone CommonJS for optimized execution in production environments.

### Technical Stack
* **Frontend:** React 19 (Hooks, Context, Refs), React Router v7, Tailwind CSS v4, Lucide React Icons, Motion (Framer Motion), Recharts.
* **Backend:** Express API proxy, esbuild, TypeScript Execution (`tsx`).
* **Database & Auth:** Firebase Firestore (Cloud Database Synchronization) & Authentication with strict security rules.
* **AI Engine:** `@google/genai` TypeScript SDK interfacing with Gemini 2.5 Flash.
* **Drive Integration:** Firebase Client Auth-powered OAuth for secure Google Drive linking and file access.

---

## 🚀 Core Features

### 1. Subject Track Management
* **Dual-Block Alignment:** Directly tag curriculum paths as core technical modules, secondary blocks, or revision sprints.
* **Timeline Planner:** Includes fully interactive Native Date Range Pickers mapping subject periods precisely.
* **Syllabus Weightage Marks:** Custom numerical input sanitization and positive-integer boundaries.
* **Study Material Resource Builder:** Sort materials into distinct categories (`Video`, `Book`, `Other`), complete with real-time duplication protection, custom chip-tags, and inline warning alerts.
* **URL Router Interceptor:** Features an interceptor modal that warns users before they click external links, preventing breaking shifts from the embedded iframe context ("Proceed in New Tab" vs "Dismiss").

### 2. Time Tracking & Analytics
* **Active Ticking Stopwatch:** Tracks precise learning hours down to the second.
* **Syllabus Progress Visualization:** Interactive charting showing progress percentage updates and remaining modules.
* **Automatic Inactivity Lock:** Monitors user input. If a user is inactive for 14 minutes, it presents an automatic warning overlay, automatically writing the current study session to the database and logging out after 15 minutes of inactivity to keep data secure.

### 3. Dynamic Kanban & Tasks
* **Interactive Kanban Board:** Categorizes study items into *To-Do*, *In Progress*, and *Completed*.
* **Smart Column Edge-Scrolling:** Smoothly scroll columns vertically when holding cards near the top or bottom boundaries during drag-and-drop.
* **Task CRUD:** Add, modify, delete, and view task dates using interactive calendar views.

### 4. AI-Powered Planner Importer
* **Gemini Syllabus Analyzer:** Upload raw text syllabus data, uploaded screenshots, or list exam schedules, and the integrated Gemini 2.5 Flash model will automatically structure subjects, tasks, weightages, and key concepts, seeding personalized dashboard structures directly into the Firestore database.

### 5. Deep Google Drive Integration
* **OAuth-Secured Drive Linker:** Safely authenticate with Google using popups powered by Firebase Client Auth.
* **Embedded Drive File Explorer:** Search, browse, and select revision materials, PDFs, slides, and docs directly from your Google Drive account without leaving the app.
* **Direct Upload Proxy:** Upload documents from your local machine straight to Google Drive via the backend API proxy, which instantly links them as revision materials to study tasks.

### 6. Secure History Audit Trail
* **Database Synchronized Logs:** Purges artificial frontend mockups, rendering history entries fetched straight from Firestore in real-time.
* **Failover Offline Resiliency:** If a database query fails or a connection drops, the app automatically switches to a local `mock_failover.json` file, allowing continuous viewing.
* **Interactive Tooltips:** Custom multilines show exact session durations on hover:
  ```text
  Login - HH:MM:SS
  Logout - HH:MM:SS
  ```
* **Real-time Live Stream:** The history log feed streams and paginates updates seamlessly without manual page refreshes.

### 7. Durable Cloud Persistence (Firebase & Firestore)
* **User Segregation:** Each user gets their own dedicated, secure Firestore collection hierarchy.
* **Offline-First Resilience:** Data queries and writes sync securely with the cloud database while maintaining clean local fallbacks.
* **Enterprise-Grade Security Rules:** Multi-layer access control rules safeguard user data against unauthorized read/write attempts.

---

## 🛠️ Local Development & Deployment

### Prerequisites
Make sure you have Node.js and npm installed.

### Run Locally
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   Create a `.env` or `.env.local` file based on the template:
   ```env
   # .env.example
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **Launch dev environment:**
   ```bash
   npm run dev
   ```
   The dev server will spin up on `http://localhost:3000`.

### Compile & Build
To generate the optimized production assets and bundle the backend:
```bash
npm run build
```
This runs the Vite build for static frontend resources and esbuilds the custom TypeScript Express server into a single, self-contained `dist/server.cjs` file, resolving all runtime ES Module paths instantly and preventing ES module resolution issues during cold starts.

### Start Production
```bash
npm start
```

---

## 📁 Directory Structure
```text
├── server.ts                    # Full-stack server entry point (Express & Vite dev proxy)
├── firebase-blueprint.json      # Dynamic database blueprint schema definitions
├── firebase-applet-config.json  # Firebase Project Configurations and credentials
├── firestore.rules              # Firestore Security Rules mapping collections
├── src/
│   ├── App.tsx                  # Main Router and Portal Frame layout
│   ├── main.tsx                 # Core application mounting script
│   ├── types.ts                 # Centralized type declarations
│   ├── index.css                # Tailwind import and theme overrides
│   ├── components/              # Interactive widgets & UI parts
│   ├── features/
│   │   └── tasks/               # TimeTracker, AIImporter, and Study Kanban components
│   ├── lib/
│   │   └── firebase.ts          # Client-side Firebase App & Auth Initializer
│   └── utils/
│       └── api.ts               # Authenticated API fetch proxy client
```

---

## 🔒 Security & Data Compliance
All Google Drive actions are executed on-demand in the active session scope. No personal files are ever cached on our servers; file contents are streamed and metadata is saved exclusively within user-authenticated private Firestore scopes under secure client rules. The Express backend acts as an API gateway proxy for Google Drive REST endpoints, keeping sensitive OAuth access tokens out of browser memory and preventing raw API exposures.