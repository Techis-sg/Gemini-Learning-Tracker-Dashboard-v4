import React, { useState, useRef } from "react";
import {
  IconUpload as Upload,
  IconSparkles as Sparkles,
  IconAlertCircle as AlertCircle,
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconCheck as Check,
  IconCopy as Copy,
  IconZip as ZipIcon,
  IconFileCheck as FileCheck
} from '@tabler/icons-react';
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, Modal } from "@utils/index";
import { toast } from "react-hot-toast";
import JSZip from "jszip";

interface AIImporterProps {
  onImportSuccess: (dashboardId: string) => void;
  onClose: () => void;
}

export default function AIImporter({ onImportSuccess, onClose }: AIImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  
  // ZIP extracted files text
  const [zipFilesData, setZipFilesData] = useState<{
    planMetaText: string;
    subjectsCsvText: string;
    scheduleCsvText: string;
    goalsJsonText: string;
    resourcesCsvText: string;
  }>({
    planMetaText: "",
    subjectsCsvText: "",
    scheduleCsvText: "",
    goalsJsonText: "",
    resourcesCsvText: "",
  });

  const [foundFiles, setFoundFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptTemplate = `# StudyOS — Universal Study Plan Generator Prompt
## Copy this entire prompt into any AI (ChatGPT, Claude, Gemini) and fill in your details

---

You are a study plan architect. I will give you my personal details and goals. You will generate exactly **5 structured files** that a study tracking web app will parse to build my personalized dashboard, database, and progress tracker.

## My Details (fill these in before sending)

\`\`\`
PLAN NAME         : [e.g. "College Term 5 + SWE Prep", "UPSC 2027 Study Roadmap"]
YOUR NAME         : [your name]
EXAM / GOAL       : [e.g. "GATE CSE 2027", "GRE 2026", "UPSC 2027", "Software Engineer Job", "Data Scientist Role"]
PRIMARY TARGET    : [e.g. "AIR < 200", "Score 320+", "Crack top-50 company", "Land remote job"]
START DATE        : [YYYY-MM-DD]
THEORY DEADLINE   : [YYYY-MM-DD — last day to finish all new content]
EXAM / GOAL DATE  : [YYYY-MM-DD]

BLOCKS (how you want to split your study):
  Block 1: [e.g. "Exam Preparation"] — [morning / afternoon]
  Block 2: [e.g. "Job Skills"] — [evening / night]
  (add Block 3 if needed)

SUBJECTS TO COVER (list all, which block each belongs to, rough weeks needed):
  [e.g. Linear Algebra — Block 1 — 2 weeks — done/not started/in progress]
  [e.g. System Design — Block 2 — 3 weeks — in progress 60%]
  [list all subjects...]

CURRENT STATUS PER SUBJECT:
  [subject]: [not_started / in_progress X% / done]

DSA GOAL (if applicable):
  Platform: [e.g. algomaster.io / LeetCode / GFG]
  Total problems target: [e.g. 300]
  Daily minimum: [e.g. 1 hour / 5 problems]

RESOURCES I AM USING:
  [e.g. GoClasses for OS, algomaster.io for DSA, GFG for DBMS, NPTEL for Networks]
\`\`\`

---

## Output Required — Generate All 5 Files Exactly As Specified Below

---

### FILE 1: \`plan_meta.json\`

Generate a JSON file with this exact structure. Do not add or remove top-level keys.

\`\`\`json
{
  "schema_version": "1.0",
  "plan": {
    "id": "plan_001",
    "name": "<PLAN NAME>",
    "owner": "<YOUR NAME>",
    "exam": "<EXAM / GOAL>",
    "primary_target": "<PRIMARY TARGET>",
    "secondary_target": "<any secondary goal or null>",
    "start_date": "<YYYY-MM-DD>",
    "theory_deadline": "<YYYY-MM-DD>",
    "exam_date": "<YYYY-MM-DD>",
    "total_days": <calculated integer>,
    "approach": "sequential"
  },
  "blocks": [
    {
      "id": "b1",
      "name": "<Block 1 name>",
      "color": "#154360",
      "time_of_day": "<morning/afternoon/evening/night>",
      "description": "<one line description>"
    },
    {
      "id": "b2",
      "name": "<Block 2 name>",
      "color": "#145A32",
      "time_of_day": "<morning/afternoon/evening/night>",
      "description": "<one line description>"
    }
  ],
  "phases": [
    {
      "id": "ph1",
      "name": "<Phase name e.g. Foundation>",
      "start_date": "<YYYY-MM-DD>",
      "end_date": "<YYYY-MM-DD>",
      "description": "<one line>"
    }
  ],
  "daily_schedule": {
    "study_start_time": "10:00",
    "block1_slot": "10:00-13:00",
    "block2_slot": "19:00-22:00",
    "dsa_slot": "09:00-10:00",
    "revision_slot": "23:00-00:30"
  },
  "dsa_track": {
    "enabled": true,
    "platform": "<platform name or null>",
    "total_target": <integer or null>,
    "daily_minimum_mins": <integer>
  },
  "revision_config": {
    "daily_pyq_target": 10,
    "weekly_revision_day": "Sunday",
    "error_notebook": true,
    "spaced_repetition": true
  }
}
\`\`\`

---

### FILE 2: \`subjects.csv\`

Generate a CSV with these exact column headers. One row per subject/topic track.

\`\`\`
subject_id,name,block_id,phase_id,category,start_date,end_date,planned_days,priority,exam_weightage,status,progress_pct,accuracy_target_pct,resource_primary,resource_secondary,notes
\`\`\`

**Column rules:**
- \`subject_id\`: s01, s02, s03... (sequential, no gaps)
- \`block_id\`: must match an id from plan_meta.json blocks (b1, b2, b3...)
- \`phase_id\`: must match an id from plan_meta.json phases (ph1, ph2...)
- \`category\`: one of \`mathematics\`, \`cs_core\`, \`gate_da\`, \`dsa\`, \`job_skills\`, \`language\`, \`framework\`, \`devops\`, \`ai_ml\`, \`project\`, \`aptitude\`, \`revision\`
- \`start_date\`, \`end_date\`: YYYY-MM-DD
- \`planned_days\`: integer (working days allocated)
- \`priority\`: one of \`critical\`, \`high\`, \`medium\`, \`low\`
- \`exam_weightage\`: marks range string like "7-10" or "high/medium/low" or "N/A"
- \`status\`: one of \`not_started\`, \`in_progress\`, \`done\`, \`paused\`
- \`progress_pct\`: 0-100 integer
- \`accuracy_target_pct\`: 0-100 integer for PYQ/test accuracy target (0 if not applicable)
- \`resource_primary\`: main resource name (short, no commas)
- \`resource_secondary\`: secondary resource or empty
- \`notes\`: short note, no commas (use semicolons inside)

---

### FILE 3: \`schedule.csv\`

Generate a CSV with daily tasks for the first **4 weeks only** (the app will infer the rest from the subject pipeline). One row per task per day. Days can have 2-4 rows (one per block/track).

\`\`\`
date,day_name,week_num,subject_id,block_id,topic,task_type,target_count,status,notes
\`\`\`

**Column rules:**
- \`date\`: YYYY-MM-DD
- \`day_name\`: Monday/Tuesday/.../Sunday
- \`week_num\`: 1/2/3/4...
- \`subject_id\`: must match subjects.csv
- \`block_id\`: b1/b2/dsa/revision
- \`topic\`: concise topic string (under 80 chars)
- \`task_type\`: one of \`theory\`, \`practice\`, \`revision\`, \`mock_test\`, \`project\`, \`dsa\`, \`pyq\`
- \`target_count\`: integer (problems to solve, pages to read — 0 if theory day)
- \`status\`: \`not_started\` for all new entries
- \`notes\`: optional short note

**Rules:**
- Sundays: only \`revision\` and \`pyq\` type rows
- Each non-Sunday day: minimum 3 rows (block1 theory + block2 skill + dsa)
- Do not generate beyond week 4 — the app handles the rest

---

### FILE 4: \`goals.json\`

Generate goals for every month in the plan. Each month has block-wise targets and a checkpoint question.

\`\`\`json
{
  "schema_version": "1.0",
  "weekly_goals": [
    {
      "week_num": 1,
      "week_start": "<YYYY-MM-DD>",
      "week_end": "<YYYY-MM-DD>",
      "b1_target": "<what to complete in Block 1 this week>",
      "b2_target": "<what to complete in Block 2 this week>",
      "dsa_target": "<DSA goal this week>",
      "checkpoint": "<one question to verify the week went well>"
    }
  ],
  "monthly_goals": [
    {
      "month": "<Month YYYY e.g. July 2026>",
      "month_start": "<YYYY-MM-DD>",
      "month_end": "<YYYY-MM-DD>",
      "b1_subjects_to_close": ["<subject_id>", "<subject_id>"],
      "b2_milestones": ["<milestone 1>", "<milestone 2>"],
      "dsa_cumulative_target": <integer>,
      "accuracy_checkpoints": [
        {"subject_id": "<id>", "target_pct": <integer>}
      ],
      "milestone_statement": "<one sentence milestone for this month>"
    }
  ]
}
\`\`\`

Generate weekly_goals for the first 4 weeks only. Generate monthly_goals for every month from start to exam date.

---

### FILE 5: \`resources.csv\`

Generate a resource list for every subject. One row per resource.

\`\`\`
resource_id,subject_id,resource_type,title,url_or_location,priority,notes
\`\`\`

**Column rules:**
- \`resource_id\`: r001, r002... (sequential)
- \`subject_id\`: must match subjects.csv (use "all" for general resources)
- \`resource_type\`: one of \`textbook\`, \`video_course\`, \`platform\`, \`pyq_set\`, \`website\`, \`tool\`, \`cheatsheet\`, \`community\`
- \`title\`: name of the resource
- \`url_or_location\`: URL or description like "GoClasses recorded lectures"
- \`priority\`: \`primary\`, \`secondary\`, \`reference\`
- \`notes\`: short note (no commas)

---

## Strict Rules for Output

1. Output all 5 files. Do not skip any.
2. Use exact column names as specified. The parser is case-sensitive.
3. No commas inside field values in CSV files. Use semicolons instead.
4. All dates in YYYY-MM-DD format. No exceptions.
5. All status fields use only the allowed enum values listed above.
6. subject_id in schedule.csv and goals.json must exactly match subject_id in subjects.csv.
7. block_id values must exactly match the ids defined in plan_meta.json blocks.
8. Do not add extra columns. Do not remove any columns.
9. For subjects that are already done, set status=done, progress_pct=100, start_date and end_date as past dates.
10. Keep notes fields short (under 100 chars). No narrative text.

---

## Output Format

Return each file as a clearly labeled code block:

\`\`\`
=== FILE: plan_meta.json ===
[json content]

=== FILE: subjects.csv ===
[csv content]

=== FILE: schedule.csv ===
[csv content]

=== FILE: goals.json ===
[json content]

=== FILE: resources.csv ===
[csv content]
\`\`\`

Generate now based on the details I filled in above.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptTemplate);
    toast.success("AI Study Plan template copied to clipboard!");
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

  const processFiles = async (files: File[]) => {
    setError(null);

    // If there is a zip file, process it first and prioritize it
    const zipFile = files.find(f => f.name.toLowerCase().endsWith(".zip"));
    if (zipFile) {
      setFile(zipFile);
      await handleZipFile(zipFile);
      return;
    }

    setLoading(true);
    setProgressStep("Reading and parsing uploaded files...");

    let newZipFilesData = { ...zipFilesData };
    let newFoundFiles = [...foundFiles];

    for (const selectedFile of files) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      
      // STRICT FILTER: Only accept zip, json, csv
      if (ext !== "zip" && ext !== "json" && ext !== "csv") {
        setError("StudyOS only accepts .zip bundles, or individual .json and .csv planner files. Images are not supported here.");
        toast.error(`Invalid file type: ${selectedFile.name}. Please upload a .zip, .json, or .csv file.`);
        continue;
      }

      setFile(selectedFile);

      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("File read error"));
          reader.readAsText(selectedFile);
        });

        if (ext === "json") {
          try {
            const parsed = JSON.parse(text);
            if (parsed.weekly_goals || parsed.monthly_goals || Array.isArray(parsed)) {
              newZipFilesData.goalsJsonText = text;
              if (!newFoundFiles.includes("goals.json")) {
                newFoundFiles.push("goals.json");
              }
              toast.success("Loaded goals.json successfully!");
            } else {
              newZipFilesData.planMetaText = text;
              if (!newFoundFiles.includes("plan_meta.json")) {
                newFoundFiles.push("plan_meta.json");
              }
              toast.success("Loaded plan_meta.json successfully!");
            }
          } catch (err) {
            setError(`Invalid JSON format in ${selectedFile.name}`);
          }
        } else if (ext === "csv") {
          const lowerName = selectedFile.name.toLowerCase();
          if (lowerName.includes("subject")) {
            newZipFilesData.subjectsCsvText = text;
            if (!newFoundFiles.includes("subjects.csv")) {
              newFoundFiles.push("subjects.csv");
            }
            toast.success("Loaded subjects.csv successfully!");
          } else if (lowerName.includes("resource")) {
            newZipFilesData.resourcesCsvText = text;
            if (!newFoundFiles.includes("resources.csv")) {
              newFoundFiles.push("resources.csv");
            }
            toast.success("Loaded resources.csv successfully!");
          } else if (lowerName.includes("schedule")) {
            newZipFilesData.scheduleCsvText = text;
            if (!newFoundFiles.includes("schedule.csv")) {
              newFoundFiles.push("schedule.csv");
            }
            toast.success("Loaded schedule.csv successfully!");
          } else {
            // content heuristics
            if (text.includes("subject_id") && text.includes("exam_weightage")) {
              newZipFilesData.subjectsCsvText = text;
              if (!newFoundFiles.includes("subjects.csv")) {
                newFoundFiles.push("subjects.csv");
              }
              toast.success("Loaded subjects.csv successfully!");
            } else if (text.includes("resource_id")) {
              newZipFilesData.resourcesCsvText = text;
              if (!newFoundFiles.includes("resources.csv")) {
                newFoundFiles.push("resources.csv");
              }
              toast.success("Loaded resources.csv successfully!");
            } else if (text.includes("date") && text.includes("topic")) {
              newZipFilesData.scheduleCsvText = text;
              if (!newFoundFiles.includes("schedule.csv")) {
                newFoundFiles.push("schedule.csv");
              }
              toast.success("Loaded schedule.csv successfully!");
            } else {
              setError(`Could not determine format of ${selectedFile.name}. Ensure CSV file has standard headers.`);
            }
          }
        }
      } catch (err: any) {
        setError(`Failed to read ${selectedFile.name}: ${err.message}`);
      }
    }

    setZipFilesData(newZipFilesData);
    setFoundFiles(newFoundFiles);
    setLoading(false);
    setProgressStep("");
  };

  const handleZipFile = async (selectedFile: File) => {
    setLoading(true);
    setProgressStep("Reading and unpacking .zip study bundle...");
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(selectedFile);
      
      let planMetaText = "";
      let subjectsCsvText = "";
      let scheduleCsvText = "";
      let goalsJsonText = "";
      let resourcesCsvText = "";
      const detected: string[] = [];

      const getZipFileEntry = (targetName: string) => {
        const key = Object.keys(zipData.files).find(
          path => path.toLowerCase().endsWith(targetName.toLowerCase()) && !zipData.files[path].dir
        );
        return key ? zipData.file(key) : null;
      };

      const metaFile = getZipFileEntry("plan_meta.json");
      if (metaFile) {
        planMetaText = await metaFile.async("string");
        detected.push("plan_meta.json");
      }

      const subjectsFile = getZipFileEntry("subjects.csv");
      if (subjectsFile) {
        subjectsCsvText = await subjectsFile.async("string");
        detected.push("subjects.csv");
      }

      const scheduleFile = getZipFileEntry("schedule.csv");
      if (scheduleFile) {
        scheduleCsvText = await scheduleFile.async("string");
        detected.push("schedule.csv");
      }

      const goalsFile = getZipFileEntry("goals.json");
      if (goalsFile) {
        goalsJsonText = await goalsFile.async("string");
        detected.push("goals.json");
      }

      const resourcesFile = getZipFileEntry("resources.csv");
      if (resourcesFile) {
        resourcesCsvText = await resourcesFile.async("string");
        detected.push("resources.csv");
      }

      setZipFilesData({
        planMetaText,
        subjectsCsvText,
        scheduleCsvText,
        goalsJsonText,
        resourcesCsvText,
      });

      setFoundFiles(detected);
      toast.success(`Unpacked & extracted ${detected.length} files successfully!`);
    } catch (err: any) {
      setError("Failed to parse zip archive: " + err.message);
    } finally {
      setLoading(false);
      setProgressStep("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setProgressStep("Initializing StudyOS Study Space...");

    try {
      if (!zipFilesData.planMetaText || !zipFilesData.subjectsCsvText || !zipFilesData.scheduleCsvText || !zipFilesData.goalsJsonText || !zipFilesData.resourcesCsvText) {
        throw new Error("Please upload a valid .zip bundle or individual files containing all 5 files: plan_meta.json, subjects.csv, schedule.csv, goals.json, and resources.csv.");
      }

      setProgressStep("Mapping data fields and seeding databases...");
      const response = await apiFetch("/api/dashboard/import-files", {
        method: "POST",
        body: JSON.stringify(zipFilesData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process and seed your study dashboard.");
      }

      setProgressStep("Configuring charts, timetables, and timelines...");
      toast.success("Welcome to your interactive study space!");
      onImportSuccess(data.dashboardId);
    } catch (err: any) {
      setError(err.message || "An error occurred while importing your syllabus.");
    } finally {
      setLoading(false);
      setProgressStep("");
    }
  };

  const hasRequiredFiles = !!(
    zipFilesData.planMetaText &&
    zipFilesData.subjectsCsvText &&
    zipFilesData.scheduleCsvText &&
    zipFilesData.goalsJsonText &&
    zipFilesData.resourcesCsvText
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="StudyOS Syllabus & Planner Importer"
      icon={<Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Top visual instructions bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Need a study plan template?</h4>
            <p className="text-[10px] text-slate-500 max-w-sm font-medium leading-relaxed">
              Copy our standard AI architect prompt below, paste it into any LLM to generate the bundle files, then import the resulting files to begin!
            </p>
          </div>
          <button
            onClick={handleCopyPrompt}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Prompt
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-xs font-bold text-rose-700 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive ? "border-indigo-500 bg-indigo-50/40 shadow-inner" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            accept=".zip,.json,.csv"
            multiple
          />
          {file ? (
            <div className="flex flex-col items-center gap-2 text-slate-800">
              <ZipIcon className="w-10 h-10 text-indigo-600" />
              <span className="font-bold text-xs">{file.name}</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100/50 px-2.5 py-1 rounded-lg font-mono font-bold uppercase tracking-wider">
                {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Bundle Loaded"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-800">
              <Upload className="w-10 h-10 text-indigo-600 animate-bounce" />
              <span className="font-bold text-xs">Drag & Drop study_plan.zip, or individual .json/.csv here</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block uppercase">
                Supports selecting/dragging multiple files together
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Files checklist mapper */}
        <div className="p-4 border border-slate-200 bg-white rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Planner Files Mapping Status</span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              {foundFiles.filter(f => ["plan_meta.json", "subjects.csv", "schedule.csv", "goals.json", "resources.csv"].includes(f)).length}/5 Required
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: "plan_meta.json", label: "plan_meta.json", required: true, desc: "Syllabus Plan Metadata" },
              { id: "subjects.csv", label: "subjects.csv", required: true, desc: "Syllabus Subject Modules" },
              { id: "schedule.csv", label: "schedule.csv", required: true, desc: "4-Week Daily Schedule Tasks" },
              { id: "goals.json", label: "goals.json", required: true, desc: "Weekly & Monthly Milestones" },
              { id: "resources.csv", label: "resources.csv", required: true, desc: "Subject Prep Resources" },
            ].map((item) => {
              const isLoaded = foundFiles.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 p-2.5 border rounded-xl transition-all ${
                    isLoaded
                      ? "border-emerald-100 bg-emerald-50/20 text-emerald-800"
                      : "border-slate-100 bg-slate-50/50 text-slate-400"
                  }`}
                >
                  <div className={`p-1 rounded-full flex items-center justify-center ${
                    isLoaded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {isLoaded ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      <span className={isLoaded ? "text-slate-800" : "text-slate-500"}>{item.label}</span>
                      {item.required && (
                        <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1 py-0.2 rounded font-black uppercase tracking-wider scale-95 origin-left">
                          Req
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Loader Progress View during extraction or database seeding */}
        {loading && progressStep && (
          <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700">Syncing and building Space...</p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider font-mono">{progressStep}</p>
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-200 font-bold text-xs bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !hasRequiredFiles}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Populating Space...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                Initialize Dashboard Tracker
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
