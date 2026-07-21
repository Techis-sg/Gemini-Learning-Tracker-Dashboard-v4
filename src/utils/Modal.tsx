import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string; // e.g. "max-w-lg"
}

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidthClass = "max-w-lg",
}: ModalProps) {
  // Listen for Escape key to close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          {/* Backdrop overlay */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className={`bg-white border border-slate-100 p-6 w-full ${maxWidthClass} shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-[24px] relative z-10`}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2 text-slate-500 rounded-full transition-all text-xs font-bold w-7 h-7 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            {title && (
              <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide font-sans">
                {icon && <span className="shrink-0">{icon}</span>}
                {title}
              </h3>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
