import { useState, useEffect, useCallback } from "react";
import { api, EmployeeDetail } from "../services/api";

// ─── List hook ────────────────────────────────────────────────────────────────

export function useAdminEmployees() {
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllEmployees();
      if (!res.ok) {
        setError(res.error ?? "Failed to load employees");
        setEmployees([]);
      } else {
        setEmployees(res.data);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const search = useCallback(
    (query: string): EmployeeDetail[] => {
      const q = query.toLowerCase().trim();
      if (!q) return employees;
      return employees.filter(
        (e) =>
          (e.employee_name ?? "").toLowerCase().includes(q) ||
          (e.name ?? "").toLowerCase().includes(q) ||
          (e.designation ?? "").toLowerCase().includes(q) ||
          (e.cell_number ?? "").includes(q) ||
          (e.user_id ?? "").toLowerCase().includes(q)
      );
    },
    [employees]
  );

  const filterByStatus = useCallback(
    (status: string): EmployeeDetail[] => {
      if (!status || status === "all") return employees;
      return employees.filter(
        (e) => (e.status ?? "").toLowerCase() === status.toLowerCase()
      );
    },
    [employees]
  );

  return { employees, loading, error, refresh: load, search, filterByStatus };
}

// ─── Detail hook ──────────────────────────────────────────────────────────────

export function useAdminEmployeeDetail(id: string | null) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (empId: string) => {
    setLoading(true);
    setError(null);
    setEmployee(null);
    try {
      const res = await api.getEmployeeDetail(empId);
      if (!res.ok) {
        setError(res.error ?? `Failed to load employee ${empId}`);
      } else {
        setEmployee(res.data);
      }
    } catch (err: any) {
      setError(err?.message ?? `Failed to load employee ${empId}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
    else {
      setEmployee(null);
      setError(null);
    }
  }, [id, load]);

  return { employee, loading, error, refresh: () => id && load(id) };
}

// ─── Status update function ───────────────────────────────────────────────────

export async function updateEmployeeStatus(
  employeeId: string,
  status: "Active" | "Inactive" | "Left"
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://learnschool.online/api/resource/Employee/${employeeId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body?.exception ?? body?.message ?? `HTTP ${res.status}`;
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Network error" };
  }
}