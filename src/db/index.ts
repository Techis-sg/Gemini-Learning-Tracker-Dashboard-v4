import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  memoryLocalCache,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { Dashboard, Subject, Task, TimeLog, TaskAttachment } from "@/types";

// Load configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  throw new Error("firebase-applet-config.json not found in root directory");
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with memory cache to bypass persistent BloomFilter validation bugs
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId || "ai-studio-learningtracking-aaba5e61-aac7-4f66-a3c0-a8ee20689932");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    authInfo: {
      userId: userId || null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    }
  };
  const jsonString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonString);
  throw new Error(jsonString);
}

import { getInitialDefaultData } from "./mockData";

/**
 * Normalizes userId for DB queries
 */
function getNormalizedUserId(userId: string | undefined): string {
  if (!userId || userId === "null" || userId === "undefined" || userId === "anonymous") {
    return "anonymous";
  }
  return userId;
}

/**
 * Recursively cleans undefined fields from an object for Firestore compatibility
 */
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Wrapper for setDoc that automatically cleans any undefined properties recursively
 */
async function safeSetDoc(ref: any, data: any, options?: any): Promise<void> {
  const cleanedData = cleanUndefined(data);
  if (options) {
    await setDoc(ref, cleanedData, options);
  } else {
    await setDoc(ref, cleanedData);
  }
}

/**
 * Seed default template plan into Firestore for a new user
 */
export async function seedUserData(userId: string): Promise<{
  dashboards: Dashboard[];
  subjects: Record<string, Subject[]>;
  tasks: Record<string, Task[]>;
}> {
  const normUid = getNormalizedUserId(userId);
  const defaultData = getInitialDefaultData();

  try {
    // Seed Dashboards
    for (const dash of defaultData.dashboards) {
      const dashRef = doc(db, "users", normUid, "dashboards", dash.id);
      await safeSetDoc(dashRef, dash);
    }

    // Seed Subjects
    for (const subj of defaultData.subjects) {
      const subjRef = doc(db, "users", normUid, "subjects", subj.id);
      await safeSetDoc(subjRef, subj);
    }

    // Seed Tasks
    for (const task of defaultData.tasks) {
      const taskRef = doc(db, "users", normUid, "tasks", task.id);
      await safeSetDoc(taskRef, task);
    }

    // Fetch back to return properly structured shape
    return await fetchUserDashboardData(normUid);
  } catch (error) {
    console.warn("Firestore database seeding failed. Falling back to offline static data.", error);
    
    // In case of write failure (offline or rule rejection), return static local plan data mapped cleanly
    const subjectsMap: Record<string, Subject[]> = { "default": defaultData.subjects };
    const tasksMap: Record<string, Task[]> = { "default": defaultData.tasks };
    
    return {
      dashboards: defaultData.dashboards,
      subjects: subjectsMap,
      tasks: tasksMap,
    };
  }
}

/**
 * Fetch complete dashboard, subjects, and tasks data for a user
 */
