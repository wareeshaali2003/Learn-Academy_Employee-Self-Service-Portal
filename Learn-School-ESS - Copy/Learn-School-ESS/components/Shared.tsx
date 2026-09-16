import React from "react";
import { CheckCircle2, XCircle, AlertCircle, BookMarked } from "lucide-react";
// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatTime(t?: string) {
  if (!t) return "--";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

export function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export function getWeekday(dateStr?: string) {
  if (!dateStr) return "Other";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? "Other" : d.toLocaleDateString("en-US", { weekday: "long" });
}

// ─── Style Helpers ────────────────────────────────────────────────────────────

export function scheduleColorClass(color?: string) {
  const c = (color || "").toLowerCase();
  if (c === "blue")   return { border: "border-blue-200",   bg: "bg-blue-50/60",   badge: "bg-blue-100 text-blue-700" };
  if (c === "green")  return { border: "border-green-200",  bg: "bg-green-50/60",  badge: "bg-green-100 text-green-700" };
  if (c === "red")    return { border: "border-red-200",    bg: "bg-red-50/60",    badge: "bg-red-100 text-red-700" };
  if (c === "yellow") return { border: "border-yellow-200", bg: "bg-yellow-50/60", badge: "bg-yellow-100 text-yellow-700" };
  if (c === "purple") return { border: "border-purple-200", bg: "bg-purple-50/60", badge: "bg-purple-100 text-purple-700" };
  return { border: "border-gray-200", bg: "bg-gray-50/40", badge: "bg-gray-100 text-gray-600" };
}

export function avatarColor(name: string) {
  const colors = [
    "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-amber-500",
    "bg-pink-500", "bg-cyan-500", "bg-red-500", "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function gradeFromPct(pct: number): string {
  if (pct >= 93) return "A+";
  if (pct >= 86) return "A";
  if (pct >= 80) return "B+";
  if (pct >= 73) return "B";
  if (pct >= 65) return "C+";
  if (pct >= 58) return "C";
  if (pct >= 50) return "D+";
  if (pct >= 40) return "D";
  return "F";
}

export function gradeBadgeColor(grade: string): string {
  if (grade === "A+" || grade === "A")  return "bg-green-100 text-green-700 border-green-200";
  if (grade === "B+" || grade === "B")  return "bg-blue-100 text-blue-700 border-blue-200";
  if (grade === "C+" || grade === "C")  return "bg-amber-100 text-amber-700 border-amber-200";
  if (grade === "D+" || grade === "D")  return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}

// ─── Shared UI Components ─────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();

  if (s === "present")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700">
        <CheckCircle2 size={10} /> Present
      </span>
    );

  if (s === "absent")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">
        <XCircle size={10} /> Absent
      </span>
    );

  if (s === "late")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
        <AlertCircle size={10} /> Late
      </span>
    );

  if (s === "leave" || s === "leave")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
        <BookMarked size={10} /> Leave
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500">
      {status || "—"}
    </span>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

// ─── PEIRA Screen-Time Limits ─────────────────────────────────────────────────
// Standard daily screen-time ceilings by class level (per PEIRA virtual-school rules).
// Classes 9–10 are intentionally left undefined until PEIRA issues a figure for them.

export interface ScreenTimeLimit {
  minutes: number;
  hoursLabel: string; // e.g. "3h" or "4.5h"
  tierLabel: string;  // e.g. "Classes 1–5"
}

const SCREEN_TIME_TIERS: { min: number; max: number; minutes: number; hoursLabel: string; tierLabel: string }[] = [
  { min: 1,  max: 5,  minutes: 180, hoursLabel: "3h",   tierLabel: "Classes 1–5" },
  { min: 6,  max: 8,  minutes: 270, hoursLabel: "4.5h", tierLabel: "Classes 6–8" },
  { min: 11, max: 12, minutes: 360, hoursLabel: "6h",   tierLabel: "Classes 11–12" },
];

// Pulls a numeric class/grade level out of a program or student_group label
// (e.g. "Grade-6", "Class 6 - A", "6-A"). Returns null for KG / non-numeric groups.
export function extractGradeNumber(label?: string): number | null {
  if (!label) return null;
  if (/KG[-\s]?\d*/i.test(label)) return null; // KG isn't part of the 1–12 PEIRA ladder
  const m =
    label.match(/Grade[-\s]?(\d{1,2})/i) ||
    label.match(/Class[-\s]?(\d{1,2})/i) ||
    label.match(/(\d{1,2})/);
  if (m?.[1]) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n >= 1 && n <= 12) return n;
  }
  return null;
}

// Looks up the PEIRA daily screen-time ceiling for a given class/grade number.
export function getScreenTimeLimit(gradeNumber: number | null): ScreenTimeLimit | null {
  if (gradeNumber === null) return null;
  const tier = SCREEN_TIME_TIERS.find((t) => gradeNumber >= t.min && gradeNumber <= t.max);
  if (!tier) return null; // e.g. Classes 9–10 — no PEIRA figure defined yet
  return { minutes: tier.minutes, hoursLabel: tier.hoursLabel, tierLabel: tier.tierLabel };
}

// Converts "HH:MM" / "HH:MM:SS" into minutes-since-midnight.
export function timeStrToMinutes(t?: string): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// Formats a minute count as "2h 15m" / "45m" / "3h".
export function formatMinutesLabel(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Compact PEIRA screen-time meter — total scheduled time for a class vs. its daily max.
export function ScreenTimeMeter({
  label,
  usedMinutes,
  limit,
}: {
  label: string;
  usedMinutes: number;
  limit: ScreenTimeLimit | null;
}) {
  if (!limit) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
        <span className="text-xs font-bold text-gray-600 truncate">{label}</span>
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {formatMinutesLabel(usedMinutes)} scheduled · no PEIRA limit set
        </span>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((usedMinutes / limit.minutes) * 100));
  const over = usedMinutes > limit.minutes;
  const near = !over && pct >= 85;

  const barColor = over ? "bg-red-500" : near ? "bg-amber-500" : "bg-green-500";
  const textColor = over ? "text-red-600" : near ? "text-amber-600" : "text-green-600";
  const wrapTint = over
    ? "bg-red-50 border-red-200"
    : near
    ? "bg-amber-50 border-amber-200"
    : "bg-green-50 border-green-200";

  return (
    <div className={`px-3 py-2.5 rounded-lg border ${wrapTint}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-gray-700 truncate">
          {label}
          <span className="ml-1.5 text-[10px] font-semibold text-gray-400">
            ({limit.tierLabel} · max {limit.hoursLabel})
          </span>
        </span>
        <span className={`text-[11px] font-extrabold flex-shrink-0 ${textColor}`}>
          {formatMinutesLabel(usedMinutes)} / {formatMinutesLabel(limit.minutes)}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/70 border border-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <p className="text-[10px] font-bold text-red-500 mt-1">
          ⚠ {formatMinutesLabel(usedMinutes - limit.minutes)} over the PEIRA daily limit
        </p>
      )}
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h2 className="font-bold text-gray-800 text-base leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}