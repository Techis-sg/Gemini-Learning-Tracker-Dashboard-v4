import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import {
  fetchUserDashboardData,
  saveUserProfile,
  getUserProfile,
  saveUserDashboard,
  deleteUserDashboard,
  saveUserTask,
  deleteUserTask,
  saveUserSubject,
  deleteUserSubject,
  saveUserSettings,
  getUserSettings,
  addHistoryLog,
  getHistoryLogs,
} from "./src/db/index.js";
import { handleChatbotRequest } from "./src/features/chatbot/server/chatbotAgent.js";
import { Dashboard, Subject, Task, TimeLog, TaskAttachment } from "./src/types";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-")         // Replace multiple - with single -
    .replace(/^-+/, "")             // Trim - from start of text
    .replace(/-+$/, "");            // Trim - from end of text
}

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limits for base64 file uploads safely
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("GEMINI_API_KEY is not defined in environment variables.");
}

/**
 * Robust wrapper for calling Gemini content generation with automated retries and
 * fallback to gemini-3.1-flash-lite if the primary model is busy/overloaded (503 Service Unavailable).
 */
async function generateContentWithFallback(params: any): Promise<any> {
  if (!ai) {
    throw new Error("Gemini API client is not configured.");
  }

  const originalModel = params.model || "gemini-3.6-flash";
  try {
    return await ai.models.generateContent({
      ...params,
      model: params.model || "gemini-3.6-flash",
    });
  } catch (err: any) {
    const errorStr = String(err.message || err).toLowerCase();
    const is503 = errorStr.includes("503") || 
                  errorStr.includes("demand") || 
                  errorStr.includes("unavailable") || 
                  errorStr.includes("overloaded") || 
                  errorStr.includes("rate limit") ||
                  err.status === 503;

    if (is503) {
      console.warn(`Model ${originalModel} is busy or unavailable. Trying fallback model gemini-3.1-flash-lite...`, err);
      // Wait a tiny bit to let spikes settle
      await new Promise(resolve => setTimeout(resolve, 500));

      const fallbackParams = {
        ...params,
        model: "gemini-3.1-flash-lite"
      };

      try {
        return await ai.models.generateContent(fallbackParams);
      } catch (fallbackErr: any) {
        console.error("Fallback model gemini-3.1-flash-lite also failed:", fallbackErr);
        // If fallback fails, try a simple retry on the original model
        console.warn(`Retrying original model ${originalModel} one last time...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await ai.models.generateContent(params);
      }
    }

    // For other types of errors, propagate them
    throw err;
  }
}

/**
 * Syncs the subject percentage/status in Firestore based on its associated tasks
 */
async function syncSubjectProgress(userId: string, dashboardId: string, subjectId: string): Promise<void> {
  const data = await fetchUserDashboardData(userId);
  const subjectsList = data.subjects[dashboardId] || [];
  const tasksList = data.tasks[dashboardId] || [];

  const subj = subjectsList.find((s) => s.id === subjectId);
  if (!subj) return;

  const associatedTasks = tasksList.filter((t) => t.subjectId === subjectId);
  if (associatedTasks.length === 0) {
    subj.percentage = 0;
    subj.status = "Not Started";
    await saveUserSubject(userId, subj);
    return;
  }

  const completed = associatedTasks.filter((t) => t.status === "Completed").length;
  const percentage = Math.round((completed / associatedTasks.length) * 100);

  subj.percentage = percentage;
  subj.status =
    percentage === 100 ? "Completed" : percentage > 0 ? "In Progress" : "Not Started";

  await saveUserSubject(userId, subj);
}

// --- Auth Routes ---

// Get current session
app.get("/api/auth/me", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (userId && userId !== "null" && userId !== "undefined" && userId !== "anonymous") {
      const user = await getUserProfile(userId);
      if (user && user.isBlocked) {
        return res.status(403).json({ error: "Your account is blocked for misuse. Contact administrator: support@studybuddy.com" });
      }
      res.json({ user });
    } else {
      res.json({ user: null });
    }
  } catch (error: any) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: "Failed to get current session: " + error.message });
  }
});

// OAuth Simulated Login (Google or GitHub)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { provider, email, name, avatarUrl } = req.body;
    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    const cleanEmail = email || `${provider}_user@example.com`;
    const cleanName = name || (provider === "google" ? "Google Student" : "GitHub Developer");
    const cleanId = `${provider}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;

    const existingUser = await getUserProfile(cleanId);
    if (existingUser && existingUser.isBlocked) {
      return res.status(403).json({ error: "Your account is blocked for misuse. Contact administrator: support@studybuddy.com" });
    }

    const user = {
      id: cleanId,
      provider,
      email: cleanEmail,
      name: cleanName,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
      createdAt: existingUser?.createdAt || new Date().toISOString(),
      warningsCount: existingUser?.warningsCount || 0,
      isBlocked: false,
    };

    await saveUserProfile(cleanId, user);

    // Seed/initialize user data if it's their first login
    await fetchUserDashboardData(cleanId);

    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Auth login error:", error);
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

// --- API Routes ---

// Get DB state
app.get("/api/dashboard", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const data = await fetchUserDashboardData(userId);
    res.json(data);
  } catch (error: any) {
    console.error("Fetch dashboards error:", error);
    res.status(500).json({ error: "Failed to fetch planner: " + error.message });
  }
});

// Create new dashboard
app.post("/api/dashboard", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { name, description, target, statusOverview } = req.body;

    const dbName = name || "New Custom Tracker Plan";
    const newDashboard: Dashboard = {
      id: "dash_" + Date.now(),
      name: dbName,
      shortName: slugify(dbName),
      description: description || "Custom study tracks and tasks tracking.",
      createdAt: new Date().toISOString(),
      isDefault: false,
      target: target || "AIR < 200",
      statusOverview: statusOverview || "Created " + new Date().toLocaleDateString(),
    };

    await saveUserDashboard(userId, newDashboard);
    res.json({ dashboard: newDashboard, subjects: [], tasks: [] });
  } catch (error: any) {
    console.error("Create dashboard error:", error);
    res.status(500).json({ error: "Failed to create dashboard: " + error.message });
  }
});

// Delete dashboard
app.delete("/api/dashboard/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    await deleteUserDashboard(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete dashboard error:", error);
    res.status(500).json({ error: "Failed to delete dashboard: " + error.message });
  }
});

