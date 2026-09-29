import React, { useMemo, useState } from "react";
import {
  Users, Search, X, AlertCircle, RefreshCw,
  ChevronRight, GraduationCap, Calendar, Droplet,
  MapPin, Mail, IdCard, Heart, UserPlus, ArrowLeft,
} from "lucide-react";
import {
  useAdminStudents,
  useAdminStudentDetail,
  AdminStudent,
  StudentStatusFilter,
  StudentStatus,
} from "../hooks/Useadminstudents";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-green-500">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function DetailRowPair({
  icon, label1, value1, label2, value2,
}: {
  icon: React.ReactNode;
  label1: string; value1?: string | number | null;
  label2: string; value2?: string | number | null;
}) {
  if ((!value1 && value1 !== 0) && (!value2 && value2 !== 0)) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-green-500">{icon}</span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label1}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{value1 ?? "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label2}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{value2 ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <div className="bg-gray-50 rounded-xl px-4 py-1">{children}</div>
    </div>
  );
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  Active: "bg-green-50 text-green-600",
  Inactive: "bg-gray-100 text-gray-500",
  Suspended: "bg-red-50 text-red-500",
  "On-Leave": "bg-amber-50 text-amber-600",
};

function StatusBadge({ status }: { status?: StudentStatus | string }) {
  const label = status || "Active";
  const style = STATUS_BADGE_STYLES[label] ?? "bg-gray-50 text-gray-500";
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${style}`}>
      {label}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return undefined;
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function StudentDetailPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const { student, loading, error } = useAdminStudentDetail(name);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-[calc(100vh-4rem)] shadow-2xl flex flex-col overflow-hidden animate-slide-in-right mt-16">
        <div
          className="px-6 py-5 flex items-center justify-between flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white">
                {loading ? "Loading..." : student?.student_name ?? name}
              </p>
              <p className="text-[10px] text-white/70 font-medium mt-0.5">
                {student?.name ? `ID: ${student.name}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {student && !loading && (
            <>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</p>
                <StatusBadge status={student.status} />
              </div>

              <Section title="Academic Info">
                <DetailRowPair
                  icon={<GraduationCap size={13} />}
                  label1="Batch"
                  value1={student.custom_batch}
                  label2="Student ID"
                  value2={student.name}
                />
                <DetailRow icon={<Calendar size={13} />} label="Joining Date" value={fmtDate(student.joining_date)} />
              </Section>

              <Section title="Personal Info">
                <DetailRowPair
                  icon={<Calendar size={13} />}
                  label1="Date of Birth"
                  value1={fmtDate(student.date_of_birth)}
                  label2="Blood Group"
                  value2={student.blood_group}
                />
                <DetailRowPair
                  icon={<MapPin size={13} />}
                  label1="City"
                  value1={student.city}
                  label2="Country"
                  value2={student.country}
                />
                <DetailRow icon={<MapPin size={13} />} label="Nationality" value={student.nationality} />
              </Section>

              <Section title="Contact & Identification">
                <DetailRow icon={<Mail size={13} />} label="Email" value={student.student_email_id} />
                <DetailRowPair
                  icon={<IdCard size={13} />}
                  label1="ID Type"
                  value1={student.custom_student_id_type}
                  label2="ID Number"
                  value2={student.custom_student_id_number}
                />
              </Section>

              {student.guardians && student.guardians.length > 0 && (
                <Section title="Guardian(s)">
                  {student.guardians.map((g, i) => (
                    <DetailRow
                      key={(g.guardian ?? "") + i}
                      icon={<Heart size={13} />}
                      label="Guardian"
                      value={g.guardian_name || g.guardian}
                    />
                  ))}
                </Section>
              )}

              {student.siblings && student.siblings.length > 0 && (
                <Section title="Sibling(s)">
                  {student.siblings.map((s, i) => (
                    <DetailRow
                      key={(s.student ?? "") + i}
                      icon={<UserPlus size={13} />}
                      label="Sibling"
                      value={s.student_name || s.student}
                    />
                  ))}
                </Section>
              )}

              <div className="h-6" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e",
  Inactive: "#9ca3af",
  Suspended: "#ef4444",
  "On-Leave": "#f59e0b",
};

function StudentCharts({ students }: { students: AdminStudent[] }) {
  const statusMap = students.reduce<Record<string, number>>((acc, s) => {
    const label = s.status || "Active";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const batchMap = students.reduce<Record<string, number>>((acc, s) => {
    const b = s.custom_batch || "Unspecified";
    acc[b] = (acc[b] ?? 0) + 1;
    return acc;
  }, {});
  const batchData = Object.entries(batchMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (students.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Students by Status
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#9ca3af"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Students by Batch
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={batchData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: "#9ca3af" }} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface AdminStudentsPageProps {
  onBack?: () => void;
}

export const AdminStudentsPage: React.FC<AdminStudentsPageProps> = ({ onBack }) => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const { students, loading, error, refetch } = useAdminStudents(statusFilter);

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        (s.student_name ?? "").toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.custom_serial_no ?? "").toLowerCase().includes(q) ||
        (s.student_email_id ?? "").toLowerCase().includes(q)
    );
  }, [students, query]);

  const activeCount = useMemo(() => students.filter((s) => (s.status || "Active") === "Active").length, [students]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-500 flex items-center justify-center transition-all flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Users size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-black text-gray-800 text-lg leading-none">Students</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {students.length} students · {activeCount} active
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-500 rounded-xl text-sm font-bold transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Charts */}
      {!loading && !error && <StudentCharts students={students} />}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "", label: "All Students" },
          { key: "Active", label: "Active" },
          { key: "Inactive", label: "Inactive" },
          { key: "Suspended", label: "Suspended" },
          { key: "On-Leave", label: "On-Leave" },
        ] as { key: StudentStatusFilter; label: string }[]).map((tab) => (
          <button
            key={tab.key || "all"}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === tab.key
                ? "bg-green-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-500 hover:border-green-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, student ID, email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Student list */}
      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No students found</p>
              <p className="text-xs mt-1">Try a different search or filter</p>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelectedName(s.name)}
                className="w-full text-left bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:shadow-md hover:border-green-200 transition-all flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100">
                  <GraduationCap size={18} className="text-green-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-800 text-sm truncate">{s.student_name || s.name}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                    {s.name ? `ID: ${s.name}` : "—"}
                    {s.custom_batch ? ` · Batch ${s.custom_batch}` : ""}
                  </p>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5 truncate">
                    {s.city || s.nationality ? `${s.city ?? ""}${s.city && s.nationality ? ", " : ""}${s.nationality ?? ""}` : "No location info"}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {s.blood_group && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                      <Droplet size={10} /> {s.blood_group}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Detail panel */}
      {selectedName && (
        <StudentDetailPanel name={selectedName} onClose={() => setSelectedName(null)} />
      )}
    </div>
  );
};