import React, { useState } from "react";
import { IconTrash as Trash, IconLoader2 as Loader2 } from '@tabler/icons-react';
import { motion } from "motion/react";
import { apiFetch, toast } from "@utils/index";

interface DeleteTaskProps {
  isOpen: boolean;
  onClose: () => void;
  type: "task" | "subject" | "dashboard";
  id: string;
  activeDashboardId: string;
  title: string;
  onSuccess: () => void;
}

export default function DeleteTask({
  isOpen,
  onClose,
  type,
  id,
  activeDashboardId,
  title,
  onSuccess,
}: DeleteTaskProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      if (type === "dashboard") {
        const response = await apiFetch(`/api/dashboard/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete study track");
        toast.success(`Dashboard removed.`);
      } else if (type === "task") {
        const response = await apiFetch(`/api/task/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete study target");
        toast.success("Syllabus target deleted.");
      } else if (type === "subject") {
        const response = await apiFetch(`/api/subject/${activeDashboardId}/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove subject track");
        toast.success("Subject track removed.");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[99] overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-white border border-slate-100 p-6 w-full max-w-md shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-[24px] relative text-center"
      >
        <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-600">
          <Trash className="w-5 h-5" />
        </div>

        <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-wider mb-2">
          Confirm Deletion
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          Are you sure you want to delete the {type} <strong className="text-slate-800">"{title}"</strong>?
          <br />
          This action is irreversible and all associated data will be removed.
        </p>

        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all font-mono uppercase cursor-pointer disabled:opacity-50"
          >
            No, Keep it
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all font-mono uppercase shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