// Create new task
app.post("/api/task", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { dashboardId, title, description, date, category, priority, subjectId, boardColumnId } = req.body;

    const targetColumn = boardColumnId || "today";
    const statusMap: Record<string, 'Not Started' | 'In Progress' | 'Completed'> = {
      backlog: "Not Started",
      today: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
      revision: "Completed",
    };
    const mappedStatus = statusMap[targetColumn] || "Not Started";

    const dbData = await fetchUserDashboardData(userId);
    const existingTasks = dbData.tasks[dashboardId] || [];
    const seqNum = existingTasks.length + 1;
    const taskIdVal = req.body.taskId || req.body.taskid || `TSK-${String(seqNum).padStart(3, "0")}`;

    const newTask: Task = {
      id: "task_" + Date.now(),
      taskId: taskIdVal,
      taskid: taskIdVal,
      dashboardId,
      subjectId,
      title: title || "New Task",
      description: description || "",
      date: date || new Date().toISOString().split("T")[0],
      category: category || "General",
      status: mappedStatus,
      priority: priority || "Medium",
      notes: "",
      timeSpentMinutes: 0,
      timeLogs: [],
      attachments: [],
      boardColumnId: targetColumn,
    };

    await saveUserTask(userId, newTask);

    // Save action log to history
    await addHistoryLog(userId, {
      id: "log_user_create_" + Date.now(),
      type: "action",
      subType: "user",
      action: "create_task",
      description: `Created syllabus task: "${newTask.title}".`,
      timestamp: new Date().toISOString(),
    });

    if (subjectId) {
      await syncSubjectProgress(userId, dashboardId, subjectId);
    }

    res.json(newTask);
  } catch (error: any) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Failed to create task: " + error.message });
  }
});

