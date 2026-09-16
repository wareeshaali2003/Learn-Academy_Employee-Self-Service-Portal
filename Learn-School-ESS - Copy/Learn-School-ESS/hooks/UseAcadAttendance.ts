// hooks/UseAcadAttendance.ts
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

// ── FIXED: 'Late' does not exist in ERP DocType. Real options are: Present, Absent, Leave ──
export type AttStatus = 'Present' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: AttStatus;
  creation?: string;
  modified?: string;
  docstatus?: number;
}

// ✅ Holiday interface
export interface HolidayInfo {
  date: string;
  holiday_name: string;
}

// ✅ GroupDateHoliday interface
export interface GroupDateHoliday {
  isHoliday: boolean;
  holidayName?: string;
}

// ✅ NEW: DateHoliday interface
export interface DateHoliday {
  isHoliday: boolean;
  holidayName?: string;
}

export interface StudentWithAttendance {
  id: string;
  name: string;
  section: string;
  grade: string;
  overall: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  consecAbsences: number;
  pattern: number[];
  recentDates: string[];
  records: AttendanceRecord[];
}

export interface RosterStudent {
  student: string;
  student_name: string;
}

export interface StudentGroupItem {
  name: string;
  program: string;
}

export interface AcademicTermItem {
  name: string;
  term_name: string;
  academic_year: string;
  term_start_date: string;
  term_end_date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: fetch ALL pages from ERPNext
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 500;

async function fetchAllPages(filters?: {
  student_group?: string;
  from_date?: string;
  to_date?: string;
  student?: string;
  status?: string;
}): Promise<AttendanceRecord[]> {

  const erpFilters: any[] = [];
  if (filters?.student_group) erpFilters.push(['student_group', '=', filters.student_group]);
  if (filters?.from_date)     erpFilters.push(['date', '>=', filters.from_date]);
  if (filters?.to_date)       erpFilters.push(['date', '<=', filters.to_date]);
  if (filters?.student)       erpFilters.push(['student', '=', filters.student]);
  if (filters?.status)        erpFilters.push(['status', '=', filters.status]);

  const fields = JSON.stringify([
    'name', 'student', 'student_name', 'course_schedule',
    'student_group', 'date', 'status', 'creation', 'modified', 'docstatus',
  ]);

  let allRecords: AttendanceRecord[] = [];
  let start = 0;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams();
    params.set('fields', fields);
    params.set('limit_start', String(start));
    params.set('limit_page_length', String(PAGE_SIZE));
    params.set('order_by', 'date desc');
    if (erpFilters.length) {
      params.set('filters', JSON.stringify(erpFilters));
    }

    const url = `/api/resource/Student%20Attendance?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Attendance] API error:', res.status, errText);
      throw new Error(`API error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const page: AttendanceRecord[] = json.data || [];
    allRecords = allRecords.concat(page);
    start += PAGE_SIZE;
    hasMore = page.length === PAGE_SIZE;
  }

  return allRecords;
}

// ✅ Holiday List se fetch karo
async function fetchHolidays(fromDate?: string, toDate?: string): Promise<HolidayInfo[]> {
  try {
    const res = await fetch('/api/resource/Holiday%20List/Public%20Day', { 
      credentials: 'include' 
    });
    
    if (!res.ok) {
      console.warn('Holiday List fetch failed:', res.status);
      return [];
    }
    
    const json = await res.json();
    const holidayList = json.data || json;
    const holidaysList = holidayList.holidays || [];
    
    let holidays: HolidayInfo[] = holidaysList
      .filter((h: any) => h.holiday_date)
      .map((h: any) => ({
        date: h.holiday_date,
        holiday_name: h.description || 'Holiday',
      }));
    
    if (fromDate) {
      holidays = holidays.filter(h => h.date >= fromDate);
    }
    if (toDate) {
      holidays = holidays.filter(h => h.date <= toDate);
    }
    
    console.log('🎉 Holidays from Public Day list:', holidays.length);
    return holidays;
  } catch (err) {
    console.warn('[Attendance] Holiday fetch failed:', err);
    return [];
  }
}

