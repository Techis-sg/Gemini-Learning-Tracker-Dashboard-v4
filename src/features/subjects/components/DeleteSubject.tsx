import React, { useState } from "react";
import { IconTrash as Trash, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Modal, apiFetch, toast } from "@utils/index";

interface DeleteSubjectProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  activeDashboardId: string;
  subjectName: string;
  onSuccess: () => void;
}

export default function DeleteSubject({
  isOpen,
  onClose,
  subjectId,
  activeDashboardId,
  subjectName,
  onSuccess,
}: DeleteSubjectProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/subject/${activeDashboardId}/${subjectId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove subject track");
      
      toast.success(`Subject track "${subjectName}" removed.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error deleting subject track: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Subject Track"
      icon={<Trash className="w-5 h-5 text-rose-500" />}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4 text-center pb-2">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center gap-2">
          <Trash className="w-8 h-8 text-rose-500 animate-bounce" />
          <p className="text-xs font-bold text-rose-800 uppercase font-mono tracking-wider">
            Critical Action Warning
          </p>
        </div>

        <p className="text-slate-600 text-xs leading-relaxed">
          Are you sure you want to delete the study track <strong className="text-slate-800">"{subjectName}"</strong>?
          This will permanently remove the syllabus, coverage progress, and resource links.
        </p>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2 border border-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash className="w-3.5 h-3.5" />
                Delete Track
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