// Update task
app.put("/api/task/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const updates = req.body;

    const data = await fetchUserDashboardData(userId);
    let targetTask: Task | null = null;
    let oldStatus = "";

    // Search inside all dashboard lists
    for (const dId of Object.keys(data.tasks)) {
      const match = data.tasks[dId].find((t) => t.id === id);
      if (match) {
        oldStatus = match.status;
        targetTask = { ...match, ...updates };
        break;
      }
    }

    if (!targetTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    await saveUserTask(userId, targetTask);

    // Save action log to history
    if (oldStatus !== targetTask.status) {
      await addHistoryLog(userId, {
        id: "log_user_status_" + Date.now(),
        type: "action",
        subType: "user",
        action: targetTask.status === "Completed" ? "complete_task" : "update_task",
        description: `Updated task "${targetTask.title}" status to "${targetTask.status}".`,
        timestamp: new Date().toISOString(),
      });
    } else {
      await addHistoryLog(userId, {
        id: "log_user_update_" + Date.now(),
        type: "action",
        subType: "user",
        action: "update_task",
        description: `Edited task details for: "${targetTask.title}".`,
        timestamp: new Date().toISOString(),
      });
    }

    if (targetTask.subjectId) {
      await syncSubjectProgress(userId, targetTask.dashboardId, targetTask.subjectId);
    }

    res.json(targetTask);
  } catch (error: any) {
    console.error("Update task error:", error);
    res.status(500).json({ error: "Failed to update task: " + error.message });
  }
});

// Delete task
app.delete("/api/task/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    const data = await fetchUserDashboardData(userId);
    let targetTask: Task | null = null;

    for (const dId of Object.keys(data.tasks)) {
      const match = data.tasks[dId].find((t) => t.id === id);
      if (match) {
        targetTask = match;
        break;
      }
    }

    if (!targetTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    await deleteUserTask(userId, id);

    // Save action log to history
    await addHistoryLog(userId, {
      id: "log_user_delete_" + Date.now(),
      type: "action",
      subType: "user",
      action: "delete_task",
      description: `Deleted syllabus task: "${targetTask.title}".`,
      timestamp: new Date().toISOString(),
    });

    if (targetTask.subjectId) {
      await syncSubjectProgress(userId, targetTask.dashboardId, targetTask.subjectId);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Failed to delete task: " + error.message });
  }
});

// Reorder tasks
app.put("/api/tasks/reorder/:dashId", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { dashId } = req.params;
    const { taskIds } = req.body;

    const data = await fetchUserDashboardData(userId);
    const existingTasks = data.tasks[dashId] || [];
    const taskMap = new Map(existingTasks.map((t) => [t.id, t]));
    const reordered: Task[] = [];

    taskIds.forEach((id: string) => {
      const task = taskMap.get(id);
      if (task) {
        reordered.push(task);
        taskMap.delete(id);
      }
    });

    taskMap.forEach((task) => {
      reordered.push(task);
    });

    // Save them sequentially
    for (const task of reordered) {
      await saveUserTask(userId, task);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Reorder tasks error:", error);
    res.status(500).json({ error: "Failed to reorder tasks: " + error.message });
  }
});

// Log time for task
app.post("/api/task/:id/log-time", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const { minutes, note } = req.body;

    const data = await fetchUserDashboardData(userId);
    let targetTask: Task | null = null;

    for (const dId of Object.keys(data.tasks)) {
      const match = data.tasks[dId].find((t) => t.id === id);
      if (match) {
        targetTask = { ...match };
        break;
      }
    }

    if (!targetTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const newLog: TimeLog = {
      id: "log_" + Date.now(),
      minutes: Number(minutes) || 0,
      note: note || "Logged active study session.",
      loggedAt: new Date().toISOString(),
    };

    targetTask.timeLogs = [...(targetTask.timeLogs || []), newLog];
    targetTask.timeSpentMinutes = (targetTask.timeSpentMinutes || 0) + newLog.minutes;

    if (targetTask.status === "Not Started") {
      targetTask.status = "In Progress";
      targetTask.boardColumnId = "in_progress";
    }

    await saveUserTask(userId, targetTask);

    // Save action log to history
    await addHistoryLog(userId, {
      id: "log_user_time_" + Date.now(),
      type: "action",
      subType: "user",
      action: "log_time",
      description: `Logged ${minutes} study minutes to: "${targetTask.title}".`,
      timestamp: new Date().toISOString(),
    });

    if (targetTask.subjectId) {
      await syncSubjectProgress(userId, targetTask.dashboardId, targetTask.subjectId);
    }

    res.json(targetTask);
  } catch (error: any) {
    console.error("Log time error:", error);
    res.status(500).json({ error: "Failed to log time: " + error.message });
  }
});

