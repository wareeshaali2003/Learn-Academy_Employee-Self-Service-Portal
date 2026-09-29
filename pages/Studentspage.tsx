// pages/StudentsPage.tsx

import React, { useState, useMemo } from "react";
import { Users, UserRound, School, CheckCircle2, RefreshCw, Search } from "lucide-react";

import { usePrograms }                        from "../hooks/Useprograms";
import { useStudentGroups, useGroupStudents } from "../hooks/Usestudents";
import { useEmployee }                        from "../hooks/useEmployee";
import { Skeleton, avatarColor }              from "../components/Shared";

export const StudentsPage: React.FC = () => {
  const { employee, loading: empLoading } = useEmployee();
  const { programs } = usePrograms();

  const [programFilter, setProgramFilter] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [search, setSearch]               = useState("");

  // ✅ FIX: employee_name ki jagah employee ID se TA-XXXXX derive karo
  // Profile → name: "LA-00036" → Instructor ID: "TA-00036"
  const instructorId = useMemo(() => {
    const empId = (employee as any)?.name ?? "";
    return empId ? empId.replace(/^LA-/, "TA-") : undefined;
  }, [employee]);

  const { groups, loading: gLoading, error: gError, refetch } =
    useStudentGroups(
      programFilter || undefined,
      empLoading ? undefined : instructorId  // ✅ TA-XXXXX pass ho raha hai
    );

  const { students, loading: sLoading, error: sError } =
    useGroupStudents(selectedGroup || undefined);

  const handleProgramChange = (p: string) => { setProgramFilter(p); setSelectedGroup(""); };

  // Sirf woh programs dikhao jo instructor ke groups mein hain
  const availablePrograms = useMemo(() => {
    if (!groups.length) return [];
    const groupPrograms = new Set(groups.map((g) => g.program).filter(Boolean));
    return programs.filter((p) => groupPrograms.has(p.name));
  }, [groups, programs]);

  const filteredStudents = useMemo(() =>
    students.filter((s) =>
      !search ||
      s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const activeCount      = students.filter((s) => s.active !== 0).length;
  const totalActiveAll   = useMemo(() => groups.reduce((sum, g) => sum + (g.activeCount ?? 0), 0), [groups]);
  const totalStudentsAll = useMemo(() => groups.reduce((sum, g) => sum + (g.totalCount  ?? 0), 0), [groups]);

  return (
    <div className="space-y-6">

      {/* Summary stats */}
      {!gLoading && groups.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Students", value: totalActiveAll,   icon: <Users size={20} className="text-green-600" /> },
            { label: "Total Enrolled",  value: totalStudentsAll, icon: <UserRound size={20} className="text-green-600" /> },
            { label: `Groups${programFilter ? ` · ${programFilter}` : ""}`, value: groups.length, icon: <School size={20} className="text-green-600" /> },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Groups Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <School size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Student Groups</h3>
              <p className="text-xs text-gray-400">Select a program and group to view students</p>
            </div>
          </div>
          <button type="button" onClick={refetch}
            className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Program Filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button type="button" onClick={() => handleProgramChange("")}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${!programFilter ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-green-200"}`}>
            All Programs
          </button>
          {availablePrograms.map((p) => (
            <button key={p.name} type="button" onClick={() => handleProgramChange(p.name)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${programFilter === p.name ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-600 hover:border-green-200"}`}>
              {p.program_name || p.name}
            </button>
          ))}
        </div>

        {empLoading || gLoading ? <Skeleton rows={1} /> : gError ? (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {gError}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No student groups found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups.map((g) => {
              const isSelected = selectedGroup === g.name;
              return (
                <button key={g.name} type="button"
                  onClick={() => setSelectedGroup(isSelected ? "" : g.name)}
                  className={`p-4 rounded-xl border-2 text-left transition-all group ${isSelected ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-100 bg-white hover:border-green-200 hover:shadow-sm"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isSelected ? "bg-green-500" : "bg-gray-100 group-hover:bg-green-100"}`}>
                      <Users size={16} className={isSelected ? "text-white" : "text-gray-500"} />
                    </div>
                    {g.activeCount !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-green-200 text-green-800" : "bg-green-50 text-green-600"}`}>
                        {g.activeCount} active
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-sm ${isSelected ? "text-green-700" : "text-gray-700"}`}>
                    {g.student_group_name || g.name}
                  </p>
                  {g.totalCount !== undefined && (
                    <p className="text-[11px] text-gray-400 mt-1">{g.totalCount} total students</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Students Table */}
      {selectedGroup && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <UserRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedGroup}</h3>
                <p className="text-xs text-gray-400">
                  {sLoading ? "Loading..." : `${activeCount} active · ${students.length} total`}
                </p>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search student…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 w-48" />
            </div>
          </div>

          {sError && <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {sError}</p>}
          {sLoading ? <div className="p-8"><Skeleton rows={6} /></div> : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-semibold">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((s, i) => (
                    <tr key={s.student} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{s.group_roll_number ?? i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${avatarColor(s.student_name)} text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0`}>
                            {s.student_name.slice(0, 2)}
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">{s.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{s.student}</td>
                      <td className="px-6 py-4">
                        {s.active === 0
                          ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500">Inactive</span>
                          : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700"><CheckCircle2 size={10} /> Active</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentsPage;