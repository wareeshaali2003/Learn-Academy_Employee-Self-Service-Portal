// hooks/useAttendance.ts
// Student Attendance (view) page ke liye dedicated hooks

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: string;
}

export interface StudentGroupSummary {
  student_group: string;
  student_group_name?: string;
  recordCount: number;
  presentCount: number;
  absentCount: number;
}

export interface StudentGroupDetail {
  name: string;
  student_group_name: string;
  program?: string;
  batch?: string;
}

// ─── useStudentAttendance ────────────────────────────────────────────────────

export function useStudentAttendance(courseSchedule?: string) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!courseSchedule) { setAttendance([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentAttendance(courseSchedule);
      if (!res.ok) throw new Error(res.error);
      setAttendance(res.data as AttendanceRecord[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [courseSchedule]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── Derived: konsay group(s) ki attendance mark ho rahi hai ──
  const groupSummary: StudentGroupSummary[] = useMemo(() => {
    const map = new Map<string, StudentGroupSummary>();

    for (const record of attendance) {
      const key = record.student_group;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          student_group: key,
          recordCount: 0,
          presentCount: 0,
          absentCount: 0,
        });
      }

      const entry = map.get(key)!;
      entry.recordCount += 1;
      if (record.status === "Present") entry.presentCount += 1;
      if (record.status === "Absent") entry.absentCount += 1;
    }

    return Array.from(map.values());
  }, [attendance]);

  return { attendance, loading, error, refetch: fetchAttendance, groupSummary };
}

// ─── useStudentGroupInfo ──────────────────────────────────────────────────────
// Student Group IDs ke against readable name/details fetch karta hai
// (e.g. "SG-2024-001" → "Grade 9 - Section A - Physics")

export function useStudentGroupInfo(studentGroupIds: string[]) {
  const [groupDetails, setGroupDetails] = useState<Record<string, StudentGroupDetail>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueIds = useMemo(
    () => Array.from(new Set(studentGroupIds.filter(Boolean))),
    [studentGroupIds]
  );

  const fetchGroupDetails = useCallback(async () => {
    if (uniqueIds.length === 0) { setGroupDetails({}); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentGroupsByNames(uniqueIds);
      if (!res.ok) throw new Error(res.error);

      const map: Record<string, StudentGroupDetail> = {};
      for (const group of res.data as StudentGroupDetail[]) {
        map[group.name] = group;
      }
      setGroupDetails(map);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student groups");
    } finally {
      setLoading(false);
    }
  }, [uniqueIds]);

  useEffect(() => { fetchGroupDetails(); }, [fetchGroupDetails]);

  return { groupDetails, loading, error, refetch: fetchGroupDetails };
}