// Edit subject
app.put("/api/subject/:dashId/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { dashId, id } = req.params;
    const updates = req.body;

    const data = await fetchUserDashboardData(userId);
    const subjectsList = data.subjects[dashId] || [];
    const targetSubj = subjectsList.find((s) => s.id === id);

    if (!targetSubj) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const updatedSubj: Subject = {
      ...targetSubj,
      ...updates,
    };

    // BI-DIRECTIONAL SYNC: Subject status -> Tasks status
    const targetStatus = updatedSubj.status;
    const tasksList = data.tasks[dashId] || [];

    if (targetStatus === "Completed") {
      for (const t of tasksList) {
        if (t.subjectId === id && t.status !== "Completed") {
          t.status = "Completed";
          t.boardColumnId = "completed";
          await saveUserTask(userId, t);
        }
      }
    } else if (targetStatus === "Not Started") {
      for (const t of tasksList) {
        if (t.subjectId === id && t.status !== "Not Started") {
          t.status = "Not Started";
          t.boardColumnId = "today";
          await saveUserTask(userId, t);
        }
      }
    } else if (targetStatus === "In Progress") {
      const hasActive = tasksList.some((t) => t.subjectId === id && t.status === "In Progress");
      if (!hasActive) {
        const subjectTasks = tasksList.filter((t) => t.subjectId === id);
        const todoTask = subjectTasks.find((t) => t.status === "Not Started");
        if (todoTask) {
          todoTask.status = "In Progress";
          todoTask.boardColumnId = "in_progress";
          await saveUserTask(userId, todoTask);
        } else if (subjectTasks.length > 0) {
          subjectTasks[0].status = "In Progress";
          subjectTasks[0].boardColumnId = "in_progress";
          await saveUserTask(userId, subjectTasks[0]);
        }
      }
    }

    // Recalculate percentage based on synced task statuses
    const updatedTasksList = (await fetchUserDashboardData(userId)).tasks[dashId] || [];
    const associatedTasks = updatedTasksList.filter((t) => t.subjectId === id);
    if (associatedTasks.length > 0) {
      const completedCount = associatedTasks.filter((t) => t.status === "Completed").length;
      updatedSubj.percentage = Math.round((completedCount / associatedTasks.length) * 100);
    }

    await saveUserSubject(userId, updatedSubj);
    res.json(updatedSubj);
  } catch (error: any) {
    console.error("Update subject error:", error);
    res.status(500).json({ error: "Failed to update subject: " + error.message });
  }
});

// Add custom subject
app.post("/api/subject/:dashId", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { dashId } = req.params;
    const {
      name,
      block,
      daysPlanned,
      timeline,
      percentage,
      pendingTopics,
      completedTopics,
      weightage,
      resource,
    } = req.body;

    const newSubject: Subject = {
      id: "subj_" + Date.now(),
      dashboardId: dashId,
      name: name || "New Subject",
      block: block || "Block 1 - GATE",
      daysPlanned: Number(daysPlanned) || 0,
      timeline: timeline || "Custom",
      status: percentage === 100 ? "Completed" : percentage > 0 ? "In Progress" : "Not Started",
      percentage: Number(percentage) || 0,
      pendingTopics: pendingTopics || "",
      completedTopics: completedTopics || "",
      weightage: weightage || "",
      resource: resource || "",
    };

    await saveUserSubject(userId, newSubject);
    res.json(newSubject);
  } catch (error: any) {
    console.error("Add subject error:", error);
    res.status(500).json({ error: "Failed to add subject: " + error.message });
  }
});

// Delete subject
app.delete("/api/subject/:dashId/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    await deleteUserSubject(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete subject error:", error);
    res.status(500).json({ error: "Failed to delete subject: " + error.message });
  }
});

