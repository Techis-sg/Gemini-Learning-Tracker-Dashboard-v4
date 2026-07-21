# Deployment Guide & Cloud Run Containerization

This document outlines the build scripts, environment variable declarations, runtime port constraints, and deployment process for Google Cloud Run containerized environments.

---

## 1. Runtime Port & Network Rules

- **Port Mapping**: The application MUST run on **Port 3000** (`0.0.0.0:3000`).
- **Nginx Reverse Proxy**: External ingress traffic maps directly to port 3000.
- **Environment Variable**: `PORT=3000` is hardcoded by infrastructure.

---

## 2. Build & Start Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "lint": "tsc --noEmit"
  }
}
```

---

## 3. Required Environment Variables (`.env.example`)

Declare required environment keys in `.env.example`:

```env
# Google Gemini AI Key
GEMINI_API_KEY=

# Firebase Configuration
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_FIRESTORE_DATABASE_ID=
```

---

## 4. Production Build Verification

Verify that the application builds cleanly prior to deployment:

```bash
npm run build
```

This generates `dist/index.html` and assets for the frontend SPA, and `dist/server.cjs` for the Express backend.