// ✅ NEW: dedicated 'check_holiday' Server Script se check karo (group-independent, permission-safe)
async function fetchDateHoliday(date: string): Promise<DateHoliday> {
  if (!date) return { isHoliday: false };
  try {
    const res = await fetch(`/api/method/check_holiday?date=${encodeURIComponent(date)}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      console.warn('[fetchDateHoliday] failed:', res.status);
      return { isHoliday: false };
    }
    const json = await res.json();
    const result = json.message || {};
    return {
      isHoliday: !!result.is_holiday,
      holidayName: result.holiday_name || undefined,
    };
  } catch (err) {
    console.warn('[fetchDateHoliday] error:', err);
    return { isHoliday: false };
  }
}

// ✅ Course Schedule se holiday check karo (fallback)
async function fetchGroupDateHoliday(group: string, date: string): Promise<GroupDateHoliday> {
  if (!group || !date) return { isHoliday: false };
  try {
    const params = new URLSearchParams();
    params.set('fields', JSON.stringify(['custom_is_holiday', 'custom_holiday_name']));
    params.set('filters', JSON.stringify([
      ['student_group', '=', group],
      ['schedule_date', '=', date],
    ]));
    params.set('limit_page_length', '1');

    const res = await fetch(`/api/resource/Course%20Schedule?${params}`, { credentials: 'include' });
    if (!res.ok) {
      console.warn('[fetchGroupDateHoliday] failed:', res.status);
      return { isHoliday: false };
    }
    const json = await res.json();
    const row = (json.data || [])[0];
    if (!row) return { isHoliday: false };
    return {
      isHoliday: row.custom_is_holiday === 1 || row.custom_is_holiday === true,
      holidayName: row.custom_holiday_name || undefined,
    };
  } catch (err) {
    console.warn('[fetchGroupDateHoliday] error:', err);
    return { isHoliday: false };
  }
}

// ✅ Check if date is weekend
export function isWeekendDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

// ✅ Check if date is holiday
export function isHolidayDate(dateStr: string, holidays: HolidayInfo[]): boolean {
  return holidays.some(h => h.date === dateStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build headers with CSRF token
// ─────────────────────────────────────────────────────────────────────────────
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrf = (window as any).csrf_token
    || document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))
        ?.split('=')?.[1];
  if (csrf && csrf !== 'None') headers['X-Frappe-CSRF-Token'] = csrf;
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Real ERP status check for a specific list of student IDs.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchStudentStatusForIds(
  studentIds: string[]
): Promise<Record<string, { status: string; enabled: number }>> {
  if (!studentIds.length) return {};
  const CHUNK = 100;
  const map: Record<string, { status: string; enabled: number }> = {};

  for (let i = 0; i < studentIds.length; i += CHUNK) {
    const chunk = studentIds.slice(i, i + CHUNK);
    try {
      const params = new URLSearchParams();
      params.set('fields', JSON.stringify(['name', 'status', 'enabled']));
      params.set('filters', JSON.stringify([['name', 'in', chunk]]));
      params.set('limit_page_length', String(chunk.length));
      const res = await fetch(`/api/resource/Student?${params}`, { credentials: 'include' });
      if (!res.ok) continue;
      const d = await res.json();
      (d.data || []).forEach((r: any) => {
        map[r.name] = { status: r.status, enabled: r.enabled };
      });
    } catch {
      // skip this chunk on error
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Each student's authoritative CURRENT batch
// ─────────────────────────────────────────────────────────────────────────────
async function fetchBatchForIds(studentIds: string[]): Promise<Record<string, string>> {
  if (!studentIds.length) return {};
  const CHUNK = 100;
  const best: Record<string, { batch: string; creation: string; docstatus: number }> = {};

  for (let i = 0; i < studentIds.length; i += CHUNK) {
    const chunk = studentIds.slice(i, i + CHUNK);
    try {
      const params = new URLSearchParams();
      params.set('fields', JSON.stringify(['student', 'student_batch_name', 'docstatus', 'creation']));
      params.set('filters', JSON.stringify([['student', 'in', chunk]]));
      params.set('limit_page_length', '500');
      const res = await fetch(`/api/resource/Program%20Enrollment?${params}`, { credentials: 'include' });
      if (!res.ok) continue;
      const d = await res.json();
      (d.data || []).forEach((r: any) => {
        if (!r.student || !r.student_batch_name) return;
        const existing = best[r.student];
        const score = r.docstatus === 1 ? 1 : 0;
        if (!existing) {
          best[r.student] = { batch: r.student_batch_name, creation: r.creation, docstatus: r.docstatus };
          return;
        }
        const existingScore = existing.docstatus === 1 ? 1 : 0;
        if (score > existingScore || (score === existingScore && r.creation > existing.creation)) {
          best[r.student] = { batch: r.student_batch_name, creation: r.creation, docstatus: r.docstatus };
        }
      });
    } catch {
      // skip chunk on error
    }
  }

  const map: Record<string, string> = {};
  Object.entries(best).forEach(([s, v]) => { map[s] = v.batch; });
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useAcadAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);

  const fetchAttendance = useCallback(async (filters?: {
    student_group?: string;
    from_date?: string;
    to_date?: string;
    student?: string;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const records = await fetchAllPages(filters);
      setAttendanceRecords(records);
      return records;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch attendance';
      console.error('[Attendance] fetchAttendance error:', err);
      setError(msg);
      toast.error(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHolidayList = useCallback(async (fromDate?: string, toDate?: string) => {
    try {
      const holidayList = await fetchHolidays(fromDate, toDate);
      console.log('🎉 fetchHolidayList result:', holidayList.length, holidayList);
      setHolidays(holidayList);
      return holidayList;
    } catch (err) {
      console.error('[Attendance] fetchHolidayList error:', err);
      return [];
    }
  }, []);

  // ✅ NEW: Server Script se date holiday check
  const fetchDateHolidayInfo = useCallback(async (date: string): Promise<DateHoliday> => {
    return fetchDateHoliday(date);
  }, []);

  // ✅ Course Schedule se group+date holiday check (fallback)
  const fetchGroupHoliday = useCallback(async (group: string, date: string): Promise<GroupDateHoliday> => {
    return fetchGroupDateHoliday(group, date);
  }, []);

  // ✅ Check date status (holiday/weekend)
  const checkDateStatus = useCallback((dateStr: string): { isHoliday: boolean; isWeekend: boolean; holidayName?: string } => {
    const weekend = isWeekendDate(dateStr);
    const holiday = holidays.find(h => h.date === dateStr);
    return {
      isHoliday: !!holiday,
      isWeekend: weekend,
      holidayName: holiday?.holiday_name,
    };
  }, [holidays]);

  const fetchAllGroups = useCallback(async (): Promise<StudentGroupItem[]> => {
    try {
      const params = new URLSearchParams();
      params.set('fields', JSON.stringify(['name', 'program', 'disabled']));
      params.set('limit_page_length', '500');
      params.set('order_by', 'name asc');
      const res = await fetch(`/api/resource/Student%20Group?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch groups: ${res.status}`);
      const d = await res.json();
      return (d.data || [])
        .filter((g: any) => !g.disabled)
        .map((g: any) => ({ name: g.name, program: g.program || '' }));
    } catch (err) {
      console.error('[Attendance] fetchAllGroups error:', err);
      toast.error('Could not load student groups');
      return [];
    }
  }, []);

  const fetchAcademicTerms = useCallback(async (): Promise<AcademicTermItem[]> => {
    try {
      const params = new URLSearchParams();
      params.set('fields', JSON.stringify([
        'name', 'term_name', 'academic_year', 'term_start_date', 'term_end_date',
      ]));
      params.set('limit_page_length', '0');
      params.set('order_by', 'term_start_date desc');
      const res = await fetch(`/api/resource/Academic%20Term?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch academic terms: ${res.status}`);
      const d = await res.json();
      return (d.data || []).map((t: any) => ({
        name: t.name,
        term_name: t.term_name || t.name,
        academic_year: t.academic_year || '',
        term_start_date: t.term_start_date,
        term_end_date: t.term_end_date,
      }));
    } catch (err) {
      console.error('[Attendance] fetchAcademicTerms error:', err);
      toast.error('Could not load academic terms');
      return [];
    }
  }, []);

  const getStudentsByGroup = useCallback(async (groupName: string): Promise<RosterStudent[]> => {
    if (!groupName) return [];
    try {
      const res = await fetch(`/api/resource/Student%20Group/${encodeURIComponent(groupName)}`, {
        credentials: 'include',
        headers: buildHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch group roster: ${res.status}`);
      const json = await res.json();
      const doc = json.data ?? json;
      const rawStudents: any[] = doc.students || [];
      const sectionBatch: string | undefined = doc.batch || undefined;

      if (rawStudents.length === 0) return [];

      const studentIds = [...new Set(rawStudents.map((s: any) => s.student).filter(Boolean))] as string[];

      const [statusMap, batchMap] = await Promise.all([
        fetchStudentStatusForIds(studentIds),
        fetchBatchForIds(studentIds),
      ]);

      const reconciled = rawStudents.map((s: any) => {
        const rowSaysActive = s.active === undefined || s.active === 1;
        const entry = statusMap[s.student];
        const statusOk = entry
          ? (entry.enabled !== 0 && (!entry.status || entry.status === 'Active'))
          : rowSaysActive;

        let batchOk = true;
        const enrolledBatch = batchMap[s.student];
        if (statusOk && enrolledBatch && sectionBatch) {
          batchOk = enrolledBatch === sectionBatch;
        }

        const isActive = rowSaysActive && statusOk && batchOk;
        return {
          student: s.student,
          student_name: s.student_name,
          active: isActive ? 1 : 0,
        };
      });

      const byStudent = new Map<string, { student: string; student_name: string; active: number }>();
      for (const row of reconciled) {
        const existing = byStudent.get(row.student);
        if (!existing) {
          byStudent.set(row.student, row);
        } else if (row.active === 1 && existing.active !== 1) {
          byStudent.set(row.student, row);
        }
      }

      return Array.from(byStudent.values())
        .filter(s => s.active === 1)
        .map(s => ({ student: s.student, student_name: s.student_name }));
    } catch (err) {
      console.error('[Attendance] getStudentsByGroup error:', err);
      toast.error('Could not load group roster');
      return [];
    }
  }, []);

  const fetchAttendanceForGroupDate = useCallback(async (
    groupName: string, date: string
  ): Promise<AttendanceRecord[]> => {
    if (!groupName || !date) return [];
    try {
      return await fetchAllPages({ student_group: groupName, from_date: date, to_date: date });
    } catch (err) {
      console.error('[Attendance] fetchAttendanceForGroupDate error:', err);
      return [];
    }
  }, []);

  const createAttendance = useCallback(async (payload: {
    student: string;
    student_name: string;
    course_schedule: string;
    student_group: string;
    date: string;
    status: AttStatus;
  }) => {
    setSaving(true);
    try {
      const res = await fetch('/api/resource/Student%20Attendance', {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({ doctype: 'Student Attendance', ...payload }),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const json = await res.json();
      const created = json.data ?? json;
      toast.success('Attendance marked');
      setAttendanceRecords(prev => [created as AttendanceRecord, ...prev]);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark attendance');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const bulkUpsertAttendance = useCallback(async (rows: {
    student: string;
    student_name: string;
    student_group: string;
    course_schedule?: string;
    date: string;
    status: AttStatus;
    existingName?: string;
    existingDocstatus?: number;
  }[]) => {
    setSaving(true);
    let created = 0, updated = 0, skippedCancelled = 0, failed = 0;
    try {
      await Promise.all(rows.map(async row => {
        try {
          if (row.existingName) {
            const encodedName = encodeURIComponent(row.existingName);

            if (row.existingDocstatus === 2) {
              skippedCancelled++;
              return;
            }
            if (row.existingDocstatus === 1) {
              const cancelRes = await fetch(`/api/resource/Student%20Attendance/${encodedName}`, {
                method: 'PUT',
                credentials: 'include',
                headers: buildHeaders(),
                body: JSON.stringify({ docstatus: 2 }),
              });
              if (!cancelRes.ok) throw new Error('cancel failed');
            }
            const res = await fetch(`/api/resource/Student%20Attendance/${encodedName}`, {
              method: 'PUT',
              credentials: 'include',
              headers: buildHeaders(),
              body: JSON.stringify({ status: row.status, docstatus: 0 }),
            });
            if (!res.ok) throw new Error('update failed');
            updated++;
          } else {
            const res = await fetch('/api/resource/Student%20Attendance', {
              method: 'POST',
              credentials: 'include',
              headers: buildHeaders(),
              body: JSON.stringify({
                doctype: 'Student Attendance',
                student: row.student,
                student_name: row.student_name,
                student_group: row.student_group,
                course_schedule: row.course_schedule || '',
                date: row.date,
                status: row.status,
              }),
            });
            if (!res.ok) throw new Error('create failed');
            created++;
          }
        } catch {
          failed++;
        }
      }));

      if (created) toast.success(`${created} record(s) created`);
      if (updated) toast.success(`${updated} record(s) updated`);
      if (skippedCancelled) toast.error(`${skippedCancelled} record(s) skipped (cancelled — needs amend)`);
      if (failed) toast.error(`${failed} record(s) failed`);

      return failed === 0;
    } finally {
      setSaving(false);
    }
  }, []);

  const bulkCreateAttendance = useCallback(async (records: {
    student: string;
    student_name: string;
    course_schedule: string;
    student_group: string;
    date: string;
    status: AttStatus;
  }[]) => {
    setSaving(true);
    let ok = 0, fail = 0;
    try {
      await Promise.all(
        records.map(async rec => {
          try {
            const res = await fetch('/api/resource/Student%20Attendance', {
              method: 'POST',
              credentials: 'include',
              headers: buildHeaders(),
              body: JSON.stringify({ doctype: 'Student Attendance', ...rec }),
            });
            res.ok ? ok++ : fail++;
          } catch { fail++; }
        })
      );
      if (ok)   toast.success(`${ok} records saved`);
      if (fail) toast.error(`${fail} records failed`);
      await fetchAttendance();
      return ok > 0;
    } catch {
      toast.error('Bulk save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchAttendance]);

  const updateAttendanceStatus = useCallback(async (
    attendanceName: string,
    status: AttStatus
  ) => {
    setSaving(true);
    try {
      const encodedName = encodeURIComponent(attendanceName);

      const getRes = await fetch(`/api/resource/Student%20Attendance/${encodedName}`, {
        credentials: 'include',
        headers: buildHeaders(),
      });
      if (!getRes.ok) throw new Error(`Fetch failed: ${getRes.status}`);
      const fullRecord = await getRes.json().then((d: any) => d.data ?? d);

      if (fullRecord.docstatus === 2) {
        throw new Error('This record is cancelled and cannot be edited directly. It needs to be amended.');
      }

      if (fullRecord.docstatus === 1) {
        const cancelRes = await fetch(`/api/resource/Student%20Attendance/${encodedName}`, {
          method: 'PUT',
          credentials: 'include',
          headers: buildHeaders(),
          body: JSON.stringify({ docstatus: 2 }),
        });
        if (!cancelRes.ok) throw new Error('Cancel failed');
      }

      const updateRes = await fetch(`/api/resource/Student%20Attendance/${encodedName}`, {
        method: 'PUT',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({ status, docstatus: 0 }),
      });
      if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}`);

      setAttendanceRecords(prev =>
        prev.map(r => r.name === attendanceName ? { ...r, status } : r)
      );
      toast.success(`Updated to ${status}`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteAttendance = useCallback(async (attendanceName: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/resource/Student%20Attendance/${encodeURIComponent(attendanceName)}`,
        { method: 'DELETE', credentials: 'include', headers: buildHeaders() }
      );
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setAttendanceRecords(prev => prev.filter(r => r.name !== attendanceName));
      toast.success('Record deleted');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const getStudentWiseSummary = useCallback((
    records?: AttendanceRecord[]
  ): StudentWithAttendance[] => {
    const data = records ?? attendanceRecords;
    const map  = new Map<string, StudentWithAttendance>();

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

    for (const rec of sorted) {
      if (!map.has(rec.student)) {
        map.set(rec.student, {
          id: rec.student, name: rec.student_name,
          section: rec.student_group || '',
          grade: rec.student_group?.match(/Grade[-\s]?(\d+)/i)?.[1] || '',
          overall: 0, totalDays: 0,
          presentDays: 0, absentDays: 0, leaveDays: 0,
          consecAbsences: 0, pattern: [], recentDates: [],
          records: [],
        });
      }
      const s = map.get(rec.student)!;
      s.records.push(rec);
      s.totalDays++;
      if (rec.status === 'Present')     s.presentDays++;
      else if (rec.status === 'Absent') s.absentDays++;
      else if (rec.status === 'Leave')  s.leaveDays++;
    }

    map.forEach(s => {
      s.overall = s.totalDays > 0
        ? Math.round((s.presentDays / s.totalDays) * 100)
        : 0;

      const desc = [...s.records].sort((a, b) => b.date.localeCompare(a.date));

      let consec = 0;
      for (const r of desc) {
        if (r.status === 'Absent') consec++;
        else break;
      }
      s.consecAbsences = consec;

      const last10   = desc.slice(0, 10).reverse();
      s.pattern      = last10.map(r => r.status === 'Present' ? 2 : r.status === 'Leave' ? 1 : 0);
      s.recentDates  = last10.map(r => r.date);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceRecords]);

  const getAttendanceStats = useCallback((records?: AttendanceRecord[]) => {
    const data    = records ?? attendanceRecords;
    const total   = data.length;
    const present = data.filter(r => r.status === 'Present').length;
    const absent  = data.filter(r => r.status === 'Absent').length;
    const leave   = data.filter(r => r.status === 'Leave').length;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
    const flagged = getStudentWiseSummary(data).filter(s => s.overall < 75).length;
    return { total, present, absent, leave, rate, flagged };
  }, [attendanceRecords, getStudentWiseSummary]);

  const getUniqueGroups = useCallback(() =>
    [...new Set(attendanceRecords.map(r => r.student_group).filter(Boolean))].sort(),
    [attendanceRecords]
  );

  const getUniqueDates = useCallback((records?: AttendanceRecord[]) =>
    [...new Set((records ?? attendanceRecords).map(r => r.date))].sort().reverse(),
    [attendanceRecords]
  );

  const getStatusColor = useCallback((status: string) =>
    status === 'Present' ? '#16a34a' : status === 'Absent' ? '#dc2626' : '#d97706',
    []
  );

  return {
    attendanceRecords, 
    holidays,
    loading, 
    error, 
    saving,
    fetchAttendance,
    fetchHolidayList,
    fetchDateHolidayInfo, 
    fetchGroupHoliday,
    checkDateStatus,
    fetchAllGroups,
    fetchAcademicTerms,
    getStudentsByGroup,
    fetchAttendanceForGroupDate,
    createAttendance,
    bulkCreateAttendance,
    bulkUpsertAttendance,
    updateAttendanceStatus,
    deleteAttendance,
    getAttendanceStats,
    getStudentWiseSummary,
    getUniqueGroups,
    getUniqueDates,
    getStatusColor,
  };
}