// --- Settings API ---
app.get("/api/settings", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const settings = await getUserSettings(userId);
    res.json({ settings });
  } catch (error: any) {
    console.error("Fetch settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings: " + error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const settings = req.body;
    await saveUserSettings(userId, settings);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Save settings error:", error);
    res.status(500).json({ error: "Failed to save settings: " + error.message });
  }
});

// --- History Logs API ---
app.get("/api/history", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const logs = await getHistoryLogs(userId);
    res.json({ logs });
  } catch (error: any) {
    console.error("Fetch history logs error:", error);
    res.status(500).json({ error: "Failed to fetch activity history: " + error.message });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { type, action, description, durationMinutes, sessionNumber, loggedInTime, loggedOutTime } = req.body;
    
    const newLog = {
      id: "log_" + Date.now(),
      type: type || "action",
      action: action || "interaction",
      description: description || "User performed an action.",
      timestamp: new Date().toISOString(),
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
      sessionNumber: sessionNumber !== undefined ? Number(sessionNumber) : undefined,
      loggedInTime,
      loggedOutTime,
    };

    await addHistoryLog(userId, newLog);
    res.json({ success: true, log: newLog });
  } catch (error: any) {
    console.error("Add history log error:", error);
    res.status(500).json({ error: "Failed to record activity log: " + error.message });
  }
});

// Upload Attachment (Base64 file uploader)
app.post("/api/upload", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { fileName, mimeType, base64Data, taskId } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "No file content supplied" });
    }

    const cleanFileName = Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const targetPath = path.join(uploadsDir, cleanFileName);

    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(targetPath, buffer);

    const attachmentUrl = `/uploads/${cleanFileName}`;
    const attachment: TaskAttachment = {
      id: "attach_" + Date.now(),
      name: fileName,
      size: buffer.length,
      mimeType,
      uploadedAt: new Date().toISOString(),
      url: attachmentUrl,
    };

    if (taskId) {
      const data = await fetchUserDashboardData(userId);
      let targetTask: Task | null = null;

      for (const dId of Object.keys(data.tasks)) {
        const match = data.tasks[dId].find((t) => t.id === taskId);
        if (match) {
          targetTask = { ...match };
          break;
        }
      }

      if (targetTask) {
        targetTask.attachments = [...(targetTask.attachments || []), attachment];
        await saveUserTask(userId, targetTask);
      }
    }

    res.json(attachment);
  } catch (err: any) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Failed to upload file: " + err.message });
  }
});

