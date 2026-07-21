# Error Handling & Resiliency Patterns

This document details error mitigation, automated retries, database exception wrappers, and fallback logic designed to maintain application uptime and reliability.

---

## 1. Automated Gemini AI Retry & 503 Fallback System

When invoking Google Gemini models for AI features (Syllabus Import, Study Chatbot, Direct Feedback AI Tagging), API calls pass through `generateContentWithFallback()` in `server.ts`.

### 503 / Overload Recovery Flow
1. Primary Request: Calls `gemini-3.6-flash`.
2. Interception: Catches errors matching `503 Service Unavailable`, `rate limit`, or `overloaded`.
3. Delay: Pauses execution for 500ms to allow traffic spikes to settle.
4. Secondary Fallback: Retries request using `gemini-3.1-flash-lite`.
5. Tertiary Retry: If the fallback model also experiences a transient spike, waits 1000ms and executes one final retry on the primary model.

---

## 2. Firestore Error Wrapper (`handleFirestoreError`)

In `src/db/index.ts`, all database operations are wrapped in `handleFirestoreError`:

```ts
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    authInfo: { userId: userId || null }
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
```

This logs structured JSON error metadata to container output logs for fast diagnosis.

---

## 3. Form Validation & Toast Feedback

All user-facing forms (such as `FeedbackModal.tsx` and `ProfileSettings.tsx`) validate inputs on the client before triggering network requests:
- **Instant Error Feedback**: Visual badges highlight missing or invalid fields.
- **Toast Notifications**: Powered by `react-hot-toast`, displaying clear success/failure banners (`toast.success()`, `toast.error()`).
