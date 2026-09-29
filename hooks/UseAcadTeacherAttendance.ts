// hooks/UseAcadTeacherAttendance.ts
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export type TeacherAttStatus = 'Present' | 'Absent' | 'Half Day' | 'On Leave';

export interface TeacherAttendanceRecord {
  name: string;
  employee: string;
  employee_name?: string; 
  attendance_date?: string; 
  status?: string;          
  shift?: string;
  working_hours?: number;
  late_entry?: number;
  early_exit?: number;
  docstatus?: number;
}

export function useAcadTeacherAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── FETCH ATTENDANCE ──────────────────────────────
  const fetchTeacherAttendance = useCallback(async (filters?: {
    employee?: string;
    from_date?: string;
    to_date?: string;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAcadTeacherAttendanceList(filters);
      if (res.ok) {
        setAttendanceRecords(res.data);
        return res.data;
      }
      toast.error(res.error || 'Failed to fetch attendance');
      return [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch teacher attendance';
      setError(msg);
      toast.error(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── MARK ATTENDANCE  ────────
  const bulkMarkTeacherAttendance = useCallback(async (rows: {
    employee: string;
    employee_name: string;
    attendance_date: string;
    status: TeacherAttStatus;
  }[]) => {
    setSaving(true);
    try {
      
      const res = await api.bulkCreateAcadTeacherAttendance(rows);
      
      if (res.ok) {
        const { created, failed } = res.data;
        if (failed > 0) {
          toast.error(`${created} created, ${failed} failed`);
        } else {
          toast.success(`${created} teacher attendance marked`);
        }
        
        // Refresh records 
        const date = rows[0]?.attendance_date;
        await fetchTeacherAttendance({ 
          from_date: date, 
          to_date: date 
        });
        return true;
      }
      toast.error(res.error || 'Bulk save failed');
      return false;
    } catch (err) {
      console.error('Bulk save error:', err);
      toast.error(err instanceof Error ? err.message : 'Bulk save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchTeacherAttendance]);

  // ── GET STATS  DATA ──────────────────────────────
  const getTeacherStats = useCallback((records?: TeacherAttendanceRecord[]) => {
    const data = records ?? attendanceRecords;
    const total = data.length;
    const present = data.filter(r => r.status === 'Present').length;
    const absent = data.filter(r => r.status === 'Absent').length;
    const leave = data.filter(r => r.status === 'On Leave').length;
    const halfDay = data.filter(r => r.status === 'Half Day').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, leave, halfDay, rate };
  }, [attendanceRecords]);

  // ── GET TEACHER SUMMARY DATA ─────────────────────
  const getTeacherSummary = useCallback((records?: TeacherAttendanceRecord[]) => {
    const data = records ?? attendanceRecords;
    const map = new Map<string, any>();

    for (const rec of data) {
      if (!map.has(rec.employee)) {
        map.set(rec.employee, {
          id: rec.employee,
          name: rec.employee_name || rec.employee,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          halfDayDays: 0,
          percentage: 0,
          records: [],
        });
      }
      const t = map.get(rec.employee)!;
      t.records.push(rec);
      t.totalDays++;
      if (rec.status === 'Present') t.presentDays++;
      else if (rec.status === 'Absent') t.absentDays++;
      else if (rec.status === 'Half Day') t.halfDayDays++;
      else if (rec.status === 'On Leave') t.leaveDays++;
    }

    map.forEach(t => {
      t.percentage = t.totalDays > 0
        ? Math.round(((t.presentDays + t.halfDayDays * 0.5) / t.totalDays) * 100)
        : 0;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceRecords]);

  return {
    attendanceRecords,
    loading,
    error,
    saving,
    fetchTeacherAttendance,
    bulkMarkTeacherAttendance,
    getTeacherStats,
    getTeacherSummary,
  };
}