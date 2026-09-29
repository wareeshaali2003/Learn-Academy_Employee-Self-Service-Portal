// components/TeacherAttendanceSection.tsx
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAcadTeacherAttendance } from '../hooks/UseAcadTeacherAttendance';
import { useAcadTeachers } from '../hooks/UseAcadTeachers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ── Icons ────────────────────────────────────────────────────
const Icons = {
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  checkCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  xCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  barChart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="6" height="11" rx="1"/><rect x="10" y="6" width="6" height="15" rx="1"/><rect x="16" y="2" width="6" height="19" rx="1"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  filter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 13.46 10 19 14 21 14 13.46 22 3"/></svg>,
  arrowLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  arrowUp: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  arrowDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  trendingUp: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  award: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  info: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  calendarDays: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>,
  dayView: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="1.5"/></svg>,
  monthView: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>,
  mark: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  view: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

// ── Type Definitions ──────────────────────────────────────
interface TeacherAttendanceData {
  teacher: any;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  total: number;
  percentage: number;
  days: { date: string; status: string }[];
}

interface TeacherAttendanceSectionProps {
  activeTab: 'mark' | 'view';
}

// ── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    Present: { bg: '#dcfce7', color: '#15803d', icon: Icons.checkCircle, label: 'Present' },
    Absent: { bg: '#fee2e2', color: '#dc2626', icon: Icons.xCircle, label: 'Absent' },
    'Half Day': { bg: '#fef3c7', color: '#d97706', icon: Icons.clock, label: 'Half Day' },
    'On Leave': { bg: '#dbeafe', color: '#2563eb', icon: Icons.xCircle, label: 'On Leave' },
  };

  const c = config[status] || { bg: '#f1f5f9', color: '#64748b', icon: null, label: '—' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 24, fontSize: 12,
      fontWeight: 700, background: c.bg, color: c.color,
      whiteSpace: 'nowrap', border: `1px solid ${c.color}20`,
    }}>
      {c.icon}
      {c.label}
    </span>
  );
};

// ── KPI Card ─────────────────────────────────────────────────
const KPICard = ({ 
  label, 
  value, 
  icon, 
  color, 
  bg, 
  subtitle,
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string; 
  bg: string;
  subtitle?: string;
}) => {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${bg}, ${bg}dd)`,
      borderRadius: 16,
      padding: '18px 20px',
      border: `1px solid ${color}20`,
      boxShadow: `0 4px 16px -4px ${color}15, inset 0 1px 0 ${color}10`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `${color}10`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}15`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ── Helper Functions ──────────────────────────────────────
function thStyle(): React.CSSProperties {
  return {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.8px',
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  };
}

function tdStyle(): React.CSSProperties {
  return {
    padding: '10px 16px',
    fontSize: 13,
    color: '#1e293b',
  };
}

function selectStyle(): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    fontSize: 13,
    fontFamily: "'DM Sans',sans-serif",
    outline: 'none',
    cursor: 'pointer',
    background: '#fff',
    fontWeight: 600,
    color: '#1e293b',
    minWidth: 130,
    transition: 'all 0.15s ease',
  };
}

