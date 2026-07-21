import React, { useState, useEffect } from "react";
import { Subject } from "@/types";
import { IconPlus as Plus, IconEdit as Edit2, IconTrash as Trash, IconBook as BookOpen, IconGlobe as Globe, IconChevronRight as ChevronRight, IconChevronDown as ChevronDown, IconExternalLink as ExternalLink, IconDotsVerticalFilled as MoreVertical } from '@tabler/icons-react';
import { Tooltip, DataTable } from "@components/ui";
import { Modal } from "@utils/index";
import { ColumnDef } from "@tanstack/react-table";
import { parseResource, ParsedLink } from "../utils/resourceUtils";
import AddSubject from "./AddSubject";
import UpdateSubject from "./UpdateSubject";
import DeleteSubject from "./DeleteSubject";

interface SubjectDatatableProps {
  subjects: Subject[];
  activeDashboardId: string;
  onSuccess: () => void;
}

function formatTimelineString(timeline?: string): string {
  if (!timeline) return "";
  return timeline.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_match, y, m, d) => {
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (isNaN(dateObj.getTime())) return _match;
    const monthName = dateObj.toLocaleDateString("en-US", { month: "long" });
    const formattedDay = String(d).padStart(2, "0");
    return `${monthName} ${formattedDay}, ${y}`;
  });
}

