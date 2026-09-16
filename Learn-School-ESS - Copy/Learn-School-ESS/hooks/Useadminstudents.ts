import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStudentGuardian {
  guardian?: string;
  guardian_name?: string;
}

export interface AdminStudentSibling {
  student?: string;
  student_name?: string;
}

export type StudentStatus = "Active" | "Inactive" | "Suspended" | "On-Leave";

export interface AdminStudent {
  name: string;
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: number;
  idx?: number;
  enabled?: number; // 1 = active, 0 = inactive
  status?: StudentStatus;
  first_name?: string;
  student_name?: string;
  custom_serial_no?: string;
  custom_batch?: string;
  naming_series?: string;
  joining_date?: string;
  user?: string;
  custom_student_id_number?: string;
  custom_student_id_type?: string;
  student_email_id?: string;
  date_of_birth?: string;
  blood_group?: string;
  nationality?: string;
  city?: string;
  country?: string;
  customer?: string;
  customer_group?: string;
  doctype?: string;
  siblings?: AdminStudentSibling[];
  guardians?: AdminStudentGuardian[];
}

export type StudentStatusFilter = "" | "Active" | "Inactive" | "Suspended" | "On-Leave";

// ─── List hook ────────────────────────────────────────────────────────────────

export function useAdminStudents(statusFilter?: StudentStatusFilter) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: string[][] = [];
      if (statusFilter) filters.push(["status", "=", statusFilter]);

      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "student_name",
          "first_name",
          "custom_serial_no",
          "custom_batch",
          "joining_date",
          "enabled",
          "status",
          "city",
          "country",
          "nationality",
          "blood_group",
          "student_email_id",
        ]),
        limit_page_length: "0",
      });
      if (filters.length) params.set("filters", JSON.stringify(filters));

      const res = await fetch(`/api/resource/Student?${params.toString()}`, {
        headers: { "X-Frappe-CSRF-Token": (window as any).csrf_token ?? "" },
      });
      if (!res.ok) throw new Error(`Failed to fetch students (${res.status})`);
      const json = await res.json();
      setStudents(json.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refetch: fetchStudents };
}

// ─── Detail hook ──────────────────────────────────────────────────────────────

export function useAdminStudentDetail(name: string | null) {
  const [student, setStudent] = useState<AdminStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resource/Student/${encodeURIComponent(name)}`, {
        headers: { "X-Frappe-CSRF-Token": (window as any).csrf_token ?? "" },
      });
      if (!res.ok) throw new Error(`Failed to fetch student (${res.status})`);
      const json = await res.json();
      setStudent(json.data ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load student");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { student, loading, error, refetch: fetchDetail };
}