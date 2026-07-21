# Authentication & Session Security Architecture

This document describes the user authentication, session state management, account security controls, and authorization headers implemented across the portal.

---

## 1. Session Architecture & `x-user-id` Header

The portal uses a lightweight, client-side session identifier mechanism passed on every HTTP request via the custom header:

```http
x-user-id: <user_id>
```

### Session Lifecycle
1. On initial load, `AppRouter` issues `GET /api/auth/me` with the stored `userId` from `localStorage` (`sb_session_user_id`).
2. If `userId` exists and is valid, the server reads the profile from Firestore (`/users/{userId}`).
3. If no session exists or user logs out, `localStorage.removeItem("sb_session_user_id")` clears the session.
4. Fallback: Requests without a valid `x-user-id` header default to the `"anonymous"` workspace, allowing instant preview while preserving safety.

---

## 2. OAuth Simulation Flow

The application supports simulated Google and GitHub OAuth sign-in via `LoginModal.tsx` and `POST /api/auth/login`.

### Login Flow Sequence
```
[User Clicks "Sign in with Google"]
       │
       ▼
[Client sends POST /api/auth/login] ──> { provider: "google", email, name, avatarUrl }
       │
       ▼
[Server checks if user isBlocked] ────> [If isBlocked: Return 403 Forbidden]
       │
       ▼
[Server creates/updates /users/{cleanId}]
       │
       ▼
[Client stores cleanId in localStorage]
       │
       ▼
[Client reloads session & loads user workspaces]
```

---

## 3. Account Suspension & Misuse Safeguards

To prevent platform abuse or malicious input:
- The `UserProfile` schema includes `isBlocked` (boolean) and `warningsCount` (number).
- Every request to `/api/auth/me` checks `user.isBlocked`.
- If `isBlocked` is `true`, the API returns HTTP `403 Forbidden` with the message:
  `"Your account is blocked for misuse. Contact administrator: support@studybuddy.com"`.
- All user inputs (such as feedback messages) undergo sanitization (`replace(/<[^>]*>?/gm, "")`) and strict alphanumeric validation rules.
