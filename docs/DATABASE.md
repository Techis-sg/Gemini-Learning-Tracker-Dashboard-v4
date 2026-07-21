# Database Architecture & Firestore Schema

This document details the persistent storage model, Firestore configuration, schema layout, collection hierarchies, and security principles implemented in the **Student Syllabus & Target Study Portal**.

---

## 1. Overview & Storage Strategy

The application leverages **Google Cloud Firestore** as its primary persistent database engine. To eliminate transient environment bugs and avoid BloomFilter validation issues in sandbox containers, Firestore is initialized with an in-memory local cache (`memoryLocalCache()`).

### Core Database Capabilities
- **Multi-Tenant Scoping**: All user data (tasks, subjects, settings, history) is scoped under the `/users/{userId}` document path.
- **Root Collections**: Global records like developer feedback submissions reside in the top-level `/feedbacks` collection.
- **Merge Semantics**: All updates use `{ merge: true }` via `safeSetDoc` to prevent destructive overwrites of adjacent field attributes.
- **Sanitization**: Before writing to Firestore, objects pass through `cleanUndefined()` to recursively remove any JavaScript `undefined` values that would cause Firestore serialization exceptions.

---

## 2. Entity Relationship & Collection Hierarchy

```
/ (Firestore Root)
├── /users/{userId}
│   ├── profile: UserProfile
│   ├── /dashboards/{dashboardId}
│   ├── /subjects/{subjectId}
│   ├── /tasks/{taskId}
│   ├── /settings/info
│   └── /history/{logId}
└── /feedbacks/{feedbackId}
```

---

## 3. Schema Definitions

### 3.1 `UserProfile`
Stored at `/users/{userId}`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique user ID (e.g., `google_user@example.com` or `github_user@example.com`) |
| `provider` | `string` | Login provider (`google` or `github`) |
| `email` | `string` | User's primary email address |
| `name` | `string` | Full display name |
| `avatarUrl` | `string` | DiceBear avatar URL or provider profile image |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `isBlocked` | `boolean` | Account suspension status for security enforcement |
| `warningsCount`| `number` | Number of security or misuse warnings issued |

### 3.2 `Dashboard`
Stored at `/users/{userId}/dashboards/{dashboardId}`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Dashboard identifier |
| `name` | `string` | Name of the study track (e.g., "GATE CSE 2026", "Semester Exams") |
| `isDefault` | `boolean` | Indicates if this track is the initial landing workspace |
| `createdAt` | `string` | ISO timestamp of track creation |

### 3.3 `Subject`
Stored at `/users/{userId}/subjects/{subjectId}`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Subject identifier (e.g. `subj_1720000000`) |
| `dashboardId` | `string` | Parent dashboard identifier |
| `name` | `string` | Subject name (e.g., "Data Structures & Algorithms") |
| `block` | `string` | Syllabus block / category |
| `daysPlanned` | `number` | Total days allocated for completion |
| `timeline` | `string` | Scheduled timeline description |
| `status` | `string` | `"Not Started"` \| `"In Progress"` \| `"Completed"` |
| `percentage` | `number` | Dynamically calculated completion percentage (0–100) |
| `pendingTopics` | `string` | Formatted text of remaining topics |
| `completedTopics` | `string` | Formatted text of finished topics |
| `weightage` | `string` | Exam weightage percentage or score expectation |
| `resource` | `string` | Recommended study links or textbook references |

### 3.4 `Task`
Stored at `/users/{userId}/tasks/{taskId}`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Task identifier |
| `dashboardId` | `string` | Associated study track ID |
| `subjectId` | `string?` | Optional linked subject ID |
| `title` | `string` | Task title / chapter objective |
| `date` | `string` | Scheduled target date (`YYYY-MM-DD`) |
| `status` | `string` | `"Pending"` \| `"In Progress"` \| `"Completed"` |
| `priority` | `string` | `"Low"` \| `"Medium"` \| `"High"` |
| `notes` | `string?` | Optional markdown study notes |
| `loggedMinutes` | `number` | Accumulated study minutes logged |
| `timeLogs` | `TimeLog[]` | Array of log objects: `{ id, minutes, note, loggedAt }` |
| `attachments` | `Attachment[]`| Array of uploaded file attachments: `{ id, fileName, fileUrl, size, uploadedAt }` |

### 3.5 `UserSettings`
Stored at `/users/{userId}/settings/info`.

| Field | Type | Description |
|---|---|---|
| `theme` | `string` | `"light"` \| `"dark"` \| `"cosmic"` |
| `fontFamily` | `string` | Selected font family (`Inter`, `Space Grotesk`, `Playfair Display`, `JetBrains Mono`) |
| `fontSize` | `string` | Global font size (`12px`, `14px`, `16px`, `18px`, `20px`) |
| `accentColor` | `string` | Custom hex accent color |
| `userMotivation`| `string?` | Optional custom motivation message displayed on Dashboard self-motivation card |
| `hiddenMenus` | `string[]` | Array of tab IDs hidden from the navigation sidebar |
| `emailNotifications`| `boolean` | Email alert preference |
| `pushNotifications`| `boolean` | Push alert preference |

### 3.6 `FeedbackRecord`
Stored at top-level root collection `/feedbacks/{feedbackId}`.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique feedback document ID (`fb_172000000...`) |
| `user_id` | `string` | ID of the submitting user |
| `user_email` | `string` | Verified user email address |
| `user_name` | `string` | User display name |
| `date` | `string` | Submission ISO 8601 timestamp |
| `feedback_message` | `string` | Sanitized alphanumeric feedback content |
| `ai_tag` | `string` | One-word AI classification generated by Gemini (e.g., `Good`, `Constructive`, `Bug`, `Malicious`, `Feature`) |

---

## 4. Automatic Bi-Directional Progress Sync

When tasks are created, edited, or marked completed, the backend invokes `syncSubjectProgress(userId, dashboardId, subjectId)`:
1. Calculates `completedCount / totalAssociatedTasks`.
2. Computes integer `percentage`.
3. Automatically sets subject status to `"Completed"` when percentage reaches 100%, or `"In Progress"` when > 0%.
4. Automatically updates the parent subject document in Firestore.
