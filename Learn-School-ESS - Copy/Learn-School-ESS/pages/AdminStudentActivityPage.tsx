// pages/AdminStudentActivityPage.tsx
// CEO/Admin view — koi bhi student select karke uski login/logout activity
// dekho. Ya to "All Students" mein search karo, ya ek class/group choose
// karke sirf uske students dekho (Teacher wale view jaisa).

import React, { useMemo, useState } from "react";
import { Activity, Users } from "lucide-react";
import { useAdminStudents } from "../hooks/Useadminstudents";
import { useAdminStudentGroups, useGroupStudents } from "../hooks/Usestudents";
import { StudentActivityView, StudentPickerEntry } from "../components/StudentActivityView";

const AdminStudentActivityPage: React.FC = () => {
  const { students: allStudents, loading: allLoading, error: allError } = useAdminStudents();

  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Saare Student Groups (instructor filter nahi lagta — CEO ko sab dikhtay hain)
  const { groups, loading: gLoading } = useAdminStudentGroups(undefined, true);
  const { students: groupStudents, loading: gsLoading, error: gsError } =
    useGroupStudents(selectedGroup || undefined);

  // Group select hua ho to us group ke students, warna poori school ki list.
  const pickerEntries: StudentPickerEntry[] = useMemo(() => {
    if (selectedGroup) {
      return groupStudents.map((s) => ({
        id: s.student,
        name: s.student_name,
        meta: selectedGroup,
      }));
    }
    return allStudents.map((s) => ({
      id: s.name,
      name: s.student_name || s.first_name || s.name,
      email: s.student_email_id,
      meta: s.custom_batch || s.status || s.name,
    }));
  }, [selectedGroup, groupStudents, allStudents]);

  const isLoadingStudents = selectedGroup ? gsLoading : allLoading;
  const studentsError = selectedGroup ? gsError : allError;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Activity size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Student Login Activity</h1>
          <p className="text-sm text-gray-500">All student login/logout Activity</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Users size={16} className="text-indigo-500" /> Filter (optional)
        </div>
        <div className="flex flex-wrap gap-3">
          {gLoading ? (
            <div className="flex-1 h-10 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="flex-1 min-w-[220px] bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Students</option>
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
        loadingStudents={isLoadingStudents}
        errorStudents={studentsError}
        emptyStudentsLabel={selectedGroup ? "No student found in this group." : "No students found."}
      />
    </div>
  );
};

export default AdminStudentActivityPage;