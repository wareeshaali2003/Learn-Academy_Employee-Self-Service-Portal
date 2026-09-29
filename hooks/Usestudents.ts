// hooks/useStudents.ts

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

export interface StudentGroup {
  name: string;
  student_group_name?: string;
  program?: string;
  course?: string;
  batch?: string;
  activeCount?: number;
  totalCount?: number;
}

export interface GroupStudent {
  student: string;
  student_name: string;
  group_roll_number?: number;
  active: number;
}

// ─── useStudentGroups (Faculty / Instructor) ───────────────────────────────
// Sirf logged-in instructor ke apne Course Schedule se linked groups fetch
// karta hai. Employee ID (LA-XXXXX) → Instructor ID (TA-XXXXX) resolve hota
// hai api.ts ke andar, aur usi se Course Schedule filter hota hai.
// Ye hook admin/CEO ke liye NAHI hai — unke liye neeche useAdminStudentGroups
// use karo.

export function useStudentGroups(programFilter?: string, ready?: boolean) {
  const [groups, setGroups]   = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(false); // ← false rakho, wait karo
  const [error, setError]     = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    // ← ready false ho to bilkul fetch mat karo (employee profile abhi load nahi hua)
    if (ready === false) return;

    setLoading(true);
    setError(null);
    try {
      // instructorName ab pass nahi ho rahi — api.getStudentGroups()
      // khud Instructor ID resolve kar lega Employee profile se.
      const res = await api.getStudentGroups(programFilter);
      if (!res.ok) throw new Error(res.error);

      // Counts parallel fetch karo — Promise.all se fast hoga
      const withCounts = await Promise.all(
        (res.data as StudentGroup[]).map(async (g) => {
          try {
            const detail = await api.getStudentGroupDetail(g.name);
            if (detail.ok) {
              const students: GroupStudent[] = detail.data?.students ?? [];
              return {
                ...g,
                activeCount: students.filter((s) => s.active !== 0).length,
                totalCount:  students.length,
              };
            }
          } catch { /* ignore */ }
          return g;
        })
      );
      setGroups(withCounts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [programFilter, ready]);

  useEffect(() => {
    // ready false ho to kuch mat karo
    if (ready === false) {
      setGroups([]);
      return;
    }
    fetchGroups();
  }, [fetchGroups, ready]);

  return { groups, loading, error, refetch: fetchGroups };
}

// ─── useAdminStudentGroups (Admin / CEO / Management) ──────────────────────
// Koi instructor filter nahi lagta — seedha api.getAllStudentGroups() se
// SAARE Student Group records fetch hote hain, regardless of Course
// Schedule assignment. Admin panel (StudentsPage.tsx) mein isi hook ko
// use karna hai, useStudentGroups() ko nahi.

export function useAdminStudentGroups(programFilter?: string, ready?: boolean) {
  const [groups, setGroups]   = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    // ← ready false ho to bilkul fetch mat karo (employee profile abhi load nahi hua)
    if (ready === false) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllStudentGroups(programFilter);
      if (!res.ok) throw new Error(res.error);

      // Counts parallel fetch karo — same pattern as instructor hook
      const withCounts = await Promise.all(
        (res.data as StudentGroup[]).map(async (g) => {
          try {
            const detail = await api.getStudentGroupDetail(g.name);
            if (detail.ok) {
              const students: GroupStudent[] = detail.data?.students ?? [];
              return {
                ...g,
                activeCount: students.filter((s) => s.active !== 0).length,
                totalCount:  students.length,
              };
            }
          } catch { /* ignore */ }
          return g;
        })
      );
      setGroups(withCounts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [programFilter, ready]);

  useEffect(() => {
    if (ready === false) {
      setGroups([]);
      return;
    }
    fetchGroups();
  }, [fetchGroups, ready]);

  return { groups, loading, error, refetch: fetchGroups };
}

// ─── useGroupStudents ───────────────────────────────────────────────────────

export function useGroupStudents(groupName?: string) {
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!groupName) { setStudents([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentGroupDetail(groupName);
      if (!res.ok) throw new Error(res.error);
      setStudents(res.data?.students ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [groupName]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  return { students, loading, error };
}