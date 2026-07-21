import React, { useMemo, useState } from "react";
import { Task, Subject } from "@/types";
import { getPriorityColor, getCategoryBg, getStatusColor, formatDate, getFormattedTaskId, getSubjectName } from "@utils/index";
import { DataTable } from "@components/ui";
import { ColumnDef } from "@tanstack/react-table";
import { IconEye as Eye, IconClock as Clock, IconEdit as Edit2, IconTrash as Trash, IconDotsVerticalFilled as MoreVertical } from "@tabler/icons-react";

interface TasksListViewProps {
  tasks: Task[];
  subjects: Subject[];
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTimeTracker: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
  onViewDetails: (task: Task) => void;
}

export default function TasksListView({
  tasks,
  subjects,
  itemsPerPage,
  currentPage,
  onPageChange,
  onUpdateTask,
  onDeleteTask,
  onOpenTimeTracker,
  onOpenEditTask,
  onViewDetails,
}: TasksListViewProps) {
  const [openActionTaskId, setOpenActionTaskId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    {
      id: "select",
      header: "✓",
      size: 50,
      cell: ({ row }) => {
        const task = row.original;
        const isCompleted = task.status === "Completed";
        const handleToggleStatus = () => {
          const nextStatus = isCompleted ? "Not Started" : "Completed";
          const nextCol = nextStatus === "Completed" ? "completed" : "today";
          onUpdateTask(task.id, { status: nextStatus, boardColumnId: nextCol });
        };
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer select-none active:scale-95 transition-all shadow-sm ${
                isCompleted
                  ? "bg-emerald-500 border-emerald-500 text-white font-bold"
                  : "bg-white border-slate-300 hover:bg-slate-50"
              }`}
              title="Toggle Completed"
            >
              {isCompleted ? "✓" : ""}
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      size: 150,
      cell: ({ row }) => {
        const task = row.original;
        const todayStr = (() => {
          const d = new Date();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dayStr = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dayStr}`;
        })();
        const isToday = task.date === todayStr;
        return isToday ? (
          <span className="flex flex-col gap-0.5 text-xs">
            <span className="text-slate-800 font-mono font-bold">{formatDate(task.date)}</span>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md w-max animate-pulse">
              Today 🌟
            </span>
          </span>
        ) : (
          <span className="font-mono font-bold text-slate-600 text-xs">{formatDate(task.date)}</span>
        );
      },
    },
    {
      id: "serial_id",
      header: "Task ID",
      size: 90,
      cell: ({ row }) => {
        const task = row.original;
        const displayTaskId = getFormattedTaskId(task, row.index + (currentPage - 1) * itemsPerPage);
        return (
          <div className="flex flex-col gap-0.5 font-mono text-[11px] font-bold text-indigo-600">
            <span>{displayTaskId}</span>
          </div>
        );
      }
    },
    {
      accessorKey: "title",
      header: "Task Name",
      size: 320,
      cell: ({ row }) => {
        const task = row.original;
        const isCompleted = task.status === "Completed";
        return (
          <div className="space-y-1 max-w-md relative group">
            <span
              onClick={() => onViewDetails(task)}
              className={`font-bold text-sm block text-slate-800 break-words whitespace-normal cursor-pointer hover:text-indigo-600 hover:underline transition-colors ${isCompleted ? "line-through text-slate-400 font-normal" : ""}`}
            >
              {task.title}
              {task.notes && <span className="inline-block ml-1 text-xs cursor-help">📝</span>}
            </span>
            {task.description && (
              <p className="text-slate-500 font-mono text-xs leading-relaxed break-words whitespace-normal">
                {task.description}
              </p>
            )}
            {task.notes && (
              <div className="hidden group-hover:block absolute left-1/2 top-[110%] mt-1 -translate-x-1/2 z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-800 font-sans pointer-events-none transition-all duration-150">
                <span className="font-bold text-amber-400 block mb-1">📝 Notes</span>
                <p className="font-normal text-slate-200 text-[11px] leading-relaxed break-words whitespace-normal">{task.notes}</p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-900"></div>
              </div>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {task.attachments.map((a) => (
                  <span
                    key={a.id}
                    className="text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono rounded-md flex items-center gap-1 shadow-sm text-slate-600"
                  >
                    📎 {a.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      cell: ({ row }) => {
        const task = row.original;
        return (
          <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg shadow-sm border border-slate-100/20 inline-block ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      size: 100,
      cell: ({ row }) => {
        const task = row.original;
        return (
          <span className={`text-[10px] px-2.5 py-1 font-bold uppercase rounded-lg shadow-sm border border-slate-100/20 inline-block ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        );
      },
    },
    {
      accessorKey: "timeSpentMinutes",
      header: "TimeLog",
      size: 100,
      cell: ({ row }) => {
        const task = row.original;
        return task.timeSpentMinutes > 0 ? (
          <span className="inline-flex items-center gap-1 bg-indigo-50/70 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100/40 text-[11px] shadow-sm font-mono font-bold">
            ⏱️ {task.timeSpentMinutes}m
          </span>
        ) : (
          <span className="text-slate-400 font-mono text-[11px]">-</span>
        );
      },
    },
    {
      id: "association",
      header: "Association",
      size: 180,
      cell: ({ row }) => {
        const task = row.original;
        const subName = getSubjectName(task.subjectId, subjects);
        return (
          <div className="flex flex-col gap-1 items-start max-w-[170px]">
            {task.category && (
              <span className={`text-[9px] px-2 py-0.5 font-bold uppercase rounded-md shadow-sm border border-slate-100/20 ${getCategoryBg(task.category)}`}>
                {task.category}
              </span>
            )}
            {subName ? (
              <span className="bg-indigo-50/70 text-indigo-950 border border-indigo-100/40 rounded-md px-2 py-0.5 font-sans font-bold text-[11px] shadow-sm truncate max-w-[160px]">
                📚 {subName}
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-[10px] italic">No Subject</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      cell: ({ row }) => {
        const task = row.original;
        const isOpen = openActionTaskId === task.id;
        const isNearBottom = row.index >= tasks.length - 2 || tasks.length <= 4;
        return (
          <div className="flex items-center justify-center">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionTaskId(isOpen ? null : task.id);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-center"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenActionTaskId(null)} />
                  <div className={`absolute right-0 w-36 bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 z-50 text-left font-sans text-xs ${
                    isNearBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
                  }`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionTaskId(null);
                        onViewDetails(task);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionTaskId(null);
                        onOpenTimeTracker(task);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Log Time
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionTaskId(null);
                        onOpenEditTask(task);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionTaskId(null);
                        onDeleteTask(task.id);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5 text-rose-500" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      },
    },
  ], [
    tasks.length,
    subjects,
    openActionTaskId,
    onUpdateTask,
    onOpenTimeTracker,
    onOpenEditTask,
    onDeleteTask,
    onViewDetails,
  ]);

  return (
    <DataTable<Task>
      columns={columns}
      data={tasks}
      enablePagination={true}
      pageSize={itemsPerPage}
      currentPage={currentPage}
      onPageChange={onPageChange}
      paginationLabel="targets"
      containerClassName="border border-slate-100 rounded-2xl shadow-sm bg-white min-h-[220px] flex flex-col justify-between overflow-x-auto"
      tableClassName="w-full text-left border-collapse bg-white min-w-[800px]"
      theadClassName="font-mono text-[10px]"
      emptyState={
        <div className="p-12 text-center text-slate-400 font-mono italic">
          No matching tasks found. Refine your filter parameters or search term.
        </div>
      }
    />
  );
}
