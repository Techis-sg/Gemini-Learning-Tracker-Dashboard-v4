import React from "react";
import { Task } from "@/types";
import { apiFetch, toast } from "@utils/index";

export function useUploads(
  activeDashboardId: string,
  setTasks: React.Dispatch<React.SetStateAction<Record<string, Task[]>>>,
  activeTimeTrackerTask: Task | null,
  setActiveTimeTrackerTask: React.Dispatch<React.SetStateAction<Task | null>>
) {
  const handleAddAttachment = async (
    taskId: string,
    fileData: { fileName: string; mimeType: string; base64Data: string }
  ) => {
    try {
      const response = await apiFetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({
          taskId,
          fileName: fileData.fileName,
          mimeType: fileData.mimeType,
          base64Data: fileData.base64Data,
        }),
      });

      if (!response.ok) throw new Error("Failed to upload attachment");
      const attachment = await response.json();

      setTasks((prev) => {
        const list = prev[activeDashboardId] || [];
        return {
          ...prev,
          [activeDashboardId]: list.map((t) => {
            if (t.id === taskId) {
              return {
                ...t,
                attachments: [...(t.attachments || []), attachment],
              };
            }
            return t;
          }),
        };
      });

      if (activeTimeTrackerTask?.id === taskId) {
        setActiveTimeTrackerTask((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            attachments: [...(prev.attachments || []), attachment],
          };
        });
      }

      toast.success(`Material "${fileData.fileName}" uploaded successfully!`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  return {
    handleAddAttachment,
  };
}
