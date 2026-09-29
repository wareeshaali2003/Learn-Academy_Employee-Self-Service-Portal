import React, { useState, useMemo } from "react";
import {
  Users, Search, X, Phone, Mail, MapPin, Building2,
  Calendar, CreditCard, Banknote, Clock, UserCheck,
  ChevronRight, RefreshCw, AlertCircle, User, Shield,
  Briefcase, Heart, ArrowLeft,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  useAdminEmployees,
  useAdminEmployeeDetail,
  updateEmployeeStatus,
} from "../hooks/Useadminemployees";

const BASE_URL = "https://learnschool.online";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AvatarCircle({
  name, image, size = "md",
}: {
  name: string; image?: string; size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "lg" ? "w-16 h-16 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-11 h-11 text-sm";

  if (image && !imgError) {
    return (
      <img
        src={`${BASE_URL}${image}`}
        alt={name}
        className={`${dim} rounded-xl object-cover border-2 border-white/30`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${dim} rounded-xl bg-white/20 flex items-center justify-center font-black text-white flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").toLowerCase();
  const styles: Record<string, string> = {
    active:   "bg-green-100 text-green-700 border border-green-200",
    inactive: "bg-gray-100 text-gray-500 border border-gray-200",
    left:     "bg-red-50 text-red-500 border border-red-100",
  };
  const labels: Record<string, string> = {
    active: "Active", inactive: "Inactive", left: "Left",
  };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${styles[s] ?? "bg-gray-100 text-gray-500 border border-gray-200"}`}>
      {labels[s] ?? (status || "—")}
    </span>
  );
}

function DetailRow({
  icon, label, value,
}: {
  icon: React.ReactNode; label: string; value?: string | number | null;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-green-500">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function Section({
  title, icon, children,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-500">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      </div>
      <div className="bg-gray-50/80 rounded-2xl px-4 py-1 border border-gray-100">
        {children}
      </div>
    </div>
  );
}

// ─── Employee Detail Panel ────────────────────────────────────────────────────

function EmployeeDetailPanel({
  id, onClose, onStatusUpdated,
}: {
  id: string;
  onClose: () => void;
  onStatusUpdated?: () => void;
}) {
  const { employee, loading, error } = useAdminEmployeeDetail(id);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError]     = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState(false);
  // optimistic local status so header chip updates instantly
  const [localStatus, setLocalStatus]     = useState<string | null>(null);

  const currentStatus = localStatus ?? employee?.status ?? "";

  async function handleStatusChange(newStatus: "Active" | "Inactive" | "Left") {
    if (!employee) return;
    setStatusLoading(true);
    setStatusError(null);
    setStatusSuccess(false);

    const result = await updateEmployeeStatus(employee.name, newStatus);

    setStatusLoading(false);
    if (result.success) {
      setLocalStatus(newStatus);
      setStatusSuccess(true);
      onStatusUpdated?.();
      setTimeout(() => setStatusSuccess(false), 3000);
    } else {
      setStatusError(result.error ?? "Update failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-[calc(100vh-4rem)] shadow-2xl flex flex-col overflow-hidden mt-16">

        {/* ── Hero Header ── */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute right-12 -bottom-6 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-white" />
          </button>

          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {loading ? (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 animate-pulse" />
                ) : employee ? (
                  <AvatarCircle
                    name={employee.employee_name ?? employee.name}
                    image={employee.image}
                    size="lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <User size={28} className="text-white/60" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-white leading-tight truncate">
                  {loading ? "Loading…" : (employee?.employee_name ?? id)}
                </p>
                {employee?.designation && (
                  <p className="text-sm text-white/80 font-medium mt-0.5 truncate">
                    {employee.designation}
                  </p>
                )}
                {employee?.department && (
                  <p className="text-xs text-white/60 font-medium mt-0.5 truncate">
                    {employee.department}
                  </p>
                )}
              </div>
            </div>

            {employee && !loading && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {/* Status chip — reflects optimistic update */}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                  currentStatus.toLowerCase() === "active"
                    ? "bg-white/25 text-white border border-white/30"
                    : currentStatus.toLowerCase() === "left"
                    ? "bg-red-500/40 text-white border border-red-300/30"
                    : "bg-gray-500/30 text-white border border-gray-300/30"
                }`}>
                  {currentStatus || "—"}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/15 text-white/80 border border-white/20">
                  {employee.name}
                </span>
                {employee.employment_type && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/15 text-white/80 border border-white/20">
                    {employee.employment_type}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium border border-red-100">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {employee && !loading && (
            <>
              {/* ── Status Change Card ── */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                    <UserCheck size={13} className="text-green-500" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Change Status
                  </p>
                </div>

                <div className="flex gap-2">
                  {(["Active", "Inactive", "Left"] as const).map((s) => {
                    const isCurrent = currentStatus.toLowerCase() === s.toLowerCase();
                    const btnStyles: Record<string, string> = {
                      Active:   isCurrent
                        ? "bg-green-600 text-white border-green-600 shadow-sm"
                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
                      Inactive: isCurrent
                        ? "bg-gray-500 text-white border-gray-500 shadow-sm"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
                      Left:     isCurrent
                        ? "bg-red-500 text-white border-red-500 shadow-sm"
                        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
                    };
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={isCurrent || statusLoading}
                        onClick={() => handleStatusChange(s)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${btnStyles[s]}`}
                      >
                        {isCurrent ? `✓ ${s}` : s}
                      </button>
                    );
                  })}
                </div>

                {statusLoading && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 font-medium">
                    <RefreshCw size={12} className="animate-spin" />
                    Updating status…
                  </div>
                )}
                {statusSuccess && (
                  <div className="mt-3 text-xs text-green-600 font-bold bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                    ✓ Status updated successfully
                  </div>
                )}
                {statusError && (
                  <div className="mt-3 text-xs text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                    {statusError}
                  </div>
                )}
              </div>

              {/* Personal Info */}
              <Section title="Personal Information" icon={<User size={13} />}>
                <DetailRow icon={<User size={13} />}       label="Full Name"      value={employee.employee_name} />
                <DetailRow icon={<User size={13} />}       label="Gender"         value={employee.gender} />
                <DetailRow icon={<Calendar size={13} />}   label="Date of Birth"  value={employee.date_of_birth} />
                <DetailRow icon={<CreditCard size={13} />} label={employee.custom_employeeidtype ?? "CNIC"} value={employee.custom_employee_nic} />
                <DetailRow icon={<Heart size={13} />}      label="Marital Status" value={employee.marital_status} />
                <DetailRow icon={<Heart size={13} />}      label="Blood Group"    value={employee.blood_group} />
              </Section>

              {/* Contact */}
              <Section title="Contact Details" icon={<Phone size={13} />}>
                <DetailRow icon={<Phone size={13} />}  label="Cell Number"    value={employee.cell_number} />
                <DetailRow icon={<Mail size={13} />}   label="Personal Email" value={employee.personal_email} />
                <DetailRow icon={<Mail size={13} />}   label="Work Email"     value={employee.user_id} />
                <DetailRow icon={<MapPin size={13} />} label="Address"        value={employee.permanent_address} />
              </Section>

              {/* Employment */}
              <Section title="Employment" icon={<Briefcase size={13} />}>
                <DetailRow icon={<Building2 size={13} />}  label="Company"         value={employee.company} />
                <DetailRow icon={<UserCheck size={13} />}  label="Employment Type" value={employee.employment_type} />
                <DetailRow icon={<Briefcase size={13} />}  label="Designation"     value={employee.designation} />
                <DetailRow icon={<Building2 size={13} />}  label="Department"      value={employee.department} />
                <DetailRow icon={<Calendar size={13} />}   label="Date of Joining" value={employee.date_of_joining} />
                <DetailRow icon={<Clock size={13} />}      label="Default Shift"   value={employee.default_shift} />
                <DetailRow icon={<Calendar size={13} />}   label="Holiday List"    value={employee.holiday_list} />
                <DetailRow icon={<UserCheck size={13} />}  label="Reports To"      value={employee.reports_to} />
              </Section>

              {/* Approvers */}
              <Section title="Approvers" icon={<Shield size={13} />}>
                <DetailRow icon={<Mail size={13} />} label="Leave Approver"         value={employee.leave_approver} />
                <DetailRow icon={<Mail size={13} />} label="Expense Approver"       value={employee.expense_approver} />
                <DetailRow icon={<Mail size={13} />} label="Shift Request Approver" value={employee.shift_request_approver} />
              </Section>

              {/* Payroll */}
              <Section title="Payroll & Bank" icon={<Banknote size={13} />}>
                <DetailRow icon={<Banknote size={13} />}   label="Salary Mode"     value={employee.salary_mode} />
                <DetailRow icon={<Banknote size={13} />}   label="Salary Currency" value={employee.salary_currency} />
                <DetailRow icon={<Building2 size={13} />}  label="Bank Name"       value={employee.bank_name} />
                <DetailRow icon={<CreditCard size={13} />} label="IBAN"            value={employee.iban} />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface AdminEmployeesPageProps {
  onBack?: () => void;
}

export const AdminEmployeesPage: React.FC<AdminEmployeesPageProps> = ({ onBack }) => {
  const { employees, loading, error, refresh, filterByStatus } = useAdminEmployees();

  const [query, setQuery]           = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleBack = () => {
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const filtered = useMemo(() => {
    const byStatus = filterByStatus(statusFilter);
    if (!query.trim()) return byStatus;
    const q = query.toLowerCase();
    return byStatus.filter((e) =>
      (e.employee_name ?? "").toLowerCase().includes(q) ||
      (e.name ?? "").toLowerCase().includes(q) ||
      (e.designation ?? "").toLowerCase().includes(q) ||
      (e.cell_number ?? "").includes(q)
    );
  }, [employees, query, statusFilter, filterByStatus]);

  const counts = useMemo(() => ({
    all:      employees.length,
    active:   employees.filter((e) => (e.status ?? "").toLowerCase() === "active").length,
    inactive: employees.filter((e) => (e.status ?? "").toLowerCase() === "inactive").length,
    left:     employees.filter((e) => (e.status ?? "").toLowerCase() === "left").length,
  }), [employees]);

  // ── Data for the status bar chart ──
  const chartData = useMemo(() => ([
    { name: "Active",   value: counts.active,   color: "#16a34a" },
    { name: "Inactive", value: counts.inactive, color: "#9ca3af" },
    { name: "Left",     value: counts.left,     color: "#ef4444" },
  ]), [counts]);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-500 flex items-center justify-center transition-all flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
            <Users size={21} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-black text-gray-800 text-lg leading-none">Employees</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {counts.all} total · {counts.active} active · {counts.inactive} inactive
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-xl text-sm font-bold transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Status Chart ── */}
      {!loading && counts.all > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
              <Users size={13} className="text-green-500" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Employees by Status
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontWeight: 600, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f9fafb" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "inactive", "left"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                statusFilter === s ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, ID, designation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium border border-red-100">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[72px] bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Employee list ── */}
      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-14 text-center">
              <Users size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-sm text-gray-400">No employees found</p>
              <p className="text-xs text-gray-300 mt-1">Try a different search or filter</p>
            </div>
          ) : (
            filtered.map((emp) => (
              <button
                key={emp.name}
                type="button"
                onClick={() => setSelectedId(emp.name)}
                className="w-full text-left bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-green-100">
                  {emp.image ? (
                    <img
                      src={`${BASE_URL}${emp.image}`}
                      alt={emp.employee_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span className="text-sm font-black text-green-600">
                      {getInitials(emp.employee_name ?? emp.name)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-800 text-sm">{emp.employee_name ?? emp.name}</p>
                    <StatusBadge status={emp.status} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {emp.designation ?? "—"}
                    {emp.department ? ` · ${emp.department}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{emp.name}</p>
                </div>

                <ChevronRight size={16} className="text-gray-200 group-hover:text-green-400 transition-colors flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-gray-400 text-center font-medium">
          Showing {filtered.length} of {counts.all} employees
        </p>
      )}

      {/* ── Detail panel ── */}
      {selectedId && (
        <EmployeeDetailPanel
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusUpdated={refresh}
        />
      )}
    </div>
  );
};