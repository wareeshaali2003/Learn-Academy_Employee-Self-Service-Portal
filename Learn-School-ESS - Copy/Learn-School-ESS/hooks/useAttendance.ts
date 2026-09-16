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

// ── Normalize whatever status string the backend sends ─────────────────────
// The mobile ESS endpoint often returns records with a blank/unrecognized
// `status` (e.g. plain biometric check-in/out logs, not the Attendance
// doctype). Previously this fell back to a hardcoded "Other" for every row,
// which meant the Present/Absent/Late stats — and the graph — stayed at 0
// even when real check-in/out times were present.
function normalizeStatus(rawStatus: string | undefined, hasInTime: boolean): string {
  const s = String(rawStatus || "").trim().toLowerCase();
  if (s.includes("present")) return "Present";
  if (s.includes("late")) return "Late";
  if (s.includes("half")) return "Half Day";
  if (s.includes("leave")) return "On Leave";
  if (s.includes("absent")) return "Absent";
  if (s.includes("holiday")) return "Holiday";
  if (s.includes("week")) return "Weekly Off";
  // No recognizable status from the backend — derive it from the punch data
  // itself: a check-in time means the employee was physically present.
  if (hasInTime) return "Present";
  return "Absent";
}

export const useAttendance = (selectedYear?: number, selectedMonth?: number) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [apiStats, setApiStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
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
      // ✅ STEP 1: Holidays fetch karo
      let holidayDates = new Set<string>();
      try {
        const holidayRes = await api.getHolidayList();
        if (holidayRes.ok) {
          const holidays = (holidayRes.data as any[]) || [];
          holidays.forEach((h: any) => {
            if (h.holiday_date) {
              holidayDates.add(String(h.holiday_date).slice(0, 10));
            }
          });
        }
        console.log('🎯 [ESS] Holiday dates:', [...holidayDates]);
      } catch (holidayErr) {
        console.warn('[ESS] Holiday fetch failed:', holidayErr);
      }

      const res = await api.getAttendanceList(year, month);

      if (res.ok) {
        const rawData = res.data as any;

        const rawList: any[] =
          Array.isArray(rawData?.attendance_list)
            ? rawData.attendance_list
            : Array.isArray(rawData?.data)
            ? rawData.data
            : Array.isArray(rawData)
            ? rawData
            : [];

        // ✅ STEP 2: Holiday dates filter karo
        const filteredList = rawList.filter((item: any) => {
          const recordDate = String(item.attendance_date || "").slice(0, 10);
          if (holidayDates.has(recordDate)) {
            console.log(`🚫 [ESS] Holiday excluded: ${recordDate} (${item.status})`);
            return false;
          }
          return true;
        });

        const mapped: AttendanceRecord[] = filteredList.map((item: any, idx: number) => {
          const inTime = item.in_time
            ? (item.in_time.includes(" ")
                ? item.in_time.split(" ")[1]?.slice(0, 5)
                : item.in_time.slice(0, 5)) ?? "--:--"
            : "--:--";
          const outTime = item.out_time
            ? (item.out_time.includes(" ")
                ? item.out_time.split(" ")[1]?.slice(0, 5)
                : item.out_time.slice(0, 5)) ?? "--:--"
            : "--:--";

          return {
            id: item.name || `rec-${idx}`,
            date: item.attendance_date || "",
            inTime,
            outTime,
            status: normalizeStatus(item.status, inTime !== "--:--"),
          };
        });

        setRecords(mapped);

        // ✅ STEP 3: Filtered records se stats calculate karo
        const present = mapped.filter(r => r.status === "Present").length;
        const absent = mapped.filter(r => r.status === "Absent").length;
        const late = mapped.filter(r => r.status === "Late").length;
        const totalDays = present + absent + late;

        setApiStats({ present, absent, late, totalDays });

        console.log(`✅ [ESS] Filtered: ${rawList.length} → ${mapped.length} records`);
      } else {
        const isEmptyMonth = res.error?.toLowerCase().includes("no attendance found") ||
                             res.error?.toLowerCase().includes("no attendance") ||
                             res.status === 500;
        setRecords([]);
        if (!isEmptyMonth) {
          setError(res.error || "Failed to load attendance");
        }
        setApiStats({ present: 0, absent: 0, late: 0, totalDays: 0 });
      }
    } catch (e: any) {
      setRecords([]);
      setError(e?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const regularize = useCallback(
    async (data: any): Promise<RegularizeResult> => {
      try {
        const res = await api.createLog(data);
        if (!res.ok) return { success: false, error: res.error || "Request failed" };
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
      totalDays: apiStats.totalDays,
      percentage: apiStats.totalDays
        ? Math.round((apiStats.present / apiStats.totalDays) * 100)
        : 0,
      monthLabel: makeMonthLabel(year, month),
    }),
    [apiStats, year, month]
  );

  return { records, loading, error, stats, regularize, refetch: fetchData };
};