import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, DirectoryEmployee } from "../services/api";
import { Search, X, Mail, Phone, User, ArrowLeft, Briefcase, Building2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
  "#16a34a"
];

function avatarBg(name: string): string {
  let h = 0;
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
const ProfileModal: React.FC<{ emp: DirectoryEmployee; onClose: () => void }> = ({ emp, onClose }) => {
  const bg = avatarBg(emp.employee_name || "?");
  const initials = getInitials(emp.employee_name || "?");

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", animation: "fadeIn 0.2s ease" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: "slideUp 0.2s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div className="relative flex flex-col items-center px-6 pt-8 pb-6 border-b border-gray-100"
          style={{ background: `${bg}08` }}>
          <button type="button" onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors">
            <X size={14} />
          </button>

          {/* Avatar */}
          {emp.image ? (
            <img src={emp.image} alt={emp.employee_name}
              className="w-20 h-20 rounded-full object-cover mb-4"
              style={{ border: `3px solid ${bg}`, boxShadow: `0 0 20px ${bg}30` }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white mb-4"
              style={{ background: bg, boxShadow: `0 4px 20px ${bg}40` }}>
              {initials}
            </div>
          )}

          <h3 className="text-lg font-black text-gray-800 text-center mb-2">{emp.employee_name}</h3>

          {emp.designation && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: `${bg}15`, color: bg }}>
              {emp.designation}
            </span>
          )}
          {emp.department && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Building2 size={11} /> {emp.department}
            </p>
          )}
        </div>

        {/* Contact info */}
        <div className="px-6 py-4 space-y-3">
          {emp.company_email && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                <a href={`mailto:${emp.company_email}`}
                  className="text-xs font-semibold text-gray-700 hover:text-green-600 transition-colors truncate block">
                  {emp.company_email}
                </a>
              </div>
            </div>
          )}
          {emp.cell_number && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</p>
                <a href={`tel:${emp.cell_number}`}
                  className="text-xs font-semibold text-gray-700 hover:text-green-600 transition-colors">
                  {emp.cell_number}
                </a>
              </div>
            </div>
          )}
          {!emp.company_email && !emp.cell_number && (
            <p className="text-center text-xs text-gray-400 py-4">No contact info available</p>
          )}
        </div>

        {/* Close */}
        <div className="px-6 pb-6">
          <button type="button" onClick={onClose}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 text-sm font-bold transition-all">
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

// ── Employee Card ─────────────────────────────────────────────────────────────
const EmployeeCard: React.FC<{ emp: DirectoryEmployee; onView: () => void }> = ({ emp, onView }) => {
  const bg = avatarBg(emp.employee_name || "?");
  const initials = getInitials(emp.employee_name || "?");

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group flex flex-col">
      {/* Top color bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${bg}, ${bg}50)` }} />

      <div className="flex flex-col items-center p-5 flex-1">
        {/* Avatar */}
        {emp.image ? (
          <img src={emp.image} alt={emp.employee_name}
            className="w-16 h-16 rounded-full object-cover mb-3 group-hover:scale-105 transition-transform"
            style={{ border: `2px solid ${bg}40` }} />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-black text-white mb-3 group-hover:scale-105 transition-transform"
            style={{ background: bg }}>
            {initials}
          </div>
        )}

        {/* Name */}
        <p className="text-sm font-black text-gray-800 group-hover:text-green-700 transition-colors text-center mb-1 leading-tight">
          {emp.employee_name}
        </p>

        {/* Designation */}
        {emp.designation && (
          <p className="text-[10px] font-bold text-center mb-1"
            style={{ color: bg }}>
            {emp.designation}
          </p>
        )}

        {/* Department */}
        {emp.department && (
          <p className="text-[10px] text-gray-400 text-center mb-3 truncate max-w-full">
            {emp.department}
          </p>
        )}

        {/* Contact icons */}
        {(emp.company_email || emp.cell_number) && (
          <div className="flex gap-2 mb-3">
            {emp.company_email && (
              <a href={`mailto:${emp.company_email}`} title={emp.company_email}
                className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all">
                <Mail size={12} />
              </a>
            )}
            {emp.cell_number && (
              <a href={`tel:${emp.cell_number}`} title={emp.cell_number}
                className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all">
                <Phone size={12} />
              </a>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Profile */}
        <button type="button" onClick={onView}
          className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest border-2 border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all">
          View Profile
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<DirectoryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<DirectoryEmployee | null>(null);

  const load = async (query?: string) => {
    setLoading(true);
    const res = await api.getDirectory(query);
    setRows(res.ok ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Back button */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate("/ess")}
          className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-xl text-sm font-bold transition-all group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <span className="text-gray-300">›</span>
        <span className="text-sm font-bold text-gray-400">My Team</span>
      </div>

      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-1">Directory</p>
          <h1 className="text-2xl font-black text-gray-800">Contacts</h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-bold text-gray-700">{rows.length}</span> employees found
              {q && <span className="text-green-600 font-semibold"> for "{q}"</span>}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-2 sm:w-80">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load(q)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
            {q && (
              <button type="button" onClick={() => { setQ(""); load(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          <button type="button" onClick={() => load(q)}
            className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm shadow-green-100">
            <Search size={13} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-gray-400 text-sm font-medium">
          <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
          Loading directory…
        </div>
      )}

      {/* Empty */}
      {!loading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            <User size={26} className="text-gray-200" />
          </div>
          <p className="text-sm font-bold text-gray-400">No employees found</p>
          <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
        </div>
      )}

      {/* Cards grid */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {rows.map(emp => (
            <EmployeeCard key={emp.name} emp={emp} onView={() => setSelectedEmp(emp)} />
          ))}
        </div>
      )}

      {/* Profile modal */}
      {selectedEmp && <ProfileModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}
    </div>
  );
};