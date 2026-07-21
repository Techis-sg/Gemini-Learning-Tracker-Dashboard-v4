import { API_ENDPOINTS } from "./api.config";
import { FEATURE_FLAGS, VALIDATION_LIMITS } from "./feature.config";

export const SESSION_CONFIG = {
  TIMEOUT_SEC: 900, // 15 minutes
  WARNING_SEC: 840, // 14 minutes
  DEFAULT_SESSION_NUMBER: "142",
} as const;

export const STORAGE_KEYS = {
  USER: "portal_user",
  USER_ID: "portal_user_id",
  ACTIVE_SESSION_NUMBER: "portal_active_session_number",
  SESSION_START: "portal_session_start",
  CUSTOM_FILES: "custom_uploads_data",
  HISTORY_LOGS: "history_logs",
  SUBJECTS: "syllabus_subjects",
  TASKS: "syllabus_tasks",
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
} as const;

export const DATE_CONFIG = {
  DEFAULT_FORMAT: "YYYY-MM-DD",
  TIME_24H_FORMAT: "HH:MM:SS",
} as const;

export const ANIMATION_CONFIG = {
  TRANSITION_DURATION: 0.6,
  TOAST_LOADING_DURATION: 2000,
} as const;

export const USER_CONFIG = {
  DEFAULT_THEME: "light",
  DEFAULT_FONT: "Inter",
  DEFAULT_ACCENT: "#6366f1",
} as const;

export const APP_CONFIG = {
  // Session / Security
  SESSION_TIMEOUT_SEC: SESSION_CONFIG.TIMEOUT_SEC,
  INACTIVITY_WARNING_SEC: SESSION_CONFIG.WARNING_SEC,
  DEFAULT_SESSION_NUMBER: SESSION_CONFIG.DEFAULT_SESSION_NUMBER,
  
  // Storage Keys
  STORAGE_KEYS,
  
  // Default Appearance
  DEFAULT_THEME: USER_CONFIG.DEFAULT_THEME,
  DEFAULT_FONT: USER_CONFIG.DEFAULT_FONT,
  DEFAULT_ACCENT: USER_CONFIG.DEFAULT_ACCENT,
  
  // API Endpoints
  API_ENDPOINTS,

  // Modular segments for reference
  PAGINATION: PAGINATION_CONFIG,
  VALIDATION: VALIDATION_LIMITS,
  DATE: DATE_CONFIG,
  ANIMATION: ANIMATION_CONFIG,
  FEATURES: FEATURE_FLAGS,
} as const;

// Re-exports from other consolidated config files
export { API_ENDPOINTS };
export { FEATURE_FLAGS, VALIDATION_LIMITS };
