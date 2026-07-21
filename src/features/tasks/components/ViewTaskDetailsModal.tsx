import React from "react";
import { Task, Subject } from "@/types";
import { getPriorityColor, getCategoryBg, getStatusColor, Modal } from "@utils/index";

interface ViewTaskDetailsModalProps {
  task: Task | null;
  subjects: Subject[];
  onClose: () => void;
  indexInList?: number;
}

export function ViewTaskDetailsModal({
  task,
  subjects,
  onClose,
  indexInList = 0,
}: ViewTaskDetailsModalProps) {
  if (!task) return null;

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "";
  };

  const formattedTaskId =
    task.taskId || task.taskid || `TSK-${String(indexInList + 1).padStart(3, "0")}`;

  return (
    <Modal isOpen={task !== null} onClose={onClose} maxWidthClass="max-w-xl">
      <div className="font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm sm:text-base font-mono font-extrabold text-slate-800 tracking-tight mr-1">
              #{formattedTaskId}
            </span>
            <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg border border-slate-100/20 shadow-sm ${getCategoryBg(task.category)}`}>
              {task.category}
            </span>
            <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg border border-slate-100/20 shadow-sm ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg border border-slate-100/20 shadow-sm ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
          </div>
        </div>

        <h3 className="text-xl font-extrabold text-slate-800 mb-2 leading-snug">
          {task.title}
        </h3>

        {(task.subjectId || task.category) && (
          <p className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-xl w-max mb-4 flex items-center gap-1.5 font-sans">
            📚 Subject: {getSubjectName(task.subjectId) || task.category}
          </p>
        )}

        <div className="space-y-4">
          {/* Date & Time Spent Info */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Syllabus Date</span>
              <span className="font-bold text-slate-700">{task.date}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total Logged Time</span>
              <span className="font-bold text-indigo-700">⏱️ {task.timeSpentMinutes || 0} mins</span>
            </div>
          </div>

          {/* Subtopics / Description */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Description / Subtopics</span>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
              {task.description || <span className="italic text-slate-400 font-sans text-xs">No subtopic details provided.</span>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Personal Notes</span>
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 font-mono text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
              {task.notes || <span className="italic text-slate-400 font-sans text-xs">No notes written.</span>}
            </div>
          </div>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Attachments</span>
              <div className="flex flex-wrap gap-2">
                {task.attachments.map((a) => (
                  <span key={a.id} className="text-xs bg-slate-100 border border-slate-200 px-3 py-1 font-mono rounded-xl flex items-center gap-1.5 shadow-sm text-slate-600">
                    📎 {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Logged study sessions (Ordered descending) */}
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Logged Study Sessions (Descending)</span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {!task.timeLogs || task.timeLogs.length === 0 ? (
                <p className="text-slate-400 text-xs italic font-sans">No study sessions logged for this syllabus target.</p>
              ) : (
                [...task.timeLogs]
                  .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
                  .map((log) => {
                    const formattedDate = new Date(log.loggedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div key={log.id} className="p-3 bg-indigo-50/20 border border-indigo-100/30 rounded-2xl text-xs flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 font-mono block text-[11px]">{formattedDate}</span>
                          {log.note ? (
                            <p className="text-slate-500 leading-normal font-sans">{log.note}</p>
                          ) : (
                            <p className="text-slate-400 italic font-sans">No notes logged.</p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-xl text-[10px] shrink-0">
                          ⏱️ {log.minutes}m
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ViewTaskDetailsModal;
