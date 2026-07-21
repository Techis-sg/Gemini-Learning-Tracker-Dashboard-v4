import React from "react";
import { IconFolderOpen as FolderOpen, IconArrowLeft as ArrowLeft } from '@tabler/icons-react';
import { Link } from "react-router-dom";

export function NotFoundErrorView() {
  return (
    <div className="min-h-screen bg-[#F4F5F8] text-slate-800 font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white border border-slate-100 p-8 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col items-center">
        <div className="bg-indigo-50 p-4 text-indigo-600 rounded-full mb-4">
          <FolderOpen className="w-10 h-10" />
        </div>
        
        <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">
          Resource Not Found
        </h2>
        
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          The requested study track, dashboard workspace, or navigation route could not be resolved in the database registry.
        </p>

        <Link
          to="/default/tasks"
          className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Default Syllabus
        </Link>
      </div>
    </div>
  );
}

export default NotFoundErrorView;
