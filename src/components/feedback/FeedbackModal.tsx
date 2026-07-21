import React, { useState } from "react";
import { IconSend, IconX, IconMessageReport, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import { apiFetch } from "@utils/index";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccessRedirect: () => void;
}

export function FeedbackModal({ isOpen, onClose, user, onSuccessRedirect }: FeedbackModalProps) {
  const [name, setName] = useState(user?.name || "");
  const email = user?.email || "student@example.com";
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Validation Calculations
  const trimmedMsg = message.trim();
  const wordCount = trimmedMsg ? trimmedMsg.split(/\s+/).filter(Boolean).length : 0;
  const isAlphanumeric = message.length === 0 || /^[a-zA-Z0-9\s]+$/.test(message);
  const isLengthValid = message.length >= 5 && message.length <= 255;
  const isWordCountValid = wordCount >= 2;
  const isNameValid = name.trim().length > 0;

  const isFormValid = isNameValid && isAlphanumeric && isLengthValid && isWordCountValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit feedback");
      }

      const data = await res.json();
      toast.success(`Feedback submitted successfully! (Tagged as: ${data.ai_tag})`);
      setMessage("");
      onClose();
      onSuccessRedirect();
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      toast.error(err.message || "An error occurred while sending feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <IconMessageReport className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Direct Feedback to Developer</h3>
              <p className="text-[10px] text-slate-500 font-mono">Share thoughts, bugs, or feature suggestions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              Your Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full text-xs font-bold px-3.5 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
            />
          </div>

          {/* Email Field (Disabled / Readonly) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <span className="text-[9px] font-mono text-indigo-600 font-bold uppercase bg-indigo-50 px-1.5 py-0.5 rounded">
                Verified Account
              </span>
            </div>
            <input
              type="email"
              value={email}
              disabled
              readOnly
              className="w-full text-xs font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed select-none font-mono"
            />
          </div>

          {/* Message Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Feedback Message <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${message.length > 255 ? 'text-rose-500' : 'text-slate-400'}`}>
                {message.length}/255 chars
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your feedback here (alphanumeric characters only, min 2 words)..."
              className={`w-full text-xs font-medium p-3.5 border rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-800 ${
                !isAlphanumeric || (message.length > 0 && message.length > 255)
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10'
              }`}
            />

            {/* Validation indicators */}
            <div className="mt-2 space-y-1.5 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                {isAlphanumeric ? (
                  <IconCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <IconAlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                )}
                <span className={isAlphanumeric ? "text-slate-600" : "text-rose-600 font-bold"}>
                  Only letters, numbers, and spaces allowed
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isWordCountValid ? (
                  <IconCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <IconAlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                )}
                <span className={isWordCountValid ? "text-slate-600" : "text-amber-600 font-medium"}>
                  At least 2 words required ({wordCount}/2)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isLengthValid ? (
                  <IconCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <IconAlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                )}
                <span className={isLengthValid ? "text-slate-600" : "text-amber-600 font-medium"}>
                  Between 5 and 255 characters ({message.length}/255)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`group px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all transform shadow-md ${
                isFormValid
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-95 cursor-pointer shadow-indigo-600/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              <span>{submitting ? "Sending..." : "Send Feedback"}</span>
              <IconSend className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
