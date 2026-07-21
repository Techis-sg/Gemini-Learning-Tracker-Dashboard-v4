import React, { useState, useEffect } from "react";
import { Task, Subject } from "@/types";
import { IconPlus as Plus } from '@tabler/icons-react';
import { DatePicker, Modal, apiFetch, toast } from "@utils/index";
import { Select } from "@components/ui";
import { VALIDATION_LIMITS } from "@config/app.config";

interface AddTaskProps {
  isOpen: boolean;
  onClose: () => void;
  activeDashboardId: string;
  boardColumnId: Task["boardColumnId"];
  subjects: Subject[];
  initialDate?: string;
  onSuccess: () => void;
}

export default function AddTask({
  isOpen,
  onClose,
  activeDashboardId,
  boardColumnId,
  subjects,
  initialDate = new Date().toLocaleDateString("en-CA"),
  onSuccess,
}: AddTaskProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(initialDate);
  const [category, setCategory] = useState<Task["category"]>("Block 1 - GATE");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [subjectId, setSubjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({
    title: "",
    desc: "",
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

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDesc("");
      setDate(initialDate);
      setCategory("Block 1 - GATE");
      setPriority("Medium");
      setSubjectId("");
      setErrors({ title: "", desc: "" });
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    if (errors.title || errors.desc) return;

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/api/task", {
        method: "POST",
        body: JSON.stringify({
          dashboardId: activeDashboardId,
          title,
          description: desc,
          date,
          category,
          priority,
          subjectId: subjectId || undefined,
          boardColumnId,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");
      const addedTask = await response.json();

      toast.success(`Syllabus target "${addedTask.title}" added successfully!`);
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
      isOpen={isOpen}
      onClose={onClose}
      title="Add Task"
      icon={<Plus className="w-5 h-5 text-indigo-600" />}
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
              placeholder="e.g. Master Bayes theorem & conditional formulas"
              className={`w-full p-2.5 border bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm text-slate-800 text-xs font-semibold focus:outline-none placeholder-slate-400 ${
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
              placeholder="e.g. Focus on total probability, independent trials, solve 10 PYQs"
              className={`w-full h-20 p-2.5 border bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm font-mono text-slate-700 text-xs focus:outline-none placeholder-slate-400 ${
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
                label="Associate Subject Track"
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
                  { value: "High", label: "High Priority" },
                  { value: "Medium", label: "Medium Priority" },
                  { value: "Low", label: "Low Priority" },
                ]}
              />
            </div>
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
              {isSubmitting ? "Adding..." : "Add Task"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
