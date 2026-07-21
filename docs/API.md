# REST API Reference & Specification

This document provides a comprehensive specification of all HTTP REST endpoints exposed by the Node.js/Express application server (`/server.ts`).

---

## 1. Authentication & Global Headers

All API endpoints require identifying the current session via custom request headers.

### Required Header
```http
x-user-id: <USER_ID>
```
If `x-user-id` is omitted or invalid (`"null"`, `"undefined"`), requests default to the `"anonymous"` user workspace.

---

## 2. Endpoint Specifications

### 2.1 Authentication & Session API

#### `GET /api/auth/me`
Retrieves the profile of the currently logged-in user.
- **Headers**: `x-user-id`
- **Response `200 OK`**:
```json
{
  "user": {
    "id": "google_user@example.com",
    "provider": "google",
    "email": "user@example.com",
    "name": "Alex Student",
    "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=123",
    "createdAt": "2026-07-21T10:00:00.000Z",
    "isBlocked": false,
    "warningsCount": 0
  }
}
```
- **Error `403 Forbidden`**: Returned if the user account is suspended (`isBlocked: true`).

#### `POST /api/auth/login`
Simulates OAuth login for Google or GitHub providers.
- **Body**:
```json
{
  "provider": "google",
  "email": "student@example.com",
  "name": "Alex Student",
  "avatarUrl": "https://..."
}
```
- **Response `200 OK`**: Returns populated user profile object.

---

### 2.2 Dashboard Workspace API

#### `GET /api/dashboard/data`
Retrieves all workspaces, subjects, tasks, and settings for the authenticated user in a single request.
- **Response `200 OK`**:
```json
{
  "dashboards": [ ... ],
  "subjects": { "dash_default": [ ... ] },
  "tasks": { "dash_default": [ ... ] },
  "settings": { "theme": "light", "userMotivation": "Keep grinding!" }
}
```

#### `POST /api/dashboard/create`
Creates a new study track dashboard.
- **Body**: `{ "name": "GRE Prep 2026" }`
- **Response `200 OK`**: Created dashboard object.

#### `DELETE /api/dashboard/:id`
Deletes a study track along with all contained subjects and tasks.

---

### 2.3 Tasks API

#### `POST /api/task`
Creates a new study task or syllabus objective.
- **Body**:
```json
{
  "dashboardId": "dash_default",
  "subjectId": "subj_101",
  "title": "Solve 20 Dynamic Programming Problems",
  "date": "2026-07-25",
  "priority": "High",
  "status": "Pending"
}
```
- **Response `200 OK`**: Returns new task object and triggers `syncSubjectProgress()`.

#### `PUT /api/task/:id`
Updates task attributes (status, title, notes, priority). Supports status toggling and progress calculation.

#### `POST /api/task/:id/log-time`
Logs study minutes spent on a task.
- **Body**: `{ "minutes": 45, "note": "Reviewed memoization tables" }`

#### `DELETE /api/task/:id`
Deletes a task and re-calculates subject percentage.

---

### 2.4 Direct Developer Feedback API

#### `POST /api/feedback`
Submits user feedback directly to the developer database with automated AI classification.

- **Request Headers**: `x-user-id`, `Content-Type: application/json`
- **Validation Rules**:
  - `name`: Non-empty string
  - `email`: Valid user email (pre-filled, disabled in UI)
  - `message`: Must contain **only alphanumeric characters and spaces** (`/^[a-zA-Z0-9\s]+$/`)
  - **Length**: Between 5 and 255 characters
  - **Words**: Minimum 2 words
- **AI Processing**:
  - The backend sanitizes HTML tags and evaluates the text with **Google Gemini AI**.
  - Gemini analyzes sentiment/intent and returns a single-word classification tag (e.g., `Good`, `Constructive`, `Bug`, `Malicious`, `Feature`, `Spam`).
- **Request Body**:
```json
{
  "name": "Alex Student",
  "email": "awesomegags@gmail.com",
  "message": "Great study planner app, please add dark mode customization"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Feedback submitted successfully.",
  "ai_tag": "Constructive"
}
```
- **Response `400 Bad Request`**:
```json
{
  "error": "Only alphanumeric characters and spaces are allowed in feedback message."
}
```

---

### 2.5 Settings API

#### `GET /api/settings`
Returns user portal preferences (`theme`, `fontFamily`, `userMotivation`, `hiddenMenus`).

#### `POST /api/settings`
Saves updated preferences to `/users/{userId}/settings/info`.

- **Body Example**:
```json
{
  "theme": "light",
  "fontFamily": "Space Grotesk",
  "fontSize": "16px",
  "userMotivation": "Consistency builds excellence. Keep pushing forward!",
  "hiddenMenus": []
}
```
- **Response `200 OK`**: `{ "success": true }`
