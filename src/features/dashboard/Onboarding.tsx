import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { 
  IconSparkles as Sparkles, 
  IconLogout as LogOut, 
  IconFileText as FileIcon, 
  IconTrash as Trash, 
  IconCircleX as CircleX,
  IconLoader2 as Loader2,
  IconCheck as Check
} from "@tabler/icons-react";
import { apiFetch, toast } from "@utils/index";

interface OnboardingProps {
  user: any;
  onLogout: () => void;
  onImportSuccess: (newDashboardId: string) => void;
}

interface QueuedFile {
  name: string;
  size: number;
  content: string; // text content of the file
  type: "json" | "csv";
}

export function Onboarding({ user, onLogout, onImportSuccess }: OnboardingProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<Record<string, QueuedFile>>({});
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFileList = async (files: FileList) => {
    const fileList = Array.from(files);
    const newFiles = { ...queuedFiles };
    let hasZip = false;

    // Check if any ZIP is uploaded. If yes, unzip and extract files
    const zipFile = fileList.find(f => f.name.toLowerCase().endsWith(".zip"));
    if (zipFile) {
      hasZip = true;
      setLoading(true);
      setProgressStep("Reading and unpacking .zip study bundle...");
      try {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(zipFile);
        const expectedFiles = [
          "plan_meta.json",
          "subjects.csv",
          "schedule.csv",
          "goals.json",
          "resources.csv"
        ];

        let extractedCount = 0;
        for (const name of expectedFiles) {
          const zipEntry = zipData.file(name);
          if (zipEntry) {
            const content = await zipEntry.async("string");
            const ext = name.split(".").pop() as "json" | "csv";
            // Mock a file size based on string length for listing
            const mockSize = content.length;
            newFiles[name] = {
              name,
              size: mockSize,
              content,
              type: ext
            };
            extractedCount++;
          }
        }

        if (extractedCount === 0) {
          toast.error("No valid study planner files found inside the zip. Ensure it contains plan_meta.json, subjects.csv, and schedule.csv.");
        } else {
          toast.success(`Successfully unpacked ${extractedCount} study files from ZIP!`);
        }
      } catch (err: any) {
        toast.error("Failed to extract ZIP file: " + err.message);
      } finally {
        setLoading(false);
        setProgressStep("");
      }
    } else {
      // Process individual files
      for (const file of fileList) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext !== "json" && ext !== "csv") {
          toast.error(`Unsupported file: ${file.name}. Only .json, .csv or .zip files are accepted.`);
          continue;
        }

        try {
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error("File read error"));
            reader.readAsText(file);
          });

          // Standardize or map name based on heuristics
          let mappedName = file.name;
          const lowerName = file.name.toLowerCase();

          if (ext === "json") {
            try {
              const parsed = JSON.parse(text);
              if (parsed.weekly_goals || parsed.monthly_goals || Array.isArray(parsed)) {
                mappedName = "goals.json";
              } else {
                mappedName = "plan_meta.json";
              }
            } catch (err) {
              toast.error(`Invalid JSON in file ${file.name}`);
              continue;
            }
          } else if (ext === "csv") {
            if (lowerName.includes("subject")) {
              mappedName = "subjects.csv";
            } else if (lowerName.includes("resource")) {
              mappedName = "resources.csv";
            } else if (lowerName.includes("schedule")) {
              mappedName = "schedule.csv";
            } else {
              // Heuristics for headers
              if (text.includes("subject_id") && text.includes("exam_weightage")) {
                mappedName = "subjects.csv";
              } else if (text.includes("resource_id")) {
                mappedName = "resources.csv";
              } else if (text.includes("date") && text.includes("topic")) {
                mappedName = "schedule.csv";
              }
            }
          }

          newFiles[mappedName] = {
            name: mappedName,
            size: file.size,
            content: text,
            type: ext as "json" | "csv"
          };
          toast.success(`Added ${mappedName} to queue!`);
        } catch (err: any) {
          toast.error(`Failed to read file ${file.name}: ${err.message}`);
        }
      }
    }

    setQueuedFiles(newFiles);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileList(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFileList(e.target.files);
    }
  };

  const removeFile = (filename: string) => {
    const updated = { ...queuedFiles };
    delete updated[filename];
    setQueuedFiles(updated);
    toast.success(`Removed ${filename} from queue.`);
  };

  const handleImport = async () => {
    setError(null);
    const required = ["plan_meta.json", "subjects.csv", "schedule.csv"];
    const missing = required.filter(fn => !queuedFiles[fn]);

    if (missing.length > 0) {
      const errMessage = `Missing required files: ${missing.join(", ")}. Please upload them to continue.`;
      setError(errMessage);
      toast.error(errMessage);
      return;
    }

    setLoading(true);
    setProgressStep("Analyzing planner configuration with AI...");

    try {
      // Simulate/trigger full-stack endpoint
      const response = await apiFetch("/api/dashboard/import-files", {
        method: "POST",
        body: JSON.stringify({
          planMetaText: queuedFiles["plan_meta.json"]?.content || "",
          subjectsCsvText: queuedFiles["subjects.csv"]?.content || "",
          scheduleCsvText: queuedFiles["schedule.csv"]?.content || "",
          goalsJsonText: queuedFiles["goals.json"]?.content || "",
          resourcesCsvText: queuedFiles["resources.csv"]?.content || "",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process imported files.");
      }

      const data = await response.json();
      toast.success("AI learning plan imported and compiled successfully!");
      onImportSuccess(data.dashboardId);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during database import.");
      toast.error(err.message || "Failed to import database.");
    } finally {
      setLoading(false);
      setProgressStep("");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const queuedList = Object.values(queuedFiles);
  const hasRequiredFiles = !!(queuedFiles["plan_meta.json"] && queuedFiles["subjects.csv"] && queuedFiles["schedule.csv"]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-800 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Header bar */}
        <div className="flex items-center justify-between border border-slate-100 bg-white p-6 rounded-[24px] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-600 fill-indigo-600/10" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">Welcome to StudyStack</h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">Let's build your first study workspace.</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>

        {/* How this works */}
        <div className="bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white border border-indigo-100/40 p-6 rounded-[24px] shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">✨ How this works</h2>
          <ol className="space-y-3 text-xs font-medium text-slate-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-indigo-600 font-bold">1.</span>
              <span>Upload your planner bundle — 5 files (<code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono text-indigo-600">plan_meta.json</code>, <code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono text-indigo-600">subjects.csv</code>, <code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono text-indigo-600">schedule.csv</code>, <code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono text-indigo-600">goals.json</code>, <code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono text-indigo-600">resources.csv</code>) or a single <code className="bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100/50 font-mono text-indigo-600">.zip</code>.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-600 font-bold">2.</span>
              <span>Our AI parses, validates and stores it as a dedicated study workspace.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-600 font-bold">3.</span>
              <span>Your dashboard, tasks, subjects and interactive progress trackers unlock instantly.</span>
            </li>
          </ol>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border border-dashed rounded-[24px] p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
            dragActive 
              ? "border-indigo-500 bg-indigo-50/30 scale-[0.99]" 
              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/30"
          } shadow-sm`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".zip,.json,.csv"
            multiple
          />
          <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-[20px] flex items-center justify-center shadow-inner">
            <Sparkles className="w-8 h-8 text-indigo-600 fill-indigo-100" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-base md:text-lg font-extrabold tracking-tight text-slate-800">
              Drop your 5 planner files or a .zip package
            </h3>
            <p className="text-[11px] font-mono font-medium text-slate-400">
              plan_meta.json · subjects.csv · schedule.csv · goals.json · resources.csv
            </p>
          </div>
        </div>

        {/* Queued files display */}
        {queuedList.length > 0 && (
          <div className="border border-slate-100 bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Queued Files ({queuedList.length})
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {Object.keys(queuedFiles).filter(fn => ["plan_meta.json", "subjects.csv", "schedule.csv"].includes(fn)).length}/3 Required
              </span>
            </div>
            
            <div className="p-5 divide-y divide-slate-50 space-y-3">
              {queuedList.map((file) => (
                <div key={file.name} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-700">{file.name}</span>
                      {["plan_meta.json", "subjects.csv", "schedule.csv"].includes(file.name) && (
                        <span className="ml-2 text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">{formatSize(file.size)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.name);
                      }}
                      className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <CircleX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Error messaging inside container */}
            {error && (
              <div className="px-5 py-3 bg-rose-50/50 border-t border-slate-100 text-rose-600 font-semibold text-xs">
                ⚠️ {error}
              </div>
            )}

            {/* Bottom action button inside container */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/20">
              {loading ? (
                <div className="w-full py-3.5 bg-indigo-500/10 text-indigo-600 font-semibold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{progressStep || "Parsing study tracker with AI..."}</span>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImport();
                  }}
                  disabled={!hasRequiredFiles}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all cursor-pointer text-center"
                >
                  Import {queuedList.length} files →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay for zip unpacking, etc. */}
        {loading && !progressStep && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-mono font-semibold text-slate-400">Unpacking uploaded files...</span>
          </div>
        )}

      </div>
    </div>
  );
}
