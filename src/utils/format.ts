export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

import { formatToDisplayDate } from "./date";

export function formatDate(dateStr: string): string {
  return formatToDisplayDate(dateStr);
}

/**
  * Safely parses JSON string with a provided fallback value
  */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (err) {
    console.warn("Failed to parse JSON safely:", err);
    return fallback;
  }
}

/**
  * Formats Task ID consistently across the app (e.g. TSK-001)
  */
export function getFormattedTaskId(
  task?: { taskId?: string; taskid?: string } | null,
  index?: number
): string {
  if (!task) {
    return typeof index === "number" ? `TSK-${String(index + 1).padStart(3, "0")}` : "TSK-000";
  }
  return (
    task.taskId ||
    task.taskid ||
    (typeof index === "number" ? `TSK-${String(index + 1).padStart(3, "0")}` : "TSK-000")
  );
}

/**
  * Resolves subject name safely from a subject ID and a list of subjects
  */
export function getSubjectName(
  subjectId: string | undefined,
  subjects: Array<{ id: string; name: string }> = []
): string {
  if (!subjectId) return "";
  const sub = subjects.find((s) => s.id === subjectId);
  return sub ? sub.name : "";
}
