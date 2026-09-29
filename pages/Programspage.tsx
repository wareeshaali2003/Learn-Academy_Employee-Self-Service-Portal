// pages/ProgramsPage.tsx
// Programs & Courses — alag standalone page
// UPDATED: monochrome-green look ki jagah har program/course ka apna distinct
// color accent, aur courses ke liye ek search box add kiya.

import React, { useState, useMemo } from "react";
import {
  BookOpen, GraduationCap, RefreshCw, ChevronRight,
  ChevronDown, LayoutGrid, List, BookMarked, Search, X,
} from "lucide-react";

import { usePrograms, useCourses } from "../hooks/Useprograms";

// ─── Constants ────────────────────────────────────────────────────────────────

// App-wide consistent multi-color palette — har program/course ko naam ke hash
// se ek fixed color milta hai, taake wo har jagah (grid, list, chips) same rahe
const PALETTE = [
  { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-500", dot: "bg-indigo-500", hoverBg: "hover:bg-indigo-50/50" },
  { bg: "bg-rose-50",   text: "text-rose-600",   border: "border-rose-500",   dot: "bg-rose-500",   hoverBg: "hover:bg-rose-50/50" },
  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-500",  dot: "bg-amber-500",  hoverBg: "hover:bg-amber-50/50" },
  { bg: "bg-teal-50",   text: "text-teal-600",   border: "border-teal-500",   dot: "bg-teal-500",   hoverBg: "hover:bg-teal-50/50" },
  { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-500", dot: "bg-violet-500", hoverBg: "hover:bg-violet-50/50" },
  { bg: "bg-sky-50",    text: "text-sky-600",    border: "border-sky-500",    dot: "bg-sky-500",    hoverBg: "hover:bg-sky-50/50" },
];
const colorFor = (name: string) => {
  const sum = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PALETTE[sum % PALETTE.length];
};

// ─── Shared small UI ─────────────────────────────────────────────────────────

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Programs Section ─────────────────────────────────────────────────────────

function ProgramsSection({
  selectedProgram,
  onSelect,
}: {
  selectedProgram: string | null;
  onSelect: (name: string | null) => void;
}) {
  const { programs, loading, error, refetch } = usePrograms();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <SectionHeader
        icon={<GraduationCap size={20} />}
        title="Programs"
        subtitle={`${programs.length} program${programs.length !== 1 ? "s" : ""}`}
        action={
          <button
            type="button"
            onClick={refetch}
            className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        }
      />

      {loading ? (
        <Skeleton rows={1} />
      ) : error ? (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {error}</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {/* "All" button — brand green, hamesha available default */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
              !selectedProgram
                ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                : "border-gray-100 bg-gray-50 text-gray-500 hover:border-green-200"
            }`}
          >
            All
          </button>

          {/* Sirf instructor ke apne programs — har ek ka apna consistent color */}
          {programs.map((p) => {
            const isSelected = selectedProgram === p.name;
            const color = colorFor(p.name);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelect(isSelected ? null : p.name)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                  isSelected
                    ? `${color.border} ${color.bg} ${color.text} shadow-sm`
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                {p.program_name || p.name}
                {isSelected && <ChevronDown size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Courses Section ──────────────────────────────────────────────────────────

function CoursesSection({ selectedProgram }: { selectedProgram: string | null }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  // API se hi filtered courses aate hain (by program) — search sirf client-side hai
  const { courses, loading, error } = useCourses(selectedProgram ?? undefined);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.trim().toLowerCase();
    return courses.filter(
      (c) =>
        (c.course_name || "").toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
  }, [courses, search]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <SectionHeader
        icon={<BookOpen size={20} />}
        title={selectedProgram ? `Courses — ${selectedProgram}` : "All Courses"}
        subtitle={`${filteredCourses.length} of ${courses.length} course${courses.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="pl-8 pr-7 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 w-36 sm:w-56 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["grid", "list"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === m ? "bg-white shadow-sm text-green-600" : "text-gray-400"
                  }`}
                >
                  {m === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {loading ? (
        <Skeleton rows={2} />
      ) : error ? (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {error}</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No courses found.</p>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-8">
          <Search size={24} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No courses match "{search}"</p>
        </div>
      ) : viewMode === "grid" ? (
        // ── Grid View ────────────────────────────────────────────────────────
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => {
            const color = colorFor(c.name);
            return (
              <div
                key={c.name}
                className="p-4 rounded-xl border border-gray-100 bg-white hover:border-green-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${color.bg} ${color.text}`}
                  >
                    {(c.course_name || c.name).slice(0, 2).toUpperCase()}
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-gray-200 group-hover:text-green-400 transition-colors"
                  />
                </div>
                <p className="font-semibold text-gray-800 text-sm">{c.course_name || c.name}</p>
                <p className="text-[11px] text-gray-400 mt-1 font-mono">{c.name}</p>
              </div>
            );
          })}
        </div>
      ) : (
        // ── List View ────────────────────────────────────────────────────────
        <div className="divide-y divide-gray-50">
          {filteredCourses.map((c) => {
            const color = colorFor(c.name);
            return (
              <div
                key={c.name}
                className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors ${color.hoverBg}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color.bg}`}>
                    <BookMarked size={13} className={color.text} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {c.course_name || c.name}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">{c.name}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ProgramsPage: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ProgramsSection
        selectedProgram={selectedProgram}
        onSelect={setSelectedProgram}
      />
      <CoursesSection selectedProgram={selectedProgram} />
    </div>
  );
};

export default ProgramsPage;