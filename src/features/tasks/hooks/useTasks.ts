import React from "react";
import { Task } from "@/types";
import { apiFetch, toast } from "@utils/index";

export function useTasks(
  activeDashboardId: string,
  setTasks: React.Dispatch<React.SetStateAction<Record<string, Task[]>>>,
  fetchDB: (selectDashId?: string, silent?: boolean) => Promise<void>,
  addTaskColumn: Task["boardColumnId"],
  activeTimeTrackerTask: Task | null,
  setActiveTimeTrackerTask: React.Dispatch<React.SetStateAction<Task | null>>
) {
  const handleAddTask = async (taskData: {
    title: string;
    description: string;
    date: string;
    category: Task["category"];
    priority: Task["priority"];
    subjectId: string;
  }) => {
    try {
      const response = await apiFetch("/api/task", {
        method: "POST",
        body: JSON.stringify({
          dashboardId: activeDashboardId,
          title: taskData.title,
          description: taskData.description,
          date: taskData.date,
          category: taskData.category,
          priority: taskData.priority,
          subjectId: taskData.subjectId || undefined,
          boardColumnId: addTaskColumn,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");
      const addedTask = await response.json();

      setTasks((prev) => ({
        ...prev,
        [activeDashboardId]: [...(prev[activeDashboardId] || []), addedTask],
      }));

      toast.success(`Syllabus target "${addedTask.title}" added successfully!`);
      await fetchDB(activeDashboardId, true);
    } catch (err: any) {
      toast.error("Error: " + err.message);
      throw err;
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await apiFetch(`/api/task/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update task");
      const updatedTask = await response.json();

      setTasks((prev) => {
        const list = prev[activeDashboardId] || [];
        return {
          ...prev,
          [activeDashboardId]: list.map((t) => (t.id === taskId ? updatedTask : t)),
        };
      });

      await fetchDB(activeDashboardId, true);

      if (activeTimeTrackerTask?.id === taskId) {
        setActiveTimeTrackerTask(updatedTask);
      }
      toast.success("Study target updated successfully!");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleLogTime = async (taskId: string, minutes: number, note: string) => {
    try {
      const response = await apiFetch(`/api/task/${taskId}/log-time`, {
        method: "POST",
        body: JSON.stringify({ minutes, note }),
      });
      if (!response.ok) throw new Error("Failed to log study minutes");
      const updatedTask = await response.json();

      setTasks((prev) => {
        const list = prev[activeDashboardId] || [];
        return {
          ...prev,
          [activeDashboardId]: list.map((t) => (t.id === taskId ? updatedTask : t)),
        };
      });

      setActiveTimeTrackerTask(null);
      toast.success(`Logged ${minutes} minutes of active learning!`);
      await fetchDB(activeDashboardId, true);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  return {
    handleAddTask,
    handleUpdateTask,
    handleLogTime,
  };
}
