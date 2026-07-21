import React, { useState } from "react";
import { IconBook as BookOpen, IconPlus as Plus, IconX as X } from "@tabler/icons-react";
import { Select } from "@components/ui";
import { VALIDATION_LIMITS } from "@config/app.config";
import { Modal, apiFetch, toast } from "@utils/index";
import { validateResource, formatResourceToSave, parseResource } from "../utils/resourceUtils";
import { Subject } from "@/types";

interface AddSubjectProps {
  isOpen: boolean;
  onClose: () => void;
  activeDashboardId: string;
  onSuccess: () => void;
}

export default function AddSubject({
  isOpen,
  onClose,
  activeDashboardId,
  onSuccess,
}: AddSubjectProps) {
  // Form states
  const [addName, setAddName] = useState("");
  const [addBlock, setAddBlock] = useState<string>('Block 1 - GATE');
  const [addDays, setAddDays] = useState(10);
  const [addTimeline, setAddTimeline] = useState("");
  const [addWeightage, setAddWeightage] = useState("");
  const [addPending, setAddPending] = useState("");
  const [addResources, setAddResources] = useState<string[]>([]);
  
  const [addResourceType, setAddResourceType] = useState<"video" | "textbook" | "link">("link");
  const [addResourceVal, setAddResourceVal] = useState("");
  const [addResourceError, setAddResourceError] = useState("");

  const [addErrors, setAddErrors] = useState({
    name: "",
    timeline: "",
    weightage: "",
    pending: "",
  });

  const handleAddNameChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_NAME_MAX);
    let errorMsg = "";
    if (!trimmed.trim()) {
      errorMsg = "Subject name is required";
    } else if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_NAME_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_NAME_MAX} characters allowed`;
    }
    setAddErrors((prev) => ({ ...prev, name: errorMsg }));
    setAddName(trimmed);
  };

  const handleAddTimelineChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_TIMELINE_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_TIMELINE_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_TIMELINE_MAX} characters allowed`;
    }
    setAddErrors((prev) => ({ ...prev, timeline: errorMsg }));
    setAddTimeline(trimmed);
  };

  const handleAddWeightageChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_WEIGHTAGE_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_WEIGHTAGE_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_WEIGHTAGE_MAX} characters allowed`;
    }
    setAddErrors((prev) => ({ ...prev, weightage: errorMsg }));
    setAddWeightage(trimmed);
  };

  const handleAddPendingChange = (val: string) => {
    const trimmed = val.substring(0, VALIDATION_LIMITS.SUBJECT_PENDING_MAX);
    let errorMsg = "";
    if (trimmed.length >= VALIDATION_LIMITS.SUBJECT_PENDING_MAX) {
      errorMsg = `Max ${VALIDATION_LIMITS.SUBJECT_PENDING_MAX} characters allowed`;
    }
    setAddErrors((prev) => ({ ...prev, pending: errorMsg }));
    setAddPending(trimmed);
  };

  const handleRemoveAddResource = (idx: number) => {
    setAddResources(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddResourceCustom = () => {
    const err = validateResource(addResourceType, addResourceVal);
    if (err) {
      setAddResourceError(err);
      return;
    }
    const formatted = formatResourceToSave(addResourceType, addResourceVal);
    setAddResources((prev) => [...prev.filter(Boolean), formatted]);
    setAddResourceVal("");
    setAddResourceError("");
  };

  const submitAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || addErrors.name || addErrors.timeline || addErrors.weightage || addErrors.pending) {
      return;
    }

    const compiledResource = addResources
      .map(r => r.trim())
      .filter(Boolean)
      .join(", ");

    try {
      const response = await apiFetch(`/api/subject/${activeDashboardId}`, {
        method: "POST",
        body: JSON.stringify({
          name: addName,
          block: addBlock,
          daysPlanned: Number(addDays),
          timeline: addTimeline || "Flexible",
          pendingTopics: addPending,
          weightage: addWeightage,
          resource: compiledResource,
          percentage: 0,
        }),
      });

      if (!response.ok) throw new Error("Failed to create subject track");
      const newSubj = await response.json();

      toast.success(`Subject Track "${newSubj.name}" created!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error creating subject: " + err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Subject Track"
      icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={submitAddSubject} className="space-y-5">
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
                {addName.length}/40
              </span>
            </div>
            <input
              type="text"
              value={addName}
              onChange={(e) => handleAddNameChange(e.target.value)}
              placeholder="e.g. Computer Networks"
              className={`w-full p-2.5 border bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl shadow-sm text-slate-800 text-xs font-semibold focus:outline-none placeholder-slate-400 ${
                addErrors.name ? "border-rose-400 focus:border-rose-500" : "border-slate-200"
              }`}
              required
            />
            {addErrors.name && (
              <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                ⚠️ {addErrors.name}
              </p>
            )}
          </div>

          <div>
            <Select
              label="Study Track Block"
              value={addBlock}
              onChange={(e: any) => setAddBlock(e.target.value)}
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
                value={addDays}
                onChange={(e) => setAddDays(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 border border-slate-200 text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-mono font-bold"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Timeline Span:
                </label>
                <span className="text-[8px] font-mono text-slate-400">{addTimeline.length}/30</span>
              </div>
              <input
                type="text"
                value={addTimeline}
                onChange={(e) => handleAddTimelineChange(e.target.value)}
                placeholder="e.g. June 08, 2026 to June 21, 2026"
                className={`w-full p-2.5 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold ${
                  addErrors.timeline ? "border-rose-400" : "border-slate-200"
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                Syllabus Weightage Marks:
              </label>
              <span className="text-[8px] font-mono text-slate-400">{addWeightage.length}/20</span>
            </div>
            <input
              type="text"
              value={addWeightage}
              onChange={(e) => handleAddWeightageChange(e.target.value)}
              placeholder="e.g. 6-8 Marks"
              className={`w-full p-2.5 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold ${
                addErrors.weightage ? "border-rose-400" : "border-slate-200"
              }`}
            />
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
                {addResources.filter(Boolean).length} Added
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <select
                  value={addResourceType}
                  onChange={(e) => {
                    setAddResourceType(e.target.value as any);
                    setAddResourceVal("");
                    setAddResourceError("");
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
                    value={addResourceVal}
                    onChange={(e) => {
                      setAddResourceVal(e.target.value);
                      setAddResourceError("");
                    }}
                    placeholder={
                      addResourceType === "video"
                        ? "YouTube link..."
                        : addResourceType === "textbook"
                        ? "Textbook name..."
                        : "Website link..."
                    }
                    className="w-full p-2 border border-slate-200 text-xs bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-semibold placeholder-slate-400 h-[38px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddResourceCustom();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddResourceCustom}
                  className="w-[38px] h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm shrink-0"
                  title="Add Resource"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {addResourceError && (
              <p className="text-rose-500 text-[10px] font-bold font-mono uppercase tracking-wide">
                ⚠️ {addResourceError}
              </p>
            )}

            {addResources.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1 border-t border-slate-200/50 mt-2">
                {addResources.filter(Boolean).map((res, idx) => {
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
                        onClick={() => handleRemoveAddResource(idx)}
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

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                Key Topics to Cover:
              </label>
              <span className="text-[8px] font-mono text-slate-400">{addPending.length}/250</span>
            </div>
            <textarea
              value={addPending}
              onChange={(e) => handleAddPendingChange(e.target.value)}
              placeholder="e.g. Subnetting, Routing Protocols, TCP Flow Control"
              className={`w-full p-2.5 h-16 border text-xs bg-white rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-700 font-medium ${
                addErrors.pending ? "border-rose-400" : "border-slate-200"
              }`}
            />
            {addErrors.pending && (
              <p className="text-rose-500 text-[10px] font-bold font-mono mt-1 uppercase tracking-wide">
                ⚠️ {addErrors.pending}
              </p>
            )}
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
            disabled={!addName.trim() || !!addErrors.name || !!addErrors.timeline || !!addErrors.weightage || !!addErrors.pending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Subject
          </button>
        </div>
      </form>
    </Modal>
  );
}
