# Security & Storage Architecture

This document describes API key protection, client storage safety, and input sanitization practices.

---

## 1. Server-Side Secret Management
- **Gemini API Key**: Read exclusively via `process.env.GEMINI_API_KEY` on the Node.js Express backend (`server.ts` / `chatbotAgent.ts`).
- **No Client Key Leakage**: API keys are never prefixed with `VITE_` or exposed to browser context bundle.

---

## 2. Safe Storage Strategy
- Local storage operations utilize `safeJsonParse` (`src/utils/format.ts`) to handle malformed data without throwing runtime errors.
- Centralized `STORAGE_KEYS` in `src/config/app.config.ts` prevent key collisions across feature modules.

---

## 3. Input Validation & Limits
- Title and description lengths are capped according to `VALIDATION_LIMITS` (`MAX_TITLE_LENGTH: 100`, `MAX_DESCRIPTION_LENGTH: 500`).
- Upload file sizes are bounded (`MAX_FILE_SIZE_MB: 10`).
