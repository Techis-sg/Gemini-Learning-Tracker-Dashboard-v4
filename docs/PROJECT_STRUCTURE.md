# Project Structure & Directory Layout

This document maps out the repository structure and explains module responsibilities across the application.

---

## Directory Hierarchy

```
/
├── .env.example                # Template for required environment variables
├── index.html                  # Main HTML entrypoint
├── package.json                # Project dependencies and npm scripts
├── server.ts                   # Express server entry point (Vite middleware + API endpoints)
├── vite.config.ts              # Vite configuration (aliases, plugins)
├── docs/                       # Developer documentation
└── src/
    ├── main.tsx                # Application root mounting script
    ├── App.tsx                 # Top-level React component
    ├── types.ts                # Shared global TypeScript types (Task, Subject, User, etc.)
    ├── components/
    │   ├── theme/
    │   │   ├── ThemeContext.tsx# React context provider for light/dark theme
    │   │   └── ThemeToggle.tsx  # Theme switcher button
    │   └── ui/
    │       ├── Badge.tsx       # Pill badges
    │       ├── Breadcrumbs.tsx  # Navigation breadcrumbs
    │       ├── Button.tsx      # Standard button primitive
    │       ├── Card.tsx        # Container card primitive
    │       ├── DataTable.tsx   # Reusable TanStack data table
    │       ├── Select.tsx      # Dropdown selector
    │       ├── Tabs.tsx        # Tab navigation container
    │       ├── Tooltip.tsx     # Hover tooltip component
    │       └── index.ts        # Re-export barrel
    ├── config/
    │   ├── api.config.ts       # API route endpoint definitions
    │   ├── app.config.ts       # Application constants, storage keys, and limits
    │   ├── feature.config.ts   # Feature flags
    │   └── firebase.ts         # Firebase initialization setup (if enabled)
    ├── db/
    │   ├── index.ts            # Local database storage handler
    │   └── mockData.ts         # Initial seed subjects and targets
    ├── errors/
    │   ├── ErrorBoundary.tsx   # Global React error boundary
    │   ├── NotFoundErrorView.tsx # 404 page fallback
    │   └── SyllabusErrorView.tsx # Module error display component
    ├── features/
    │   ├── auth/               # User authentication screens and OAuth handling
    │   ├── calendar/           # Interactive month calendar view for targets
    │   ├── chatbot/            # AI Assistant drawer and backend chatbot agent
    │   ├── dashboard/          # Onboarding and main dashboard overview
    │   ├── history/            # Study session logs and historical logs
    │   ├── insights/           # Overview stats and charts
    │   ├── kanban/             # Kanban board view with column drag-and-drop
    │   ├── settings/           # User profile and preference settings
    │   ├── subjects/           # Subject management, modals, and resource utilities
    │   ├── tasks/              # Target tasks views (List, Grid, Timeline, Modals, AI Importer)
    │   └── uploads/            # File upload repository and attachment viewer
    ├── layouts/
    │   ├── PageLayout.tsx      # Standard page container layout
    │   └── SidebarLayout.tsx   # Main responsive sidebar navigation frame
    ├── routing/
    │   ├── AppRouter.tsx       # Main client-side router
    │   └── route.config.ts     # Route paths configuration
    ├── services/
    │   └── apiService.ts       # Centralized `apiFetch` HTTP client
    └── utils/
        ├── DatePicker.tsx      # Date picker widget
        ├── Modal.tsx           # Standard modal dialog container
        ├── date.ts             # Date calculations and streak helpers
        ├── format.ts           # Safe JSON parsing, Task ID formatting, Subject lookup
        ├── index.ts            # Utilities re-export barrel
        ├── styles.ts           # Priority, status, and category color styling maps
        ├── subjectSync.ts      # Subject list sync helper
        └── toast.ts            # Notification toast dispatcher
```

---

## Module Responsibilities

| Directory | Responsibility |
| :--- | :--- |
| `src/config/` | Holds immutable configuration values, local storage key names, limits, and endpoint paths. |
| `src/features/` | Domain-driven modules containing view components, modals, and hooks for specific workflows. |
| `src/components/ui/` | Pure visual UI primitives styled with Tailwind CSS. |
| `src/layouts/` | Page containers and sidebar layouts that manage navigation state and mobile drawer toggles. |
| `src/services/` | Centralized network requests and API abstractions. |
| `src/utils/` | Shared pure helper functions (formatting, dates, styles, toast notifications). |
