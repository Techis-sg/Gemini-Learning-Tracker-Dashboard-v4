import React from "react";
import { IconAlertTriangle as AlertTriangle, IconRefresh as RefreshCw } from '@tabler/icons-react';

interface SyllabusErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function SyllabusErrorView({
  message = "Failed to load tracking data from full-stack server.",
  onRetry,
}: SyllabusErrorViewProps) {
  return (
    <div className="w-full bg-rose-50/50 border border-rose-100 p-8 text-center flex flex-col items-center justify-center rounded-[24px] shadow-sm animate-in fade-in duration-150">
      <div className="bg-rose-100 p-3 text-rose-600 rounded-full mb-3">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
        Failed to Synchronize Workspace
      </h3>
      <p className="text-xs text-rose-700 mt-1 font-mono max-w-lg leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}

export default SyllabusErrorView;
