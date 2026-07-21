# Student Syllabus & Target Study Portal

An enterprise-grade, responsive React + TypeScript + Vite portal for tracking academic syllabi, study targets, subjects, study time logs, active study streaks, and AI-powered syllabus breakdown.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Folder Structure](#folder-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Building & Deployment](#building--deployment)
- [Documentation Index](#documentation-index)

---

## Overview

The **Student Syllabus & Target Study Portal** helps students organize their curriculum into subjects, study targets (tasks), interactive study sessions, and time logs. It provides multiple visual representations (List, Grid, Kanban, Timeline, Calendar, and Analytics) to track learning progress, maintain daily study streaks, and automatically parse syllabus documents using AI assistance.

---

## Key Features

- **Dashboard & Overview Stats**: High-level metrics for overall completion, active study streak, time spent per subject, and upcoming targets.
- **Syllabus & Target Management**: Multi-view target organizer with List (DataTable), Grid, Kanban, Timeline, and Calendar views.
- **Interactive Time Tracker**: Built-in stopwatch and study time logger for tracking target preparation time and updating history logs.
- **Subject Management**: Subject cards with progress tracking, syllabus topics, uploaded attachments, and resource management.
- **AI Syllabus Importer**: Smart syllabus text/file parser using Gemini API to generate structured study targets automatically.
- **AI Study Assistant**: AI Chat drawer offering study tips, revision schedules, and subject Q&A.
- **History & Analytics Logs**: Comprehensive audit trail of completed study sessions, daily study habits, and time distribution charts.
- **Custom Uploads & File Management**: Repository for uploaded syllabus PDFs, documents, images, and notes.
- **Theme & Customization**: Support for Light/Dark mode and customized user settings.

---

## Technology Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **UI & Styling**: Tailwind CSS, Tabler Icons, Lucide React
- **Animations**: Framer Motion (`motion/react`)
- **Data Table & Visuals**: TanStack React Table (`@tanstack/react-table`), Recharts
- **Backend & AI**: Express.js server, Google GenAI SDK (`@google/genai`)
- **State & Storage**: React Context, LocalStorage fallback with centralized config key definitions

---

## Folder Structure

```
src/
├── components/          # Shared reusable UI primitives & theme controls
│   ├── theme/           # Dark/Light mode context & toggles
│   └── ui/              # Reusable Button, Card, Badge, Modal, DataTable, Tooltip
├── config/              # Centralized app configurations, limits, storage keys
├── db/                  # Initial mock data and local database state helpers
├── errors/              # Error boundary and fallback error views
├── features/            # Feature-sliced application modules
│   ├── auth/            # Auth pages & OAuth callbacks
│   ├── calendar/        # Calendar grid and date task views
│   ├── chatbot/         # AI Assistant drawer and server agent integration
│   ├── dashboard/       # Main Portal app dashboard and onboarding
│   ├── history/         # Study logs and history analytics
│   ├── insights/        # Performance overview and statistics
│   ├── kanban/          # Kanban drag-and-drop board
│   ├── settings/        # Profile and user settings
│   ├── subjects/        # Subject CRUD, resource links, and target details
│   ├── tasks/           # Target tasks (ListView, GridView, TimelineView, Importer, LogTime)
│   └── uploads/         # File attachments and resource management
├── layouts/             # Page frame & collapsible Sidebar navigation layout
├── routing/             # Application router, route guards, and path configs
├── services/            # API fetch layer (`apiFetch`)
├── utils/               # Shared date, formatting, toast, and sync utilities
├── App.tsx              # Root application entry
├── main.tsx             # React DOM rendering entrypoint
└── types.ts             # Global TypeScript type definitions
```

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd portal-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The dev server starts on `http://localhost:3000`.

---

## Environment Variables

Copy `.env.example` to create your local `.env` configuration:

```env
# Server-side Gemini API Key (Required for AI Importer and AI Assistant)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Available Scripts

- `npm run dev`: Starts the Express + Vite server in direct development mode using `tsx server.ts`.
- `npm run build`: Builds client static assets via Vite and bundles `server.ts` into CommonJS (`dist/server.cjs`) using `esbuild`.
- `npm run start`: Runs the production CommonJS server on `node dist/server.cjs`.
- `npm run lint`: Runs TypeScript compiler (`tsc --noEmit`) to validate type integrity.

---

## Documentation Index

For detailed architectural and developer guides, consult the `/docs` folder:

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [User Workflows](docs/USER_FLOWS.md)
- [Technical Overview](docs/TECHNICAL_OVERVIEW.md)
- [State Management](docs/STATE_MANAGEMENT.md)
- [Configuration](docs/CONFIGURATION.md)
- [Routing Specification](docs/ROUTING.md)
- [Security & Storage](docs/SECURITY.md)
- [Development Guide](docs/DEVELOPMENT_GUIDE.md)

---