export async function fetchUserDashboardData(userId: string | undefined): Promise<{
  dashboards: Dashboard[];
  subjects: Record<string, Subject[]>;
  tasks: Record<string, Task[]>;
}> {
  const normUid = getNormalizedUserId(userId);

  try {
    // 1. Fetch Dashboards
    const dashCol = collection(db, "users", normUid, "dashboards");
    const dashSnap = await getDocs(dashCol);
    
    if (dashSnap.empty) {
      // No dashboards found, return empty collections
      return {
        dashboards: [],
        subjects: {},
        tasks: {},
      };
    }

    const dashboards: Dashboard[] = [];
    dashSnap.forEach((doc) => {
      dashboards.push(doc.data() as Dashboard);
    });

    // 2. Fetch Subjects
    const subjCol = collection(db, "users", normUid, "subjects");
    const subjSnap = await getDocs(subjCol);
    const subjectsMap: Record<string, Subject[]> = {};
    
    // By default we associate subjects to the "default" dashboard or first available
    const defaultDashId = dashboards[0]?.id || "default";

    const subjectsList: Subject[] = [];
    subjSnap.forEach((doc) => {
      subjectsList.push(doc.data() as Subject);
    });

    // Organize by dashboardId (Since our entity schema has subjects map as Record<dashboardId, Subject[]>)
    dashboards.forEach((d) => {
      subjectsMap[d.id] = [];
    });
    
    subjectsList.forEach((sub) => {
      // Use dashboardId property on the subject if set, or fall back to defaultDashId
      const dId = (sub as any).dashboardId || defaultDashId;
      if (!subjectsMap[dId]) {
        subjectsMap[dId] = [];
      }
      subjectsMap[dId].push(sub);
    });

    // 3. Fetch Tasks
    const tasksCol = collection(db, "users", normUid, "tasks");
    const tasksSnap = await getDocs(tasksCol);
    const tasksMap: Record<string, Task[]> = {};

    dashboards.forEach((d) => {
      tasksMap[d.id] = [];
    });

    tasksSnap.forEach((doc) => {
      const task = doc.data() as Task;
      const dId = task.dashboardId || defaultDashId;
      if (!tasksMap[dId]) {
        tasksMap[dId] = [];
      }
      tasksMap[dId].push(task);
    });

    // Dynamic database auto-updater to shift old hardcoded dates (e.g. 2026-07-11 to 2026-07-15) relative to today
    const referenceDate = new Date("2026-07-13");
    for (const dId of Object.keys(tasksMap)) {
      for (const t of tasksMap[dId]) {
        if (t.date && (
          t.date === "2026-07-11" || 
          t.date === "2026-07-12" || 
          t.date === "2026-07-13" || 
          t.date === "2026-07-14" || 
          t.date === "2026-07-15"
        )) {
          const tDate = new Date(t.date);
          const diffTime = tDate.getTime() - referenceDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          const newD = new Date();
          newD.setDate(newD.getDate() + diffDays);
          const y = newD.getFullYear();
          const m = String(newD.getMonth() + 1).padStart(2, "0");
          const day = String(newD.getDate()).padStart(2, "0");
          t.date = `${y}-${m}-${day}`;

          if (t.timeLogs) {
            t.timeLogs = t.timeLogs.map((log: any) => {
              if (log.loggedAt && log.loggedAt.includes("2026-07-")) {
                const logParts = log.loggedAt.split("T")[0].split("-");
                if (logParts.length === 3) {
                  const logD = new Date(parseInt(logParts[0], 10), parseInt(logParts[1], 10) - 1, parseInt(logParts[2], 10));
                  const logDiff = logD.getTime() - referenceDate.getTime();
                  const logDiffDays = Math.round(logDiff / (1000 * 60 * 60 * 24));
                  const newLogD = new Date();
                  newLogD.setDate(newLogD.getDate() + logDiffDays);
                  log.loggedAt = newLogD.toISOString();
                }
              }
              return log;
            });
          }

          await saveUserTask(normUid, t);
        }
      }
    }

    const todayDateObj = new Date();
    const todayY = todayDateObj.getFullYear();
    const todayM = String(todayDateObj.getMonth() + 1).padStart(2, "0");
    const todayD = String(todayDateObj.getDate()).padStart(2, "0");
    const todayStr = `${todayY}-${todayM}-${todayD}`;

    for (const dId of Object.keys(tasksMap)) {
      for (const t of tasksMap[dId]) {
        if (t.status === "Not Started" && t.date) {
          if (t.date < todayStr && t.boardColumnId !== "backlog") {
            t.boardColumnId = "backlog";
            try {
              await saveUserTask(normUid, t);
            } catch (e) {
              console.warn("Failed to auto-save backlog task", e);
            }
          } else if (t.date === todayStr && t.boardColumnId !== "today") {
            t.boardColumnId = "today";
            try {
              await saveUserTask(normUid, t);
            } catch (e) {
              console.warn("Failed to auto-save today task", e);
            }
          }
        }
      }
    }

    for (const d of dashboards) {
      if (d.statusOverview && (d.statusOverview.includes("July 10, 2026") || d.statusOverview.includes("July 13, 2026"))) {
        const dObj = new Date();
        const mName = dObj.toLocaleDateString("en-US", { month: "long" });
        d.statusOverview = `Current Status — ${mName} ${dObj.getDate()}, ${dObj.getFullYear()}`;
        await saveUserDashboard(normUid, d);
      }
    }

    return { dashboards, subjects: subjectsMap, tasks: tasksMap };
  } catch (error) {
    console.warn("Firestore database fetch failed. Returning empty collections.", error);
    return {
      dashboards: [],
      subjects: {},
      tasks: {},
    };
  }
}

