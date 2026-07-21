/**
 * Centralized Date Utilities
 * Ensures consistent MM DD YYYY (e.g., July 13, 2026) formatting across the application
 * and provides helper functions to dynamically fetch local today's date safely.
 */

/**
 * Returns today's date in 'YYYY-MM-DD' format, safe from UTC/local timezone shifts
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses and formats any date string into 'Month DD, YYYY' (e.g., 'July 13, 2026')
 */
export function formatToDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  
  // If already in 'Month DD, YYYY' format (e.g., contains words), return as-is
  if (/[a-zA-Z]/.test(dateStr)) {
    return dateStr;
  }
  
  // Clean up any potential ISO timestamp ending or whitespace
  const cleanStr = dateStr.split("T")[0].trim();
  const parts = cleanStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    // Create Date using local time constructor to avoid timezone drift
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
  }
  
  // Fallback to native Date parsing if not in YYYY-MM-DD
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  
  return dateStr;
}

/**
 * Check if the given date string corresponds to today's date
 */
export function isDateToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const cleanStr = dateStr.split("T")[0].trim();
  return cleanStr === getTodayString();
}

/**
 * Formats a Date object to "HH:MM:SS" (24-hour format)
 */
export function format24h(d: Date): string {
  const hrs = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

