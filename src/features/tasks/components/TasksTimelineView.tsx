import React from "react";
import { Task, Subject } from "@/types";
import { getPriorityColor, getCategoryBg } from "@utils/index";

interface TasksTimelineViewProps {
  tasks: Task[];
  subjects: Subject[];
}

export default function TasksTimelineView({
  tasks,
  subjects,
}: TasksTimelineViewProps) {
  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "";
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl font-mono text-xs font-semibold text-amber-800">
        💡 Timeline arranges scheduled daily targets sequentially by calendar date. It provides a quick look into morning, afternoon, and evening tracks.
      </div>
      <div className="relative border-l border-slate-200 pl-6 space-y-6 ml-3 py-2">
        {tasks.length === 0 ? (
          <div className="text-slate-400 font-mono italic">No targets scheduled.</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="relative animate-in fade-in duration-150">
              {/* Timeline dot */}
              <div className="absolute -left-[30px] top-1.5 bg-indigo-600 w-2.5 h-2.5 rounded-full border border-white"></div>

              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm max-w-xl hover:border-slate-200 transition-colors">
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {task.date}
                  </span>
                  <div className="flex gap-1.5">
                    <span className={`text-[9px] font-bold border border-slate-100 px-1.5 py-0.5 rounded-md ${getCategoryBg(task.category)}`}>
                      {task.category}
                    </span>
                    <span className={`text-[9px] font-bold border border-slate-100 px-1.5 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                <h4 className="text-md font-bold text-slate-800 mb-1">{task.title}</h4>
                {task.subjectId && (
                  <span className="text-[10px] font-bold text-slate-500 font-mono bg-indigo-50/20 px-1.5 py-0.5 rounded-md">
                    📚 Subject: {getSubjectName(task.subjectId)}
                  </span>
                )}
                {task.description && (
                  <p className="text-xs text-slate-500 mt-2 font-mono leading-relaxed bg-slate-50 p-2 border border-dashed border-slate-100 rounded-lg">
                    {task.description}
                  </p>
                )}
                {task.timeSpentMinutes > 0 && (
                  <div className="mt-2.5 flex items-center gap-1 font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md w-max">
                    ⏱️ Active session completed: {task.timeSpentMinutes} mins
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