/**
 * Save user profile info
 */
export async function saveUserProfile(userId: string, userData: any): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const userRef = doc(db, "users", normUid);
  await safeSetDoc(userRef, {
    ...userData,
    id: normUid,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Get user profile info
 */
export async function getUserProfile(userId: string): Promise<any> {
  const normUid = getNormalizedUserId(userId);
  const userRef = doc(db, "users", normUid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

/**
 * Create or save a dashboard
 */
export async function saveUserDashboard(userId: string | undefined, dashboard: Dashboard): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const ref = doc(db, "users", normUid, "dashboards", dashboard.id);
  await safeSetDoc(ref, dashboard, { merge: true });
}

/**
 * Delete a dashboard and cascade-delete its items
 */
export async function deleteUserDashboard(userId: string | undefined, dashboardId: string): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  
  // Delete dashboard doc
  const dashRef = doc(db, "users", normUid, "dashboards", dashboardId);
  await deleteDoc(dashRef);

  // Clean up tasks associated with this dashboard
  const tasksCol = collection(db, "users", normUid, "tasks");
  const tasksSnap = await getDocs(tasksCol);
  for (const tDoc of tasksSnap.docs) {
    const t = tDoc.data() as Task;
    if (t.dashboardId === dashboardId) {
      await deleteDoc(doc(db, "users", normUid, "tasks", t.id));
    }
  }
}

/**
 * Save or update a task
 */
export async function saveUserTask(userId: string | undefined, task: Task): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const ref = doc(db, "users", normUid, "tasks", task.id);
  await safeSetDoc(ref, task, { merge: true });
}

/**
 * Delete a task
 */
export async function deleteUserTask(userId: string | undefined, taskId: string): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const ref = doc(db, "users", normUid, "tasks", taskId);
  await deleteDoc(ref);
}

/**
 * Save or update a subject
 */
export async function saveUserSubject(userId: string | undefined, subject: Subject): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const ref = doc(db, "users", normUid, "subjects", subject.id);
  await safeSetDoc(ref, subject, { merge: true });
}

/**
 * Delete a subject
 */
export async function deleteUserSubject(userId: string | undefined, subjectId: string): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  
  // Delete subject
  const ref = doc(db, "users", normUid, "subjects", subjectId);
  await deleteDoc(ref);

  // Update tasks referencing this subject
  const tasksCol = collection(db, "users", normUid, "tasks");
  const tasksSnap = await getDocs(tasksCol);
  for (const tDoc of tasksSnap.docs) {
    const t = tDoc.data() as Task;
    if (t.subjectId === subjectId) {
      const updatedTask = { ...t };
      delete updatedTask.subjectId;
      await safeSetDoc(doc(db, "users", normUid, "tasks", t.id), updatedTask);
    }
  }
}

/**
 * Save user custom settings
 */
export async function saveUserSettings(userId: string | undefined, settings: any): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const ref = doc(db, "users", normUid, "settings", "info");
  try {
    await safeSetDoc(ref, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${normUid}/settings/info`, normUid);
  }
}

/**
 * Get user custom settings
 */
export async function getUserSettings(userId: string | undefined): Promise<any> {
  const normUid = getNormalizedUserId(userId);
  const ref = doc(db, "users", normUid, "settings", "info");
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${normUid}/settings/info`, normUid);
  }
}

/**
 * Add history action log
 */
export async function addHistoryLog(userId: string | undefined, log: any): Promise<void> {
  const normUid = getNormalizedUserId(userId);
  const logId = log.id || ("log_" + Date.now());
  const ref = doc(db, "users", normUid, "history", logId);
  try {
    await safeSetDoc(ref, log, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${normUid}/history/${logId}`, normUid);
  }
}

/**
 * Get history action logs
 */
export async function getHistoryLogs(userId: string | undefined): Promise<any[]> {
  const normUid = getNormalizedUserId(userId);
  const path = `users/${normUid}/history`;
  try {
    const col = collection(db, "users", normUid, "history");
    const snap = await getDocs(col);
    const logs: any[] = [];
    snap.forEach((doc) => {
      logs.push(doc.data());
    });
    // Sort by timestamp desc
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path, normUid);
  }
}

