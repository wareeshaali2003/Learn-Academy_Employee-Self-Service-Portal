import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FacultyProgram = {
  name: string;
  program_name?: string;
};

export type FacultyCourse = {
  name: string;
  course_name?: string;
};

export type ScheduleEntry = {
  name: string;
  student_group: string;
  instructor: string;
  instructor_name: string;
  program: string;
  course: string;
  schedule_date: string;
  room?: string;
  from_time: string;
  to_time: string;
  title?: string;
  color?: string;
  class_schedule_color?: string;
};

export type StudentGroup = {
  name: string;
  student_group_name?: string;
  program?: string;
  course?: string;
  batch?: string;
  activeCount?: number;
  totalCount?: number;
};

export type GroupStudent = {
  name?: string;
  student: string;
  student_name: string;
  active?: number;
  group_roll_number?: number;
};

export type StudentAttendance = {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: string;
};

export type AssessmentCriteria = {
  name: string;
  assessment_criteria: string;
  maximum_score: number;
};

export type AssessmentPlan = {
  name: string;
  student_group?: string;
  program?: string;
  course?: string;
  academic_year?: string;
  academic_term?: string;
  assessment_group?: string;
  grading_scale?: string;
  maximum_assessment_score?: number;
  assessment_criteria?: AssessmentCriteria[];
};

export type AssessmentResultRecord = {
  name: string;
  student: string;
  student_name: string;
  assessment_plan: string;
  student_group: string;
  program?: string;
  course?: string;
  total_score?: number;
  maximum_score?: number;
  grade?: string;
  comment?: string;
};

// TodayClass — FacultyPage ke "Today's Schedule" card ke liye lightweight shape
export type TodayClass = {
  id: string;              // course_schedule name, mark-attendance route ke liye
  course: string;
  studentGroup: string;
  room?: string;
  startTime: string;       // formatted, e.g. "9:00 AM"
  endTime: string;         // formatted, e.g. "9:45 AM"
  duration: string;        // e.g. "45 min"
  attendanceMarked: boolean;
};

// Dashboard charts ke liye shapes
export type DailyAttendancePoint = { date: string; label: string; percentage: number };
export type GroupAttendancePoint = { group: string; percentage: number };

// ── usePrograms ───────────────────────────────────────────────────────────────

export const usePrograms = () => {
  const [programs, setPrograms] = useState<FacultyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getFacultyPrograms();
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setPrograms(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { programs, loading, error, refetch: fetchData };
};

// ── useCourses ────────────────────────────────────────────────────────────────

export const useCourses = () => {
  const [courses, setCourses] = useState<FacultyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getFacultyCourses();
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setCourses(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { courses, loading, error, refetch: fetchData };
};

// ── useSchedule ───────────────────────────────────────────────────────────────

export const useSchedule = (programFilter?: string) => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getCourseSchedule(programFilter);
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setSchedule(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [programFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { schedule, loading, error, refetch: fetchData };
};

// ── useStudentGroups ──────────────────────────────────────────────────────────
// FIX: instructorName (employee_name/full_name) ki bajaye ab api.getInstructorName()
// se Instructor ID (TA-XXXXX) use ho raha hai — same convention jo QuickStats mein hai.

export const useStudentGroups = (programFilter?: string) => {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const instructorId = await api.getInstructorName();

    console.log("[useStudentGroups] instructorId =>", instructorId);

    const res = await api.getStudentGroups(programFilter, instructorId || undefined);
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }

    const raw: StudentGroup[] = Array.isArray(res.data)
      ? res.data
      : (res.data as any)?.data ?? [];

    const withCounts = await Promise.all(
      raw.map(async (g) => {
        const detail = await api.getStudentGroupDetail(g.name);
        if (!detail.ok) return { ...g, totalCount: 0, activeCount: 0 };
        const studs: any[] = Array.isArray(detail.data?.students)
          ? detail.data.students
          : [];
        return {
          ...g,
          totalCount: studs.length,
          activeCount: studs.filter((s) => s.active === 1).length,
        };
      })
    );

    setGroups(withCounts);
    setLoading(false);
  }, [programFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { groups, loading, error, refetch: fetchData };
};

// ── useGroupStudents ──────────────────────────────────────────────────────────

export const useGroupStudents = (groupName?: string) => {
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!groupName) { setStudents([]); return; }
    setLoading(true);
    setError(null);

    const res = await api.getStudentGroupDetail(groupName);
    if (res.ok) {
      const raw: any[] = Array.isArray(res.data?.students) ? res.data.students : [];
      setStudents(
        raw.map((s) => ({
          name: s.name,
          student: s.student || s.student_id || "",
          student_name: s.student_name || s.name || "",
          active: s.active,
          group_roll_number: s.group_roll_number,
        }))
      );
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [groupName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { students, loading, error, refetch: fetchData };
};

// ── useStudentAttendance ──────────────────────────────────────────────────────

export const useStudentAttendance = (courseSchedule?: string) => {
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!courseSchedule) { setAttendance([]); return; }
    setLoading(true);
    setError(null);

    const res = await api.getStudentAttendance(courseSchedule);
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setAttendance(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [courseSchedule]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { attendance, loading, error, refetch: fetchData };
};

// ── useAssessmentPlans ────────────────────────────────────────────────────────

export const useAssessmentPlans = () => {
  const [plans, setPlans] = useState<AssessmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAssessmentPlans().then(async (res) => {
      if (!res.ok) { setError(res.error); setLoading(false); return; }

      const raw: AssessmentPlan[] = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.data ?? [];

      const needsDetail = raw.some((p) => !p.student_group);
      if (!needsDetail) { setPlans(raw); setLoading(false); return; }

      const enriched = await Promise.all(
        raw.map(async (p) => {
          if (p.student_group) return p;
          const detail = await api.getAssessmentPlanDetail(p.name);
          if (!detail.ok) return p;
          const d = detail.data as AssessmentPlan;
          return {
            ...p,
            student_group: d.student_group,
            program: d.program,
            course: d.course,
          };
        })
      );
      setPlans(enriched);
      setLoading(false);
    });
  }, []);

  return { plans, loading, error };
};

// ── useAssessmentPlanDetail ───────────────────────────────────────────────────

export const useAssessmentPlanDetail = (planName: string | null) => {
  const [plan, setPlan] = useState<AssessmentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planName) { setPlan(null); return; }
    setLoading(true);
    api.getAssessmentPlanDetail(planName).then((res) => {
      if (res.ok) setPlan(res.data as AssessmentPlan);
      else setError(res.error);
      setLoading(false);
    });
  }, [planName]);

  return { plan, loading, error };
};

