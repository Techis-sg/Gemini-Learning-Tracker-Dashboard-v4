import React, { useState, useEffect } from "react";
import { IconUpload as Upload, IconFileText as FileText, IconMagnet as ImageIcon, IconFileCode as FileCode, IconFile as File, IconTrash as Trash2, IconPaperclip as Paperclip, IconCheck as Check, IconSearch as Search, IconBook as BookOpen, IconCalendar as Calendar, IconSparkles as Sparkles, IconDownload as Download, IconAlertCircle as AlertCircle } from '@tabler/icons-react';
import { Task, Subject } from "@/types";
import { toast, Modal, safeJsonParse } from "@utils/index";
import { Tooltip } from "@components/ui";
import { VALIDATION_LIMITS, STORAGE_KEYS } from "@config/app.config";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  subjectId?: string;
  associatedTaskTitle?: string;
}

interface UploadsPageProps {
  tasks: Task[];
  subjects: Subject[];
}

export function UploadsPage({ tasks, subjects }: UploadsPageProps) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dragOver, setDragOver] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  
  // Local custom uploaded files persistent state
  const [customFiles, setCustomFiles] = useState<UploadedFile[]>([]);
  
  // Loading custom files from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_FILES);
    setCustomFiles(safeJsonParse<UploadedFile[]>(saved, []));
  }, []);

  // Save custom files to localStorage
  const saveCustomFiles = (updated: UploadedFile[]) => {
    setCustomFiles(updated);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_FILES, JSON.stringify(updated));
  };

  // Compile files: custom uploads + task attachments
  const taskFiles: UploadedFile[] = [];
  tasks.forEach((task) => {
    if (task.attachments && task.attachments.length > 0) {
      task.attachments.forEach((att) => {
        taskFiles.push({
          id: att.id,
          name: att.name,
          size: "420 KB", // Simulated or task-assigned sizes
          type: att.name.split(".").pop() || "unknown",
          uploadedAt: task.date || new Date().toISOString(),
          subjectId: task.subjectId,
          associatedTaskTitle: task.title,
        });
      });
    }
  });

  const allFiles = [...customFiles, ...taskFiles];

  // Filters and searches
  const filteredFiles = allFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase()) || 
      (file.associatedTaskTitle || "").toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === "all" || file.subjectId === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processUploadedFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processUploadedFiles(files);
    }
  };

  // Process selected or dropped files
  const processUploadedFiles = (files: File[]) => {
    let count = 0;
    const newUploads: UploadedFile[] = [];
    
    files.forEach((file) => {
      // Validate filename length limit of VALIDATION_LIMITS.FILE_NAME_MAX characters
      let processedName = file.name;
      if (processedName.length > VALIDATION_LIMITS.FILE_NAME_MAX) {
        processedName = processedName.substring(0, VALIDATION_LIMITS.FILE_NAME_MAX - 3) + "...";
        toast.error(`File name was trimmed to ${VALIDATION_LIMITS.FILE_NAME_MAX} characters.`);
      }

      // Format size
      const sizeKB = Math.round(file.size / 1024);
      const formattedSize = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      newUploads.push({
        id: "upload_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: processedName,
        size: formattedSize,
        type: file.name.split(".").pop() || "unknown",
        uploadedAt: new Date().toISOString(),
        subjectId: subjectFilter !== "all" ? subjectFilter : undefined,
      });
      count++;
    });

    if (count > 0) {
      const updated = [...newUploads, ...customFiles];
      saveCustomFiles(updated);
      toast.success(`Successfully uploaded ${count} study guide ${count === 1 ? "file" : "files"}!`);
    }
  };

  // Delete manual custom files
  const handleDeleteCustomFile = (id: string) => {
    const updated = customFiles.filter((f) => f.id !== id);
    saveCustomFiles(updated);
    toast.success("Study guide deleted successfully.");
  };

  const handleDeleteAllCustomFiles = () => {
    saveCustomFiles([]);
    toast.success("All manual study guides cleared successfully.");
    setShowConfirmDeleteAll(false);
  };

  const getFileIcon = (ext: string) => {
    const extension = ext.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
      return <ImageIcon className="w-5 h-5 text-pink-500" />;
    } else if (["pdf", "doc", "docx", "txt", "rtf", "md"].includes(extension)) {
      return <FileText className="w-5 h-5 text-indigo-500" />;
    } else if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
      return <FileCode className="w-5 h-5 text-amber-500" />;
    } else {
      return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "Unassociated Material";
    const sub = subjects.find((s) => s.id === subjectId);
    return sub ? sub.name : "Unassociated Material";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold font-sans text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          Study Materials & Uploads
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload and manage textbooks, reference notes, past papers, and review slides. Files are associated with respective syllabus tracks.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-200 cursor-pointer ${
          dragOver
            ? "border-indigo-500 bg-indigo-50/40 scale-[0.99] shadow-inner"
            : "border-slate-200 hover:border-slate-300 bg-white"
        }`}
      >
        <input
          type="file"
          id="file-upload-input"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <label htmlFor="file-upload-input" className="cursor-pointer block space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-slate-800 block">
              Drag & drop files here, or <span className="text-indigo-600 underline">browse</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block uppercase">
              Supports PDFs, Images, TXT, Word, and zip archives (Up to 15 MB)
            </span>
          </div>
        </label>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files by name or task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-bold pl-10 pr-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-400 font-mono font-bold uppercase shrink-0">Filter Track:</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="p-2 border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-700 text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
          >
            <option value="all">📚 All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                📚 {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Uploaded Files grid */}
      {filteredFiles.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center">
          <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">No uploaded files registered</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Upload files in the zone above or add attachments when tracking task study sessions to build your digital study library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFiles.map((file) => {
            const isCustom = file.id.startsWith("upload_");

            return (
              <div
                key={file.id}
                className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-start gap-3 hover:shadow-md hover:border-indigo-100 transition-all group"
              >
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 group-hover:bg-indigo-50 group-hover:border-indigo-100/30 transition-colors shrink-0">
                  {getFileIcon(file.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs sm:text-sm text-slate-800 block truncate group-hover:text-indigo-600 transition-colors" title={file.name}>
                    {file.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono font-bold uppercase leading-tight">
                    <span>{file.size}</span>
                    <span>•</span>
                    <span className="text-indigo-600">{getSubjectName(file.subjectId)}</span>
                  </div>

                  {file.associatedTaskTitle && (
                    <div className="mt-2 text-[10px] bg-slate-100/80 px-2 py-0.5 rounded text-slate-500 font-sans border border-slate-200/40 w-max max-w-full truncate" title={`Sourced from task: ${file.associatedTaskTitle}`}>
                      📎 Sourced: {file.associatedTaskTitle}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>Uploaded: {new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* File operation actions */}
                <div className="flex flex-col gap-1.5 shrink-0 justify-between self-stretch">
                  <Tooltip content="Download file" position="top">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.success(`Simulating download of document "${file.name}"...`);
                      }}
                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-100/50 rounded-lg transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </Tooltip>

                  {isCustom ? (
                    <Tooltip content="Delete uploaded file" position="top">
                      <button
                        onClick={() => handleDeleteCustomFile(file.id)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-100/50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Task attachments must be deleted from task records directly." position="top">
                      <span className="p-1.5 border border-transparent text-slate-300 text-[9px] font-mono cursor-help select-none">
                        Locked
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete All Button in bottom right */}
      {customFiles.length > 0 && (
        <div className="flex justify-end pt-4">
          <button
            onClick={() => setShowConfirmDeleteAll(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Manual Uploads
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmDeleteAll}
        onClose={() => setShowConfirmDeleteAll(false)}
        title="Delete All Manual Uploads?"
        icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
        maxWidthClass="max-w-md"
      >
        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
          Are you sure you want to delete all manual uploads? This action is irreversible and will remove all custom study materials from your local library. Task-attached documents will not be affected.
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            onClick={() => setShowConfirmDeleteAll(false)}
            className="px-3.5 py-2 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAllCustomFiles}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Yes, Delete All
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default UploadsPage;
