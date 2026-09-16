import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSalarySlip } from "../hooks/useSalarySlip";
import { api as apiService } from "../services/api";
import {
  Download, CreditCard, Eye, AlertTriangle,
  TrendingUp, TrendingDown, Wallet, FileText, ChevronRight,
  ArrowLeft,
} from "lucide-react";

type SlipLike = {
  name?: string;
  posting_date?: string;
  month?: string;
  net_pay?: number | string;
  netPay?: number | string;
  gross_pay?: number | string;
  grossPay?: number | string;
  total_deduction?: number | string;
  totalDeduction?: number | string;
  [k: string]: any;
};

function num(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function fmt(v: number | null): string {
  if (v === null) return "--";
  return v.toLocaleString();
}

function slipLabel(slip: SlipLike) {
  return slip.posting_date || slip.month || slip.name || "Salary Slip";
}

function slipNetPay(slip: SlipLike)    { return num(slip.net_pay   ?? slip.netPay); }
function slipGrossPay(slip: SlipLike)  { return num(slip.gross_pay ?? slip.grossPay); }
function slipDeduction(slip: SlipLike) { return num(slip.total_deduction ?? slip.totalDeduction); }

interface SalarySlipPageProps {
  onBack?: () => void;
}

export const SalarySlipPage: React.FC<SalarySlipPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { slips, loading } = useSalarySlip();
  const [pageError, setPageError] = useState<string | null>(null);

  const safeSlips: SlipLike[] = useMemo(() => {
    if (!Array.isArray(slips)) return [];
    return slips.filter(Boolean).map((s) =>
      typeof s === "object" ? (s as SlipLike) : ({} as SlipLike)
    );
  }, [slips]);

  const latestSlip   = safeSlips[0];
  const latestNet    = latestSlip ? slipNetPay(latestSlip)    : null;
  const latestGross  = latestSlip ? slipGrossPay(latestSlip)  : null;
  const latestDeduct = latestSlip ? slipDeduction(latestSlip) : null;

  const handleDownload = (name?: string) => {
    setPageError(null);
    if (!name) { setPageError("Cannot download: salary slip ID is missing."); return; }
    window.open(apiService.getSalarySlipDownloadUrl(name), "_blank", "noopener,noreferrer");
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate("/ess");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 h-64 text-gray-400 text-sm font-medium">
        <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
        Fetching payroll records…
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
        <p className="text-sm font-bold text-gray-500">Salary Slips</p>
      </div> */}

      {/* ── Page header ── */}
      <div>
        <h2 className="text-xl font-black text-gray-800">Salary Slips</h2>
        <p className="text-sm text-gray-400 mt-0.5">Official payroll records and history</p>
        {pageError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-500 font-medium bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
            <AlertTriangle size={14} />
            {pageError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Slip list (2/3) ── */}
        <div className="lg:col-span-2 space-y-3">
          {safeSlips.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <CreditCard size={22} className="text-gray-200" />
              </div>
              <p className="text-sm font-semibold text-gray-400">No salary slips on record</p>
              <p className="text-xs text-gray-300 mt-1">Your payroll history will appear here</p>
            </div>
          ) : (
            safeSlips.map((slip, idx) => {
              const net    = slipNetPay(slip);
              const slipId = slip.name;
              const isLatest = idx === 0;

              return (
                <div
                  key={slipId || idx}
                  className={`relative bg-white rounded-2xl border shadow-sm flex items-center justify-between px-5 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden ${
                    isLatest ? "border-green-200" : "border-gray-100"
                  }`}
                >
                  {isLatest && (
                    <div className="absolute top-0 right-0">
                      <span className="text-[9px] font-black uppercase bg-green-500 text-white px-2.5 py-1 rounded-bl-xl rounded-tr-2xl tracking-widest">
                        Latest
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
                      isLatest ? "bg-green-500" : "bg-green-50"
                    }`}>
                      <CreditCard size={20} className={isLatest ? "text-white" : "text-green-600"} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{slipLabel(slip)}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{slipId || "N/A"}</p>
                      <p className="text-xs font-bold text-green-600 mt-1">Net Pay: {fmt(net)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mr-6">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 flex items-center justify-center transition-all"
                      title="View Detail"
                      onClick={() => setPageError("Detail view not connected yet.")}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(slipId)}
                      disabled={!slipId}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Sidebar (1/3) ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Wallet size={15} className="text-green-600" />
              </div>
              <p className="font-bold text-gray-800 text-sm">Payroll Overview</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <TrendingUp size={13} className="text-green-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Gross Monthly</span>
                </div>
                <span className="text-sm font-bold text-gray-800">{fmt(latestGross)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                    <TrendingDown size={13} className="text-red-400" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Total Deductions</span>
                </div>
                <span className="text-sm font-bold text-red-500">{fmt(latestDeduct)}</span>
              </div>
              <div className="border-t border-dashed border-gray-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">Latest Take Home</span>
                  <span className="text-xl font-black text-green-600">{fmt(latestNet)}</span>
                </div>
                {latestGross && latestNet && (
                  <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min((latestNet / latestGross) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)" }}
          >
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full" />
            <div className="absolute -right-2 -top-4 w-16 h-16 bg-white/5 rounded-full" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <FileText size={16} className="text-white" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Official Letters</h4>
              <p className="text-xs text-white/70 mb-4 leading-relaxed">
                Request authenticated salary letters for visa or financial applications.
              </p>
              <button
                type="button"
                onClick={() => setPageError("Document request endpoint not connected yet.")}
                className="w-full bg-white text-green-700 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 active:scale-95 transition-all"
              >
                Request Document <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};