// ── useAssessmentResults ──────────────────────────────────────────────────────

export const useAssessmentResults = (planName?: string, groupName?: string) => {
  const [results, setResults] = useState<AssessmentResultRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!planName && !groupName) { setResults([]); return; }
    setLoading(true);
    setError(null);

    const res = await api.getAssessmentResults(planName, groupName);
    if (res.ok) {
      const raw = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setResults(raw);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [planName, groupName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { results, loading, error, refetch: fetchData };
};

// ── useQuickStats ─────────────────────────────────────────────────────────────
// FIX: instructorId ab api.getInstructorName() se aata hai (profile.name LA-XXXXX
// ko TA-XXXXX mein convert karta hai — established convention is project ka).
// Filtering ab is ID se hoti hai, naam string-match se nahi.
// NAYA: studentGroups count bhi return karta hai (Step 3 mein jo groups already
// fetch ho rahe thay unhi ka length — extra API call ki zaroorat nahi).

export const useQuickStats = () => {
  const [activeCourses, setActiveCourses] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [avgAttendance, setAvgAttendance] = useState<string>("—");
  const [studentGroups, setStudentGroups] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      // Step 1: Instructor ID lo (LA-XXXXX -> TA-XXXXX conversion already handled)
      const instructorId = await api.getInstructorName();

      console.log("[useQuickStats] instructorId =>", instructorId);

      if (!instructorId) {
        console.warn("[useQuickStats] instructorId empty — stats will not load");
        return;
      }

      // Step 2: Course Schedule se sirf is teacher ke unique courses count karo
      const schedRes = await api.getCourseSchedule(undefined);
      if (schedRes.ok) {
        const rows: any[] = Array.isArray(schedRes.data)
          ? schedRes.data
          : (schedRes.data as any)?.data ?? [];

        console.log("[useQuickStats] schedule rows =>", rows.length, rows[0]);

        const filtered = rows.filter((r: any) => r.instructor === instructorId);

        const uniqueCourses = new Set(
          filtered.map((r: any) => r.course).filter(Boolean)
        );

        console.log("[useQuickStats] filtered rows =>", filtered.length, "unique courses =>", uniqueCourses.size);
        setActiveCourses(uniqueCourses.size);
      }

      // Step 3: Teacher ke student groups nikalo, phir activeCount sum karo
      const groupsRes = await api.getStudentGroups(undefined, instructorId);
      if (groupsRes.ok) {
        const groups: any[] = Array.isArray(groupsRes.data)
          ? groupsRes.data
          : (groupsRes.data as any)?.data ?? [];

        console.log("[useQuickStats] student groups =>", groups.length);

        // NAYA: distinct student groups ka count — StatCard ke liye
        setStudentGroups(groups.length);

        let total = 0;
        await Promise.all(
          groups.map(async (g) => {
            const detail = await api.getStudentGroupDetail(g.name);
            if (detail.ok) {
              const studs: any[] = Array.isArray(detail.data?.students)
                ? detail.data.students
                : [];
              const activeCount = studs.filter((s) => s.active === 1).length;
              console.log(`[useQuickStats] group ${g.name} => active students: ${activeCount}`);
              total += activeCount;
            }
          })
        );

        console.log("[useQuickStats] totalStudents =>", total);
        setTotalStudents(total);
      }

      // Step 4: Avg Attendance this month
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const fromDate = `${year}-${month}-01`;
      const toDate = today.toISOString().slice(0, 10);

      const RESOURCE_URL =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
          ? "/api/resource"
          : "https://learnschool.online/api/resource";

      const token = localStorage.getItem("erpnext_auth_token");
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) {
        headers["Authorization"] = token.startsWith("token ")
          ? token
          : `token ${token}`;
      }

      const url = new URL(
        `${RESOURCE_URL}/Student%20Attendance`,
        window.location.origin
      );
      url.searchParams.set("fields", JSON.stringify(["status"]));
      url.searchParams.set(
        "filters",
        JSON.stringify([
          ["date", ">=", fromDate],
          ["date", "<=", toDate],
        ])
      );
      url.searchParams.set("limit_page_length", "1000");

      fetch(url.toString(), { credentials: "include", headers })
        .then((r) => r.json())
        .then((json) => {
          const records: any[] = Array.isArray(json.data) ? json.data : [];
          console.log("[useQuickStats] attendance records =>", records.length);
          if (!records.length) { setAvgAttendance("—"); return; }
          const present = records.filter(
            (r) => r.status?.toLowerCase() === "present"
          ).length;
          const pct = Math.round((present / records.length) * 100);
          console.log("[useQuickStats] avgAttendance =>", pct + "%");
          setAvgAttendance(`${pct}%`);
        })
        .catch((err) => {
          console.error("[useQuickStats] attendance fetch error =>", err);
          setAvgAttendance("—");
        });
    };

    load();
  }, []);

  return { activeCourses, totalStudents, avgAttendance, studentGroups };
};

