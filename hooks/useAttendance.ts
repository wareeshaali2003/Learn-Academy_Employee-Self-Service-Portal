import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

// ── Type defined locally ─────────────────────────────────────────────────────
export type AttendanceRecord = {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string;
};

type RegularizeResult = { success: true } | { success: false; error: string };

function makeMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// ── Time helpers ─────────────────────────────────────────────────────────────
// Accepts "HH:mm:ss", "YYYY-MM-DD HH:mm:ss", or already trimmed "HH:mm".
function pickTime(raw?: string | null): string {
  if (!raw) return "--:--";
  const s = String(raw).trim();
  if (!s) return "--:--";
  const part = s.includes(" ") ? s.split(" ")[1] : s;
  if (!part) return "--:--";
  return part.slice(0, 5) || "--:--";
}

// ── Normalize status ─────────────────────────────────────────────────────────
// Priority order matters:
//   1. Half Day  (most specific)
//   2. On Leave
//   3. Late      (from ERP's late_entry field — already shift-aware,
//                 calculated per-employee against THEIR assigned Shift Type's
//                 start time + grace period. No need to duplicate shift
//                 timing/grace values here — that would only go stale the
//                 moment HR adds a new shift or edits an existing one in ERP.)
//   4. Present / Absent / WFH
function normalizeStatus(
  rawStatus: string | undefined,
  hasInTime: boolean,
  lateEntry?: 0 | 1,
): string {
  const s = String(rawStatus || "").trim().toLowerCase();

  // 1. Half Day
  if (
    s === "half day" ||
    s.includes("half day") ||
    s.includes("half-day") ||
    s.includes("halfday")
  ) {
    return "Half Day";
  }
  if (s.includes("half")) return "Half Day";

  // 2. On Leave
  if (s.includes("on leave") || s.includes("on-leave") || s === "leave") {
    return "On Leave";
  }
  if (s.includes("leave")) return "On Leave";

  // 3. Absent — pehle handle karo agar koi in-time hi nahi
  if (s.includes("absent") && !hasInTime) return "Absent";

  // 4. Late — ERP ka late_entry field trust karo. Ye field ERP ke
  //    auto-attendance scheduler se aata hai jo employee ki apni assigned
  //    Shift Type (e.g. "Morning" 10:00 start, "Morning From 9" 09:00 start)
  //    ke hisaab se calculate hota hai. Kisi bhi shift ke liye automatically
  //    sahi kaam karega — naya shift add ho ya timing change ho, frontend
  //    code mein kuch update karne ki zaroorat nahi.
  if (lateEntry === 1) return "Late";

  // 5. Regular statuses
  if (s.includes("work from home") || s.includes("wfh")) return "Present";
  if (s.includes("present")) return "Present";
  if (s.includes("absent")) return "Absent";

  // Fallback
  if (hasInTime) return "Present";
  return "Absent";
}

export const useAttendance = (
  selectedYear?: number,
  selectedMonth?: number
) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [apiStats, setApiStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    totalDays: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const year = selectedYear ?? now.getFullYear();
  const month = selectedMonth ?? now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ── Step 1: current employee id lo ──
      const profileRes = await api.getProfile();
      if (!profileRes.ok || !profileRes.data?.name) {
        setRecords([]);
        setApiStats({ present: 0, absent: 0, late: 0, halfDay: 0, totalDays: 0 });
        setError("Could not resolve employee profile");
        return;
      }
      const employeeId: string = profileRes.data.name;

      // ── Step 2: ERP Attendance doctype se data lo (real status ke sath) ──
      const res = await api.getMyAttendance(employeeId, year, month);

      if (!res.ok) {
        setRecords([]);
        setApiStats({ present: 0, absent: 0, late: 0, halfDay: 0, totalDays: 0 });
        setError(res.error || "Failed to load attendance");
        return;
      }

      const rawList: any[] = Array.isArray(res.data) ? res.data : [];

      const mapped: AttendanceRecord[] = rawList.map((item: any, idx: number) => {
        const inTime = pickTime(item.in_time);
        const outTime = pickTime(item.out_time);

        return {
          id: item.name || `rec-${idx}`,
          date: item.attendance_date || "",
          inTime,
          outTime,
          status: normalizeStatus(
            item.status,
            inTime !== "--:--",
            item.late_entry,
          ),
        };
      });

      // Latest first
      mapped.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      setRecords(mapped);

      const present = mapped.filter((r) => r.status === "Present").length;
      const absent = mapped.filter((r) => r.status === "Absent").length;
      const late = mapped.filter((r) => r.status === "Late").length;
      const halfDay = mapped.filter((r) => r.status === "Half Day").length;
      const totalDays = present + absent + late + halfDay;

      setApiStats({ present, absent, late, halfDay, totalDays });
    } catch (e: any) {
      setRecords([]);
      setApiStats({ present: 0, absent: 0, late: 0, halfDay: 0, totalDays: 0 });
      setError(e?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const regularize = useCallback(
    async (data: any): Promise<RegularizeResult> => {
      try {
        const res = await api.createLog(data);
        if (!res.ok)
          return { success: false, error: res.error || "Request failed" };
        await fetchData();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Request failed" };
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(
    () => ({
      present: apiStats.present,
      absent: apiStats.absent,
      late: apiStats.late,
      halfDay: apiStats.halfDay,
      totalDays: apiStats.totalDays,
      // Half Day = 0.5 present. Score ERP jaisa.
      percentage: apiStats.totalDays
        ? Math.round(
            ((apiStats.present + apiStats.halfDay * 0.5) / apiStats.totalDays) *
              100
          )
        : 0,
      monthLabel: makeMonthLabel(year, month),
    }),
    [apiStats, year, month]
  );

  return { records, loading, error, stats, regularize, refetch: fetchData };
};