// ════════════════════════════════════════════════════════════════════════════
// STEP 1: Yeh function apne api.ts mein paste karo — "Admin — Student
// Attendance" section ke andar, getAllStudentAttendance ke neeche.
// (StudentAttendanceRow type wahan already maujood hay, dobara add na karein.)
// ════════════════════════════════════════════════════════════════════════════
/*
  getStudentAttendanceDetail: async (
    name: string
  ): Promise<ApiResult<StudentAttendanceRow>> => {
    const DETAIL_FIELDS = [
      "name",
      "student",
      "student_name",
      "course_schedule",
      "student_group",
      "date",
      "status",
      "docstatus",
    ];

    const res = await handleResponse<any>(
      resourceClient.get(`Student Attendance/${encodeURIComponent(name)}`, {
        params: { fields: JSON.stringify(DETAIL_FIELDS) },
      })
    );

    if (!res.ok) return res as ApiResult<StudentAttendanceRow>;
    return { ok: true, data: res.data as StudentAttendanceRow };
  },
*/

// ════════════════════════════════════════════════════════════════════════════
// STEP 2: Yeh hooks use karein — inn mein api.ts ka `api.getAllStudentAttendance`
// aur `api.getStudentAttendanceDetail` (STEP 1 wala) call hota hay, taake pura
// project ek hi resourceClient/ApiResult pattern follow kare.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api, type StudentAttendanceRow } from "../services/api"; // ✅ apne api.ts ka actual path daalein

export type StudentAttendanceStatus =
  | "all"
  | "Present"
  | "Absent"
  | "Half Day"
  | "On Leave"
  | "Excused";

// ─── useStudentAttendance: list hook (filters + status breakdown + stats) ──

interface UseStudentAttendanceOptions {
  from_date?: string;
  to_date?: string;
  student_group?: string;
}

export function useStudentAttendance(options: UseStudentAttendanceOptions = {}) {
  const { from_date, to_date, student_group } = options;

  const [attendance, setAttendance] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Race condition guard — jab filters jaldi jaldi change hon to purani
  // request ka result baad mein aa kar naye data ko overwrite na kare.
  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const res = await api.getAllStudentAttendance({ from_date, to_date, student_group });

    if (requestId !== requestIdRef.current) return; // stale response, ignore

    if (res.ok) {
      setAttendance(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [from_date, to_date, student_group]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filterByStatus = useCallback(
    (status: StudentAttendanceStatus) => {
      if (status === "all") return attendance;
      return attendance.filter((a) => a.status === status);
    },
    [attendance]
  );

  // Quick stats — dashboard cards ke liye ready-made aggregation
  const stats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "Present").length;
    const absent = attendance.filter((a) => a.status === "Absent").length;
    const onLeave = attendance.filter((a) => a.status === "On Leave").length;
    const halfDay = attendance.filter((a) => a.status === "Half Day").length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, onLeave, halfDay, attendanceRate };
  }, [attendance]);

  return {
    attendance,
    loading,
    error,
    refresh: fetchAll,
    filterByStatus,
    stats,
  };
}

// ─── useStudentAttendanceDetail: single record fetch ───────────────────────

export function useStudentAttendanceDetail(id: string | null) {
  const [record, setRecord] = useState<StudentAttendanceRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setRecord(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const res = await api.getStudentAttendanceDetail(id);

    if (requestId !== requestIdRef.current) return; // stale response, ignore

    if (res.ok) {
      setRecord(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { record, loading, error, refresh: fetchDetail };
}