// ── useTodaySchedule ──────────────────────────────────────────────────────────
// NAYA: FacultyPage ke "Today's Schedule" card ke liye. Aaj ke din ke course
// schedule entries (sirf is instructor ke) nikalta hai, aur har entry ke liye
// Student Attendance check karke attendanceMarked flag laga deta hai.

const formatTime = (raw?: string): string => {
  if (!raw) return "—";
  const [hStr, mStr] = raw.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? "0");
  if (Number.isNaN(h)) return raw;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const formatDuration = (fromRaw?: string, toRaw?: string): string => {
  if (!fromRaw || !toRaw) return "—";
  const toMinutes = (raw: string) => {
    const [h, m] = raw.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const diff = toMinutes(toRaw) - toMinutes(fromRaw);
  if (diff <= 0) return "—";
  if (diff < 60) return `${diff} min`;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

export const useTodaySchedule = () => {
  const [classes, setClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const instructorId = await api.getInstructorName();
    console.log("[useTodaySchedule] instructorId =>", instructorId);

    if (!instructorId) {
      setClasses([]);
      setLoading(false);
      return;
    }

    const res = await api.getCourseSchedule(undefined);
    if (!res.ok) {
      setError(res.error);
      setLoading(false);
      return;
    }

    const rows: ScheduleEntry[] = Array.isArray(res.data)
      ? res.data
      : (res.data as any)?.data ?? [];

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const todayRows = rows
      .filter((r) => r.instructor === instructorId && r.schedule_date === todayStr)
      .sort((a, b) => (a.from_time || "").localeCompare(b.from_time || ""));

    console.log("[useTodaySchedule] today's rows =>", todayRows.length);

    const withAttendance = await Promise.all(
      todayRows.map(async (r) => {
        const attRes = await api.getStudentAttendance(r.name);
        const marked = attRes.ok
          ? (Array.isArray(attRes.data) ? attRes.data : (attRes.data as any)?.data ?? []).length > 0
          : false;

        const cls: TodayClass = {
          id: r.name,
          course: r.course,
          studentGroup: r.student_group,
          room: r.room,
          startTime: formatTime(r.from_time),
          endTime: formatTime(r.to_time),
          duration: formatDuration(r.from_time, r.to_time),
          attendanceMarked: marked,
        };
        return cls;
      })
    );

    setClasses(withAttendance);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { classes, loading, error, refetch: fetchData };
};

// ── useAttendanceTrends ───────────────────────────────────────────────────────
// NAYA: FacultyPage dashboard charts ke liye — pichhle 7 din ka daily attendance
// trend, aur is mahine ka per-student-group attendance breakdown. Sirf isi
// teacher ke student groups ki attendance count hoti hai (myGroupNames filter).

export const useAttendanceTrends = () => {
  const [dailyTrend, setDailyTrend] = useState<DailyAttendancePoint[]>([]);
  const [groupBreakdown, setGroupBreakdown] = useState<GroupAttendancePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const instructorId = await api.getInstructorName();
    console.log("[useAttendanceTrends] instructorId =>", instructorId);

    if (!instructorId) {
      setDailyTrend([]);
      setGroupBreakdown([]);
      setLoading(false);
      return;
    }

    // Teacher ke apne student groups — attendance ko inhi tak restrict karne ke liye
    const groupsRes = await api.getStudentGroups(undefined, instructorId);
    const myGroups: any[] = groupsRes.ok
      ? (Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data as any)?.data ?? [])
      : [];
    const myGroupNames = new Set(myGroups.map((g) => g.name));

    if (myGroupNames.size === 0) {
      setDailyTrend([]);
      setGroupBreakdown([]);
      setLoading(false);
      return;
    }

    // Pichhle 7 din ki range (aaj sameet)
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const fromDate = from.toISOString().slice(0, 10);
    const toDate = today.toISOString().slice(0, 10);

    const RESOURCE_URL =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "/api/resource"
        : "https://learnschool.online/api/resource";

    const token = localStorage.getItem("erpnext_auth_token");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers["Authorization"] = token.startsWith("token ") ? token : `token ${token}`;
    }

    const url = new URL(`${RESOURCE_URL}/Student%20Attendance`, window.location.origin);
    url.searchParams.set("fields", JSON.stringify(["date", "status", "student_group"]));
    url.searchParams.set(
      "filters",
      JSON.stringify([
        ["date", ">=", fromDate],
        ["date", "<=", toDate],
      ])
    );
    url.searchParams.set("limit_page_length", "1000");

    try {
      const res = await fetch(url.toString(), { credentials: "include", headers });
      const json = await res.json();
      const records: any[] = Array.isArray(json.data) ? json.data : [];
      const mine = records.filter((r) => myGroupNames.has(r.student_group));

      console.log("[useAttendanceTrends] records =>", records.length, "mine =>", mine.length);

      
      const byDate = new Map<string, { present: number; total: number }>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(from);
        d.setDate(from.getDate() + i);
        byDate.set(d.toISOString().slice(0, 10), { present: 0, total: 0 });
      }
      mine.forEach((r) => {
        const bucket = byDate.get(r.date);
        if (!bucket) return;
        bucket.total += 1;
        if (r.status?.toLowerCase() === "present") bucket.present += 1;
      });

      const trend: DailyAttendancePoint[] = Array.from(byDate.entries()).map(([date, v]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        percentage: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));
      setDailyTrend(trend);

      // Per-group breakdown
      const byGroup = new Map<string, { present: number; total: number }>();
      mine.forEach((r) => {
        const bucket = byGroup.get(r.student_group) ?? { present: 0, total: 0 };
        bucket.total += 1;
        if (r.status?.toLowerCase() === "present") bucket.present += 1;
        byGroup.set(r.student_group, bucket);
      });

      const groupNameLookup = new Map(
        myGroups.map((g) => [g.name, g.student_group_name || g.name])
      );

      const breakdown: GroupAttendancePoint[] = Array.from(byGroup.entries()).map(([name, v]) => ({
        group: groupNameLookup.get(name) || name,
        percentage: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }));
      setGroupBreakdown(breakdown);
    } catch (err) {
      console.error("[useAttendanceTrends] fetch error =>", err);
      setError("Failed to load attendance trends");
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { dailyTrend, groupBreakdown, loading, error, refetch: fetchData };
};