// pages/FacultyClassroomCourseDetail.tsx — one course's live Classroom data for a teacher:
// roster, lesson plan by topic, and class-wide submission/grading stats per assignment.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEmployee } from "../hooks/useEmployee";
import { classroomService } from "../services/classroomService";
import { ClassroomCourseDetail as CourseDetail, ClassroomCourseWorkItem } from "../types/classroom";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  Layers,
  Users,
  AlertCircle,
} from "lucide-react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const AssignmentRow: React.FC<{ item: ClassroomCourseWorkItem }> = ({ item }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
    <div className="flex items-start gap-3">
      <div className={cn("p-2 rounded-xl shrink-0", item.isQuiz ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600")}>
        {item.isQuiz ? <HelpCircle size={16} /> : <FileText size={16} />}
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
          {item.dueDate && <span>Due {item.dueDate}</span>}
          {item.maxPoints != null && <span>Marks: {item.maxPoints}</span>}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 pl-11 sm:pl-0 flex-wrap">
      <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200">
        {item.submittedCount}/{item.totalStudents} submitted
      </span>
      {item.ungradedCount > 0 ? (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
          {item.ungradedCount} to grade
        </span>
      ) : (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
          Graded
        </span>
      )}
      {item.classroomUrl && (
        <a href={item.classroomUrl} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-green-600 transition-colors">
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  </div>
);

export const FacultyClassroomCourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { employeeId } = useEmployee();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!employeeId || !courseId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await classroomService.getCourseDetail(employeeId, courseId);
        setDetail(data);
      } catch (err: any) {
        setError(err?.response?.data?.error === "course_not_found"
          ? "This course was not found — try syncing again from My Classes."
          : err?.message || "Failed to load course");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [employeeId, courseId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 size={36} className="text-green-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading course…</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertCircle size={48} className="text-red-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-6">{error || "Course not found"}</p>
        <button
          onClick={() => navigate("/faculty/classroom")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to My Classes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-8 animate-in fade-in duration-300">
      <button
        onClick={() => navigate("/faculty/classroom")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={16} />
        My Classes
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-800">{detail.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {detail.section || "Google Classroom"} · {detail.roster.length} students
            </p>
          </div>
          {detail.classroomUrl && (
            <a
              href={detail.classroomUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              Open Google Classroom
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Lesson plan by topic, with class-wide stats per assignment */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Layers size={16} className="text-green-600" />
          Coursework
        </h2>
        {detail.lessonPlan.length === 0 ? (
          <p className="text-sm text-gray-300 italic">No topics published for this course yet.</p>
        ) : (
          <div className="space-y-5">
            {detail.lessonPlan.map((topic) => (
              <div key={topic.topicId ?? "other"}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{topic.name}</h3>
                {topic.items.length === 0 ? (
                  <p className="text-xs text-gray-300 italic pl-4">No coursework yet</p>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-50 rounded-xl overflow-hidden">
                    {topic.items.map((item) => (
                      <AssignmentRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Users size={16} className="text-green-600" />
          Roster ({detail.roster.length})
        </h2>
        {detail.roster.length === 0 ? (
          <p className="text-sm text-gray-300 italic">No students enrolled yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {detail.roster.map((s) => (
              <div key={s.userId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700 font-medium">{s.name}</span>
                {s.email && <span className="text-gray-400 text-xs">{s.email}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyClassroomCourseDetailPage;
