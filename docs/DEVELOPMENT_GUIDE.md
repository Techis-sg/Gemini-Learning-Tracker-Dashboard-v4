# Development & Maintenance Guide

This document provides setup, coding guidelines, and testing/verification instructions for developers working on the repository.

---

## Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

---

## Local Development Workflow

1. **Clone & Install**:
   ```bash
   git clone <repo-url>
   cd portal-app
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000`.

---

## Verification & Code Quality Commands

- **Type Check & Linter**:
  ```bash
  npm run lint
  ```
  Runs `tsc --noEmit` to verify type safety across all TypeScript files.

- **Production Build Check**:
  ```bash
  npm run build
  ```
  Bundles client static assets using Vite into `dist/` and compiles `server.ts` into `dist/server.cjs` via `esbuild`.

- **Start Production Build**:
  ```bash
  npm run start
  ```
  Launches the production Node.js server.

---

## Architectural Guidelines for New Features

1. **Centralize Utilities**: When creating new formatting logic or date operations, add them to `src/utils/format.ts` or `src/utils/date.ts` rather than embedding inline formatting in components.
2. **Reuse UI Primitives**: Use existing components from `src/components/ui/` (`Button`, `Card`, `Badge`, `Modal`, `DataTable`, `Tooltip`).
3. **Storage Keys**: Declare any new localStorage keys inside `STORAGE_KEYS` in `src/config/app.config.ts`.
4. **Keep Components Modular**: Avoid monolithic components (>800 LOC). Extract child modals and views into dedicated files in `src/features/<module>/components/`.
