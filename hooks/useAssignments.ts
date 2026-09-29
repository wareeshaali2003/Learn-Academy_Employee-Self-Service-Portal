import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api"; // apna api.ts path

export interface Assignment {
  name: string;
  course: string;
  link_gdbv?: string;
  heading: string;
  description?: string;
  docstatus: number;
  creation?: string;
  modified?: string;
}

export interface CreateAssignmentPayload {
  course: string;
  link_gdbv: string;   // Section / Student Group
  heading: string;
  description?: string;
}

export interface SectionOption {
  name: string;
  student_group_name: string;
  program?: string;
  course?: string;
}

// ─── useTeacherCourses ─────────────────────────────────────────────────────
// Teacher ko assign hui courses ki list (wahi list jo Programs & Courses page
// pe filter-tabs banane ke liye use hoti hai — LB-Grade1-Urdu, LB-Grade2-Urdu...).
// "All" tab ka scope isi list tak mehdood rakhne ke liye ye hook use hoga.

export function useTeacherCourses() {
  const [courseNames, setCourseNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // api.getFacultyCourses() — Course Schedule ko current instructor
        // (getInstructorName() se resolve hota hai) ke against filter karke
        // unique courses deta hai. Yehi method Programs & Courses page ke
        // course-tabs (LB-Grade1-Urdu, LB-Grade2-Urdu...) banane ke liye
        // use hota hai — isliye "All" ka scope bhi isi list tak rakha.
        const res = await api.getFacultyCourses();
        if (cancelled) return;
        if (!res.ok) throw new Error(res.error);
        // res.data: array of { name: string, course_name: string }
        const names = (res.data as { name: string }[]).map((c) => c.name);
        setCourseNames(names);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load teacher's courses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { courseNames, loading, error };
}

// ─── useAssignments ───────────────────────────────────────────────────────────
// Academic Assignments ko course se filter karke fetch karta hai, + create support
// FIX: ab "All" tab ka matlab "system ke saare assignments" nahi, balke
// "teacher ke assigned courses ke saare assignments" hai. Isi liye ye hook
// teacher ki courses list ko internally use karke result ko scope karta hai.

export function useAssignments(courseFilter?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);

  const requestIdRef = useRef(0);
  const { courseNames: teacherCourses, loading: coursesLoading } = useTeacherCourses();

  const fetchAssignments = useCallback(async () => {
    // Teacher ki courses list load hone tak wait karo — warna galat scope
    // (ya khali/full list) ke sath assignments fetch ho jayenge.
    if (coursesLoading) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      if (courseFilter) {
        if (!teacherCourses.includes(courseFilter)) {
          if (requestId === requestIdRef.current) {
            setAssignments([]);
            setLoading(false);
          }
          return;
        }
        const res = await api.getAssignments(courseFilter);
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) throw new Error(res.error);
        setAssignments(res.data as Assignment[]);
        return;
      }

      // "All" tab: teacher ke har assigned course ke assignments fetch
      // karke ek list mein combine karo.
      if (teacherCourses.length === 0) {
        if (requestId === requestIdRef.current) setAssignments([]);
        return;
      }

      const results = await Promise.all(
        teacherCourses.map((course) => api.getAssignments(course))
      );
      if (requestId !== requestIdRef.current) return; // stale response guard

      const combined: Assignment[] = [];
      for (const res of results) {
        if (res.ok) combined.push(...(res.data as Assignment[]));
      }
      setAssignments(combined);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [courseFilter, teacherCourses, coursesLoading]);

  const createAssignment = useCallback(
    async (payload: CreateAssignmentPayload) => {
      setSaving(true);
      try {
        const res = await api.createAssignment(payload);
        if (!res.ok) throw new Error(res.error);
        await fetchAssignments(); // list refresh save ke baad
        return res.data as Assignment;
      } finally {
        setSaving(false);
      }
    },
    [fetchAssignments]
  );

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  return { assignments, loading, error, saving, refetch: fetchAssignments, createAssignment };
}

// ─── useAssignmentSections ─────────────────────────────────────────────────
// Assignment dialog ke "Section" dropdown ke liye — selected COURSE ke against
// sections fetch karta hai (program ke against nahi — yehi purana bug tha).
// selectedCourse change hote hi refetch hota hai, aur khali/undefined course
// pe list clear kar deta hai taake purani course ka data na dikhe.

export function useAssignmentSections(selectedCourse?: string) {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const fetchSections = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    // Course select hi nahi hui — dropdown ko empty/reset rakho
    if (!selectedCourse) {
      setSections([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentGroupsByCourse(selectedCourse);
      if (requestId !== requestIdRef.current) return; // stale response guard

      if (!res.ok) throw new Error(res.error);
      setSections(res.data as SectionOption[]);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load sections");
      setSections([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  return { sections, loading, error, refetch: fetchSections };
}