// AI Planner Importer API
app.post("/api/dashboard/import", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { plannerText, plannerImageBase64, plannerImageMimeType } = req.body;

  if (!ai) {
    return res.status(500).json({
      error: "Gemini API client is not configured on this server. Check GEMINI_API_KEY settings.",
    });
  }

  try {
    let responseText = "";

    const userPrompt = `
Analyze the provided study track, calendar, plan, or list of topics/schedule.
You must construct a highly structured study dashboard.
Parse topics, days/duration, status, dates, resources, and construct a complete study planner.

Format the output strictly as a single JSON object. Do not include markdown wraps like \`\`\`json. Output ONLY the raw JSON string matching the following structure:
{
  "dashboardName": "Descriptive title of this planner track (e.g. UPSC prep, College Semester Plan)",
  "dashboardDescription": "A summary of the goals and target milestones",
  "target": "Overall targets, milestones, or target rank/marks",
  "statusOverview": "Overview of current study status",
  "subjects": [
    {
      "name": "Subject/Module Name",
      "block": "Block 1 - GATE" | "Block 2 - Placements" | "DSA" | "General",
      "daysPlanned": 12,
      "timeline": "e.g. Jul 11-24 or Oct 1-14",
      "pendingTopics": "List of topics pending",
      "completedTopics": "List of topics done if any",
      "percentage": 0, 
      "weightage": "e.g. 10 Marks or High Priority",
      "resource": "Suggested books or website"
    }
  ],
  "tasks": [
    {
      "title": "Daily topic / task title",
      "description": "Specific subtopics to cover, problems to solve, action notes",
      "date": "2026-07-11", // Standard YYYY-MM-DD. Estimate dates starting from July 11, 2026 if no dates are specified. Choose dates in 2026 so they are visible in calendar!
      "category": "Block 1 - GATE" | "Block 2 - Placements" | "DSA" | "General",
      "priority": "Low" | "Medium" | "High",
      "status": "Not Started"
    }
  ]
}

Ensure all dates are strictly in YYYY-MM-DD format (recommend using July/August/September 2026 for any estimated timelines so they display cleanly on our dynamic timetable/calendar!).
Only return the JSON. No conversational text.
`;

    if (plannerImageBase64 && plannerImageMimeType) {
      const imagePart = {
        inlineData: {
          mimeType: plannerImageMimeType,
          data: plannerImageBase64,
        },
      };
      const textPart = {
        text: userPrompt + (plannerText ? `\nAdditional text context provided:\n${plannerText}` : ""),
      };

      const response = await generateContentWithFallback({
        model: "gemini-3.6-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "";
    } else {
      const response = await generateContentWithFallback({
        model: "gemini-3.6-flash",
        contents: userPrompt + `\n\nPlanner Source Material:\n${plannerText}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "";
    }

    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    }

    const parsedPlan = JSON.parse(cleanedJson);
    const newDashId = "dash_ai_" + Date.now();
    const dbName = parsedPlan.dashboardName || "Imported Plan";

    const newDashboard: Dashboard = {
      id: newDashId,
      name: dbName,
      shortName: slugify(dbName),
      description: parsedPlan.dashboardDescription || "AI Imported custom learning track.",
      createdAt: new Date().toISOString(),
      isDefault: false,
      target: parsedPlan.target || "Accomplish all subjects",
      statusOverview: parsedPlan.statusOverview || "Ready to track",
    };

    await saveUserDashboard(userId, newDashboard);

    const createdSubjects: Subject[] = (parsedPlan.subjects || []).map((s: any, idx: number) => ({
      id: `subj_ai_${idx}_${Date.now()}`,
      name: s.name || "Unnamed Module",
      block: s.block || "General",
      daysPlanned: Number(s.daysPlanned) || 5,
      timeline: s.timeline || "Ongoing",
      status: s.percentage === 100 ? "Completed" : s.percentage > 0 ? "In Progress" : "Not Started",
      percentage: Number(s.percentage) || 0,
      pendingTopics: s.pendingTopics || "",
      completedTopics: s.completedTopics || "",
      weightage: s.weightage || "",
      resource: s.resource || "",
    }));

    for (const subj of createdSubjects) {
      await saveUserSubject(userId, subj);
    }

    const createdTasks: Task[] = (parsedPlan.tasks || []).map((t: any, idx: number) => {
      let subjectId = undefined;
      if (t.subjectTitle) {
        const match = createdSubjects.find(
          (sub) => sub.name.toLowerCase() === t.subjectTitle.toLowerCase()
        );
        if (match) subjectId = match.id;
      }

      return {
        id: `task_ai_${idx}_${Date.now()}`,
        dashboardId: newDashId,
        subjectId,
        title: t.title || "Study session",
        description: t.description || "",
        date: t.date || new Date().toISOString().split("T")[0],
        category: t.category || "General",
        status: t.status || "Not Started",
        priority: t.priority || "Medium",
        notes: "",
        timeSpentMinutes: 0,
        timeLogs: [],
        attachments: [],
        boardColumnId: t.status === "Completed" ? "completed" : t.status === "In Progress" ? "in_progress" : "today",
      };
    });

    for (const task of createdTasks) {
      await saveUserTask(userId, task);
    }

    res.json({
      success: true,
      dashboardId: newDashId,
      dashboard: newDashboard,
      subjects: createdSubjects,
      tasks: createdTasks,
    });
  } catch (err: any) {
    console.error("AI Import Failure:", err);
    res.status(500).json({ error: "AI Planner Import failed: " + err.message });
  }
});

// Helper functions for CSV parsing
function parseCSV(text: string): Record<string, string>[] {
  const cleanText = (text || "").replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const hTrim = header.trim();
      row[hTrim] = values[idx] !== undefined ? values[idx].trim() : "";
      row[hTrim.toLowerCase()] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    results.push(row);
  }
  return results;
}

function getCsvField(row: Record<string, string>, ...possibleKeys: string[]): string {
  if (!row) return "";
  for (const k of possibleKeys) {
    const lowerKey = k.toLowerCase();
    for (const rk of Object.keys(row)) {
      if (rk.trim().toLowerCase() === lowerKey) {
        if (row[rk] !== undefined && row[rk] !== null && row[rk] !== "") {
          return row[rk];
        }
      }
    }
  }
  return "";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(val => val.replace(/^"|"$/g, ""));
}

// File Planner Importer API
app.post("/api/dashboard/import-files", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { planMetaText, subjectsCsvText, scheduleCsvText, goalsJsonText, resourcesCsvText } = req.body;

  try {
    // 1. Parse plan_meta.json
    let planMeta: any = {};
    if (planMetaText) {
      planMeta = JSON.parse(planMetaText);
    }

    // 2. Parse goals.json
    let goals: any = {};
    if (goalsJsonText) {
      goals = JSON.parse(goalsJsonText);
    }

    // 3. Parse resources.csv
    let resources: any[] = [];
    if (resourcesCsvText) {
      resources = parseCSV(resourcesCsvText);
    }

    const planInfo = planMeta.plan || {};
    const newDashId = "dash_file_" + Date.now();
    const dbName = planInfo.name || planMeta.name || "My Imported Plan";
    const newDashboard: Dashboard = {
      id: newDashId,
      name: dbName,
      shortName: slugify(dbName),
      description: planInfo.exam || planMeta.description || "Uploaded planner workspace.",
      createdAt: new Date().toISOString(),
      isDefault: false,
      target: planInfo.primary_target || planMeta.target || "Achieve all syllabus milestones",
      statusOverview: planInfo.secondary_target || planMeta.statusOverview || "Initialized from files",
    } as any;

    await saveUserDashboard(userId, newDashboard);

    // 4. Parse subjects.csv and maintain ID mapping
    let createdSubjects: Subject[] = [];
    const subjectIdMap: Record<string, string> = {}; // maps from s01 -> firestore id

    if (subjectsCsvText) {
      const parsedSubjects = parseCSV(subjectsCsvText);
      createdSubjects = parsedSubjects.map((s, idx) => {
        const rawSubjectId = getCsvField(s, "subject_id", "id", "subj_id");
        const firestoreSubjId = `subj_file_${idx}_${Date.now()}`;
        if (rawSubjectId) {
          subjectIdMap[rawSubjectId] = firestoreSubjId;
        }

        const rawBlockId = getCsvField(s, "block_id", "block", "block_name") || "DSA";
        const blockName = rawBlockId === "b1" ? "Block 1" : rawBlockId === "b2" ? "Block 2" : rawBlockId;

        const rawStatus = getCsvField(s, "status", "state") || "Not Started";
        const statusVal = (rawStatus === "done" || rawStatus === "Completed" || rawStatus === "completed") 
          ? "Completed" 
          : (rawStatus === "in_progress" || rawStatus === "In Progress" || rawStatus === "in-progress") 
            ? "In Progress" 
            : "Not Started";

        const daysPlannedVal = Number(getCsvField(s, "planned_days", "daysplanned", "days_planned", "days")) || 10;
        const progressPctVal = Number(getCsvField(s, "progress_pct", "percentage", "progress")) || 0;
        
        const startDate = getCsvField(s, "start_date", "startdate");
        const endDate = getCsvField(s, "end_date", "enddate");
        const timelineStr = startDate && endDate ? `${startDate} to ${endDate}` : (getCsvField(s, "timeline") || "Ongoing");
        const resourceStr = getCsvField(s, "resource_primary", "resource", "resources") || "";
        const weightageStr = getCsvField(s, "exam_weightage", "weightage", "priority") || "";
        const subjectName = getCsvField(s, "name", "subject_name", "subject", "title", "module") || `Subject ${idx + 1}`;

        return {
          id: firestoreSubjId,
          dashboardId: newDashId,
          name: subjectName,
          block: blockName as any,
          daysPlanned: daysPlannedVal,
          timeline: timelineStr,
          status: statusVal as any,
          percentage: progressPctVal,
          pendingTopics: getCsvField(s, "notes", "pendingtopics", "pending_topics") || "Syllabus details",
          completedTopics: getCsvField(s, "completedtopics", "completed_topics") || "",
          weightage: weightageStr,
          resource: resourceStr,
        };
      });

      for (const subj of createdSubjects) {
        await saveUserSubject(userId, subj);
      }
    }

    // 5. Parse schedule.csv (Tasks) using the subject ID mapping
    let createdTasks: Task[] = [];
    if (scheduleCsvText) {
      const parsedTasks = parseCSV(scheduleCsvText);
      const todayStr = new Date().toISOString().split("T")[0];

      createdTasks = parsedTasks.map((t, idx) => {
        let subjectId = undefined;
        const rawSubjId = t.subject_id || "";
        
        // Match using the precise map from CSV subject_id -> new firestore id
        if (rawSubjId && subjectIdMap[rawSubjId]) {
          subjectId = subjectIdMap[rawSubjId];
        } else {
          // Fallback to name search
          const targetSubjName = t.subjectName || t.subject || "";
          if (targetSubjName) {
            const match = createdSubjects.find(
              (sub) => sub.name.toLowerCase().includes(targetSubjName.toLowerCase()) || targetSubjName.toLowerCase().includes(sub.name.toLowerCase())
            );
            if (match) subjectId = match.id;
          }
        }

        const taskDate = t.date || todayStr;
        const rawTaskStatus = t.status || "Not Started";
        const taskStatus = (rawTaskStatus === "done" || rawTaskStatus === "Completed" || rawTaskStatus === "completed") 
          ? "Completed" 
          : (rawTaskStatus === "in_progress" || rawTaskStatus === "In Progress" || rawTaskStatus === "in-progress") 
            ? "In Progress" 
            : "Not Started";

        let boardColumnId: Task["boardColumnId"] = "backlog";
        if (taskStatus === "Completed") {
          boardColumnId = "completed";
        } else if (taskStatus === "In Progress") {
          boardColumnId = "in_progress";
        } else if (taskDate === todayStr) {
          boardColumnId = "today";
        } else {
          boardColumnId = "backlog";
        }

        const taskTitle = t.topic || t.title || "Study session";
        const taskType = t.task_type || "";
        const taskDesc = t.notes || t.description || (taskType ? `Type: ${taskType}` : "Study plan entry");
        const rawBlockId = t.block_id || "";
        const categoryVal = rawBlockId === "dsa" ? "DSA" : rawBlockId === "revision" ? "Revision" : rawBlockId === "b1" ? "Block 1" : rawBlockId === "b2" ? "Block 2" : (t.category || "General");

        const taskIdVal = t.taskId || t.taskid || `TSK-${String(idx + 1).padStart(3, "0")}`;

        return {
          id: `task_file_${idx}_${Date.now()}`,
          taskId: taskIdVal,
          taskid: taskIdVal,
          dashboardId: newDashId,
          subjectId,
          title: taskTitle,
          description: taskDesc,
          date: taskDate,
          category: categoryVal as any,
          status: taskStatus,
          priority: (t.priority || "Medium") as any,
          notes: t.notes || "",
          timeSpentMinutes: 0,
          timeLogs: [],
          attachments: [],
          boardColumnId,
        };
      });

      for (const task of createdTasks) {
        await saveUserTask(userId, task);
      }
    }

    await addHistoryLog(userId, {
      id: "hist_import_" + Date.now(),
      type: "action",
      action: "import_planner_files",
      description: `Imported and seeded new study plan "${newDashboard.name}" from CSV/JSON bundle.`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      dashboardId: newDashId,
      dashboard: newDashboard,
      subjects: createdSubjects,
      tasks: createdTasks,
    });
  } catch (err: any) {
    console.error("File Planner Import Failure:", err);
    res.status(500).json({ error: "Import failed: " + err.message });
  }
});

// AI Chat Endpoint with Function Calling (ACID compliant database operations)
app.post("/api/chat", handleChatbotRequest);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
