import React, { useState, useMemo } from "react";
import {
  Banknote, Search, X, AlertCircle, RefreshCw,
  ChevronRight, User, Building2, Calendar, CreditCard,
  TrendingUp, TrendingDown, Wallet, ArrowLeft,
} from "lucide-react";
import {
  useAdminSalarySlips,
  useAdminSalarySlipDetail,
} from "../hooks/Useadminsalaryslips";

type StatusFilter = "all" | "Draft" | "Submitted" | "Cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value?: number, currency?: string): string {
  if (value === undefined || value === null) return "—";
  return `${currency ?? "PKR"} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "";
  const map: Record<string, { bg: string; text: string }> = {
    Draft:     { bg: "bg-amber-50", text: "text-amber-600" },
    Submitted: { bg: "bg-green-50", text: "text-green-600" },
    Cancelled: { bg: "bg-red-50",   text: "text-red-500" },
  };
  const style = map[s] ?? { bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}>
      {s || "—"}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <div className="bg-gray-50 rounded-xl px-4 py-1">
        {children}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function SalarySlipDetailPanel({
  id, onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { salarySlip, loading, error } = useAdminSalarySlipDetail(id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right mt-16">

        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft size={15} className="text-white" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Banknote size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">
                {loading ? "Loading..." : salarySlip?.employee_name ?? id}
              </p>
              <p className="text-[10px] text-white/70 font-medium mt-0.5">
                {salarySlip?.start_date && salarySlip?.end_date
                  ? `${salarySlip.start_date} – ${salarySlip.end_date}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={15} className="text-white" />
          </button>
        </div>

        {/* Body */}
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

          {salarySlip && !loading && (
            <>
              {/* Status + ID */}
              <div className="flex items-center justify-between">
                <StatusBadge status={salarySlip.status} />
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {salarySlip.name}
                </span>
              </div>

              {/* Pay summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <TrendingUp size={14} className="mx-auto text-green-500 mb-1" />
                  <p className="text-[9px] font-bold uppercase text-gray-400">Gross</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">
                    {formatCurrency(salarySlip.gross_pay, salarySlip.currency)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <TrendingDown size={14} className="mx-auto text-red-500 mb-1" />
                  <p className="text-[9px] font-bold uppercase text-gray-400">Deductions</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">
                    {formatCurrency(salarySlip.total_deduction, salarySlip.currency)}
                  </p>
                </div>
                <div className="bg-sky-50 rounded-xl p-3 text-center">
                  <Wallet size={14} className="mx-auto text-sky-500 mb-1" />
                  <p className="text-[9px] font-bold uppercase text-gray-400">Net Pay</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">
                    {formatCurrency(salarySlip.net_pay, salarySlip.currency)}
                  </p>
                </div>
              </div>

              {/* Employee */}
              <Section title="Employee">
                <DetailRow icon={<User size={13} />}     label="Employee"   value={salarySlip.employee_name} />
                <DetailRow icon={<User size={13} />}     label="Employee ID" value={salarySlip.employee} />
                <DetailRow icon={<Building2 size={13} />} label="Department" value={salarySlip.department} />
                <DetailRow icon={<Building2 size={13} />} label="Designation" value={salarySlip.designation} />
                <DetailRow icon={<Building2 size={13} />} label="Company"    value={salarySlip.company} />
              </Section>

              {/* Period */}
              <Section title="Pay Period">
                <DetailRow icon={<Calendar size={13} />} label="Start Date"   value={salarySlip.start_date} />
                <DetailRow icon={<Calendar size={13} />} label="End Date"     value={salarySlip.end_date} />
                <DetailRow icon={<Calendar size={13} />} label="Posting Date" value={salarySlip.posting_date} />
                <DetailRow icon={<Calendar size={13} />} label="Payroll Frequency" value={salarySlip.payroll_frequency} />
                <DetailRow icon={<Calendar size={13} />} label="Payment Days" value={salarySlip.payment_days} />
                <DetailRow icon={<Calendar size={13} />} label="Total Working Days" value={salarySlip.total_working_days} />
                <DetailRow icon={<Calendar size={13} />} label="Leave Without Pay" value={salarySlip.leave_without_pay} />
                <DetailRow icon={<Calendar size={13} />} label="Absent Days" value={salarySlip.absent_days} />
              </Section>

              {/* Payment */}
              <Section title="Payment">
                <DetailRow icon={<CreditCard size={13} />} label="Mode of Payment" value={salarySlip.mode_of_payment} />
                <DetailRow icon={<Building2 size={13} />}  label="Bank Name"       value={salarySlip.bank_name} />
                <DetailRow icon={<CreditCard size={13} />} label="Bank Account"    value={salarySlip.bank_account_no} />
              </Section>

              {/* Earnings breakdown */}
              {salarySlip.earnings && salarySlip.earnings.length > 0 && (
                <Section title="Earnings">
                  {salarySlip.earnings.map((e, i) => (
                    <DetailRow
                      key={i}
                      icon={<TrendingUp size={13} />}
                      label={e.salary_component ?? "—"}
                      value={formatCurrency(e.amount, salarySlip.currency)}
                    />
                  ))}
                </Section>
              )}

              {/* Deductions breakdown */}
              {(salarySlip as any).deductions && (salarySlip as any).deductions.length > 0 && (
                <Section title="Deductions">
                  {(salarySlip as any).deductions.map((d: any, i: number) => (
                    <DetailRow
                      key={i}
                      icon={<TrendingDown size={13} />}
                      label={d.salary_component ?? "—"}
                      value={formatCurrency(d.amount, salarySlip.currency)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface AdminSalarySlipPageProps {
  onBack?: () => void;
}

export const AdminSalarySlipPage: React.FC<AdminSalarySlipPageProps> = ({ onBack }) => {
  const { salarySlips, loading, error, refresh, filterByStatus, totals, range, setRange } =
    useAdminSalarySlips();

  const [query, setQuery]           = useState("");
  const [statusFilter, setStatus]   = useState<StatusFilter>("all");
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
    return byStatus.filter(
      (s) =>
        (s.employee_name ?? "").toLowerCase().includes(q) ||
        (s.employee ?? "").toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q)
    );
  }, [salarySlips, query, statusFilter, filterByStatus]);

  const counts = useMemo(() => ({
    all:       salarySlips.length,
    Draft:     salarySlips.filter((s) => s.status === "Draft").length,
    Submitted: salarySlips.filter((s) => s.status === "Submitted").length,
    Cancelled: salarySlips.filter((s) => s.status === "Cancelled").length,
  }), [salarySlips]);

  const submittedRate = counts.all > 0 ? Math.round((counts.Submitted / counts.all) * 100) : 0;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-green-400 hover:text-green-600"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-11 h-11 shrink-0 rounded-xl bg-green-100 flex items-center justify-center">
            <Banknote size={21} className="text-green-600" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">
              Payroll
            </p>
            <h2 className="text-xl font-black text-gray-900 leading-tight">Salary Slips</h2>
            <p className="text-xs font-medium text-gray-400 mt-0.5">
              {loading
                ? "Loading slips…"
                : `${counts.all} slip${counts.all === 1 ? "" : "s"} · Net ${formatCurrency(totals.netPay)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && counts.all > 0 && (
            <span
              className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${
                submittedRate >= 75
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : submittedRate >= 40
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {submittedRate}% submitted
            </span>
          )}

          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-xl text-sm font-bold transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Date range ── */}
      <div className="flex items-center gap-2 flex-wrap bg-white border border-gray-100 rounded-xl px-4 py-3">
        <Calendar size={14} className="text-gray-400" />
        <input
          type="date"
          value={range.from_date}
          onChange={(e) => setRange({ ...range, from_date: e.target.value })}
          className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={range.to_date}
          onChange={(e) => setRange({ ...range, to_date: e.target.value })}
          className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300"
        />
      </div>

      {/* ── Totals summary ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gross Pay</p>
          <p className="text-sm font-black text-gray-800 mt-1">{formatCurrency(totals.grossPay)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Deductions</p>
          <p className="text-sm font-black text-gray-800 mt-1">{formatCurrency(totals.deductions)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Net Pay</p>
          <p className="text-sm font-black text-green-600 mt-1">{formatCurrency(totals.netPay)}</p>
        </div>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "Draft", "Submitted", "Cancelled"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === s
                ? "bg-green-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-500 hover:border-green-300"
            }`}
          >
            {s === "all" ? "All" : s}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${
              statusFilter === s ? "bg-white/20" : "bg-gray-100"
            }`}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by employee, ID..."
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

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Salary slip list ── */}
      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Banknote size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No salary slips found</p>
              <p className="text-xs mt-1">Try a different date range, search, or filter</p>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelectedId(s.name)}
                className="w-full text-left bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 hover:shadow-md hover:border-green-200 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100">
                  <Banknote size={18} className="text-green-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-800 text-sm truncate">
                      {s.employee_name ?? s.employee}
                    </p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                    {s.start_date ? `${s.start_date} – ${s.end_date}` : "—"}
                    {" · "}
                    Net: {formatCurrency(s.net_pay, s.currency)}
                  </p>
                  <p className="text-[10px] text-gray-300 font-medium mt-0.5">{s.name}</p>
                </div>

                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Detail panel ── */}
      {selectedId && (
        <SalarySlipDetailPanel
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};