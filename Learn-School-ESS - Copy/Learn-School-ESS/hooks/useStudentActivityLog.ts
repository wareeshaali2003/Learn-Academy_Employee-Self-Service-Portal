// hooks/useStudentActivityLog.ts
// CEO (Admin) aur Teacher (Faculty) — dono roles se, kisi bhi student ka
// login/logout session history dekhne ke liye. Activity Log ke raw
// Login/Logout rows ko pair karke session duration nikalta hai.

import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ActivityLogRecord } from "../services/api";

export type SessionStatus = "Completed" | "Active" | "No logout recorded" | "Orphan logout";

export interface LoginSession {
  key: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  durationMs: number | null;
  status: SessionStatus;
  ipAddress?: string;
}

interface UseStudentActivityLogReturn {
  sessions: LoginSession[];
  isLoading: boolean;
  error: string | null;
  isCurrentlyOnline: boolean;
  lastLogin: Date | null;
  lastLogout: Date | null;
  totalSessionsCount: number;
  totalTimeTodayMs: number;
  averageSessionMs: number;
  refetch: () => void;
}

// Frappe stores "YYYY-MM-DD HH:mm:ss.ffffff" — normalize to a parseable string.
function parseFrappeDate(value: string): Date {
  return new Date(value.replace(" ", "T"));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Pairs raw Login/Logout Activity Log rows (already sorted oldest → newest)
// into sessions with a computed duration.
function buildSessions(records: ActivityLogRecord[]): LoginSession[] {
  const sessions: LoginSession[] = [];
  let openLogin: ActivityLogRecord | null = null;

  for (const record of records) {
    const eventTime = parseFrappeDate(record.communication_date);

    if (record.operation === "Login") {
      if (openLogin) {
        sessions.push({
          key: openLogin.name,
          loginTime: parseFrappeDate(openLogin.communication_date),
          logoutTime: null,
          durationMs: null,
          status: "No logout recorded",
          ipAddress: openLogin.ip_address,
        });
      }
      openLogin = record;
    } else if (record.operation === "Logout") {
      if (openLogin) {
        const loginTime = parseFrappeDate(openLogin.communication_date);
        sessions.push({
          key: openLogin.name,
          loginTime,
          logoutTime: eventTime,
          durationMs: eventTime.getTime() - loginTime.getTime(),
          status: "Completed",
          ipAddress: openLogin.ip_address,
        });
        openLogin = null;
      } else {
        sessions.push({
          key: record.name,
          loginTime: null,
          logoutTime: eventTime,
          durationMs: null,
          status: "Orphan logout",
          ipAddress: record.ip_address,
        });
      }
    }
  }

  if (openLogin) {
    const loginTime = parseFrappeDate(openLogin.communication_date);
    sessions.push({
      key: openLogin.name,
      loginTime,
      logoutTime: null,
      durationMs: Date.now() - loginTime.getTime(),
      status: "Active",
      ipAddress: openLogin.ip_address,
    });
  }

  return sessions.reverse(); // most recent first
}

// studentEmail undefined/empty ho to hook idle rehta hai (koi fetch nahi).
export function useStudentActivityLog(studentEmail?: string): UseStudentActivityLogReturn {
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const fetchActivity = useCallback(async () => {
    if (!studentEmail) {
      setSessions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getStudentLoginActivity(studentEmail);
      if (!res.ok) throw new Error(res.error);
      setSessions(buildSessions(res.data));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch login activity");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, trigger]);

  const derived = useMemo(() => {
    const today = new Date();
    const measurable = sessions.filter((s) => s.durationMs !== null);

    const totalTimeTodayMs = measurable
      .filter((s) => s.loginTime && isSameDay(s.loginTime, today))
      .reduce((sum, s) => sum + (s.durationMs || 0), 0);

    const averageSessionMs = measurable.length
      ? measurable.reduce((sum, s) => sum + (s.durationMs || 0), 0) / measurable.length
      : 0;

    const lastLogin = sessions.find((s) => s.loginTime)?.loginTime || null;
    const lastLogout = sessions.find((s) => s.logoutTime)?.logoutTime || null;
    const isCurrentlyOnline = sessions.some((s) => s.status === "Active");

    return { totalTimeTodayMs, averageSessionMs, lastLogin, lastLogout, isCurrentlyOnline };
  }, [sessions]);

  return {
    sessions,
    isLoading,
    error,
    isCurrentlyOnline: derived.isCurrentlyOnline,
    lastLogin: derived.lastLogin,
    lastLogout: derived.lastLogout,
    totalSessionsCount: sessions.length,
    totalTimeTodayMs: derived.totalTimeTodayMs,
    averageSessionMs: derived.averageSessionMs,
    refetch: () => setTrigger((t) => t + 1),
  };
}

// Formats a millisecond duration as "Xh Ym" / "Ym Zs" for display.
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
