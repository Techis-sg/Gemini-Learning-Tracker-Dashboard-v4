import React, { useState, useEffect } from "react";
import { Task, Subject } from "@/types";
import { IconBorderHorizontal as SlidersHorizontal, IconTrash as Trash } from '@tabler/icons-react';
import { DatePicker, Modal, apiFetch, toast } from "@utils/index";
import { Select } from "@components/ui";
import { VALIDATION_LIMITS } from "@config/app.config";

interface EditTaskProps {
  task: Task | null;
  onClose: () => void;
  onSuccess: () => void;
  subjects: Subject[];
}

export default function EditTask({
  task,
  onClose,
  onSuccess,
  subjects,
}: EditTaskProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Task["category"]>("Block 1 - GATE");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState<Task["status"]>("Not Started");
  const [timeLogs, setTimeLogs] = useState<any[]>([]);

  // Local state for the "add new session" sub-form
  const [newLogDate, setNewLogDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [newLogMinutes, setNewLogMinutes] = useState(60);
  const [newLogNote, setNewLogNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    title: "",
    desc: "",
    newLogNote: "",
  });

  const handleTitleChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.TASK_TITLE_MAX);
    let errorMsg = "";
    if (!trimmed.trim()) {
      errorMsg = "Task title is required";
    } else if (trimmed.length >= VALIDATION_LIMITS.TASK_TITLE_MAX) {
      errorMsg = `Title reached maximum limit of ${VALIDATION_LIMITS.TASK_TITLE_MAX} characters`;
    }
    setErrors((prev) => ({ ...prev, title: errorMsg }));
    setTitle(trimmed);
  };

  const handleDescChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.TASK_NOTES_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.TASK_NOTES_MAX) {
      errorMsg = `Reached maximum ${VALIDATION_LIMITS.TASK_NOTES_MAX} characters limit`;
    }
    setErrors((prev) => ({ ...prev, desc: errorMsg }));
    setDesc(trimmed);
  };

  const handleNewLogNoteChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.TASK_DESC_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.TASK_DESC_MAX) {
      errorMsg = `Reached maximum ${VALIDATION_LIMITS.TASK_DESC_MAX} characters limit`;
    }
    setErrors((prev) => ({ ...prev, newLogNote: errorMsg }));
    setNewLogNote(trimmed);
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description || "");
      setDate(task.date);
      setCategory(task.category);
      setPriority(task.priority);
      setSubjectId(task.subjectId || "");
      setStatus(task.status);
      setTimeLogs(task.timeLogs || []);

      setNewLogDate(task.date || new Date().toLocaleDateString("en-CA"));
      setNewLogMinutes(60);
      setNewLogNote("");
    }
  }, [task]);

  if (!task) return null;

  const handleAddLogSession = () => {
    let loggedAtStr = new Date().toISOString();
    try {
      loggedAtStr = new Date(newLogDate).toISOString();
    } catch (e) {
      loggedAtStr = new Date().toISOString();
    }

    const newLog = {
      id: "log_" + Date.now(),
      minutes: Math.max(1, newLogMinutes),
      note: newLogNote,
      loggedAt: loggedAtStr,
    };

    setTimeLogs([...timeLogs, newLog]);
    setNewLogMinutes(60);
    setNewLogNote("");
  };

  const handleRemoveLog = (index: number) => {
    setTimeLogs(timeLogs.filter((_, i) => i !== index));
  };

  const handleLogChange = (index: number, field: string, value: any) => {
    const updated = [...timeLogs];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTimeLogs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    if (errors.title || errors.desc) return;

    setIsSubmitting(true);
    try {
      const totalMinutes = timeLogs.reduce((acc, curr) => acc + Number(curr.minutes || 0), 0);

      let nextCol = task.boardColumnId;
      if (status === "Completed") {
        nextCol = "completed";
      } else if (status === "In Progress") {
        if (nextCol !== "in_progress" && nextCol !== "revision") {
          nextCol = "in_progress";
        }
      } else {
        if (nextCol !== "backlog" && nextCol !== "today") {
          nextCol = "today";
        }
      }

      const updates = {
        title,
        description: desc,
        date,
        category,
        priority,
        subjectId: subjectId || undefined,
        status,
        timeSpentMinutes: totalMinutes,
        timeLogs,
        boardColumnId: nextCol,
      };

      const response = await apiFetch(`/api/task/${task.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update task");

      toast.success("Study target updated successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={task !== null}
      onClose={onClose}
      title="Edit Task"
      icon={<SlidersHorizontal className="w-5 h-5 text-indigo-600" />}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[9px] font-mono font-bold text-slate-400">
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`w-full p-2.5 border bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm text-slate-800 text-xs font-semibold focus:outline-none ${
                errors.title ? "border-rose-400 focus:border-rose-500" : "border-slate-200"
              }`}
              required
            />
            {errors.title && (
              <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                ⚠️ {errors.title}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Subtopics / Description:
              </label>
              <span className="text-[9px] font-mono font-bold text-slate-400">
                {desc.length}/250
              </span>
            </div>
            <textarea
              value={desc}
              onChange={(e) => handleDescChange(e.target.value)}
              className={`w-full h-20 p-2.5 border bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm font-mono text-slate-700 text-xs focus:outline-none ${
                errors.desc ? "border-rose-400 focus:border-rose-500" : "border-slate-200"
              }`}
            />
            {errors.desc && (
              <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                ⚠️ {errors.desc}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <DatePicker
                label="Task Date:"
                value={date}
                onChange={(dateStr) => setDate(dateStr)}
              />
            </div>

            <div>
              <Select
                label="Track Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                options={[
                  { value: "Block 1 - GATE", label: "Block 1 - Core Theory" },
                  { value: "Block 2 - Placements", label: "Block 2 - Projects / Applied" },
                  { value: "DSA", label: "DSA daily" },
                  { value: "General", label: "General Track" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Associated Subject Track"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                options={[
                  { value: "", label: "No subject association" },
                  ...subjects.map((s) => ({
                    value: s.id,
                    label: `📚 ${s.name}`
                  }))
                ]}
              />
            </div>

            <div>
              <Select
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                options={[
                  { value: "High", label: "🔴 High Priority" },
                  { value: "Medium", label: "🟡 Medium Priority" },
                  { value: "Low", label: "⚪ Low Priority" },
                ]}
              />
            </div>
          </div>

          <div>
            <Select
              label="Task State (Status)"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: "Not Started", label: "Not Started" },
                { value: "In Progress", label: "In Progress" },
                { value: "Completed", label: "Completed" },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-200 font-bold text-xs bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !!errors.title || !!errors.desc}
              className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
