# User Workflows & Component Interactions

This document details the primary workflows supported by the portal, describing entry points, user actions, participating components, and state updates.

---

## 1. Syllabus Target Creation & Management Workflow

```mermaid
sequenceDiagram
    actor User
    participant View as Tasks View (List/Grid/Kanban/Calendar)
    participant Modal as AddTask / EditTask Modal
    participant State as useTasks Hook
    participant API as apiService (apiFetch)

    User->>View: Click "Add Target" or "+ Task"
    View->>Modal: Open Modal Dialog
    User->>Modal: Fill Title, Date, Subject, Priority, Category
    User->>Modal: Click "Save Target"
    Modal->>API: POST/PUT /api/tasks
    API-->>Modal: Success Response
    Modal->>State: Refresh Tasks
    State-->>View: Re-render updated Target List
```

### Workflow Details
1. **Entry Point**: Navigation bar "Tasks", Dashboard "Add Target", or Calendar date cell "+".
2. **Components Involved**: `AddTask.tsx`, `EditTask.tsx`, `TaskDatatable.tsx`, `TasksListView.tsx`, `TasksGridView.tsx`, `KanbanBoard.tsx`, `CalendarView.tsx`.
3. **State Updates**: Updates task list state, recalculates upcoming syllabus deadlines, and updates study statistics.

---

## 2. Interactive Study Session Logging Workflow

```mermaid
sequenceDiagram
    actor User
    participant Tracker as LogTime Modal / Stopwatch
    participant State as Task / Session State
    participant API as apiService (apiFetch)
    participant History as HistoryLogs View

    User->>Tracker: Click "Log Time" / Start Stopwatch
    User->>Tracker: Complete session & enter study notes
    User->>Tracker: Click "Save Session"
    Tracker->>API: POST /api/tasks/:id/log
    API-->>Tracker: Log persisted
    Tracker->>State: Update target's total timeSpentMinutes
    State->>History: Add record to Logged Study Sessions
```

### Workflow Details
1. **Entry Point**: Stopwatch icon on any target item or Dashboard Active Study widget.
2. **Components Involved**: `LogTime.tsx`, `ViewTaskDetailsModal.tsx`, `HistoryLogs.tsx`, `PortalApp.tsx`.
3. **State Updates**: Increments target's accumulated study minutes, updates user streak count, and creates a history log entry.

---

## 3. AI Syllabus Importer Workflow

```mermaid
sequenceDiagram
    actor User
    participant Importer as AIImporter Component
    participant Server as Express AI Endpoint (/api/ai/parse-syllabus)
    participant Gemini as Google GenAI SDK
    participant State as Tasks State

    User->>Importer: Paste syllabus text or upload syllabus PDF/DOCX
    User->>Importer: Click "Analyze Syllabus"
    Importer->>Server: POST syllabus content
    Server->>Gemini: Request structured targets (JSON schema)
    Gemini-->>Server: Return structured JSON targets
    Server-->>Importer: Return parsed target list
    User->>Importer: Review & select targets to import
    Importer->>State: Bulk save selected targets
```

### Workflow Details
1. **Entry Point**: Tasks view -> "Import Syllabus via AI".
2. **Components Involved**: `AIImporter.tsx`, `server.ts`, `@google/genai`.
3. **State Updates**: Generates new tasks mapped to subjects automatically.

---

## 4. Daily Study Streak Calculation Flow

```mermaid
flowchart TD
    Start[Load Tasks & Time Logs] --> ExtractDates[Extract unique dates where timeSpentMinutes > 0]
    ExtractDates --> CheckToday{Is Today in Study Dates?}
    CheckToday -- Yes --> StartToday[Set check offset = 0]
    CheckToday -- No --> CheckYesterday{Is Yesterday in Study Dates?}
    CheckYesterday -- Yes --> StartYesterday[Set check offset = -1]
    CheckYesterday -- No --> ZeroStreak[Streak = 0]
    
    StartToday --> Loop[Check Date at offset]
    StartYesterday --> Loop
    
    Loop --> IsStudied{Was Date Studied?}
    IsStudied -- Yes --> Increment[Streak++ & offset--] --> Loop
    IsStudied -- No --> Finish[Return Streak Count]
```

---

## 5. File Uploads & Syllabus Attachment Workflow

1. **Entry Point**: Uploads page (`UploadsPage.tsx`) or Task details modal attachments section.
2. **User Actions**: Drag-and-drop or file selector to attach study materials.
3. **Components Involved**: `UploadsPage.tsx`, `ViewTaskDetailsModal.tsx`, `useUploads.ts`.
4. **State Updates**: Saved to `STORAGE_KEYS.CUSTOM_FILES` using `safeJsonParse` and linked to relevant subjects/tasks.
