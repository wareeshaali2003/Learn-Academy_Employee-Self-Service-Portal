import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, RefreshCw, BookOpen, ChevronRight, Plus, X, Calendar, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { useAssignments, Assignment } from "../hooks/useAssignments";
import { usePrograms, useCourses } from "../hooks/Useprograms";
import { api } from "../services/api";

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

function SectionHeader({
  icon, title, subtitle, action,
}: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
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

// ─── Assignment Detail Modal ────────────────────────────────────────────────

function AssignmentDetailModal({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const createdDate = assignment.creation
    ? new Date(assignment.creation).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* ── Header (sticky, no X button — Close button at bottom only) ── */}
        <div className="sticky top-0 bg-gradient-to-br from-green-600 to-green-700 px-6 py-6 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-green-100 uppercase tracking-wider mb-0.5">
                Assignment
              </p>
              <h3 className="font-bold text-white text-lg leading-snug break-words">
                {assignment.heading}
              </h3>
            </div>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
              <BookOpen size={12} /> {assignment.course}
            </span>
            {assignment.link_gdbv && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                <Layers size={12} /> {assignment.link_gdbv}
              </span>
            )}
            {createdDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 text-xs font-semibold border border-gray-100">
                <Calendar size={12} /> {createdDate}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
              Description
            </label>
            {assignment.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
                {assignment.description}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided.</p>
            )}
          </div>
        </div>

        {/* ── Footer (sticky) — sirf ek Close button ── */}
        <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
// ─── New Assignment Modal ──────────────────────────────────────────────────

interface StudentGroup { name: string; student_group_name?: string; }

function NewAssignmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { courses } = useCourses();

  const [course, setCourse]         = useState("");
  const [section, setSection]       = useState("");
  const [heading, setHeading]       = useState("");
  const [description, setDescription] = useState("");

  const [groups, setGroups]         = useState<StudentGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  const handleCourseChange = async (value: string) => {
    setCourse(value);
    setSection("");
    setGroups([]);
    setGroupsError(null);
    if (!value) return;

    setGroupsLoading(true);
    try {
      const res = await api.getStudentGroupsByCourse(value);
      if (res.ok) {
        setGroups(res.data as StudentGroup[]);
        if (res.data.length === 0) {
          setGroupsError("Is course ke liye koi section assign nahi hai (Course Schedule check karo).");
        }
      } else {
        setGroupsError(res.error || "Sections load nahi ho sakay");
      }
    } catch (err: unknown) {
      setGroupsError(err instanceof Error ? err.message : "Sections load nahi ho sakay");
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!course || !section || !heading.trim()) {
      toast.error("Course, Section aur Heading zaroori hain");
      return;
    }
    setSaving(true);
    try {
      const res = await api.createAssignment({
        course,
        link_gdbv: section,
        heading: heading.trim(),
        description: description.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error || "Assignment save nahi ho saka");
        return;
      }

      toast.success("Assignment save ho gaya");
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save nahi ho saka");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header — sticky so it never scrolls out of view */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 z-10">
          <h3 className="font-bold text-gray-800">New Assignment</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Course *</label>
            <select
              value={course}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-400 focus:outline-none"
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.name} value={c.name}>{c.course_name || c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Section *</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={!course || groupsLoading}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-400 focus:border-green-400 focus:outline-none"
            >
              <option value="">
                {!course ? "First select course" : groupsLoading ? "Loading..." : "Select section"}
              </option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>{g.student_group_name || g.name}</option>
              ))}
            </select>
            {groupsError && (
              <p className="text-xs text-red-500 mt-1.5">{groupsError}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Heading *</label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. KG1 - Maths Assignment"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Assignment details..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:border-green-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer — sticky so buttons are always reachable */}
        <div className="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export const AssignmentsPage: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const { courses } = useCourses();
  const { assignments, loading, error, refetch } = useAssignments(selectedCourse ?? undefined);

  return (
    <div className="space-y-6">
      {/* Course filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader
          icon={<BookOpen size={20} />}
          title="Filter by Course"
          action={
            <div className="flex items-center gap-2">
              <button type="button" onClick={refetch} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                <Plus size={15} /> New Assignment
              </button>
            </div>
          }
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSelectedCourse(null)}
            className={`px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
              !selectedCourse ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-green-200"
            }`}
          >
            All
          </button>
          {courses.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSelectedCourse(selectedCourse === c.name ? null : c.name)}
              className={`px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                selectedCourse === c.name ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-green-200"
              }`}
            >
              {c.course_name || c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader
          icon={<ClipboardList size={20} />}
          title={selectedCourse ? `Assignments — ${selectedCourse}` : "All Assignments"}
          subtitle={`${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`}
        />

        {loading ? (
          <Skeleton rows={3} />
        ) : error ? (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {error}</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No assignments found.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {assignments.map((a) => (
              <button
                type="button"
                key={a.name}
                onClick={() => setSelectedAssignment(a)}
                className="w-full flex items-start justify-between py-4 px-2 hover:bg-gray-50 rounded-lg transition-colors text-left cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{a.heading}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{a.course}</p>
                  {a.description && (
                    <p className="text-sm text-gray-500 mt-2 whitespace-pre-line line-clamp-3">
                      {a.description}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewAssignmentModal
          onClose={() => setShowModal(false)}
          onCreated={refetch}
        />
      )}

      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
};

export default AssignmentsPage;