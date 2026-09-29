// hooks/usePrograms.ts

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api"; // apna api.ts path

export interface Program { name: string; program_name?: string; }
export interface Course  { name: string; course_name?: string;  }

// ─── usePrograms (Instructor) ───────────────────────────────────────────────
// Instructor ke schedules se unique programs nikalte hain. Ye hook
// instructor-scoped hai (Course Schedule ka instructor filter lagta hai)
// — Admin/CEO ke liye NAHI hai, unke liye neeche useAdminPrograms use karo.

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // getCourseSchedule already instructor_name filter use karta hai
      const res = await api.getCourseSchedule();
      if (!res.ok) throw new Error(res.error);

      // Schedules se unique programs nikalo
      const seen = new Map<string, Program>();
      (res.data as any[]).forEach((s: any) => {
        if (s.program && !seen.has(s.program)) {
          seen.set(s.program, { name: s.program, program_name: s.program });
        }
      });
      setPrograms(Array.from(seen.values()));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);
  return { programs, loading, error, refetch: fetchPrograms };
}

// ─── useAdminPrograms (Admin / CEO / Management) ───────────────────────────
// Koi instructor filter nahi lagta — seedha api.getAllStudentGroups() se
// SAARE Student Group records fetch karke unka `program` field nikalte
// hain (Course Schedule ke through nahi jaate, jo instructor-scoped hai).
// Admin panel (AdminStudentActivityPage.tsx waghera) mein isi hook ko
// use karna hai, usePrograms() ko nahi.

export function useAdminPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Koi programFilter pass nahi — sab groups chahiye taake unke
      // saare unique programs collect ho sakein.
      const res = await api.getAllStudentGroups();
      if (!res.ok) throw new Error(res.error);

      const seen = new Map<string, Program>();
      (res.data as any[]).forEach((g: any) => {
        if (g.program && !seen.has(g.program)) {
          seen.set(g.program, { name: g.program, program_name: g.program });
        }
      });
      setPrograms(Array.from(seen.values()));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);
  return { programs, loading, error, refetch: fetchPrograms };
}

// ─── useCourses (Instructor) ────────────────────────────────────────────────
// Instructor ke schedules se courses nikalte hain, program se filter karte hain

export function useCourses(programFilter?: string) {
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCourseSchedule(programFilter);
      if (!res.ok) throw new Error(res.error);

      // Schedules se unique courses nikalo
      const seen = new Map<string, Course>();
      (res.data as any[]).forEach((s: any) => {
        if (s.course && !seen.has(s.course)) {
          seen.set(s.course, { name: s.course, course_name: s.course });
        }
      });
      setCourses(Array.from(seen.values()));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [programFilter]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  return { courses, loading, error, refetch: fetchCourses };
}