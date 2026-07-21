# Technical Overview & Core Data Models

This document covers data models, API endpoints, error handling strategies, and utility module implementations.

---

## Shared Data Interfaces (`src/types.ts`)

### `Task`
```typescript
export interface Task {
  id: string;
  taskId?: string;            // Standard display identifier e.g. TSK-001
  taskid?: string;            // Alternative lowercase field fallback
  title: string;
  description?: string;
  subjectId?: string;
  date: string;               // ISO date string YYYY-MM-DD
  status: "Not Started" | "In Progress" | "Completed" | "Pending Review";
  priority: "Low" | "Medium" | "High";
  category: "Exam Prep" | "Assignment" | "Revision" | "Reading" | "Lecture";
  timeSpentMinutes: number;
  notes?: string;
  timeLogs?: TimeLog[];
  attachments?: Attachment[];
  boardColumnId?: "todo" | "in_progress" | "review" | "completed";
}
```

### `Subject`
```typescript
export interface Subject {
  id: string;
  name: string;
  code: string;               // e.g. CS101
  color: string;              // Hex or CSS color string
  syllabusTopics?: string[];
  resources?: ResourceLink[];
  totalTargetMinutes?: number;
}
```

### `TimeLog`
```typescript
export interface TimeLog {
  id: string;
  taskId: string;
  minutes: number;
  loggedAt: string;           // ISO timestamp
  note?: string;
}
```

---

## Core Utilities (`src/utils/`)

### 1. Date Helpers (`src/utils/date.ts`)
- `getTodayString()`: Returns current date as `YYYY-MM-DD`.
- `getDateOffsetString(daysOffset)`: Calculates offset date as `YYYY-MM-DD` (e.g. `-1` for yesterday).
- `formatToDisplayDate(dateStr)`: Transforms `YYYY-MM-DD` to `MMM DD, YYYY` (e.g., `Jul 21, 2026`).
- `format24h(Date)`: Formats time string to `HH:MM:SS`.

### 2. Format & Helper Utilities (`src/utils/format.ts`)
- `safeJsonParse<T>(jsonString, fallback)`: Safely parses JSON strings and catches syntax errors.
- `getFormattedTaskId(task, index)`: Standardizes target IDs to `TSK-001` format across all views.
- `getSubjectName(subjectId, subjects)`: Resolves subject display names safely from subject arrays.

### 3. Styling Utilities (`src/utils/styles.ts`)
- Maps priority (`Low`, `Medium`, `High`), status (`Completed`, `In Progress`, `Not Started`), and categories to Tailwind CSS color classes.

---

## Server API Endpoints (`server.ts`)

- `GET /api/health`: Healthcheck endpoint.
- `GET /api/tasks`: Retrieves user target list.
- `POST /api/tasks`: Creates a new target item.
- `PUT /api/tasks/:id`: Updates an existing target item.
- `DELETE /api/tasks/:id`: Deletes a target item.
- `POST /api/tasks/:id/log`: Appends a time study log to a target item.
- `GET /api/subjects`: Retrieves subjects list.
- `POST /api/subjects`: Creates a subject item.
- `POST /api/ai/parse-syllabus`: Sends syllabus document text to Google Gemini model for automated target generation.
- `POST /api/ai/chat`: Handles study assistant conversations via Gemini.
