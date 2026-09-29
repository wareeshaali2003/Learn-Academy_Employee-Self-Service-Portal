// hooks/useEmployee.ts
// (debug console.log lines hata di gayi hain — masla mil gaya tha)

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

type Employee = Record<string, any>;

type ActionResult =
  | { success: true }
  | { success: false; error: string };

function safeString(v: any, fallback = "N/A") {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function getInitials(name: string) {
  const clean = (name || "").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const useEmployee = () => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getProfile();

      if (result.ok) {
        const profileData: any = result.data ?? null;

        // ✅ FIX: Don't guess the Frappe User ID from Employee profile fields
        // (that chain was falling back to profileData.name, which is the
        // Employee ID like "LA-00007" — not a User account — causing a
        // DoesNotExistError 404 when fetching roles).
        // Instead, ask Frappe directly for the logged-in session's user email,
        // then use THAT to resolve roles. Employee ID stays as-is everywhere
        // else (display, lookups) — this fix only affects the roles call.
        const emailRes = await api.getLoggedUserEmail();
        const userId = emailRes.ok ? emailRes.data : undefined;

        if (userId) {
          const rolesRes = await api.getUserRoles(userId);
          if (rolesRes.ok) {
            profileData.roles = rolesRes.data; // e.g. ["Teacher", "Academics"]
          } else {
            console.warn("[useEmployee] Could not fetch roles:", rolesRes.error);
          }
        } else {
          console.warn("[useEmployee] Could not resolve logged-in user email");
        }

        setEmployee(profileData);
      } else {
        setEmployee(null);
        setError(result.error || "Failed to load profile");
      }
    } catch (e: any) {
      setEmployee(null);
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAvatar = useCallback(
    async (file: File): Promise<ActionResult> => {
      try {
        const formData = new FormData();
        // Some endpoints expect "file" only, some expect "file" + "is_private"
        formData.append("file", file);

        const result = await api.updateProfilePicture(formData);

        if (!result.ok) {
          return { success: false, error: result.error || "Failed to update avatar" };
        }

        await fetchEmployee();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to update avatar" };
      }
    },
    [fetchEmployee]
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<ActionResult> => {
      try {
        const result = await api.changePassword({
          old_password: oldPassword,
          new_password: newPassword,
        });

        if (!result.ok) {
          return { success: false, error: result.error || "Failed to change password" };
        }

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to change password" };
      }
    },
    []
  );

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // ---- Derived helpers for UI ----
  const displayName = useMemo(() => {
    // Employee ID (e.g. "LA-00007") is always the safe last fallback here,
    // since employee_name/full_name/first_name may not be set for every user.
    return (
      employee?.employee_name ||
      employee?.full_name ||
      employee?.first_name ||
      employee?.name || // fallback = Employee ID
      "User"
    );
  }, [employee]);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const imageUrl = useMemo(() => {
    // common keys: user_image, image, avatar, employee_image
    return employee?.user_image || employee?.image || employee?.avatar || employee?.employee_image || "";
  }, [employee]);

  // Employee ID itself — the ground truth identifier (e.g. "LA-00007"),
  // as opposed to the Frappe User account (email) used only for roles.
  const employeeId = useMemo(() => employee?.name ?? "", [employee]);

  const getVal = useCallback(
    (field: keyof Employee | string, fallback = "N/A") => {
      const val = (employee as any)?.[field];
      return safeString(val, fallback);
    },
    [employee]
  );

  return {
    employee,
    loading,
    error, 

    // actions
    updateAvatar,
    changePassword,
    refetch: fetchEmployee,

    // helpers
    getVal,
    displayName,
    initials,
    imageUrl,
    employeeId,
  };
};