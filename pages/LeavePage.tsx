import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeave } from "../hooks/useLeave";
import {
  Plus, CheckCircle2, Clock, XCircle, CalendarCheck,
  CalendarDays, Inbox, ArrowLeft,
} from "lucide-react";
import { LeaveApplicationModal } from "../components/LeaveApplicationModal";
import type { LeaveApplication, LeaveBalance } from "../types";

function asNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLeaveStatus(raw: string) {
  const s = (raw || "").toLowerCase();
  if (s.includes("approve")) return "approved";
  if (s.includes("reject") || s.includes("cancel")) return "rejected";
  if (s.includes("pending") || s.includes("open") || s.includes("applied")) return "pending";
  return "pending";
}

function statusBadge(statusRaw: string) {
  const s = normalizeLeaveStatus(statusRaw);
  if (s === "approved") return {
    cls: "bg-green-100 text-green-700 border border-green-200",
    icon: <CheckCircle2 size={11} />, label: "Approved",
  };
  if (s === "rejected") return {
    cls: "bg-red-100 text-red-700 border border-red-200",
    icon: <XCircle size={11} />, label: "Rejected",
  };
  return {
    cls: "bg-amber-100 text-amber-700 border border-amber-200",
    icon: <Clock size={11} />, label: "Pending",
  };
}

interface LeavePageProps {
  onBack?: () => void;
}

export const LeavePage: React.FC<LeavePageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { leaves, balances, loading, error, applyLeave } = useLeave();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const safeBalances = useMemo(() =>
    Array.isArray(balances) ? (balances as LeaveBalance[]) : [], [balances]);

  const safeLeaves = useMemo(() =>
    Array.isArray(leaves) ? (leaves as LeaveApplication[]) : [], [leaves]);

  const handleLeaveSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const result = await applyLeave({
        leave_type: `${data.leaveType} Leave`,
        from_date: data.startDate,
        to_date: data.endDate,
        reason: data.reason,
      });
      if (result.success) {
        setIsModalOpen(false);
        alert("Leave application submitted successfully for approval.");
      } else {
        alert(result.error || "Failed to submit leave application.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate("/ess");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 h-64 text-gray-400 text-sm font-medium">
        <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
        Loading leave records…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Back button ── */}
      {/* <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-xl text-sm font-bold transition-all group"
        >
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <p className="text-sm font-bold text-gray-500">Leave Applications</p>
      </div> */}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800">Leave Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">View balances and historical applications</p>
          {error && <p className="mt-1 text-sm text-red-500 font-medium">{error}</p>}
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={submitting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
            submitting
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white active:scale-95"
          }`}
        >
          <Plus size={16} />
          {submitting ? "Submitting…" : "New Application"}
        </button>
      </div>

      {/* ── Leave Balance Cards ── */}
      {safeBalances.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] p-10 text-center text-gray-400 text-sm">
          No leave balances available.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {safeBalances.map((balance) => {
            const available = asNumber((balance as any).available, 0);
            const used      = asNumber((balance as any).used, 0);
            const total     = asNumber((balance as any).total, Math.max(available + used, 1));
            const pct       = clamp((available / total) * 100);
            const typeLabel = (balance.type || "Leave").trim();

            return (
              <div
                key={balance.type}
                className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:-translate-y-1 transition-all duration-200 overflow-hidden group"
              >
                <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-green-500 opacity-[0.06] pointer-events-none" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 truncate relative">
                  {typeLabel}
                </p>
                <div className="flex items-end justify-between mb-3 relative">
                  <p className="text-3xl font-black text-gray-800 leading-none">{available}</p>
                  <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shadow-sm">
                    <CalendarDays size={16} className="text-green-600" />
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 8)}%`, background: "linear-gradient(90deg,#4ade80,#16a34a)" }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                  {used} used · {total} total
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Leave History Table ── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)] transition-shadow duration-200 border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <CalendarCheck size={17} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Leave History</p>
              <p className="text-[11px] text-gray-400">{safeLeaves.length} applications</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-green-50 text-green-700 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-3.5">Leave Type</th>
                <th className="px-6 py-3.5">Period</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {safeLeaves.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                        <Inbox size={22} className="text-gray-200" />
                      </div>
                      <p className="text-sm font-semibold text-gray-400">No applications found</p>
                      <p className="text-xs text-gray-300">Apply for leave using the button above</p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeLeaves.map((leave) => {
                  const id        = (leave as any).id || (leave as any).name || "";
                  const type      = (leave as any).type || (leave as any).leave_type || "Leave";
                  const from      = (leave as any).startDate || (leave as any).from_date || "N/A";
                  const to        = (leave as any).endDate   || (leave as any).to_date   || "N/A";
                  const reason    = (leave as any).reason || (leave as any).description || "";
                  const statusRaw = (leave as any).status || (leave as any).workflow_state || "Pending";
                  const badge     = statusBadge(statusRaw);

                  return (
                    <tr key={String(id)} className="hover:bg-green-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-sm">{type}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                          #{String(id).toUpperCase().slice(0, 10)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-700">{from}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">to {to}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badge.cls}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500 max-w-xs truncate" title={reason}>
                          {reason || "—"}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeaveApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleLeaveSubmit}
      />
    </div>
  );
};