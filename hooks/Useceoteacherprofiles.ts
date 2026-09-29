import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TeacherDegree {
  qualification?: string;
  school_univ?: string;
  level?: string;              // e.g. "Graduate", "Post Graduate"
  year_of_passing?: string;
  maj_opt_subj?: string;       // major / optional subject
}

export interface TeacherCertification {
  [key: string]: any;          // shape varies by school's custom field
}

export interface TeacherProfile {
  instructorId: string;
  employeeId: string;
  name: string;
  designation?: string;
  department?: string;
  image?: string;
  status?: string;
  degrees: TeacherDegree[];
  certifications: TeacherCertification[];
}

// ERPNext ships a standard "education" child table on Employee, but there's
// no standard field for certifications — schools usually add their own
// custom field. Try the common names defensively so this page still works
// regardless of what it's called in this ERP instance.
const CERTIFICATION_FIELD_CANDIDATES = [
  "custom_certifications",
  "certifications",
  "custom_professional_certifications",
  "custom_certificates",
];

function extractCertifications(doc: any): TeacherCertification[] {
  for (const key of CERTIFICATION_FIELD_CANDIDATES) {
    if (Array.isArray(doc?.[key]) && doc[key].length) return doc[key];
  }
  return [];
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCeoTeacherProfiles() {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const instructors = await api.getAllInstructorsForReports({ includeInactive: true });
      const withEmployee = instructors.filter((i: any) => i.employee);

      const CHUNK_SIZE = 8;
      const results: TeacherProfile[] = [];

      for (let i = 0; i < withEmployee.length; i += CHUNK_SIZE) {
        const chunk = withEmployee.slice(i, i + CHUNK_SIZE);
        const settled = await Promise.allSettled(
          chunk.map((inst: any) =>
            (api as any).getEmployeeFullProfile(inst.employee)
          )
        );

        settled.forEach((s, idx) => {
          const inst = chunk[idx];
          const fallbackName = inst.instructor_name || inst.employee_name || inst.employee;

          if (s.status === "fulfilled" && s.value.ok) {
            const doc = s.value.data;
            results.push({
              instructorId: inst.name,
              employeeId: inst.employee,
              name: fallbackName || doc?.employee_name || inst.employee,
              designation: doc?.designation,
              department: doc?.department,
              image: doc?.image || inst.image,
              status: inst.status,
              degrees: Array.isArray(doc?.education) ? doc.education : [],
              certifications: extractCertifications(doc),
            });
          } else {
            // Employee doc failed to load — still show the teacher, just with no records.
            results.push({
              instructorId: inst.name,
              employeeId: inst.employee,
              name: fallbackName,
              image: inst.image,
              status: inst.status,
              degrees: [],
              certifications: [],
            });
          }
        });
      }

      results.sort((a, b) => a.name.localeCompare(b.name));
      setProfiles(results);
    } catch (e: any) {
      setError(e?.message || "Failed to load teacher profiles");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const withDegrees = profiles.filter((p) => p.degrees.length > 0).length;
    const withCerts = profiles.filter((p) => p.certifications.length > 0).length;
    return {
      total: profiles.length,
      withDegrees,
      withCerts,
      missing: profiles.length - withDegrees,
    };
  }, [profiles]);

  return { profiles, totals, loading, error, refresh: load };
}