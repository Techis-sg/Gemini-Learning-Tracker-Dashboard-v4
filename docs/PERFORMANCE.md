# Performance & Optimization Architecture

This document describes performance optimizations, bundle compilation, state memoization, and caching strategies implemented across the portal.

---

## 1. Memory Cache for Firestore (`memoryLocalCache`)

To eliminate container disk I/O latency and prevent BloomFilter validation errors, Firestore initialization explicitly configures an in-memory local cache:

```ts
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId);
```

This ensures fast data read/write cycles without persistent cache corruption issues.

---

## 2. Bundling & Production Compilation via `esbuild`

The backend `server.ts` entry point compiles into a single, bundled CommonJS file (`dist/server.cjs`) using `esbuild`:

```json
"build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs"
```

### Benefits
- Resolves all TypeScript relative imports at build-time.
- Eliminates Node.js runtime ES Module path resolution errors.
- Externalizes node_modules (`--packages=external`) to keep bundle sizes small.
- Accelerates cold-start times on Cloud Run containers.

---

## 3. UI Render Optimizations & Dynamic Lazy Loading

- **React State Stabilization**: `useEffect` dependencies are primitive values to prevent re-render loops.
- **Selective Tab Filtering**: Hidden sidebar tabs are excluded prior to rendering list components.
- **Debounced Input Handlers**: Search and filter inputs use debounced state updates.
