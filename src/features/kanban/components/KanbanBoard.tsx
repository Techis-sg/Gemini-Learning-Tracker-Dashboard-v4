import React, { useState } from "react";
import { Task, Subject } from "@/types";
import { IconClock as Clock, IconPlus as Plus, IconTrash as Trash, IconEdit as Edit2, IconGripVertical as GripVertical } from '@tabler/icons-react';
import { motion } from "motion/react";
import { Tooltip } from "@components/ui";

interface KanbanBoardProps {
  tasks: Task[];
  subjects: Subject[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTimeTracker: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
  onOpenAddTask: (columnId: Task["boardColumnId"]) => void;
  onReorderTasks?: (draggedId: string, targetId: string, targetColumn: string) => void;
  onMoveTaskToColumn?: (draggedId: string, targetColumn: string) => void;
}

export default function KanbanBoard({
  tasks,
  subjects,
  onUpdateTask,
  onDeleteTask,
  onOpenTimeTracker,
  onOpenEditTask,
  onOpenAddTask,
  onReorderTasks,
  onMoveTaskToColumn,
}: KanbanBoardProps) {
  const [activeDragOverCol, setActiveDragOverCol] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const columns: {
    id: Task["boardColumnId"];
    title: string;
    headerBg: string;
    accentBg: string;
    containerBg: string;
    accentColor: string;
    hoverColor: string;
  }[] = [
    { 
      id: "backlog", 
      title: "Backlog", 
      headerBg: "bg-slate-100 text-slate-800 border-slate-200", 
      accentBg: "bg-slate-500 text-white", 
      containerBg: "bg-slate-50 border-slate-200/50 hover:border-slate-300/50",
      accentColor: "bg-slate-500",
      hoverColor: "bg-slate-50/20"
    },
    { 
      id: "today", 
      title: "Today's Tasks", 
      headerBg: "bg-blue-50 text-blue-950 border-blue-100", 
      accentBg: "bg-blue-500 text-white", 
      containerBg: "bg-blue-50/10 border-blue-100/50 hover:border-blue-200/50",
      accentColor: "bg-blue-500",
      hoverColor: "bg-blue-50/20"
    },
    { 
      id: "in_progress", 
      title: "In Progress", 
      headerBg: "bg-amber-50 text-amber-950 border-amber-100", 
      accentBg: "bg-amber-500 text-white", 
      containerBg: "bg-amber-50/10 border-amber-100/50 hover:border-amber-200/50",
      accentColor: "bg-amber-500",
      hoverColor: "bg-amber-50/20"
    },
    { 
      id: "completed", 
      title: "Completed", 
      headerBg: "bg-emerald-50 text-emerald-950 border-emerald-100", 
      accentBg: "bg-emerald-500 text-white", 
      containerBg: "bg-emerald-50/10 border-emerald-100/50 hover:border-emerald-200/50",
      accentColor: "bg-emerald-500",
      hoverColor: "bg-emerald-50/20"
    },
    { 
      id: "revision", 
      title: "Revision", 
      headerBg: "bg-purple-50 text-purple-950 border-purple-100", 
      accentBg: "bg-purple-500 text-white", 
      containerBg: "bg-purple-50/10 border-purple-100/50 hover:border-purple-200/50",
      accentColor: "bg-purple-500",
      hoverColor: "bg-purple-50/20"
    },
  ];

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "";
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-rose-50 text-rose-600 border border-rose-100";
      case "Medium":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      default:
        return "bg-slate-50 text-slate-500 border border-slate-100";
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    // Wrap in setTimeout so the browser takes the drag preview snapshot of the fully opaque card first
    setTimeout(() => {
      setDraggedTaskId(taskId);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDragOverCol(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (activeDragOverCol !== colId) {
      setActiveDragOverCol(colId);
    }

    // Auto vertical container edge-scrolling of the column during drag-and-drop
    const container = e.currentTarget.querySelector(".overflow-y-auto") as HTMLDivElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top; // cursor position relative to container top
      const threshold = 70; // trigger threshold from the top/bottom edges of the column container
      const scrollSpeed = 15; // smooth scrolling speed multiplier

      if (relativeY < threshold && relativeY >= 0) {
        // Accelerate scrolling as cursor gets closer to the top edge
        const ratio = (threshold - relativeY) / threshold;
        container.scrollTop -= scrollSpeed * ratio;
      } else if (rect.height - relativeY < threshold && relativeY <= rect.height) {
        // Accelerate scrolling as cursor gets closer to the bottom edge
        const ratio = (threshold - (rect.height - relativeY)) / threshold;
        container.scrollTop += scrollSpeed * ratio;
      }
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setActiveDragOverCol(null);
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (id) {
      if (onMoveTaskToColumn) {
        onMoveTaskToColumn(id, targetColId);
      } else {
        const task = tasks.find((t) => t.id === id);
        if (task && task.boardColumnId !== targetColId) {
          const statusMap: Record<string, Task["status"]> = {
            backlog: "Not Started",
            today: "Not Started",
            in_progress: "In Progress",
            completed: "Completed",
            revision: "Completed",
          };
          onUpdateTask(id, {
            boardColumnId: targetColId as any,
            status: statusMap[targetColId],
          });
        }
      }
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetTaskId: string, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragOverCol(null);
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (id && id !== targetTaskId) {
      if (onReorderTasks) {
        onReorderTasks(id, targetTaskId, targetColId);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 font-sans">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.boardColumnId === col.id);
        const isOver = activeDragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOverColumn(e, col.id)}
            onDrop={(e) => handleColumnDrop(e, col.id)}
            onDragLeave={() => setActiveDragOverCol(null)}
            className={`flex flex-col bg-white border rounded-3xl min-h-[500px] shadow-sm transition-all duration-200 ${col.containerBg} ${
              isOver ? "ring-2 ring-indigo-500/50 bg-indigo-50/10" : ""
            }`}
          >
            {/* Column Header */}
            <div className={`p-4 border-b ${col.headerBg} flex items-center justify-between rounded-t-3xl`}>
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full shadow-sm ${col.accentBg} font-bold`}>
                  {colTasks.length}
                </span>
                {col.title}
              </h3>
              <Tooltip content="Add study target to column" position="top">
                <button
                  onClick={() => onOpenAddTask(col.id as any)}
                  className="bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg shadow-sm transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>

            {/* Column Content Dropzone */}
            <div
              className={`p-4 flex-1 space-y-3 overflow-y-auto max-h-[600px] transition-colors duration-200 rounded-b-3xl ${
                isOver ? "bg-indigo-50/20" : "bg-slate-50/10"
              }`}
            >
              {colTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-mono text-xs border border-dashed border-slate-200/80 bg-white rounded-2xl p-4">
                  Drag study targets here to change progress state
                </div>
              ) : (
                colTasks.map((task) => {
                  const isBeingDragged = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleCardDrop(e, task.id, col.id)}
                      className={`bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 relative group cursor-grab active:cursor-grabbing ${
                        isBeingDragged ? "border-dashed border-2 border-indigo-500 bg-indigo-50/20" : ""
                      }`}
                    >
                      {/* Drag Handle & Info header */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>
                          {task.priority} Priority
                        </span>
                        
                        {/* Drag Handle Grip Icon */}
                        <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Task Title & Log Time */}
                      <div className="flex flex-col gap-1.5">
                        <h4 className={`font-semibold text-xs sm:text-sm leading-snug transition-colors ${
                          col.id === "completed" ? "line-through text-slate-400 font-normal" : "text-slate-800 group-hover:text-indigo-600"
                        }`}>
                          {col.id === "completed" && <span className="text-emerald-500 mr-1 font-bold">✓</span>}
                          {task.title}
                        </h4>
                        
                        {task.subjectId && (
                          <div className="text-[10px] font-bold text-slate-500 font-mono truncate bg-slate-100/80 px-2 py-0.5 rounded w-max">
                            📚 {getSubjectName(task.subjectId)}
                          </div>
                        )}

                        {task.timeSpentMinutes > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1 w-max mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {task.timeSpentMinutes}m studied
                          </span>
                        )}
                      </div>

                      {/* Action buttons (always clean and accessible) */}
                      <div className="flex gap-2 justify-between items-center pt-2.5 border-t border-slate-50 mt-1">
                        <Tooltip content="Log active study sessions" position="top">
                          <button
                            onClick={() => onOpenTimeTracker(task)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-mono font-bold px-2 py-1 rounded bg-indigo-50/60 hover:bg-indigo-100/60 transition-all cursor-pointer"
                          >
                            +Log Session
                          </button>
                        </Tooltip>

                        <div className="flex items-center gap-1.5">
                          <Tooltip content="Edit Task" position="top">
                            <button
                              onClick={() => onOpenEditTask(task)}
                              className="p-1.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-700 rounded-lg border border-slate-100 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </Tooltip>
                          
                          <Tooltip content="Delete Task" position="top">
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-100 transition-all cursor-pointer"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