function parseTopicsList(text?: string): string[] {
  if (!text || !text.trim() || text.trim() === "—") return [];
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SubjectDatatable({
  subjects,
  activeDashboardId,
  onSuccess,
}: SubjectDatatableProps) {
  // State for actions dropdown
  const [openActionSubId, setOpenActionSubId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [viewDetailsSubject, setViewDetailsSubject] = useState<Subject | null>(null);

  // Redirect interceptor state
  const [activeInterceptLink, setActiveInterceptLink] = useState<ParsedLink | null>(null);

  // Collapse row state
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Record<string, boolean>>({});

  // Toggle collapsible row
  const toggleRow = (subId: string) => {
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (sub: Subject) => {
    setDeletingSubject(sub);
    setIsDeleteModalOpen(true);
  };

  const columns: ColumnDef<Subject>[] = [
    {
      accessorKey: "name",
      header: "Subject Name",
      size: 260,
      cell: ({ row }) => {
        const sub = row.original;
        const isExpanded = row.getIsExpanded();
        return (
          <div className="flex items-start gap-2">
            <button
              type="button"
              title={isExpanded ? "Collapse Materials" : "Expand Materials"}
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div className="overflow-hidden">
              <span className="text-slate-800 text-sm font-bold block break-words whitespace-normal leading-tight">
                {sub.name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "timeline",
      header: "Timeline",
      size: 220,
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="font-mono">
            <span className="text-slate-700 text-xs font-bold block whitespace-normal">
              {formatTimelineString(sub.timeline)}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1 uppercase font-mono">
              📅 {sub.daysPlanned} days
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "percentage",
      header: "Coverage progress",
      size: 240,
      cell: ({ row }) => {
        const sub = row.original;
        const barColors = {
          "Completed": "bg-emerald-500",
          "In Progress": "bg-indigo-500",
          "Not Started": "bg-slate-300",
        };
        return (
          <div>
            <div className="flex items-center justify-between font-mono font-bold text-slate-700 text-[10px] mb-1.5">
              <span>{sub.percentage}% COVERED</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                sub.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                sub.status === "In Progress" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                "bg-slate-50 text-slate-500 border-slate-200"
              }`}>
                {sub.status}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColors[sub.status] || "bg-indigo-600"}`}
                style={{ width: `${sub.percentage}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      cell: ({ row }) => {
        const sub = row.original;
        const isOpen = openActionSubId === sub.id;
        const isNearBottom = row.index >= subjects.length - 2 || subjects.length <= 4;
        return (
          <div className="flex items-center justify-center">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionSubId(isOpen ? null : sub.id);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-center"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenActionSubId(null)} />
                  <div className={`absolute right-0 w-36 bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 z-50 text-left font-sans text-xs ${
                    isNearBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
                  }`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionSubId(null);
                        setViewDetailsSubject(sub);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-500" />
                      More Details
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionSubId(null);
                        openEditModal(sub);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionSubId(null);
                        openDeleteModal(sub);
                      }}
                      className="w-full px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-bold font-mono text-[10px] uppercase cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5 text-rose-500" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  const renderSubRow = (sub: Subject) => {
    const resourcesList = sub.resource
      ? sub.resource.split(",").map(res => parseResource(res.trim())).filter(p => p.label)
      : [];

    const videos = resourcesList.filter(r => r.type === "video");
    const textbooks = resourcesList.filter(r => r.type === "textbook");
    const otherLinks = resourcesList.filter(r => r.type === "link");

    const hasAnyResources = resourcesList.length > 0;

    return (
      <div className="bg-slate-50/40 p-5 border-b border-slate-100 pl-11">
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            Study Materials & Learning Resources
          </div>

          {!hasAnyResources ? (
            <p className="text-slate-400 text-[11px] font-mono italic">
              No material resources specified. Edit this subject track to register web links, portal files, or guide books.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Videos category */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1 font-mono">
                  📺 Video ({videos.length})
                </span>
                {videos.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic block">No videos registered</span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {videos.map((parsed, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveInterceptLink({
                            label: parsed.label,
                            url: parsed.url || "",
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-left bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer w-full"
                      >
                        <span className="shrink-0">{parsed.icon}</span>
                        <span className="truncate">{parsed.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Textbooks category */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1 font-mono">
                  📖 Text ({textbooks.length})
                </span>
                {textbooks.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic block">No textbooks registered</span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {textbooks.map((parsed, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm w-full"
                      >
                        <span className="shrink-0">{parsed.icon}</span>
                        <span className="truncate">{parsed.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Other category */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1 font-mono">
                  🔗 Other ({otherLinks.length})
                </span>
                {otherLinks.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic block">No other links registered</span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {otherLinks.map((parsed, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveInterceptLink({
                            label: parsed.label,
                            url: parsed.url || "",
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-left bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer w-full"
                      >
                        <span className="shrink-0">{parsed.icon}</span>
                        <span className="truncate">{parsed.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const uniqueBlocks = Array.from(
    new Set(subjects.map((s) => s.block).filter((b): b is string => Boolean(b) && b.trim().length > 0))
  );

  const defaultBlocks = uniqueBlocks.length > 0 ? uniqueBlocks : ["Block 1 - GATE", "Block 2 - Placements", "DSA"];

  const [activeBlockTab, setActiveBlockTab] = useState<string>(defaultBlocks[0]);

  // Ensure active tab stays valid if blocks change
  useEffect(() => {
    if (!defaultBlocks.includes(activeBlockTab)) {
      setActiveBlockTab(defaultBlocks[0]);
    }
  }, [subjects]);

  const dynamicTabs = defaultBlocks.map((blk) => {
    let icon = "📂";
    let title = `Track — ${blk}`;
    if (blk.toLowerCase().includes("b1") || blk.toLowerCase().includes("gate") || blk.toLowerCase().includes("core") || blk.toLowerCase().includes("theory") || blk.toLowerCase().includes("1")) {
      icon = "📘";
      title = `📘 ${blk} — Core Academic Theory`;
    } else if (blk.toLowerCase().includes("b2") || blk.toLowerCase().includes("placement") || blk.toLowerCase().includes("project") || blk.toLowerCase().includes("2")) {
      icon = "💻";
      title = `💻 ${blk} — Projects & Applications`;
    } else if (blk.toLowerCase().includes("dsa") || blk.toLowerCase().includes("code") || blk.toLowerCase().includes("algo")) {
      icon = "🚀";
      title = `🚀 ${blk} — Coding & Problem Solving`;
    }
    return {
      id: blk,
      label: `${icon} ${blk}`,
      title,
      bg: "bg-slate-50 text-slate-700 border-slate-200/50",
    };
  });

  const groupSubjects = subjects.filter(
    (s) => s.block === activeBlockTab || (s.block && s.block.toLowerCase() === activeBlockTab.toLowerCase())
  );

  const selectedGroup = dynamicTabs.find((t) => t.id === activeBlockTab) || dynamicTabs[0];

  return (
    <div className="bg-white border border-slate-100 p-6 shadow-sm rounded-3xl space-y-6">
      {/* Subject Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
            📚 Subject Tracks & Syllabus Coverage
          </h3>
          <p className="text-slate-500 text-xs font-mono mt-0.5">
            Configure subjects, timelines, marks distribution, and track percentage completion.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Subject Track
        </button>
      </div>

      {/* Switchable Dynamic Tabs Navbar */}
      <div className="flex flex-wrap border border-slate-100 p-1 bg-slate-50/50 rounded-2xl gap-1">
        {dynamicTabs.map((group) => {
          const isActive = activeBlockTab === group.id;
          return (
            <button
              key={group.id}
              onClick={() => setActiveBlockTab(group.id)}
              className={`flex-1 min-w-[120px] text-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-600"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* Selected Block Table Container */}
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className={`p-4 border rounded-2xl ${selectedGroup.bg} flex items-center justify-between shadow-sm`}>
          <span className="font-extrabold text-xs uppercase tracking-wider font-mono">
            {selectedGroup.title}
          </span>
          <span className="text-[10px] font-mono font-bold">
            {groupSubjects.length} subjects found
          </span>
        </div>

        <DataTable<Subject>
          columns={columns}
          data={groupSubjects}
          enablePagination={false}
          expanded={expandedSubjectIds}
          onExpandedChange={(next) => {
            setExpandedSubjectIds(next as Record<string, boolean>);
          }}
          renderSubRow={renderSubRow}
          containerClassName="border border-slate-100 overflow-x-auto rounded-2xl shadow-sm bg-white"
          tableClassName="w-full text-left border-collapse bg-white min-w-[800px]"
          emptyState={
            <div className="p-12 text-center text-slate-400 font-mono italic">
              No subjects configured for this block. Add a custom tracking subject.
            </div>
          }
        />
      </div>

      {isAddModalOpen && (
        <AddSubject
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          activeDashboardId={activeDashboardId}
          onSuccess={onSuccess}
        />
      )}

      {isEditModalOpen && (
        <UpdateSubject
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSubject(null);
          }}
          subject={editingSubject}
          activeDashboardId={activeDashboardId}
          onSuccess={onSuccess}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteSubject
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingSubject(null);
          }}
          subjectId={deletingSubject?.id || ""}
          activeDashboardId={activeDashboardId}
          subjectName={deletingSubject?.name || ""}
          onSuccess={onSuccess}
        />
      )}

      {/* --- SUBJECT MORE DETAILS MODAL --- */}
      <Modal
        isOpen={viewDetailsSubject !== null}
        onClose={() => setViewDetailsSubject(null)}
        title="Subject Track Details"
        icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
        maxWidthClass="max-w-xl"
      >
        {viewDetailsSubject && (
          <div className="font-sans space-y-4">
            {/* Header badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                  {viewDetailsSubject.block}
                </span>
                {viewDetailsSubject.weightage && (
                  <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 uppercase">
                    {viewDetailsSubject.weightage}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border uppercase ${
                viewDetailsSubject.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                viewDetailsSubject.status === "In Progress" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                "bg-slate-50 text-slate-600 border-slate-200"
              }`}>
                {viewDetailsSubject.status}
              </span>
            </div>

            {/* Subject Title & Timeline */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
                {viewDetailsSubject.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                📅 Timeline: <span className="font-bold text-slate-700">{formatTimelineString(viewDetailsSubject.timeline)}</span> ({viewDetailsSubject.daysPlanned} days planned)
              </p>
            </div>

            {/* Coverage Progress Bar */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-700">
                <span>COVERAGE PROGRESS</span>
                <span>{viewDetailsSubject.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    viewDetailsSubject.status === "Completed" ? "bg-emerald-500" : "bg-indigo-600"
                  }`}
                  style={{ width: `${viewDetailsSubject.percentage}%` }}
                />
              </div>
            </div>

            {/* Completed Topics Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold font-mono text-emerald-800 uppercase tracking-wider">
                  Completed Topics ({parseTopicsList(viewDetailsSubject.completedTopics).length})
                </h4>
              </div>
              {parseTopicsList(viewDetailsSubject.completedTopics).length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 font-mono text-xs italic">
                  No completed topics logged yet for this track.
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl space-y-2 max-h-48 overflow-y-auto">
                  {parseTopicsList(viewDetailsSubject.completedTopics).map((topic, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-emerald-950 leading-relaxed font-mono">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Topics Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                  Pending Topics ({parseTopicsList(viewDetailsSubject.pendingTopics).length})
                </h4>
              </div>
              {parseTopicsList(viewDetailsSubject.pendingTopics).length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 font-mono text-xs italic">
                  No pending topics remaining for this track!
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-2 max-h-48 overflow-y-auto">
                  {parseTopicsList(viewDetailsSubject.pendingTopics).map((topic, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-mono">
                      <span className="text-indigo-500 font-bold shrink-0">•</span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewDetailsSubject(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- REDIRECT INTERCEPTOR MODAL --- */}
      <Modal
        isOpen={activeInterceptLink !== null}
        onClose={() => setActiveInterceptLink(null)}
        title="External Link Navigation"
        icon={<ExternalLink className="w-5 h-5 text-indigo-600" />}
        maxWidthClass="max-w-md"
      >
        <div className="text-center">
          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            You are departing the learning tracker to view an external resource:
            <span className="block mt-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[11px] text-indigo-700 font-bold break-all">
              {activeInterceptLink?.label}
            </span>
            <span className="block mt-1 font-mono text-[10px] text-slate-400 break-all select-all">
              {activeInterceptLink?.url}
            </span>
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveInterceptLink(null)}
              className="flex-1 py-2 border border-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Go Back
            </button>
            {activeInterceptLink && (
              <a
                href={activeInterceptLink.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActiveInterceptLink(null)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-center font-bold text-xs uppercase rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Proceed <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SubjectDatatable;
