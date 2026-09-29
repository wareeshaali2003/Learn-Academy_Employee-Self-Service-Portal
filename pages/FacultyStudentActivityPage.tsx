// pages/FacultyStudentActivityPage.tsx
// Teacher/Faculty view — apne student group se ek student choose karke
// uski login/logout activity dekho. Sirf apne assigned groups ke students
// dikhte hain (useStudentGroups instructor-scoped hai).

import React, { useMemo, useState } from "react";
import { Activity, Users } from "lucide-react";
import { usePrograms } from "../hooks/Useprograms";
import { useStudentGroups, useGroupStudents } from "../hooks/Usestudents";
import { useEmployee } from "../hooks/useEmployee";
import { StudentActivityView, StudentPickerEntry } from "../components/StudentActivityView";

const FacultyStudentActivityPage: React.FC = () => {
  const { employee, loading: empLoading } = useEmployee();
  const { programs } = usePrograms();

  const [programFilter, setProgramFilter] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Employee ID (LA-XXXXX) → Instructor ID (TA-XXXXX), same as Studentspage.tsx
  const instructorId = useMemo(() => {
    const empId = (employee as any)?.name ?? "";
    return empId ? empId.replace(/^LA-/, "TA-") : undefined;
  }, [employee]);

  const { groups, loading: gLoading } = useStudentGroups(
    programFilter || undefined,
    empLoading ? undefined : instructorId
  );

  const { students, loading: sLoading, error: sError } = useGroupStudents(selectedGroup || undefined);

  const availablePrograms = useMemo(() => {
    if (!groups.length) return [];
    const groupPrograms = new Set(groups.map((g) => g.program).filter(Boolean));
    return programs.filter((p) => groupPrograms.has(p.name));
  }, [groups, programs]);

  const pickerEntries: StudentPickerEntry[] = useMemo(
    () =>
      students.map((s) => ({
        id: s.student,
        name: s.student_name,
        meta: selectedGroup,
      })),
    [students, selectedGroup]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Activity size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Student Login Activity</h1>
          <p className="text-sm text-gray-500">Your class students login/logout activity</p>
        </div>
      </div>

      {/* Group selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Users size={16} className="text-indigo-500" /> Select a class / group
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={programFilter}
            onChange={(e) => { setProgramFilter(e.target.value); setSelectedGroup(""); }}
            className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Programs</option>
            {availablePrograms.map((p) => (
              <option key={p.name} value={p.name}>{p.program_name || p.name}</option>
            ))}
          </select>

          {gLoading ? (
            <div className="flex-1 h-10 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="flex-1 min-w-[220px] bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">— Select a group —</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.student_group_name || g.name} {g.totalCount !== undefined ? `(${g.totalCount})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <StudentActivityView
        students={pickerEntries}
        loadingStudents={sLoading}
        errorStudents={sError}
        emptyStudentsLabel={selectedGroup ? "No student found in this group." : "select groups first."}
      />
    </div>
  );
};

export default FacultyStudentActivityPage;
