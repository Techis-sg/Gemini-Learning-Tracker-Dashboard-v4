import React, { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ExpandedState,
  getExpandedRowModel,
} from "@tanstack/react-table";
import {
  IconLoader2,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from "@tabler/icons-react";
import { PAGINATION_CONFIG } from "@config/app.config";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  
  // Filtering
  globalFilter?: string;
  onGlobalFilterChange?: (filter: string) => void;
  
  // Sorting
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  
  // Pagination
  enablePagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  paginationType?: "numbers" | "simple";
  paginationLabel?: string;
  
  // Row Interactivity
  onRowClick?: (row: TData, event: React.MouseEvent) => void;
  onRowContextMenu?: (row: TData, event: React.MouseEvent, index: number) => void;
  rowClassName?: (row: TData) => string;
  
  // Classes for layout and styling customization
  containerClassName?: string;
  tableClassName?: string;
  theadClassName?: string;
  trClassName?: string;
  thClassName?: string;
  tdClassName?: string;
  
  // Expanded Row Support (used by subjects grid)
  renderSubRow?: (row: TData) => React.ReactNode;
  expanded?: ExpandedState;
  onExpandedChange?: (expanded: ExpandedState) => void;
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  emptyState,
  globalFilter,
  onGlobalFilterChange,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  enablePagination = true,
  pageSize = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
  currentPage: externalCurrentPage,
  onPageChange: externalOnPageChange,
  paginationType = "numbers",
  paginationLabel = "items",
  onRowClick,
  onRowContextMenu,
  rowClassName,
  containerClassName = "border border-slate-100 overflow-x-auto rounded-2xl shadow-sm bg-white",
  tableClassName = "w-full text-left border-collapse bg-white min-w-[800px]",
  theadClassName = "",
  trClassName = "",
  thClassName = "",
  tdClassName = "",
  renderSubRow,
  expanded: externalExpanded,
  onExpandedChange: externalOnExpandedChange,
}: DataTableProps<TData>) {
  // Sorting internal state
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const sorting = externalSorting ?? internalSorting;

  // Expanded internal state
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const expanded = externalExpanded ?? internalExpanded;

  // Global search internal state
  const [internalGlobalFilter, setInternalGlobalFilter] = useState<any>("");
  const finalGlobalFilter = globalFilter ?? internalGlobalFilter;

  // Pagination internal state (0-indexed in TanStack table)
  const [{ pageIndex, pageSize: statePageSize }, setPagination] = useState({
    pageIndex: externalCurrentPage ? externalCurrentPage - 1 : 0,
    pageSize,
  });

  // Sync external pagination state if provided
  useEffect(() => {
    if (externalCurrentPage !== undefined) {
      setPagination((prev) => {
        if (prev.pageIndex === externalCurrentPage - 1) return prev;
        return { ...prev, pageIndex: externalCurrentPage - 1 };
      });
    }
  }, [externalCurrentPage]);

  // Sync external page size if changed
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageSize }));
  }, [pageSize]);

  // Sync pageIndex changes back to parent component safely outside render
  useEffect(() => {
    if (externalOnPageChange) {
      if (externalCurrentPage !== undefined) {
        if (pageIndex !== externalCurrentPage - 1) {
          externalOnPageChange(pageIndex + 1);
        }
      } else {
        externalOnPageChange(pageIndex + 1);
      }
    }
  }, [pageIndex, externalCurrentPage, externalOnPageChange]);

  const paginationState = {
    pageIndex,
    pageSize: statePageSize || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
  };

  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: false,
    state: {
      sorting,
      globalFilter: finalGlobalFilter,
      pagination: paginationState,
      expanded,
    },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === "function" ? (updater as any)(sorting) : updater;
      setInternalSorting(nextSorting);
      if (externalOnSortingChange) {
        externalOnSortingChange(nextSorting);
      }
    },
    onExpandedChange: (updater) => {
      const nextExpanded = typeof updater === "function" ? (updater as any)(expanded) : updater;
      setInternalExpanded(nextExpanded);
      if (externalOnExpandedChange) {
        externalOnExpandedChange(nextExpanded);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onPaginationChange: enablePagination ? (updater) => {
      setPagination((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        return next;
      });
    } : undefined,
    getRowCanExpand: () => !!renderSubRow,
  });

  const pageCount = enablePagination ? table.getPageCount() : 0;
  const actualPageIndex = enablePagination ? (table.getState().pagination?.pageIndex ?? 0) : 0;
  const totalRows = table.getFilteredRowModel().rows.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-mono text-xs">
        <IconLoader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
        LOADING DATA...
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className={containerClassName}>
      <div className="overflow-x-auto w-full lg:overflow-visible">
        <table className={tableClassName}>
          <thead className={theadClassName}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className={`bg-slate-100/85 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono ${trClassName}`}
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`px-5 py-3.5 select-none ${thClassName}`}
                      style={{ width: header.column.columnDef.size }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1 ${
                            canSort ? "cursor-pointer hover:text-slate-900" : ""
                          }`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-slate-400">
                              {isSorted === "desc" ? (
                                <IconChevronDown className="w-3.5 h-3.5" />
                              ) : isSorted === "asc" ? (
                                <IconChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <IconSelector className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState || (
                    <div className="bg-white p-12 text-center text-slate-400 font-mono italic">
                      No results found.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const customRowClass = rowClassName ? rowClassName(row.original) : "";
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={(e) => onRowClick && onRowClick(row.original, e)}
                      onContextMenu={(e) => onRowContextMenu && onRowContextMenu(row.original, e, rowIndex)}
                      className={`hover:bg-slate-50/20 transition-all ${customRowClass}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-5 py-3.5 ${tdClassName}`}
                          style={{ width: cell.column.columnDef.size }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {row.getIsExpanded() && renderSubRow && (
                      <tr>
                        <td colSpan={columns.length} className="p-0">
                          {renderSubRow(row.original)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {enablePagination && pageCount > 1 && (
        <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between font-mono text-xs gap-4">
          <div className="text-slate-500 font-semibold uppercase">
            Showing <span className="text-indigo-600 font-extrabold font-sans">{(actualPageIndex * statePageSize) + 1}</span> to{" "}
            <span className="text-indigo-600 font-extrabold font-sans">
              {Math.min((actualPageIndex + 1) * statePageSize, totalRows)}
            </span>{" "}
            of <span className="text-slate-700 font-extrabold font-sans">{totalRows}</span> {paginationLabel}
          </div>
          
          {paginationType === "simple" ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={actualPageIndex === 0}
                onClick={() => table.previousPage()}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:hover:border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed select-none shadow-sm"
              >
                ◀ PREV
              </button>
              
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/30">
                PAGE {actualPageIndex + 1} / {pageCount}
              </span>

              <button
                type="button"
                disabled={actualPageIndex >= pageCount - 1}
                onClick={() => table.nextPage()}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:hover:border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed select-none shadow-sm"
              >
                NEXT ▶
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={actualPageIndex === 0}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
              >
                Previous
              </button>
              <div className="flex items-center gap-1 font-bold text-slate-700">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => table.setPageIndex(p - 1)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                      actualPageIndex + 1 === p
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={actualPageIndex >= pageCount - 1}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