// ── Main Component ──────────────────────────────────────────
export const TeacherAttendanceSection: React.FC<TeacherAttendanceSectionProps> = ({ activeTab }) => {
  const { instructors, loading: teachersLoading } = useAcadTeachers();
  const {
    attendanceRecords,
    loading,
    saving,
    fetchTeacherAttendance,
    bulkMarkTeacherAttendance,
    getTeacherStats,
  } = useAcadTeacherAttendance();

  // ── State ──────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [existingMap, setExistingMap] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [sortBy, setSortBy] = useState<'name' | 'attendance'>('attendance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  }, []);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const STATUS_OPTIONS = ['Present', 'Absent', 'Half Day', 'On Leave'];

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'mark') {
      fetchTeacherAttendance({ from_date: selectedDate, to_date: selectedDate });
    }
  }, [selectedDate, activeTab, fetchTeacherAttendance]);

  useEffect(() => {
    if (activeTab === 'view') {
      if (viewMode === 'day' && viewDate) {
        fetchTeacherAttendance({ from_date: viewDate, to_date: viewDate });
      } else if (viewMode === 'month') {
        const fromDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const toDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        fetchTeacherAttendance({ from_date: fromDate, to_date: toDate });
      }
    }
  }, [selectedYear, selectedMonth, activeTab, viewDate, viewMode, fetchTeacherAttendance]);

  useEffect(() => {
    const map: Record<string, string> = {};
    const existing: Record<string, string> = {};
    attendanceRecords.forEach(rec => {
      if (rec.attendance_date === selectedDate) {
        map[rec.employee] = rec.status || '';
        existing[rec.employee] = rec.status || '';
      }
    });
    setStatusMap(map);
    setExistingMap(existing);
    setHasChanges(false);
  }, [attendanceRecords, selectedDate]);

  // ── Computed Data ────────────────────────────────────────
  const stats = useMemo(() => getTeacherStats(), [attendanceRecords, getTeacherStats]);

  const teacherStats = useMemo(() => {
    let recordsToUse = attendanceRecords;
    
    if (viewMode === 'day' && viewDate) {
      recordsToUse = attendanceRecords.filter(r => r.attendance_date === viewDate);
    }
    
    const teacherStatusMap = new Map<string, { 
      present: boolean; 
      absent: boolean; 
      halfDay: boolean; 
      leave: boolean;
      hasRecord: boolean;
      totalDays: number;
      statuses: string[];
      records: any[];
    }>();
    
    recordsToUse.forEach(rec => {
      const teacherExists = instructors.some(t => t.name === rec.employee);
      if (!teacherExists) return;
      
      if (!teacherStatusMap.has(rec.employee)) {
        teacherStatusMap.set(rec.employee, {
          present: false,
          absent: false,
          halfDay: false,
          leave: false,
          hasRecord: false,
          totalDays: 0,
          statuses: [],
          records: []
        });
      }
      
      const teacher = teacherStatusMap.get(rec.employee)!;
      teacher.hasRecord = true;
      teacher.totalDays += 1;
      teacher.statuses.push(rec.status || '—');
      teacher.records.push(rec);
      
      if (rec.status === 'Present') teacher.present = true;
      if (rec.status === 'Absent') teacher.absent = true;
      if (rec.status === 'Half Day') teacher.halfDay = true;
      if (rec.status === 'On Leave') teacher.leave = true;
    });
    
    let presentTeachers = 0;
    let absentTeachers = 0;
    let halfDayTeachers = 0;
    let leaveTeachers = 0;
    let totalTeachersMarked = teacherStatusMap.size;
    let totalRecords = recordsToUse.length;
    
    teacherStatusMap.forEach(teacher => {
      if (teacher.present) presentTeachers++;
      if (teacher.absent) absentTeachers++;
      if (teacher.halfDay) halfDayTeachers++;
      if (teacher.leave) leaveTeachers++;
    });
    
    let dateLabel = '';
    if (viewMode === 'day' && viewDate) {
      dateLabel = new Date(viewDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      dateLabel = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    }
    
    return {
      presentTeachers,
      absentTeachers,
      halfDayTeachers,
      leaveTeachers,
      totalTeachersMarked,
      totalRecords,
      teacherStatusMap,
      viewMode,
      dateLabel,
      isDayView: viewMode === 'day',
    };
  }, [attendanceRecords, viewDate, viewMode, selectedMonth, selectedYear, instructors]);

  const filteredInstructors = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter(t =>
      (t.employee_name || '').toLowerCase().includes(q) ||
      (t.name || '').toLowerCase().includes(q)
    );
  }, [instructors, teacherSearch]);

  const teachersWithAttendance = useMemo((): TeacherAttendanceData[] => {
    const map = new Map<string, TeacherAttendanceData>();
    
    instructors.forEach(teacher => {
      const records = attendanceRecords.filter(r => r.employee === teacher.name);
      if (records.length > 0) {
        const present = records.filter(r => r.status === 'Present').length;
        const absent = records.filter(r => r.status === 'Absent').length;
        const halfDay = records.filter(r => r.status === 'Half Day').length;
        const leave = records.filter(r => r.status === 'On Leave').length;
        const total = records.length;
        const percentage = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
        const days = records.map(r => ({ 
          date: r.attendance_date || '', 
          status: r.status || '—' 
        }));
        map.set(teacher.name, { teacher, present, absent, halfDay, leave, total, percentage, days });
      }
    });
    
    let result = Array.from(map.values());
    
    if (sortBy === 'name') {
      result.sort((a, b) => {
        const nameA = (a.teacher.employee_name || a.teacher.name).toLowerCase();
        const nameB = (b.teacher.employee_name || b.teacher.name).toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    } else {
      result.sort((a, b) => {
        return sortOrder === 'asc' ? a.percentage - b.percentage : b.percentage - a.percentage;
      });
    }
    
    return result;
  }, [instructors, attendanceRecords, sortBy, sortOrder]);

  const selectedTeacherRecords = useMemo(() => {
    if (!selectedTeacher) return [];
    return attendanceRecords.filter(r => r.employee === selectedTeacher);
  }, [selectedTeacher, attendanceRecords]);

  const selectedTeacherStats = useMemo(() => {
    const records = selectedTeacherRecords;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const halfDay = records.filter(r => r.status === 'Half Day').length;
    const leave = records.filter(r => r.status === 'On Leave').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
    return { present, absent, halfDay, leave, total, percentage };
  }, [selectedTeacherRecords]);

  const selectedTeacherName = useMemo(() => {
    const teacher = instructors.find(t => t.name === selectedTeacher);
    return teacher?.employee_name || selectedTeacher;
  }, [selectedTeacher, instructors]);

  const chartData = useMemo(() => {
    if (selectedTeacher) {
      return [
        { name: 'Present', value: selectedTeacherStats.present, color: '#22c55e' },
        { name: 'Absent', value: selectedTeacherStats.absent, color: '#ef4444' },
        { name: 'Half Day', value: selectedTeacherStats.halfDay, color: '#f59e0b' },
        { name: 'Leave', value: selectedTeacherStats.leave, color: '#3b82f6' },
      ];
    }
    return [
      { name: 'Present', value: stats.present, color: '#22c55e' },
      { name: 'Absent', value: stats.absent, color: '#ef4444' },
      { name: 'Half Day', value: stats.halfDay, color: '#f59e0b' },
      { name: 'Leave', value: stats.leave, color: '#3b82f6' },
    ];
  }, [selectedTeacher, selectedTeacherStats, stats]);

  const filteredRecords = useMemo(() => {
    if (!selectedTeacher) return [];
    if (filterStatus === 'all') return selectedTeacherRecords;
    return selectedTeacherRecords.filter(r => (r.status || '').toLowerCase().includes(filterStatus.toLowerCase()));
  }, [selectedTeacherRecords, filterStatus, selectedTeacher]);

  const pct = selectedTeacher ? selectedTeacherStats.percentage : stats.rate;
  const getGaugeColor = (p: number) => p >= 80 ? '#22c55e' : p >= 60 ? '#f59e0b' : '#ef4444';

  // ── Handlers ──────────────────────────────────────────────
  const handleStatusChange = (teacherId: string, status: string) => {
    setStatusMap(prev => {
      const next = { ...prev, [teacherId]: status };
      const changed = Object.keys(next).some(key => next[key] !== (existingMap[key] || ''));
      setHasChanges(changed);
      return next;
    });
  };

  const handleMarkAll = (status: string) => {
    const map: Record<string, string> = {};
    instructors.forEach(t => { map[t.name] = status; });
    setStatusMap(map);
    setHasChanges(true);
  };

  const handleClearAll = () => {
    setStatusMap({});
    setHasChanges(true);
    toast.success('All statuses cleared. Select again.');
  };

  // ── UPDATED: Handle Save with Update Support ──────────────
  // ── UPDATED handleSave (ONLY CREATE - NO UPDATE) ──────────────
const handleSave = async () => {
  const rows = instructors
    .filter(t => statusMap[t.name] && statusMap[t.name] !== '')
    .map(t => ({
      employee: t.name,
      employee_name: t.employee_name || t.name,
      attendance_date: selectedDate,
      status: statusMap[t.name] as any,
    }));

  if (rows.length === 0) {
    toast.error('Please select status for at least one teacher');
    return;
  }

  try {
    const success = await bulkMarkTeacherAttendance(rows);
    if (success) {
      setHasChanges(false);
      setStatusMap({});
      setExistingMap({});
      // Refresh data from ERP
      await fetchTeacherAttendance({ from_date: selectedDate, to_date: selectedDate });
    }
  } catch (error) {
    console.error('Error saving:', error);
    toast.error('Failed to save attendance');
  }
};

  const toggleSort = (field: 'name' | 'attendance') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (teachersLoading || loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 80, 
        gap: 16,
        background: 'var(--surface)',
        borderRadius: 16,
      }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          border: '3px solid #e2e8f0', 
          borderTop: '3px solid #16a34a', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }} />
        <div style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading attendance data...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── MARK MODE ─────────────────────────────────────────────
  if (activeTab === 'mark') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: 'linear-gradient(135deg, #166534 0%, #15803d 25%, #16a34a 50%, #0d9488 75%, #14b8a6 100%)',
          borderRadius: 16, padding: '24px 28px',
          boxShadow: '0 10px 28px -8px rgba(22,163,74,0.35)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -50, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#fff', display: 'flex' }}>{Icons.calendar}</span>
                <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                  Mark Teacher Attendance
                </h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '6px 0 0' }}>
                {instructors.length} teachers · <strong>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                {hasChanges && <span style={{ marginLeft: 12, padding: '4px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, color: '#fff' }}>Unsaved Changes</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>Select Date:</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value || '')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '2px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: "'DM Sans',sans-serif",
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '14px 18px',
          boxShadow: '0 2px 8px -4px rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginRight: 8 }}>Bulk Actions:</span>
          
          {STATUS_OPTIONS.map(status => {
            const colors: Record<string, { bg: string; color: string }> = {
              'Present': { bg: '#f0fdf4', color: '#16a34a' },
              'Absent': { bg: '#fef2f2', color: '#dc2626' },
              'Half Day': { bg: '#fffbeb', color: '#d97706' },
              'On Leave': { bg: '#eff6ff', color: '#2563EB' },
            };
            const c = colors[status];
            return (
              <button 
                key={status}
                onClick={() => handleMarkAll(status)} 
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${c.color}30`,
                  background: c.bg,
                  color: c.color,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans',sans-serif",
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {status === 'Present' && Icons.check}
                {status === 'Absent' && Icons.x}
                {status === 'Half Day' && Icons.clock}
                {status === 'On Leave' && Icons.xCircle}
                {status}
              </button>
            );
          })}

          <div style={{ width: 1, height: 30, background: '#e2e8f0', margin: '0 4px' }} />

          <button 
            onClick={handleClearAll} 
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {Icons.x} Clear All
          </button>

          <button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            style={{
              marginLeft: 'auto',
              padding: '8px 24px',
              borderRadius: 10,
              border: 'none',
              cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif",
              background: (saving || !hasChanges) ? '#e2e8f0' : 'linear-gradient(90deg, #16a34a, #0d9488)',
              color: '#fff',
              opacity: (saving || !hasChanges) ? 0.6 : 1,
              boxShadow: (saving || !hasChanges) ? 'none' : '0 4px 12px -2px rgba(22,163,74,0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Save Attendance'}
          </button>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ 
            overflowX: 'auto',
            maxHeight: 600,
            overflowY: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, #f0fdf4, #f8fafc)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ ...thStyle(), padding: '12px 16px' }}>#</th>
                  <th style={{ ...thStyle(), padding: '12px 16px' }}>Teacher</th>
                  <th style={{ ...thStyle(), padding: '12px 16px' }}>Employee ID</th>
                  <th style={{ ...thStyle(), padding: '12px 16px' }}>Current Status</th>
                  <th style={{ ...thStyle(), padding: '12px 16px', minWidth: 160 }}>Mark Status</th>
                </tr>
              </thead>
              <tbody>
                {instructors.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>No teachers found</td></tr>
                )}
                {instructors.map((teacher, idx) => {
                  const existing = existingMap[teacher.name] || '';
                  const current = statusMap[teacher.name] || '';
                  const isChanged = current !== existing;
                  
                  const statusColors: Record<string, string> = {
                    'Present': '#16a34a',
                    'Absent': '#dc2626',
                    'Half Day': '#d97706',
                    'On Leave': '#2563EB',
                  };
                  const sc = statusColors[current] || '#94a3b8';
                  
                  return (
                    <tr key={teacher.name} style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isChanged ? '#fffbeb' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}>
                      <td style={{ ...tdStyle(), padding: '10px 16px', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ ...tdStyle(), padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: current ? `${sc}20` : '#f1f5f9',
                            color: current ? sc : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            border: `1.5px solid ${current ? `${sc}40` : '#e2e8f0'}`,
                            flexShrink: 0,
                          }}>
                            {(teacher.employee_name || teacher.name).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{teacher.employee_name || teacher.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle(), padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{teacher.name}</td>
                      <td style={{ ...tdStyle(), padding: '10px 16px' }}>
                        {existing ? (
                          <StatusBadge status={existing} />
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>— Not Marked</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle(), padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <select 
                            value={current} 
                            onChange={e => handleStatusChange(teacher.name, e.target.value)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              border: `2px solid ${sc}40`,
                              fontSize: 12.5,
                              outline: 'none',
                              background: `${sc}10`,
                              color: sc || '#64748b',
                              cursor: 'pointer',
                              minWidth: 140,
                              fontFamily: "'DM Sans',sans-serif",
                              fontWeight: 600,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <option value="">— Select —</option>
                            {STATUS_OPTIONS.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          {isChanged && (
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '2px 10px', borderRadius: 12 }}>↻ Changed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', fontSize: 12, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total: {instructors.length} teachers</span>
            <span>{hasChanges ? '⚠️ Unsaved changes' : ' All changes saved'}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── VIEW MODE ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header with Stats */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0d9488 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        boxShadow: '0 12px 40px -8px rgba(13,148,136,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -60,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(13,148,136,0.15)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.1)',
          filter: 'blur(50px)',
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}>
                  {Icons.calendarDays}
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                    Teacher Attendance Overview
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '4px 0 0' }}>
                    {teacherStats.dateLabel}
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.06)',
              padding: '8px 16px 8px 20px',
              borderRadius: 50,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>
                {teacherStats.totalTeachersMarked} teachers with records
              </span>
              <span style={{
                width: 2,
                height: 20,
                background: 'rgba(255,255,255,0.1)',
              }} />
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                {teacherStats.totalRecords} total records
              </span>
            </div>
          </div>

          {/* Context Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', display: 'flex' }}>{Icons.info}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {viewMode === 'day' ? (
                <span>
                  📅 <strong style={{ color: '#fff' }}>Day View</strong> · 
                  <strong style={{ color: '#fff', marginLeft: 4 }}>
                    {new Date(viewDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </strong>
                  <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <strong style={{ color: '#fff' }}>{teacherStats.totalRecords}</strong> ERP records
                  <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <strong style={{ color: '#fff' }}>{teacherStats.totalTeachersMarked}</strong> teachers marked
                </span>
              ) : (
                <span>
                  📆 <strong style={{ color: '#fff' }}>Month View</strong> · 
                  <strong style={{ color: '#fff', marginLeft: 4 }}>
                    {MONTHS[selectedMonth - 1]} {selectedYear}
                  </strong>
                  <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <strong style={{ color: '#fff' }}>{teacherStats.totalRecords}</strong> ERP records
                  <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <strong style={{ color: '#fff' }}>{teacherStats.totalTeachersMarked}</strong> teachers marked
                  {teacherStats.totalTeachersMarked > instructors.length && (
                    <span>
                      <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <span style={{ color: '#fbbf24', fontSize: 10 }}>
                        ⚠️ {teacherStats.totalTeachersMarked - instructors.length} extra records found
                      </span>
                    </span>
                  )}
                  {teacherStats.totalTeachersMarked <= instructors.length && teacherStats.totalTeachersMarked > 0 && (
                    <span>
                      <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <span style={{ color: '#4ade80', fontSize: 10 }}>
                        ✅ All teachers verified
                      </span>
                    </span>
                  )}
                </span>
              )}
            </span>
            <span style={{ 
              display: 'flex', 
              gap: 8, 
              marginLeft: 4,
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
            }}>
              <span>Present: <strong style={{ color: '#4ade80' }}>{teacherStats.presentTeachers}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span>Absent: <strong style={{ color: '#f87171' }}>{teacherStats.absentTeachers}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span>Half Day: <strong style={{ color: '#fbbf24' }}>{teacherStats.halfDayTeachers}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span>Leave: <strong style={{ color: '#60a5fa' }}>{teacherStats.leaveTeachers}</strong></span>
            </span>
          </div>

          {/* Quick Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginTop: 12,
          }}>
            {[
              { 
                label: viewMode === 'day' ? 'Teachers Today' : 'Total Teachers', 
                value: viewMode === 'day' ? teacherStats.totalTeachersMarked : instructors.length, 
                icon: Icons.users, 
                color: '#818cf8', 
                bg: '#eef2ff',
                subtitle: viewMode === 'day' ? `Marked today` : 'All registered teachers'
              },
              { 
                label: viewMode === 'day' ? 'Marked Today' : 'Teachers Marked', 
                value: teacherStats.totalTeachersMarked, 
                icon: Icons.checkCircle, 
                color: '#22c55e', 
                bg: '#dcfce7',
                subtitle: viewMode === 'day' ? `Today's records` : `${teacherStats.totalRecords} total records`
              },
              { 
                label: viewMode === 'day' ? 'Present Today' : 'Present Teachers', 
                value: teacherStats.presentTeachers, 
                icon: Icons.check, 
                color: '#22c55e', 
                bg: '#dcfce7',
                subtitle: viewMode === 'day' ? 'Marked present today' : 'Teachers present at least once'
              },
              { 
                label: viewMode === 'day' ? 'Absent Today' : 'Absent Teachers', 
                value: teacherStats.absentTeachers, 
                icon: Icons.x, 
                color: '#ef4444', 
                bg: '#fee2e2',
                subtitle: viewMode === 'day' ? 'Marked absent today' : 'Teachers absent at least once'
              },
              { 
                label: viewMode === 'day' ? 'Half Day Today' : 'Half Day Teachers', 
                value: teacherStats.halfDayTeachers, 
                icon: Icons.clock, 
                color: '#d97706', 
                bg: '#fef3c7',
                subtitle: viewMode === 'day' ? 'Half day today' : 'Teachers with half day'
              },
              { 
                label: viewMode === 'day' ? 'Leave Today' : 'Leave Teachers', 
                value: teacherStats.leaveTeachers, 
                icon: Icons.xCircle, 
                color: '#3b82f6', 
                bg: '#dbeafe',
                subtitle: viewMode === 'day' ? 'On leave today' : 'Teachers on leave'
              },
            ].map(c => (
              <div key={c.label} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${c.color}20`,
                  color: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    {c.value}
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    {c.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls with Date Picker and View Mode Toggle */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 2px 12px -6px rgba(0,0,0,0.06)',
      }}>
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          <button
            onClick={() => { setViewMode('day'); setViewDate(new Date().toISOString().slice(0, 10)); }}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: viewMode === 'day' ? '#fff' : 'transparent',
              color: viewMode === 'day' ? '#0d9488' : '#64748b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: viewMode === 'day' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            📅 Day View
          </button>
          <button
            onClick={() => { setViewMode('month'); setViewDate(''); }}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: viewMode === 'month' ? '#fff' : 'transparent',
              color: viewMode === 'month' ? '#0d9488' : '#64748b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: viewMode === 'month' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            📆 Month View
          </button>
        </div>

        <div style={{ width: 1, height: 32, background: '#e2e8f0', margin: '0 4px' }} />

        {/* Date Picker - Only show in Day View */}
        {viewMode === 'day' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8' }}>{Icons.calendar}</span>
            <input 
              type="date" 
              value={viewDate} 
              onChange={e => { 
                setViewDate(e.target.value || ''); 
              }}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: '1.5px solid #e2e8f0',
                fontSize: 13,
                fontFamily: "'DM Sans',sans-serif",
                outline: 'none',
                background: '#fff',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minWidth: 160,
              }}
              onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={() => setViewDate(new Date().toISOString().slice(0, 10))}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0d9488',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              Today
            </button>
          </div>
        )}

        {/* Month/Year Selectors - Only show in Month View */}
        {viewMode === 'month' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#94a3b8' }}>{Icons.calendar}</span>
              <select 
                value={selectedMonth} 
                onChange={e => { setSelectedMonth(Number(e.target.value)); }} 
                style={selectStyle()}
              >
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            
            <select 
              value={selectedYear} 
              onChange={e => { setSelectedYear(Number(e.target.value)); }} 
              style={{ ...selectStyle(), minWidth: 90 }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}

        <div style={{ width: 1, height: 32, background: '#e2e8f0', margin: '0 4px' }} />

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            {Icons.search}
          </span>
          <input 
            type="text" 
            placeholder="Search teacher..." 
            value={teacherSearch} 
            onChange={e => setTeacherSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 36px',
              borderRadius: 10,
              border: '1.5px solid #e2e8f0',
              fontSize: 13,
              fontFamily: "'DM Sans',sans-serif",
              outline: 'none',
              background: '#fff',
              transition: 'all 0.2s ease',
            }}
            onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.08)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button 
            onClick={() => toggleSort('attendance')}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1.5px solid ${sortBy === 'attendance' ? '#0d9488' : '#e2e8f0'}`,
              background: sortBy === 'attendance' ? '#f0fdfa' : '#fff',
              color: sortBy === 'attendance' ? '#0d9488' : '#64748b',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {sortBy === 'attendance' && (sortOrder === 'asc' ? Icons.arrowUp : Icons.arrowDown)} Attendance
          </button>
          <button 
            onClick={() => toggleSort('name')}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1.5px solid ${sortBy === 'name' ? '#0d9488' : '#e2e8f0'}`,
              background: sortBy === 'name' ? '#f0fdfa' : '#fff',
              color: sortBy === 'name' ? '#0d9488' : '#64748b',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {sortBy === 'name' && (sortOrder === 'asc' ? Icons.arrowUp : Icons.arrowDown)} Name
          </button>
        </div>
      </div>

      {/* Main Content */}
      {teachersWithAttendance.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 80,
          background: '#fff',
          border: '2px dashed #e2e8f0',
          borderRadius: 20,
        }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.5 }}>📊</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>No attendance records found</p>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
            {viewMode === 'day' 
              ? `No records found for ${new Date(viewDate).toLocaleDateString()}`
              : `No records found for ${MONTHS[selectedMonth - 1]} ${selectedYear}`}
          </p>
        </div>
      ) : selectedTeacher ? (
        // ── Teacher Detail View ──────────────────────────
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <button 
              onClick={() => setSelectedTeacher('')} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 12,
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#0d9488',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
            >
              {Icons.arrowLeft} Back to Teachers
            </button>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              padding: '8px 20px 8px 16px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 800,
              }}>
                {selectedTeacherName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {selectedTeacherName}
                </h4>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>
                  ID: {selectedTeacher}
                </p>
              </div>
            </div>
          </div>

          {/* Teacher Detail KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}>
            <KPICard 
              label="Attendance Rate"
              value={`${pct}%`}
              icon={Icons.trendingUp}
              color={getGaugeColor(pct)}
              bg={getGaugeColor(pct) === '#22c55e' ? '#dcfce7' : getGaugeColor(pct) === '#f59e0b' ? '#fef3c7' : '#fee2e2'}
              subtitle={`${selectedTeacherStats.total} working days`}
            />
            <KPICard 
              label="Present Days"
              value={selectedTeacherStats.present}
              icon={Icons.checkCircle}
              color="#22c55e"
              bg="#dcfce7"
              subtitle="Days marked present"
            />
            <KPICard 
              label="Absent Days"
              value={selectedTeacherStats.absent}
              icon={Icons.xCircle}
              color="#ef4444"
              bg="#fee2e2"
              subtitle="Days marked absent"
            />
            <KPICard 
              label="Half Days"
              value={selectedTeacherStats.halfDay}
              icon={Icons.clock}
              color="#d97706"
              bg="#fef3c7"
              subtitle="Half day attendance"
            />
            <KPICard 
              label="Leave Days"
              value={selectedTeacherStats.leave}
              icon={Icons.x}
              color="#3b82f6"
              bg="#dbeafe"
              subtitle="On leave"
            />
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
            gap: 16 
          }}>
            {/* Chart */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: 24,
              boxShadow: '0 4px 16px -6px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{ width: 200, height: 200, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={65} 
                      outerRadius={85} 
                      paddingAngle={4} 
                      dataKey="value" 
                      startAngle={90} 
                      endAngle={-270}
                    >
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={3} />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 12, 
                        fontSize: 12, 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        padding: '8px 14px',
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  flexDirection: 'column',
                }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: getGaugeColor(pct) }}>{pct}%</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Attendance</span>
                </div>
              </div>

              <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginTop: 16 }}>
                <div style={{ 
                  width: `${pct}%`, 
                  height: '100%', 
                  background: `linear-gradient(90deg, ${getGaugeColor(pct)}80, ${getGaugeColor(pct)})`, 
                  borderRadius: 4, 
                  transition: 'width 0.8s ease' 
                }} />
              </div>

              <div style={{ width: '100%', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chartData.map(item => (
                  <div key={item.name} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: `${item.color}08`,
                    border: `1px solid ${item.color}15`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{item.value} days</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Log */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 16px -6px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '18px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                background: '#f8fafc',
              }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {Icons.barChart} Attendance Log
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{filteredRecords.length} records</p>
                </div>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 12,
                    fontFamily: "'DM Sans',sans-serif",
                    outline: 'none',
                    cursor: 'pointer',
                    background: '#fff',
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  <option value="all">All Statuses</option>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{
                overflowX: 'auto',
                maxHeight: 420,
                overflowY: 'auto',
                flex: 1,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
                      <th style={{ ...thStyle(), padding: '12px 18px' }}>#</th>
                      <th style={{ ...thStyle(), padding: '12px 18px' }}>Date</th>
                      <th style={{ ...thStyle(), padding: '12px 18px' }}>Day</th>
                      <th style={{ ...thStyle(), padding: '12px 18px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 50, color: '#94a3b8', fontSize: 14 }}>
                          No records found for this filter
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec, i) => {
                        const date = rec.attendance_date ? new Date(rec.attendance_date) : new Date();
                        return (
                          <tr key={rec.name || i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ ...tdStyle(), padding: '12px 18px', color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>{i + 1}</td>
                            <td style={{ ...tdStyle(), padding: '12px 18px', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                              {rec.attendance_date || '—'}
                            </td>
                            <td style={{ ...tdStyle(), padding: '12px 18px', color: '#64748b', fontSize: 13 }}>
                              {rec.attendance_date ? DAYS[date.getDay()] : '—'}
                            </td>
                            <td style={{ ...tdStyle(), padding: '12px 18px' }}>
                              <StatusBadge status={rec.status || '—'} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        // ── Teacher Grid View ────────────────────────────
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {teachersWithAttendance.map(({ teacher, present, absent, halfDay, leave, total, percentage, days }) => {
            let statusColor = '#64748b';
            let statusBg = '#f1f5f9';
            let statusLabel = 'No Status';
            let lightBorderColor = '#e2e8f0';
            
            const statuses = [
              { status: 'Present', count: present, color: '#22c55e', bg: '#dcfce7', border: '#86efac' },
              { status: 'Absent', count: absent, color: '#ef4444', bg: '#fee2e2', border: '#fca5a5' },
              { status: 'Half Day', count: halfDay, color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
              { status: 'On Leave', count: leave, color: '#3b82f6', bg: '#dbeafe', border: '#93c5fd' },
            ];
            
            const sortedStatuses = [...statuses].sort((a, b) => b.count - a.count);
            const dominant = sortedStatuses[0];
            
            if (dominant && dominant.count > 0) {
              statusColor = dominant.color;
              statusBg = dominant.bg;
              lightBorderColor = dominant.border;
              statusLabel = dominant.status;
            } else if (total === 0) {
              statusColor = '#94a3b8';
              statusBg = '#f1f5f9';
              lightBorderColor = '#e2e8f0';
              statusLabel = 'No Records';
            }
            
            const recentStatus = days.length > 0 ? days[days.length - 1].status : '—';
            const isPerfect = percentage === 100 && total > 0;
            
            return (
              <div 
                key={teacher.name} 
                onClick={() => { setSelectedTeacher(teacher.name); setFilterStatus('all'); }}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 6px 20px -8px ${statusColor}40`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = lightBorderColor;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* Top accent bar */}
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: 3, 
                  background: statusColor,
                  borderRadius: '12px 12px 0 0',
                }} />

                {isPerfect && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 8,
                    fontWeight: 700,
                    border: '1px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    zIndex: 2,
                  }}>
                    {Icons.award} Perfect
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10, 
                  marginTop: 4,
                  marginBottom: 4,
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${statusColor}15, ${statusColor}25)`,
                    color: statusColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    border: `1.5px solid ${statusColor}20`,
                    flexShrink: 0,
                  }}>
                    {(teacher.employee_name || teacher.name).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      fontWeight: 700, 
                      fontSize: 13, 
                      color: '#1e293b', 
                      margin: 0, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>
                      {teacher.employee_name || teacher.name}
                    </p>
                    <p style={{ 
                      fontSize: 10, 
                      color: '#94a3b8', 
                      margin: 0, 
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {teacher.name}
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: statusBg,
                  color: statusColor,
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 700,
                  border: `1px solid ${lightBorderColor}40`,
                  width: 'fit-content',
                }}>
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: statusColor,
                    display: 'inline-block',
                  }} />
                  {statusLabel}
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: 2,
                }}>
                  <span style={{ 
                    fontSize: 26, 
                    fontWeight: 900, 
                    color: statusColor, 
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}>
                    {total > 0 ? percentage : 0}%
                  </span>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: 8.5, 
                      fontWeight: 700, 
                      color: present > 0 ? '#16a34a' : '#94a3b8', 
                      background: present > 0 ? '#dcfce7' : '#f1f5f9', 
                      padding: '2px 7px', 
                      borderRadius: 4,
                      minWidth: 24,
                      textAlign: 'center',
                    }}>P{present}</span>
                    <span style={{ 
                      fontSize: 8.5, 
                      fontWeight: 700, 
                      color: absent > 0 ? '#dc2626' : '#94a3b8', 
                      background: absent > 0 ? '#fee2e2' : '#f1f5f9', 
                      padding: '2px 7px', 
                      borderRadius: 4,
                      minWidth: 24,
                      textAlign: 'center',
                    }}>A{absent}</span>
                    <span style={{ 
                      fontSize: 8.5, 
                      fontWeight: 700, 
                      color: halfDay > 0 ? '#d97706' : '#94a3b8', 
                      background: halfDay > 0 ? '#fef3c7' : '#f1f5f9', 
                      padding: '2px 7px', 
                      borderRadius: 4,
                      minWidth: 24,
                      textAlign: 'center',
                    }}>HD{halfDay}</span>
                    <span style={{ 
                      fontSize: 8.5, 
                      fontWeight: 700, 
                      color: leave > 0 ? '#3b82f6' : '#94a3b8', 
                      background: leave > 0 ? '#dbeafe' : '#f1f5f9', 
                      padding: '2px 7px', 
                      borderRadius: 4,
                      minWidth: 24,
                      textAlign: 'center',
                    }}>L{leave}</span>
                  </div>
                </div>

                <div style={{ 
                  height: 4, 
                  background: '#f1f5f9', 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  marginTop: 2,
                }}>
                  <div style={{ 
                    width: `${total > 0 ? percentage : 0}%`, 
                    height: '100%', 
                    background: `linear-gradient(90deg, ${statusColor}70, ${statusColor})`, 
                    borderRadius: 2, 
                    transition: 'width 0.6s ease' 
                  }} />
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: 2,
                  paddingTop: 4,
                  borderTop: '1px solid #f1f5f9',
                }}>
                  <span style={{ 
                    fontSize: 9, 
                    color: '#94a3b8', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 3 
                  }}>
                    <span style={{ display: 'flex' }}>{Icons.calendar}</span> Total: {total}d
                  </span>
                  <span style={{ 
                    fontSize: 9, 
                    color: '#94a3b8', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 3 
                  }}>
                    <span style={{ display: 'flex' }}>{Icons.barChart}</span> {days.length} entries
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};