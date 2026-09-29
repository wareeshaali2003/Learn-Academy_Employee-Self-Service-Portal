import React, { useMemo, useState } from "react";
import {
  GraduationCap,
  Award,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  FileWarning,
  User,
} from "lucide-react";
import {
  useCeoTeacherProfiles,
  TeacherProfile,
} from "../hooks/Useceoteacherprofiles";
import { SectionHeader, Skeleton, avatarColor } from "../components/Shared";

// ─── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-1 min-w-[150px]">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
        <p className="text-lg font-black text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── One teacher card ───────────────────────────────────────────────────────
function TeacherCard({ teacher }: { teacher: TeacherProfile }) {
  const [open, setOpen] = useState(false);
  const initial = (teacher.name || "?")[0]?.toUpperCase() || "?";
  const hasRecords = teacher.degrees.length > 0 || teacher.certifications.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {teacher.image ? (
            <img
              src={teacher.image}
              alt={teacher.name}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black ${avatarColor(teacher.name)}`}>
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 truncate">{teacher.name}</p>
            <p className="text-[11px] text-gray-400 truncate">
              {teacher.designation || "Instructor"}
              {teacher.department ? ` · ${teacher.department}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasRecords ? (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-green-50 text-green-600">
              <BadgeCheck size={12} />
              {teacher.degrees.length} degree{teacher.degrees.length === 1 ? "" : "s"}
              {teacher.certifications.length > 0 ? ` · ${teacher.certifications.length} cert.` : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600">
              <FileWarning size={12} />
              No records on file
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-50 p-4 space-y-4">
          {/* Degrees */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <GraduationCap size={13} /> Degrees & Education
            </p>
            {teacher.degrees.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No degree records on file in ERP.</p>
            ) : (
              <div className="space-y-2">
                {teacher.degrees.map((d, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-sm font-bold text-gray-700">
                      {d.qualification || "—"}
                      {d.level ? <span className="text-gray-400 font-medium"> · {d.level}</span> : null}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {d.school_univ || "—"}
                      {d.year_of_passing ? ` · ${d.year_of_passing}` : ""}
                      {d.maj_opt_subj ? ` · ${d.maj_opt_subj}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <Award size={13} /> Certifications & Professional Qualifications
            </p>
            {teacher.certifications.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No certification records on file in ERP.</p>
            ) : (
              <div className="space-y-2">
                {teacher.certifications.map((c, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-sm font-bold text-gray-700">
                      {c.certificate_name || c.title || c.name || "Certification"}
                    </p>
                    {(c.issued_by || c.issuing_authority || c.year) && (
                      <p className="text-[11px] text-gray-400">
                        {c.issued_by || c.issuing_authority || "—"}
                        {c.year ? ` · ${c.year}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CeoTeacherProfilesPage() {
  const { profiles, totals, loading, error, refresh } = useCeoTeacherProfiles();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.designation || "").toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <SectionHeader
        icon={<GraduationCap size={18} />}
        title="Teacher Profiles"
        subtitle="All teachers' degrees, certifications & professional qualifications on file"
      />

      {/* Search + refresh */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, designation, or department..."
            className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400"
          />
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-800 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total Teachers" value={loading ? "—" : totals.total} icon={<User size={16} />} />
        <StatPill label="With Degrees on File" value={loading ? "—" : totals.withDegrees} icon={<GraduationCap size={16} />} />
        <StatPill label="With Certifications" value={loading ? "—" : totals.withCerts} icon={<Award size={16} />} />
        <StatPill label="Missing Records" value={loading ? "—" : totals.missing} icon={<FileWarning size={16} />} />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl px-4 py-3">
          <FileWarning size={16} />
          {error}
        </div>
      )}

      {/* Teacher list */}
      {loading ? (
        <Skeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <GraduationCap size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">
            {search ? "No teachers match your search." : "No teacher records found."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <TeacherCard key={t.instructorId} teacher={t} />
          ))}
        </div>
      )}
    </div>
  );
}