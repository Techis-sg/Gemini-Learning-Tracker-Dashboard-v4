import { GoogleGenAI, Type } from "@google/genai";
import {
  fetchUserDashboardData,
  saveUserTask,
  deleteUserTask,
  saveUserSubject,
  addHistoryLog,
  getUserProfile,
  saveUserProfile,
} from "../../../db";
import { Task, Subject } from "../../../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContentWithFallback(params: any): Promise<any> {
  try {
    return await ai.models.generateContent({
      model: "gemini-3.6-flash",
      ...params,
    });
  } catch (err: any) {
    console.warn("Primary gemini-3.6-flash error, trying fallback model:", err?.message || err);
    try {
      const fallbackParams = { ...params, model: "gemini-2.5-flash" };
      return await ai.models.generateContent(fallbackParams);
    } catch (fallbackErr: any) {
      console.error("All Gemini models failed:", fallbackErr?.message || fallbackErr);
      throw fallbackErr;
    }
  }
}

function normalizeTaskId(str: string | undefined | null): string {
  if (!str) return "";
  let clean = str.trim().toUpperCase().replace(/[\s\-_]+/g, "");
  if (clean.startsWith("TASK")) {
    clean = "TSK" + clean.slice(4);
  }
  const match = clean.match(/^TSK(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `TSK${String(num).padStart(3, "0")}`;
  }
  return clean;
}

function findTaskByQuery(query: string | undefined | null, currentTasks: Task[]): { match?: Task; suggestion?: Task; searchedQuery: string } {
  if (!query || !query.trim()) return { searchedQuery: query || "" };
  const q = query.trim();
  const normQ = normalizeTaskId(q);

  // 1. Direct ID or normalized Task ID match (e.g. TSk-003, tsk-003, Tsk 3, task 003 -> TSK-003)
  let match = currentTasks.find((t, idx) => {
    if (t.id === q) return true;
    const tTaskId = t.taskId || t.taskid || `TSK-${String(idx + 1).padStart(3, "0")}`;
    if (tTaskId && (normalizeTaskId(tTaskId) === normQ || tTaskId.toLowerCase() === q.toLowerCase())) return true;
    return false;
  });
  if (match) return { match, searchedQuery: q };

  // 2. Exact Title match or Substring match
  const lowerQ = q.toLowerCase();
  match = currentTasks.find(t => t.title.toLowerCase().trim() === lowerQ);
  if (match) return { match, searchedQuery: q };

  match = currentTasks.find(t => t.title.toLowerCase().includes(lowerQ));
  if (match) return { match, searchedQuery: q };

  // 3. Extract numbers and check for close Task ID matches (e.g. if user wrote LIC-333 or Task 333, check if TSK-333 exists)
  const numMatch = q.match(/\d+/);
  if (numMatch) {
    const extractedNum = parseInt(numMatch[0], 10);
    const candidate = currentTasks.find((t, idx) => {
      const tTaskId = t.taskId || t.taskid || `TSK-${String(idx + 1).padStart(3, "0")}`;
      const tNumMatch = tTaskId.match(/\d+/);
      if (tNumMatch && parseInt(tNumMatch[0], 10) === extractedNum) return true;
      return false;
    });
    if (candidate) {
      return { suggestion: candidate, searchedQuery: q };
    }
  }

  return { searchedQuery: q };
}

export async function handleChatbotRequest(req: any, res: any) {
  try {
    const userId = (req.headers["x-user-id"] as string) || "demo-user";
    const { messages, activeDashboardId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages payload." });
    }

    // 1. Security Check: User Blocked
    const userProfile = await getUserProfile(userId);
    if (userProfile?.isBlocked) {
      return res.status(403).json({
        blocked: true,
        error: "Your account is blocked for misuse. Contact administrator: support@studybuddy.com",
        content: "❌ Your account is blocked for misuse. Please contact administrator: support@studybuddy.com"
      });
    }

    const warningsCount = userProfile?.warningsCount || 0;
    const latestUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : "";

    // 2. Fast local security firewall checks
    const hasScriptHtml = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(latestUserMessage) ||
                          /javascript:/gi.test(latestUserMessage) ||
                          /\b(eval|onload|onerror|onclick|onmouseover)\b/gi.test(latestUserMessage);
    const hasSQLPattern = /\b(select\s+.*\s+from|union\s+select|insert\s+into|delete\s+from|drop\s+table|alter\s+table)\b/gi.test(latestUserMessage);
    const hasPhishingKeywords = /\b(password\s*reset|verify\s*your\s*account|login\s*credentials|bank\s*details|credit\s*card)\b/gi.test(latestUserMessage);
    const hasPromptInjection = /ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|reveal\s+instructions|jailbreak/gi.test(latestUserMessage);

    const isMalicious = hasScriptHtml || hasSQLPattern || hasPhishingKeywords || hasPromptInjection;

    if (isMalicious) {
      const newWarningsCount = warningsCount + 1;
      const isNowBlocked = newWarningsCount >= 3;

      const updatedProfile = {
        ...userProfile,
        warningsCount: newWarningsCount,
        isBlocked: isNowBlocked,
        id: userId,
      };
      await saveUserProfile(userId, updatedProfile);

      if (isNowBlocked) {
        return res.status(403).json({
          blocked: true,
          warningsCount: newWarningsCount,
          error: "Your account is blocked for misuse. Contact administrator: support@studybuddy.com",
          content: "❌ Access Blocked. Your account has been suspended due to 3 security violations. Please contact support@studybuddy.com for assistance."
        });
      } else {
        return res.json({
          warningsCount: newWarningsCount,
          isWarning: true,
          content: `⚠️ SAFETY WARNING: Your message has triggered our security firewall (Rule: Phishing/Script/OWASP/Abusive content prohibited). Warning count: ${newWarningsCount}/3. On the 3rd warning, your account will be permanently blocked.`
        });
      }
    }

    const dbData = await fetchUserDashboardData(userId);
    const activeDashboard = dbData.dashboards.find(d => d.id === activeDashboardId) || dbData.dashboards[0];

    if (!activeDashboard) {
      return res.status(404).json({ error: "No active dashboard found." });
    }

    const currentSubjects = dbData.subjects[activeDashboard.id] || [];
    const currentTasks = dbData.tasks[activeDashboard.id] || [];

    // Provide FULL index of all workspace tasks with taskId to the AI model
    const allWorkspaceTasks = currentTasks.map((t, idx) => ({
      id: t.id,
      taskId: t.taskId || t.taskid || `TSK-${String(idx + 1).padStart(3, "0")}`,
      title: t.title,
      date: t.date,
      status: t.status,
      priority: t.priority,
      category: t.category,
      column: t.boardColumnId,
      timeSpentMinutes: t.timeSpentMinutes,
    }));

    const systemInstruction = `
You are the StudyOS AI Copilot (Gemini 3.6 Flash), a highly intelligent personal study and workspace preparation assistant.
You manage the active study plan workspace: "${activeDashboard.name}".
You can view, create, update, or delete tasks and subjects in real-time using tools.

Current Workspace State:
- Active Plan Description: ${activeDashboard.description}
- Active Plan Targets: ${activeDashboard.target}
- Active Plan Status Overview: ${activeDashboard.statusOverview}
- Active Subjects (Total: ${currentSubjects.length}):
${JSON.stringify(currentSubjects.map(s => ({ id: s.id, name: s.name, block: s.block, daysPlanned: s.daysPlanned, status: s.status, percentage: s.percentage, resource: s.resource })))}
- All Workspace Tasks (Total: ${currentTasks.length}):
${JSON.stringify(allWorkspaceTasks)}

CRITICAL TASK MATCHING & TASK ID DIRECTIVES:
1. TASK ID MATCHING & FLEXIBILITY:
   - Every task has a primary Task ID formatted as "TSK-001", "TSK-002", "TSK-003", etc.
   - Users may refer to task IDs with variations in capitalization, spacing, hyphenation, or prefix (e.g., "TSk-003", "tsk-003", "TSK 003", "Tsk 3", "task 3", "tsk003", "task-003"). ALL OF THESE refer to "TSK-003"!
   - Always map user task references to their corresponding Task ID or exact task title from "All Workspace Tasks".
2. HANDLING NON-EXISTENT TASK IDs (e.g. LIC-333 or TSK-999):
   - If a user mentions a task ID or task name that DOES NOT EXIST in "All Workspace Tasks" (e.g. "LIC-333"):
     - DO NOT call create_task!
     - DO NOT fabricate updates or pretend the task was updated!
     - Respond directly to the user indicating that no task with ID "LIC-333" exists in their workspace.
     - If a task with a matching number exists (e.g. TSK-333 exists when user typed LIC-333), explicitly ask: "No task with ID LIC-333 was found in your workspace. Did you mean TSK-333 ('<title>')?"
3. NEVER CREATE DUPLICATE TASKS:
   - Before calling create_task, verify if the user is referring to an existing task or Task ID. If a match exists, call \`update_task\` using its exact id or taskId!
4. LOGGING TIME ON PAST DATES:
   - When a user asks to log time spent across past dates (e.g. 5 hours from June 6 to June 10, distributed 1 hour per day), pass a \`timeLogs\` array to \`update_task\` with individual date entries:
     [
       { "date": "2026-06-06", "minutes": 60, "note": "1h study log" },
       { "date": "2026-06-07", "minutes": 60, "note": "1h study log" }
     ]
   - Set \`status: "Completed"\`.
5. Clear & Concise Responses: Confirm performed actions clearly and state total study time logged.
6. Security & Isolation: Operate strictly in user ${userId}.
`;

    const functionDeclarations = [
      {
        name: "create_task",
        description: "Creates a new task ONLY IF a task with the same title does NOT already exist.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The title of the task" },
            description: { type: Type.STRING, description: "Descriptive details about the task" },
            date: { type: Type.STRING, description: "The date of the task in YYYY-MM-DD format" },
            priority: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "The priority of the task" },
            category: { type: Type.STRING, description: "The category/block of the task" },
            subjectName: { type: Type.STRING, description: "Optional name of an existing subject to link" },
            loggedTimeMinutes: { type: Type.NUMBER, description: "Optional initial study time in minutes" },
          },
          required: ["title"],
        },
      },
      {
        name: "update_task",
        description: "Updates an existing task's attributes including status, priority, date, notes, or logging study time across dates.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "The unique ID of the task to update (or task title fallback)" },
            taskTitle: { type: Type.STRING, description: "Optional task title if ID is not available" },
            title: { type: Type.STRING, description: "New title for the task" },
            description: { type: Type.STRING, description: "New description for the task" },
            status: { type: Type.STRING, enum: ["Not Started", "In Progress", "Completed"], description: "The status of the task" },
            priority: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "The priority level" },
            notes: { type: Type.STRING, description: "Additional study notes" },
            date: { type: Type.STRING, description: "The task date in YYYY-MM-DD format" },
            loggedTimeMinutes: { type: Type.NUMBER, description: "Total minutes to log for this task" },
            timeLogs: {
              type: Type.ARRAY,
              description: "Detailed array of time logs for specific past or present dates",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "YYYY-MM-DD date" },
                  minutes: { type: Type.NUMBER, description: "Minutes studied" },
                  note: { type: Type.STRING, description: "Optional log note" },
                },
                required: ["minutes"],
              },
            },
          },
        },
      },
      {
        name: "delete_task",
        description: "Permanently deletes a task by its ID or title",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "The task ID to delete" },
            taskTitle: { type: Type.STRING, description: "Optional task title match to delete" },
          },
        },
      },
      {
        name: "create_subject",
        description: "Creates a new subject module in the active study track",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The unique name of the subject" },
            block: { type: Type.STRING, enum: ["Block 1 - GATE", "Block 2 - Placements", "DSA"], description: "The block category" },
            daysPlanned: { type: Type.NUMBER, description: "Estimated study days planned" },
            resource: { type: Type.STRING, description: "Primary reference books or video channels" },
          },
          required: ["name", "block"],
        },
      },
    ];

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await generateContentWithFallback({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations }] as any,
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const executedActions: string[] = [];

      for (const call of functionCalls) {
        const { name, args } = call;

        try {
          if (name === "create_task") {
            const requestedTitle = ((args as any).title || "").trim();
            
            // Check if title or query matches an existing task by Task ID or Title
            const { match: existingMatch } = findTaskByQuery(requestedTitle, currentTasks);

            if (existingMatch) {
              // Redirect create_task -> update_task on existing task!
              let newTimeSpent = existingMatch.timeSpentMinutes || 0;
              let newTimeLogs = [...(existingMatch.timeLogs || [])];

              const customLogs = (args as any).timeLogs;
              if (Array.isArray(customLogs) && customLogs.length > 0) {
                for (const item of customLogs) {
                  const m = Number(item.minutes) || 0;
                  if (m > 0) {
                    newTimeSpent += m;
                    newTimeLogs.push({
                      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                      minutes: m,
                      note: item.note || `Logged ${m}m via AI Copilot`,
                      loggedAt: item.date ? `${item.date}T12:00:00.000Z` : new Date().toISOString(),
                    });
                  }
                }
              } else {
                const loggedMins = Number((args as any).loggedTimeMinutes);
                if (!isNaN(loggedMins) && loggedMins > 0) {
                  newTimeSpent += loggedMins;
                  newTimeLogs.push({
                    id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                    minutes: loggedMins,
                    note: `Logged ${loggedMins}m via AI Copilot`,
                    loggedAt: (args as any).date ? `${(args as any).date}T12:00:00.000Z` : new Date().toISOString(),
                  });
                }
              }

              const updatedTask: Task = {
                ...existingMatch,
                status: "Completed",
                boardColumnId: "completed",
                timeSpentMinutes: newTimeSpent,
                timeLogs: newTimeLogs,
              };

              await saveUserTask(userId, updatedTask);
              const formattedId = existingMatch.taskId || existingMatch.taskid || existingMatch.id;
              executedActions.push(`Updated existing task ${formattedId} ("${existingMatch.title}") to Completed (Logged ${newTimeSpent}m)`);
            } else {
              // Create brand new task
              const taskDate = (args as any).date || new Date().toISOString().split("T")[0];
              const taskCategory = (args as any).category || "General";
              const taskPriority = (args as any).priority || "Medium";

              let subjectId = undefined;
              if ((args as any).subjectName) {
                const match = currentSubjects.find(s => s.name.toLowerCase().includes((args as any).subjectName.toLowerCase()));
                if (match) subjectId = match.id;
              }

              const todayStr = new Date().toISOString().split("T")[0];
              let boardColumnId: Task["boardColumnId"] = taskDate === todayStr ? "today" : "backlog";

              let initialMinutes = Number((args as any).loggedTimeMinutes) || 0;
              let initialTimeLogs: any[] = [];
              const customLogs = (args as any).timeLogs;
              if (Array.isArray(customLogs) && customLogs.length > 0) {
                for (const item of customLogs) {
                  const m = Number(item.minutes) || 0;
                  if (m > 0) {
                    initialMinutes += m;
                    initialTimeLogs.push({
                      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                      minutes: m,
                      note: item.note || `Logged ${m}m via AI Copilot`,
                      loggedAt: item.date ? `${item.date}T12:00:00.000Z` : new Date().toISOString(),
                    });
                  }
                }
              }

              const seqCount = currentTasks.length + 1;
              const seqTaskId = (args as any).taskId || (args as any).taskid || `TSK-${String(seqCount).padStart(3, "0")}`;

              const newTask: Task = {
                id: "task_ai_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                taskId: seqTaskId,
                taskid: seqTaskId,
                dashboardId: activeDashboard.id,
                subjectId,
                title: requestedTitle,
                description: (args as any).description || "",
                date: taskDate,
                category: taskCategory as any,
                status: initialMinutes > 0 ? "Completed" : "Not Started",
                priority: taskPriority as any,
                notes: "",
                timeSpentMinutes: initialMinutes,
                timeLogs: initialTimeLogs,
                attachments: [],
                boardColumnId: initialMinutes > 0 ? "completed" : boardColumnId,
              };

              await saveUserTask(userId, newTask);
              executedActions.push(`Created task ${seqTaskId}: "${requestedTitle}"`);
            }
          } else if (name === "update_task") {
            const targetQuery = (args as any).id || (args as any).taskId || (args as any).taskTitle || (args as any).title;
            const { match: existing, suggestion, searchedQuery } = findTaskByQuery(targetQuery, currentTasks);

            if (!existing) {
              if (suggestion) {
                const suggId = suggestion.taskId || suggestion.taskid || suggestion.id;
                executedActions.push(`⚠️ No task with ID/Title "${searchedQuery}" was found. Did you mean ${suggId} ("${suggestion.title}")?`);
              } else {
                executedActions.push(`❌ No task matching "${searchedQuery}" exists in your active workspace.`);
              }
            } else {
              let newTimeSpent = existing.timeSpentMinutes || 0;
              let newTimeLogs = [...(existing.timeLogs || [])];

              const customLogs = (args as any).timeLogs;
              if (Array.isArray(customLogs) && customLogs.length > 0) {
                for (const item of customLogs) {
                  const m = Number(item.minutes) || 0;
                  if (m > 0) {
                    newTimeSpent += m;
                    newTimeLogs.push({
                      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                      minutes: m,
                      note: item.note || `Logged ${m}m via AI Copilot`,
                      loggedAt: item.date ? `${item.date}T12:00:00.000Z` : new Date().toISOString(),
                    });
                  }
                }
              }

              const loggedMins = Number((args as any).loggedTimeMinutes);
              if (!isNaN(loggedMins) && loggedMins > 0 && (!Array.isArray(customLogs) || customLogs.length === 0)) {
                newTimeSpent += loggedMins;
                newTimeLogs.push({
                  id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                  minutes: loggedMins,
                  note: `Logged ${loggedMins}m via AI Copilot`,
                  loggedAt: (args as any).date ? `${(args as any).date}T12:00:00.000Z` : new Date().toISOString(),
                });
              }

              const newStatus = (args as any).status !== undefined ? (args as any).status : existing.status;

              const updatedTask: Task = {
                ...existing,
                title: (args as any).title !== undefined ? (args as any).title : existing.title,
                description: (args as any).description !== undefined ? (args as any).description : existing.description,
                status: newStatus,
                priority: (args as any).priority !== undefined ? (args as any).priority : existing.priority,
                notes: (args as any).notes !== undefined ? (args as any).notes : existing.notes,
                date: (args as any).date !== undefined ? (args as any).date : existing.date,
                timeSpentMinutes: newTimeSpent,
                timeLogs: newTimeLogs,
              };

              if (newStatus === "Completed") {
                updatedTask.boardColumnId = "completed";
              } else if (newStatus === "In Progress") {
                updatedTask.boardColumnId = "in_progress";
              } else if (newStatus === "Not Started") {
                const todayStr = new Date().toISOString().split("T")[0];
                if (updatedTask.date === todayStr) {
                  updatedTask.boardColumnId = "today";
                } else {
                  updatedTask.boardColumnId = "backlog";
                }
              }

              await saveUserTask(userId, updatedTask);
              const formattedId = existing.taskId || existing.taskid || existing.id;
              executedActions.push(`Updated task ${formattedId} ("${updatedTask.title}") -> Status: ${newStatus}, Total Logged: ${newTimeSpent}m`);
            }
          } else if (name === "delete_task") {
            const targetQuery = (args as any).id || (args as any).taskId || (args as any).taskTitle;
            const { match: existing, suggestion, searchedQuery } = findTaskByQuery(targetQuery, currentTasks);

            if (existing) {
              await deleteUserTask(userId, existing.id);
              const formattedId = existing.taskId || existing.taskid || existing.id;
              executedActions.push(`Deleted task ${formattedId} ("${existing.title}")`);
            } else if (suggestion) {
              const suggId = suggestion.taskId || suggestion.taskid || suggestion.id;
              executedActions.push(`⚠️ Task "${searchedQuery}" not found. Did you mean ${suggId} ("${suggestion.title}")?`);
            } else {
              executedActions.push(`❌ Task "${searchedQuery}" does not exist in active workspace.`);
            }
          } else if (name === "create_subject") {
            const newSubject: Subject = {
              id: "subj_ai_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
              dashboardId: activeDashboard.id,
              name: (args as any).name,
              block: (args as any).block || "DSA",
              daysPlanned: Number((args as any).daysPlanned) || 10,
              timeline: "Upcoming",
              status: "Not Started",
              percentage: 0,
              pendingTopics: "Syllabus topics",
              completedTopics: "",
              weightage: "Unknown",
              resource: (args as any).resource || "",
            };

            await saveUserSubject(userId, newSubject);
            executedActions.push(`Created subject: "${(args as any).name}"`);
          }
        } catch (taskErr: any) {
          console.warn("Error processing AI tool action:", taskErr);
        }

        await addHistoryLog(userId, {
          id: "hist_ai_" + Date.now(),
          type: "action",
          action: "ai_chat_execution",
          description: `AI Chat executed: ${name}.`,
          timestamp: new Date().toISOString(),
        });
      }

      // Re-query updated tasks to generate accurate final response
      const finalContents = [
        ...contents,
        {
          role: "model",
          parts: [{ text: `Executed actions and feedback: ${JSON.stringify(executedActions)}` }],
        },
        {
          role: "user",
          parts: [{ text: "Respond appropriately based on the action results above. If an action failed or a task was missing (marked with ❌ or ⚠️), clearly inform the user and suggest the correct task ID if available. Otherwise confirm success." }],
        },
      ];

      const finalResponse = await generateContentWithFallback({
        model: "gemini-3.6-flash",
        contents: finalContents,
        config: { systemInstruction },
      });

      return res.json({
        content: finalResponse.text || `Done! ${executedActions.join(", ")}`,
        actions: executedActions,
      });
    }

    return res.json({
      content: response.text || "I have reviewed your request.",
      actions: [],
    });
  } catch (err: any) {
    console.error("AI Chat handler error:", err);
    return res.status(500).json({ error: err.message || "Failed to process chat request." });
  }
}
