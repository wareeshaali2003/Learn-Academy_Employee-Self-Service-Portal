// hooks/useSchedule.ts
// Course Schedule page ke liye dedicated hook

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  name: string;
  student_group: string;
  instructor: string;
  instructor_name?: string;
  program?: string;
  course: string;
  schedule_date: string;
  room?: string;
  from_time: string;
  to_time: string;
  title?: string;
  color?: string;
  class_schedule_color?: string;
  custom_is_holiday?: boolean;      // ✅ Added — holiday-aware schedule
  custom_holiday_name?: string;     // ✅ Added — holiday-aware schedule
}

// ─── useSchedule ──────────────────────────────────────────────────────────────
// programFilter optional — pass undefined to get all sessions for this teacher

export function useSchedule(programFilter?: string) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCourseSchedule(programFilter);
      if (!res.ok) throw new Error(res.error);
      setSchedule(res.data as ScheduleEntry[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load schedule"
      );
    } finally {
      setLoading(false);
    }
  }, [programFilter]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return { schedule, loading, error, refetch: fetchSchedule };
}