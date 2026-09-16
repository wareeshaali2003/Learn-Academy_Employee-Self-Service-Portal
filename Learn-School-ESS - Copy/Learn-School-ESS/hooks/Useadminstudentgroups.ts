// hooks/Useadminstudentgroups.ts

import { useCallback, useEffect, useState } from "react";
import { api, CeoGroupSummary } from "../services/api"; // apna actual path lagayen

// ─── Types ────────────────────────────────────────────────────────────────

export type AdminStudentGroupInstructor = {
  instructor: string;
  instructor_name?: string;
};

export type AdminStudentGroupStudent = {
  student: string;
  student_name?: string;
  active?: number;
  group_roll_number?: number;
};

// List view ke liye — table/card grid mein use hota hai
export type AdminStudentGroup = {
  name: string;
  student_group_name?: string;
  program?: string;
  academic_year?: string;
  academic_term?: string;
  group_based_on?: string;
  batch?: string;
  max_strength?: number;
  totalCount: number;
  activeCount: number;
  instructorNames: string; // comma-separated, list card mein dikhane ke liye
};

// Detail panel ke liye — poora doc, students + instructors ke sath
export type AdminStudentGroupDetail = {
  name: string;
  student_group_name?: string;
  program?: string;
  academic_year?: string;
  academic_term?: string;
  group_based_on?: string;
  batch?: string;
  max_strength?: number;
  totalCount: number;
  instructors: AdminStudentGroupInstructor[];
  students: AdminStudentGroupStudent[];
};

const CHUNK_SIZE = 8;

async function fetchFullDocs(names: string[]): Promise<any[]> {
  const docs: any[] = [];
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((n) => api.getStudentGroupFullDetail(n))
    );
    settled.forEach((s) => {
      if (s.status === "fulfilled" && s.value.ok) docs.push(s.value.data);
    });
  }
  return docs;
}

// ─── List Hook ────────────────────────────────────────────────────────────
// Admin ke liye — sab groups (ya ek program ke groups), instructor filter ke bina.

export function useAdminStudentGroups(programFilter?: string) {
  const [groups, setGroups]   = useState<AdminStudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | undefined>();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      // Step 1: list of names (server-side program filter agar diya ho)
      const listRes = await api.getAllStudentGroups();
      if (!listRes.ok) {
        setError(listRes.error || "Student groups load nahi hue");
        setGroups([]);
        return;
      }

      const filteredList = programFilter
        ? listRes.data.filter((g) => g.program === programFilter)
        : listRes.data;

      const names = filteredList.map((g) => g.name).filter(Boolean);

      // Step 2: har group ka full doc (students + instructors ke sath)
      const docs = await fetchFullDocs(names);

      const mapped: AdminStudentGroup[] = docs.map((doc) => {
        const students = (doc.students ?? []) as AdminStudentGroupStudent[];
        const instructors = (doc.instructors ?? []) as AdminStudentGroupInstructor[];
        const activeCount = students.filter((s) => s.active !== 0).length;

        return {
          name: doc.name,
          student_group_name: doc.student_group_name || doc.name,
          program: doc.program,
          academic_year: doc.academic_year,
          academic_term: doc.academic_term,
          group_based_on: doc.group_based_on,
          batch: doc.batch,
          max_strength: doc.max_strength,
          totalCount: students.length,
          activeCount,
          instructorNames: instructors
            .map((i) => i.instructor_name || i.instructor)
            .filter(Boolean)
            .join(", "),
        };
      });

      mapped.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setGroups(mapped);
    } catch (e: any) {
      setError(e?.message || "Kuch ghalat ho gaya");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [programFilter]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}

// ─── Detail Hook ──────────────────────────────────────────────────────────
// Side panel ke liye — ek group ka poora doc: instructors + students list.

export function useAdminStudentGroupDetail(name: string | null) {
  const [group, setGroup]     = useState<AdminStudentGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | undefined>();

  const fetchDetail = useCallback(async () => {
    if (!name) {
      setGroup(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    const res = await api.getStudentGroupFullDetail(name);

    if (!res.ok) {
      setError(res.error || "Group detail load nahi hua");
      setGroup(null);
      setLoading(false);
      return;
    }

    const doc = res.data as any;
    const students = (doc.students ?? []) as AdminStudentGroupStudent[];
    const instructors = (doc.instructors ?? []) as AdminStudentGroupInstructor[];

    setGroup({
      name: doc.name,
      student_group_name: doc.student_group_name || doc.name,
      program: doc.program,
      academic_year: doc.academic_year,
      academic_term: doc.academic_term,
      group_based_on: doc.group_based_on,
      batch: doc.batch,
      max_strength: doc.max_strength,
      totalCount: students.length,
      instructors,
      students,
    });
    setLoading(false);
  }, [name]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { group, loading, error, refetch: fetchDetail };
}

// ─── CEO Summary Hook ─────────────────────────────────────────────────────
// CeoStudentGroupsPage ke liye — ready-made summary with totalCount,
// activeCount, inactiveCount per group. Uses api.getCeoStudentGroupSummary
// (defined in services/api.ts) instead of building the docs itself.

export function useCeoStudentGroups() {
  const [groups, setGroups]   = useState<CeoGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | undefined>();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    const res = await api.getCeoStudentGroupSummary();

    if (!res.ok) {
      setError(res.error || "Student groups load nahi hue");
      setGroups([]);
    } else {
      setGroups(res.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}