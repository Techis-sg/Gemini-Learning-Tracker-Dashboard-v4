import React, { useState, useEffect } from "react";
import { IconEdit as Edit2, IconPlus as Plus, IconX as X } from "@tabler/icons-react";
import { Select } from "@components/ui";
import { VALIDATION_LIMITS } from "@config/app.config";
import { Modal, apiFetch, toast } from "@utils/index";
import { validateResource, formatResourceToSave, parseResource } from "../utils/resourceUtils";
import { Subject } from "@/types";

interface UpdateSubjectProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  activeDashboardId: string;
  onSuccess: () => void;
}

export default function UpdateSubject({
  isOpen,
  onClose,
  subject,
  activeDashboardId,
  onSuccess,
}: UpdateSubjectProps) {
  // Form states
  const [editName, setEditName] = useState("");
  const [editBlock, setEditBlock] = useState<string>('Block 1 - GATE');
  const [editDays, setEditDays] = useState(10);
  const [editTimeline, setEditTimeline] = useState("");
  const [editWeightage, setEditWeightage] = useState("");
  const [editPending, setEditPending] = useState("");
  const [editCompleted, setEditCompleted] = useState("");
  const [editPercentage, setEditPercentage] = useState(0);
  const [editResources, setEditResources] = useState<string[]>([]);
  
  const [editResourceType, setEditResourceType] = useState<"video" | "textbook" | "link">("link");
  const [editResourceVal, setEditResourceVal] = useState("");
  const [editResourceError, setEditResourceError] = useState("");

  const [editErrors, setEditErrors] = useState({
    name: "",
    timeline: "",
    weightage: "",
    pending: "",
    completed: "",
  });

  // Populate form fields when subject changes
  useEffect(() => {
    if (subject) {
      setEditName(subject.name);
      setEditBlock(subject.block);
      setEditDays(subject.daysPlanned);
      setEditTimeline(subject.timeline || "");
      setEditWeightage(subject.weightage || "");
      setEditPending(subject.pendingTopics || "");
      setEditCompleted(subject.completedTopics || "");
      setEditPercentage(subject.percentage || 0);

      const splitRes = subject.resource
        ? subject.resource.split(",").map(r => r.trim()).filter(Boolean)
        : [];
      setEditResources(splitRes);
      
      setEditResourceType("link");
      setEditResourceVal("");
      setEditResourceError("");
      setEditErrors({ name: "", timeline: "", weightage: "", pending: "", completed: "" });
    }
  }, [subject]);

  const handleEditNameChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_NAME_MAX);
    let errorMsg = "";
    if (!trimmed.trim()) {
      errorMsg = "Subject name is required";
    } else if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_NAME_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_NAME_MAX} characters allowed`;
    }
    setEditErrors((prev) => ({ ...prev, name: errorMsg }));
    setEditName(trimmed);
  };

  const handleEditTimelineChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_TIMELINE_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_TIMELINE_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_TIMELINE_MAX} characters allowed`;
    }
    setEditErrors((prev) => ({ ...prev, timeline: errorMsg }));
    setEditTimeline(trimmed);
  };

  const handleEditWeightageChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_WEIGHTAGE_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_WEIGHTAGE_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_WEIGHTAGE_MAX} characters allowed`;
    }
    setEditErrors((prev) => ({ ...prev, weightage: errorMsg }));
    setEditWeightage(trimmed);
  };

  const handleEditPendingChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_PENDING_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_PENDING_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_PENDING_MAX} characters allowed`;
    }
    setEditErrors((prev) => ({ ...prev, pending: errorMsg }));
    setEditPending(trimmed);
  };

  const handleEditCompletedChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_PENDING_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_PENDING_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_PENDING_MAX} characters allowed`;
    }
    setEditErrors((prev) => ({ ...prev, completed: errorMsg }));
    setEditCompleted(trimmed);
  };

  const handleRemoveEditResource = (idx: number) => {
    setEditResources(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEditResourceCustom = () => {
    const err = validateResource(editResourceType, editResourceVal);
    if (err) {
      setEditResourceError(err);
      return;
    }
    const formatted = formatResourceToSave(editResourceType, editResourceVal);
    setEditResources((prev) => [...prev.filter(Boolean), formatted]);
    setEditResourceVal("");
    setEditResourceError("");
  };

  const submitEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;
    if (!editName.trim() || editErrors.name || editErrors.timeline || editErrors.weightage || editErrors.pending || editErrors.completed) {
      return;
    }

    const compiledResource = editResources
      .map(r => r.trim())
      .filter(Boolean)
      .join(", ");

    try {
      const response = await apiFetch(`/api/subject/${activeDashboardId}/${subject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          block: editBlock,
          daysPlanned: Number(editDays),
          timeline: editTimeline,
          pendingTopics: editPending,
          completedTopics: editCompleted,
          weightage: editWeightage,
          resource: compiledResource,
          percentage: Number(editPercentage),
          status: Number(editPercentage) === 100 ? "Completed" : Number(editPercentage) > 0 ? "In Progress" : "Not Started",
        }),
      });

      if (!response.ok) throw new Error("Failed to update subject track");

      toast.success("Subject track configurations updated!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error updating subject: " + err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Subject Track"
      icon={<Edit2 className="w-5 h-5 text-indigo-600" />}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={submitEditSubject} className="space-y-5">
        {/* CATEGORY 1: Core Track Information */}
        <div className="space-y-3.5 pb-4 border-b border-slate-100">
          <span className="block text-[10px] font-extrabold text-indigo-600 font-mono tracking-widest uppercase">
            I. Core Track Information
          </span>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Subject Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[9px] font-mono font-bold text-slate-400">
                {editName.length}/40
              </span>
            </div>
            <input
              type="text"
              value={editName}
              onChange={(e) => handleEditNameChange(e.target.value)}
              className={`w-full p-2.5 border bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm text-slate-800 text-xs font-semibold focus:outline-none ${
                editErrors.name ? "border-rose-400 focus:border-rose-500" : "border-slate-200"
              }`}
              required
            />
            {editErrors.name && (
              <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                ⚠️ {editErrors.name}
              </p>
            )}
          </div>

          <div>
            <Select
              label="Study Track Block"
              value={editBlock}
              onChange={(e: any) => setEditBlock(e.target.value)}
              options={[
                { value: "Block 1 - GATE", label: "Block 1 - Core Theory" },
                { value: "Block 2 - Placements", label: "Block 2 - Projects / Applied" },
                { value: "DSA", label: "DSA & Programming" },
              ]}
            />
          </div>
        </div>

        {/* CATEGORY 2: Planning & Timeline Parameters */}
        <div className="space-y-3.5 pb-4 border-b border-slate-100">
          <span className="block text-[10px] font-extrabold text-indigo-600 font-mono tracking-widest uppercase">
            II. Planning & Timeline Parameters
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono tracking-wider">
                Days Allocated:
              </label>
              <input
                type="number"
                value={editDays}
                onChange={(e) => setEditDays(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 border border-slate-200 text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-mono font-bold"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Timeline Span:
                </label>
                <span className="text-[8px] font-mono text-slate-400">{editTimeline.length}/30</span>
              </div>
              <input
                type="text"
                value={editTimeline}
                onChange={(e) => handleEditTimelineChange(e.target.value)}
                className={`w-full p-2.5 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold ${
                  editErrors.timeline ? "border-rose-400" : "border-slate-200"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Syllabus Weightage Marks:
                </label>
                <span className="text-[8px] font-mono text-slate-400">{editWeightage.length}/20</span>
              </div>
              <input
                type="text"
                value={editWeightage}
                onChange={(e) => handleEditWeightageChange(e.target.value)}
                className={`w-full p-2.5 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold ${
                  editErrors.weightage ? "border-rose-400" : "border-slate-200"
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 font-mono font-bold text-slate-400 text-[10px]">
                <span>COVERAGE PROGRESS:</span>
                <span className="text-indigo-600 text-xs font-extrabold">{editPercentage}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editPercentage}
                  onChange={(e) => setEditPercentage(Number(e.target.value))}
                  className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editPercentage}
                  onChange={(e) => setEditPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-12 p-1.5 border border-slate-200 text-center text-[11px] font-bold rounded-lg font-mono bg-white text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY 3: Reference Materials & Links */}
        <div className="space-y-3.5 pb-4 border-b border-slate-100">
          <span className="block text-[10px] font-extrabold text-indigo-600 font-mono tracking-widest uppercase">
            III. Study Materials & Learning Resources
          </span>
          
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                Reference Material & Resources:
              </label>
              <span className="text-[8px] font-mono font-bold text-slate-400">
                {editResources.filter(Boolean).length} Added
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <select
                  value={editResourceType}
                  onChange={(e) => {
                    setEditResourceType(e.target.value as any);
                    setEditResourceVal("");
                    setEditResourceError("");
                  }}
                  className="w-full p-2 border border-slate-200 text-xs bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold cursor-pointer h-[38px]"
                >
                  <option value="link">🔗 Web Link</option>
                  <option value="video">📺 Video (YouTube)</option>
                  <option value="textbook">📖 Textbook Name</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={editResourceVal}
                    onChange={(e) => {
                      setEditResourceVal(e.target.value);
                      setEditResourceError("");
                    }}
                    placeholder={
                      editResourceType === "video"
                        ? "YouTube link..."
                        : editResourceType === "textbook"
                        ? "Textbook name..."
                        : "Website link..."
                    }
                    className="w-full p-2 border border-slate-200 text-xs bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold placeholder-slate-400 h-[38px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleEditResourceCustom();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleEditResourceCustom}
                  className="w-[38px] h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm shrink-0"
                  title="Add Resource"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editResourceError && (
              <p className="text-rose-500 text-[10px] font-bold font-mono uppercase tracking-wide">
                ⚠️ {editResourceError}
              </p>
            )}

            {editResources.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1 border-t border-slate-200/50 mt-2">
                {editResources.filter(Boolean).map((res, idx) => {
                  const parsed = parseResource(res);
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 text-slate-600 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-sm animate-in fade-in duration-100"
                    >
                      <span>{parsed.icon}</span>
                      <span className="truncate max-w-[150px]" title={parsed.label}>{parsed.label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEditResource(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CATEGORY 4: Syllabus Key Topics */}
        <div className="space-y-3.5 pb-1">
          <span className="block text-[10px] font-extrabold text-indigo-600 font-mono tracking-widest uppercase">
            IV. Syllabus Modules
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Completed Topics:
                </label>
                <span className="text-[8px] font-mono text-slate-400">{editCompleted.length}/250</span>
              </div>
              <textarea
                value={editCompleted}
                onChange={(e) => handleEditCompletedChange(e.target.value)}
                placeholder="Topics successfully reviewed"
                className={`w-full p-2 h-14 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-medium ${
                  editErrors.completed ? "border-rose-400" : "border-slate-200"
                }`}
              />
              {editErrors.completed && (
                <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                  ⚠️ {editErrors.completed}
                </p>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Pending Topics:
                </label>
                <span className="text-[8px] font-mono text-slate-400">{editPending.length}/250</span>
              </div>
              <textarea
                value={editPending}
                onChange={(e) => handleEditPendingChange(e.target.value)}
                placeholder="Remaining modules"
                className={`w-full p-2 h-14 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-medium ${
                  editErrors.pending ? "border-rose-400" : "border-slate-200"
                }`}
              />
              {editErrors.pending && (
                <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                  ⚠️ {editErrors.pending}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 font-bold text-xs bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!editName.trim() || !!editErrors.name || !!editErrors.timeline || !!editErrors.weightage || !!editErrors.pending || !!editErrors.completed}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
