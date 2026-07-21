import React from "react";
import { Subject } from "@/types";
import { apiFetch, toast } from "@utils/index";

export function useSubjects(
  activeDashboardId: string,
  setSubjects: React.Dispatch<React.SetStateAction<Record<string, Subject[]>>>,
  fetchDB: (selectDashId?: string, silent?: boolean) => Promise<void>
) {
  const handleAddSubject = async (subjData: Partial<Subject>) => {
    try {
      const response = await apiFetch(`/api/subject/${activeDashboardId}`, {
        method: "POST",
        body: JSON.stringify(subjData),
      });

      if (!response.ok) throw new Error("Failed to create subject track");
      const newSubj = await response.json();

      setSubjects((prev) => ({
        ...prev,
        [activeDashboardId]: [...(prev[activeDashboardId] || []), newSubj],
      }));

      toast.success(`Subject Track "${newSubj.name}" created!`);
      await fetchDB(activeDashboardId, true);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleUpdateSubject = async (subjectId: string, updates: Partial<Subject>) => {
    try {
      const response = await apiFetch(`/api/subject/${activeDashboardId}/${subjectId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update subject track");
      const updatedSubj = await response.json();

      setSubjects((prev) => {
        const list = prev[activeDashboardId] || [];
        return {
          ...prev,
          [activeDashboardId]: list.map((s) => (s.id === subjectId ? updatedSubj : s)),
        };
      });

      toast.success("Subject track configurations updated!");
      await fetchDB(activeDashboardId, true);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  return {
    handleAddSubject,
    handleUpdateSubject,
  };
}
