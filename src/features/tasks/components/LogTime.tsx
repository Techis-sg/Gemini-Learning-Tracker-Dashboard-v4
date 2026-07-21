import React, { useState, useRef, useEffect } from "react";
import { Task, TimeLog, TaskAttachment } from "@/types";
import { 
  IconClock as Clock, 
  IconFileText as FileText, 
  IconPlus as Plus, 
  IconCheck as Check, 
  IconX as X,
  IconEdit as Edit,
  IconLoader2 as Loader2, 
  IconAlertCircle as AlertCircle, 
  IconTrash as Trash, 
  IconDownload as Download, 
  IconSend as Send 
} from '@tabler/icons-react';
import { Tooltip } from "@components/ui";
import { formatBytes, Modal, DatePicker, apiFetch, toast } from "@utils/index";
import { motion } from "motion/react";

interface LogTimeProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogTime({
  task: initialTask,
  onClose,
  onSuccess,
}: LogTimeProps) {
  const [currentTask, setCurrentTask] = useState<Task>(initialTask);

  useEffect(() => {
    setCurrentTask(initialTask);
  }, [initialTask]);

  const task = currentTask;

  const onUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await apiFetch(`/api/task/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update task");
      const updatedTask = await response.json();

      setCurrentTask(updatedTask);
      onSuccess();
    } catch (err: any) {
      toast.error("Error updating study session: " + err.message);
    }
  };

  const onAddAttachment = async (
    taskId: string,
    fileData: { fileName: string; mimeType: string; base64Data: string }
  ) => {
    try {
      const response = await apiFetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({
          taskId,
          fileName: fileData.fileName,
          mimeType: fileData.mimeType,
          base64Data: fileData.base64Data,
        }),
      });

      if (!response.ok) throw new Error("Failed to upload attachment");
      const attachment = await response.json();

      const updatedTask = {
        ...currentTask,
        attachments: [...(currentTask.attachments || []), attachment],
      };

      setCurrentTask(updatedTask);
      onSuccess();
      toast.success(`Material "${fileData.fileName}" uploaded successfully!`);
    } catch (err: any) {
      toast.error("Error uploading material: " + err.message);
    }
  };

  const [minutes, setMinutes] = useState<number | "">("");
  const [logNote, setLogNote] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  });
  const [logTime, setLogTime] = useState<string>(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`; // HH:MM
  });

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<"date" | "duration" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");

  // Inline editing state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingMinutes, setEditingMinutes] = useState<number>(0);
  const [editingNote, setEditingNote] = useState<string>("");
  const [editingDate, setEditingDate] = useState<string>("");
  const [editingTime, setEditingTime] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const numMinutes = Number(minutes);
    if (!minutes || numMinutes <= 0) return;

    let loggedAtIso = new Date().toISOString();
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      loggedAtIso = new Date(`${logDate}T${hh}:${mm}:00`).toISOString();
    } catch (err) {}

    const newLog: TimeLog = {
      id: "log_" + Date.now(),
      minutes: numMinutes,
      note: logNote || "Logged active study session.",
      loggedAt: loggedAtIso,
    };

    const updatedLogs = [...(task.timeLogs || []), newLog];
    const totalMinutes = updatedLogs.reduce((sum, log) => sum + log.minutes, 0);

    const updates: Partial<Task> = {
      timeLogs: updatedLogs,
      timeSpentMinutes: totalMinutes,
    };

    if (task.status === "Not Started") {
      updates.status = "In Progress";
      updates.boardColumnId = "in_progress";
    }

    onUpdateTask(task.id, updates);
    setLogNote("");
    setMinutes("");
    onClose();
  };

  const handleStartEdit = (log: TimeLog) => {
    setEditingLogId(log.id);
    setEditingMinutes(log.minutes);
    setEditingNote(log.note || "");
    try {
      const dt = new Date(log.loggedAt);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      setEditingDate(`${year}-${month}-${day}`);
      
      const hours = String(dt.getHours()).padStart(2, '0');
      const mins = String(dt.getMinutes()).padStart(2, '0');
      setEditingTime(`${hours}:${mins}`);
    } catch (e) {
      setEditingDate(new Date().toLocaleDateString("en-CA"));
      setEditingTime("12:00");
    }
  };

  const handleSaveEdit = (logId: string) => {
    const updatedLogs = (task.timeLogs || []).map((l) => {
      if (l.id === logId) {
        let loggedAtIso = l.loggedAt;
        try {
          const originalTime = l.loggedAt ? l.loggedAt.split("T")[1]?.substring(0, 5) || "12:00" : "12:00";
          loggedAtIso = new Date(`${editingDate}T${originalTime}`).toISOString();
        } catch (e) {}
        return {
          ...l,
          minutes: Number(editingMinutes) || 0,
          note: editingNote,
          loggedAt: loggedAtIso,
        };
      }
      return l;
    });

    const totalMinutes = updatedLogs.reduce((sum, log) => sum + log.minutes, 0);
    onUpdateTask(task.id, { timeLogs: updatedLogs, timeSpentMinutes: totalMinutes });
    setEditingLogId(null);
  };

  const handleDeleteLog = (logId: string) => {
    const updatedLogs = (task.timeLogs || []).filter((l) => l.id !== logId);
    const totalMinutes = updatedLogs.reduce((sum, log) => sum + log.minutes, 0);
    onUpdateTask(task.id, { timeLogs: updatedLogs, timeSpentMinutes: totalMinutes });
    setEditingLogId(null);
  };

  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  const formatLogOutTime = (isoString: string, duration: number) => {
    try {
      const date = new Date(isoString);
      const endDate = new Date(date.getTime() + duration * 60 * 1000);
      return endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  // Drag and Drop files handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processUploadedFile = (file: File) => {
    setUploadError(null);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const rawBase64 = base64.split(",")[1];

        onAddAttachment(task.id, {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data: rawBase64,
        });
      } catch (err: any) {
        setUploadError("Failed to upload: " + err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError("Error reading file.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    const updatedAttachments = task.attachments.filter((a) => a.id !== attachmentId);
    onUpdateTask(task.id, { attachments: updatedAttachments });
  };

  // Sorting and Filtering log entries
  const filteredAndSortedLogs = (task.timeLogs || [])
    .filter((log) => {
      if (dateFilter === "all") return true;
      const logDateObj = new Date(log.loggedAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        const logDay = new Date(logDateObj);
        logDay.setHours(0, 0, 0, 0);
        return logDay.getTime() === today.getTime();
      }
      if (dateFilter === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        return logDateObj >= sevenDaysAgo;
      }
      if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return logDateObj >= thirtyDaysAgo;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime();
      } else if (sortBy === "duration") {
        comparison = a.minutes - b.minutes;
      } else if (sortBy === "type") {
        comparison = (a.note || "").localeCompare(b.note || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Study Session Log & Notes Tracker"
      icon={<Clock className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />}
      maxWidthClass="max-w-2xl"
    >
      <p className="text-xs md:text-sm text-slate-500 font-medium mb-6 font-sans">
        Task: <span className="font-bold text-slate-800 underline">{task.title}</span> <span className="text-slate-400 font-mono">({task.category})</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Log study time and history */}
        <div className="space-y-5 font-sans">
          <div className="bg-indigo-50/40 border border-indigo-100/30 p-4 rounded-2xl shadow-sm">
            <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
              ⏱️ Log New Study Hours
            </h4>
            <form onSubmit={(e) => { e.preventDefault(); handleLogSubmit(); }} className="space-y-3.5">
              <div>
                <DatePicker
                  label="Select Study Date:"
                  value={logDate}
                  onChange={(dateStr) => setLogDate(dateStr)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Study Duration (Minutes):
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setMinutes("");
                      } else {
                        setMinutes(Math.max(0, parseInt(val) || 0));
                      }
                    }}
                    placeholder="Min"
                    className="w-16 p-2 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-xs font-mono font-bold text-slate-800 rounded-xl focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[30, 45, 60, 90].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinutes(m)}
                        className={`px-2.5 py-1.5 border rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          minutes === m
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Session Achievements / Study Notes:
                </label>
                <input
                  type="text"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="e.g., Finished 5 PYQs with 90% accuracy."
                  className="w-full p-2.5 border border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-xs font-semibold text-slate-800 rounded-xl focus:outline-none placeholder-slate-400"
                />
              </div>
            </form>
          </div>

          {/* Historical list */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-xs flex items-center justify-between">
              <span>📊 Session History</span>
              <span className="font-mono text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-lg font-bold shadow-sm">
                Total: {task.timeSpentMinutes} mins
              </span>
            </h4>

            {/* Sort & Filter Panel */}
            <div className="flex flex-wrap gap-2 items-center justify-between mb-2.5 bg-slate-100/60 p-2 rounded-xl border border-slate-200/50">
              <div className="flex gap-1 items-center">
                <span className="text-[9px] font-bold font-mono text-slate-400 mr-1">FILTER:</span>
                <button
                  type="button"
                  onClick={() => setDateFilter("all")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                    dateFilter === "all" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter("today")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                    dateFilter === "today" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter("7days")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                    dateFilter === "7days" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  7d
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter("30days")}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                    dateFilter === "30days" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  30d
                </button>
              </div>

              <div className="flex gap-1 items-center">
                <span className="text-[9px] font-bold font-mono text-slate-400 mr-1">SORT:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (sortBy === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortBy("date"); setSortOrder("desc"); }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                    sortBy === "date" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sortBy === "duration") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortBy("duration"); setSortOrder("desc"); }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
                    sortBy === "duration" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Mins {sortBy === "duration" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl max-h-[160px] overflow-y-auto bg-slate-50/50 p-2.5 space-y-2">
              {filteredAndSortedLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-mono italic">
                  No active hours logged yet.
                </div>
              ) : (
                filteredAndSortedLogs.map((log) => {
                  const isEditing = editingLogId === log.id;
                  if (isEditing) {
                    return (
                      <div key={log.id} className="p-3 rounded-xl bg-white border border-indigo-200 shadow-sm space-y-2.5">
                        <div>
                          <DatePicker
                            label="Date:"
                            value={editingDate}
                            onChange={(dateStr) => setEditingDate(dateStr)}
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-16 shrink-0">
                            <label className="block text-[8px] font-bold text-slate-500 font-mono">MINUTES:</label>
                            <input
                              type="number"
                              value={editingMinutes}
                              onChange={(e) => setEditingMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                              className="w-full p-1 border border-slate-200 rounded text-[11px] font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[8px] font-bold text-slate-500 font-mono">ACHIEVEMENT NOTE:</label>
                            <input
                              type="text"
                              value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              className="w-full p-1 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                          <Tooltip content="Delete session log" position="top">
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer flex items-center justify-center transition-colors"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <button
                            type="button"
                            onClick={() => setEditingLogId(null)}
                            className="px-2 py-1 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(log.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Tooltip key={log.id} content="Click to Edit session details" position="top">
                      <div 
                        onClick={() => handleStartEdit(log)}
                        className="relative group p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer"
                      >
                        {/* Displays minutes and date simply */}
                        <div className="flex justify-between items-center font-mono font-bold text-xs text-slate-700">
                          <span className="text-indigo-600 flex items-center gap-1">⏱️ {log.minutes} mins</span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(log.loggedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>

                        {log.note && <p className="text-slate-500 text-xs mt-1 font-medium">{log.note}</p>}
                      </div>
                    </Tooltip>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Document upload */}
        <div className="space-y-5">
          {/* Document Attachments Drag and Drop Upload */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider font-mono">
              📂 Task Attachments (MD, CSV, PDF, Spreadsheets, Images):
            </label>

            {uploadError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-2 mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
              </div>
            )}

            {/* Drag and Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all mb-3 ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/30"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  Uploading file...
                </div>
              ) : (
                <div className="text-xs text-slate-700 font-bold flex flex-col items-center py-2">
                  <span>Drag files here or click to browse</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium animate-pulse">Supports PDF, XLSX, CSV, PNG, JPG, MD</span>
                </div>
              )}
            </div>

            {/* Attachments List */}
            <div className="border border-slate-100 rounded-2xl p-2 bg-slate-50/50 max-h-[140px] overflow-y-auto space-y-1.5">
              {task.attachments && task.attachments.length > 0 ? (
                task.attachments.map((attach) => (
                  <div
                    key={attach.id}
                    className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-1.5 text-xs font-mono shadow-sm hover:border-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-bold text-slate-700 truncate" title={attach.name}>
                        {attach.name}
                      </span>
                      <span className="text-[10px] text-slate-400">({formatBytes(attach.size)})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip content="Download / View document" position="top">
                        <a
                          href={attach.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-slate-50 border border-slate-200 bg-white rounded-lg transition-all inline-block"
                        >
                          <Download className="w-3 h-3 text-slate-600" />
                        </a>
                      </Tooltip>
                      <Tooltip content="Remove attachment" position="top">
                        <button
                          onClick={() => handleDeleteAttachment(attach.id)}
                          className="p-1 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 bg-white rounded-lg transition-all cursor-pointer"
                        >
                          <Trash className="w-3 h-3 text-rose-500" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[10px] text-slate-400 font-mono italic">
                  No attachments uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action controls */}
      <div className="flex gap-2.5 justify-end pt-5 mt-4 border-t border-slate-100">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-slate-200 font-bold text-xs bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => handleLogSubmit()}
          disabled={!minutes || Number(minutes) <= 0}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          Log Time
        </button>
      </div>
    </Modal>
  );
}
