import React from "react";
import { Task, Subject } from "@/types";
import { getPriorityColor, getCategoryBg, getStatusColor } from "@utils/index";
import { Tooltip } from "@components/ui";
import { IconClock as Clock, IconEdit as Edit2, IconTrash as Trash } from "@tabler/icons-react";

interface TasksGridViewProps {
  tasks: Task[];
  subjects: Subject[];
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onOpenTimeTracker: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TasksGridView({
  tasks,
  subjects,
  itemsPerPage,
  currentPage,
  onPageChange,
  onOpenTimeTracker,
  onOpenEditTask,
  onDeleteTask,
}: TasksGridViewProps) {
  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "";
  };

  const totalPages = Math.ceil(tasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = tasks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 font-mono italic">
            No matching tasks found.
          </div>
        ) : (
          paginatedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                    {task.date}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 font-bold border border-slate-100 rounded-md uppercase ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-md leading-tight mb-1">{task.title}</h4>
                
                {task.subjectId && (
                  <div className="text-[10px] font-bold text-slate-600 mb-2 truncate bg-indigo-50/50 px-2 py-0.5 rounded-md border border-indigo-100/20 inline-block font-mono">
                    📚 {getSubjectName(task.subjectId)}
                  </div>
                )}

                {task.description && (
                  <p className="text-xs text-slate-500 font-mono line-clamp-3 mb-3">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 font-bold border border-slate-100 rounded-md ${getCategoryBg(task.category)}`}>
                    {task.category}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 font-bold border border-slate-100 rounded-md ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.timeSpentMinutes > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 font-bold border border-slate-100 bg-indigo-50 text-indigo-700 rounded-md">
                      ⏱️ {task.timeSpentMinutes}m
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 justify-end pt-2.5 border-t border-slate-100">
                  <Tooltip content="Log Time" position="top">
                    <button
                      onClick={() => onOpenTimeTracker(task)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  
                  <Tooltip content="Edit Task" position="top">
                    <button
                      onClick={() => onOpenEditTask(task)}
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  
                  <Tooltip content="Delete Task" position="top">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Grid View Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-slate-50 border border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between font-mono text-xs gap-4 rounded-2xl shadow-sm">
          <div className="text-slate-500 font-semibold uppercase">
            Showing <span className="text-indigo-600 font-extrabold font-sans">{startIndex + 1}</span> to{" "}
            <span className="text-indigo-600 font-extrabold font-sans">
              {Math.min(startIndex + itemsPerPage, tasks.length)}
            </span>{" "}
            of <span className="text-slate-700 font-extrabold font-sans">{tasks.length}</span> targets
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
            >
              Previous
            </button>
            <div className="flex items-center gap-1 font-bold text-slate-700">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                    currentPage === p
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
