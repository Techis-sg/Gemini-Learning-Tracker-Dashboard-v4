# Configuration & Environment Specifications

This document details all system constants, feature flags, storage keys, and API configuration specs.

---

## Configuration Files (`src/config/`)

### 1. Application Config (`src/config/app.config.ts`)

```typescript
export const APP_CONFIG = {
  NAME: "Syllabus Target Study Portal",
  VERSION: "1.0.0",
  STORAGE_KEYS: {
    THEME: "portal_theme",
    USER_ID: "portal_user_id",
    ACTIVE_SESSION_NUMBER: "portal_active_session_number",
    SESSION_START: "portal_session_start",
    CUSTOM_FILES: "custom_uploads_data",
    HISTORY_LOGS: "history_logs",
    SUBJECTS: "syllabus_subjects",
    TASKS: "syllabus_tasks",
  },
};

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  GRID_PAGE_SIZE: 6,
};

export const VALIDATION_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_FILE_SIZE_MB: 10,
};
```

### 2. API Config (`src/config/api.config.ts`)

Defines endpoint routes for `tasks`, `subjects`, `ai`, and `analytics`.

### 3. Feature Flags (`src/config/feature.config.ts`)

Enables or disables modules like `ENABLE_AI_IMPORTER`, `ENABLE_CANVAS`, and `ENABLE_STOPWATCH`.

---

## Environment Variables (`.env.example`)

```env
# Gemini API Key for server-side AI requests
GEMINI_API_KEY=
```
