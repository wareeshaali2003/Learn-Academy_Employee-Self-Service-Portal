// hooks/UseAcademicDashboard.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAcadAttendance, AttendanceRecord } from './UseAcadAttendance';
import { useAcadAssessment } from './UseAcadAssessment';
import { useAcadMeetLinks, isValidMeetUrl } from './UseAcadMeetLinks';

export interface AttendanceDashboardCards {
  overallPct: number;
  trendPts: number;
  below75Count: number;
  scheduledToday: number;
  unmarkedToday: number;
  chronicAbsentees: number;
  referenceDate: string;  // the actual date these "today" numbers reflect
  isToday: boolean;       // false when we fell back to the most recent day with data
}

export interface AssessmentDashboardCards {
  avg: number;
  passRate: number;
  atRisk: number;
  pending: number;
}

export interface OperationalDashboardCards {
  classesTotal: number;       // total classes scheduled on the reference day
  classesHeld: number;        // reference day's classes with valid meet link + instructor
  ghostClasses: number;       // reference day's classes missing link or instructor
  teacherCompliance: number;  // % of reference day's classes properly staffed+linked
  activeEnrollments: number;
  totalEnrollments: number;
  referenceDate: string;      // the actual date these numbers reflect
  isToday: boolean;           // false when we fell back to the most recent day with data
}

const EMPTY_ATT: AttendanceDashboardCards = {
  overallPct: 0, trendPts: 0, below75Count: 0,
  scheduledToday: 0, unmarkedToday: 0, chronicAbsentees: 0,
  referenceDate: '', isToday: true,
};

const EMPTY_ASS: AssessmentDashboardCards = {
  avg: 0, passRate: 0, atRisk: 0, pending: 0,
};

// LOCAL date (not UTC) — avoids "today" being off by a day near midnight
// in timezones ahead of UTC (e.g. Pakistan, UTC+5).
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const POLL_INTERVAL_MS = 30_000;

function computeStudentSummary(records: AttendanceRecord[]) {
  const byStudent = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    if (!r.student) continue;
    if (!byStudent.has(r.student)) byStudent.set(r.student, []);
    byStudent.get(r.student)!.push(r);
  }
  const result: { student: string; overall: number; consecAbsences: number }[] = [];
  byStudent.forEach((recs, student) => {
    const total = recs.length;
    const present = recs.filter(r => r.status === 'Present').length;
    const overall = total ? Math.round((present / total) * 100) : 0;
    const desc = [...recs].sort((a, b) => b.date.localeCompare(a.date));
    let consec = 0;
    for (const r of desc) {
      if (r.status === 'Absent') consec++;
      else break;
    }
    result.push({ student, overall, consecAbsences: consec });
  });
  return result;
}

export function useAcademicDashboard() {
  // ── Attendance ──────────────────────────────────────────
  const { fetchAttendance } = useAcadAttendance();

  const [attendance, setAttendance] = useState<AttendanceDashboardCards>(EMPTY_ATT);
  const [attLoading, setAttLoading] = useState(true);
  const [attSyncing, setAttSyncing] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const mountFetchedRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const isFetchingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Assessment ──────────────────────────────────────────
  const {
    results,
    loading: assLoading,
    error: assError,
    fetchResults,
    fetchPlans,
    getLocalStats,
  } = useAcadAssessment();

  const [assessment, setAssessment] = useState<AssessmentDashboardCards>(EMPTY_ASS);
  const [assFetched, setAssFetched] = useState(false);

  // ── Operational (powered by the REAL useAcadMeetLinks hook) ─────
  const {
    meetLinks,
    loading: meetLoading,
    error: meetError,
    fetchMeetLinks,
  } = useAcadMeetLinks();

  const [activeEnrollments, setActiveEnrollments] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [enrollLoading, setEnrollLoading] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const hasLoadedEnrollOnceRef = useRef(false);

  // ── Fetch Attendance ────────────────────────────────────
  const fetchAttendanceCards = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) setAttLoading(true);
    else setAttSyncing(true);
    setAttError(null);

    try {
      const today = new Date();
      const todayStr = fmtDate(today);
      const lastMonthStart = fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const lastMonthEnd   = fmtDate(new Date(today.getFullYear(), today.getMonth(), 0));
      const thisMonthStart = fmtDate(new Date(today.getFullYear(), today.getMonth(), 1));

      const records = await fetchAttendance({ from_date: lastMonthStart, to_date: todayStr });

      const pctOf = (recs: AttendanceRecord[]) =>
        recs.length ? Math.round((recs.filter(r => r.status === 'Present').length / recs.length) * 100) : 0;

      const thisMonthRecords = records.filter(r => r.date >= thisMonthStart && r.date <= todayStr);
      const lastMonthRecords = records.filter(r => r.date >= lastMonthStart && r.date <= lastMonthEnd);
      const overallPct   = pctOf(thisMonthRecords);
      const lastMonthPct = pctOf(lastMonthRecords);
      const trendPts = Math.round((overallPct - lastMonthPct) * 10) / 10;

      const summary = computeStudentSummary(records);
      const below75Count     = summary.filter(s => s.overall < 75).length;
      const chronicAbsentees = summary.filter(s => s.consecAbsences >= 3).length;

      // ── Scheduled/unmarked — with fallback to most recent day WITH data ──
      // If today's real calendar date has zero Course Schedule entries
      // (common with demo/historical data), silently reporting "0 of 0 —
      // all marked 🎉" is misleading. Instead, look across the same window
      // already fetched (lastMonthStart → today) for the MOST RECENT date
      // that actually has schedules, and report against that day instead —
      // with the UI clearly labeling it as "not today" so it's never confused
      // with a genuine "all caught up today" result.
      let scheduledToday = 0;
      let unmarkedToday  = 0;
      let referenceDate  = todayStr;
      let isToday = true;
      try {
        const params = new URLSearchParams();
        params.set('fields', JSON.stringify(['name', 'schedule_date', 'docstatus']));
        params.set('filters', JSON.stringify([
          ['Course Schedule', 'schedule_date', '>=', lastMonthStart],
          ['Course Schedule', 'schedule_date', '<=', todayStr],
        ]));
        params.set('limit_page_length', '2000');
        params.set('order_by', 'schedule_date desc');
        const res = await fetch(`/api/resource/Course%20Schedule?${params}`, {
          credentials: 'include',
          headers: { 'Expect': '' },
        });
        if (res.ok) {
          const d = await res.json();
          const rows: any[] = (d.data || []).filter((s: any) => s.docstatus === undefined || s.docstatus !== 2);

          if (rows.length) {
            referenceDate = rows.reduce((max: string, r: any) => (r.schedule_date > max ? r.schedule_date : max), rows[0].schedule_date);
            isToday = referenceDate === todayStr;

            const schedulesOnRef = rows.filter(r => r.schedule_date === referenceDate).map(r => r.name);
            scheduledToday = schedulesOnRef.length;

            const markedOnRef = new Set(
              records.filter(r => r.date === referenceDate && r.course_schedule).map(r => r.course_schedule)
            );
            unmarkedToday = schedulesOnRef.filter(s => !markedOnRef.has(s)).length;
          } else {
            // Genuinely no schedule data anywhere in the window — not a "0 of 0, all good" win.
            scheduledToday = 0;
            unmarkedToday = 0;
            referenceDate = todayStr;
            isToday = true;
          }
        } else {
          console.warn('[Dashboard] Course Schedule fetch failed:', res.status);
        }
      } catch (schedErr) {
        console.warn('[Dashboard] Course Schedule fetch errored:', schedErr);
      }

      setAttendance({ overallPct, trendPts, below75Count, scheduledToday, unmarkedToday, chronicAbsentees, referenceDate, isToday });
      hasLoadedOnceRef.current = true;
      setLastSynced(new Date());
    } catch (err) {
      setAttError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      isFetchingRef.current = false;
      if (isFirstLoad) setAttLoading(false);
      else setAttSyncing(false);
    }
  }, [fetchAttendance]);

  // ── Fetch Assessment Summary ────────────────────────────
  const fetchAssessmentSummary = useCallback(async () => {
    try {
      const plansList = await fetchPlans({});
      if (!plansList || plansList.length === 0) {
        setAssessment(EMPTY_ASS);
        setAssFetched(true);
        return;
      }

      const defaultPlan = plansList[0];
      await fetchResults({ assessment_plan: defaultPlan.name });
      setAssFetched(true);
    } catch (err) {
      console.error('[Dashboard] Assessment summary fetch failed:', err);
      setAssFetched(true);
    }
  }, [fetchPlans, fetchResults]);

  // ── Fetch Enrolments — FIXED ─────────────────────────────
  // Two separate bugs fixed here:
  // 1) "status" is not a real field on stock ERPNext "Program Enrollment" —
  //    only "docstatus" (0=Draft, 1=Submitted, 2=Cancelled) exists.
  // 2) 417 Expectation Failed — some Frappe dev setups / proxies choke on
  //    the browser's automatic "Expect: 100-continue" header for requests
  //    with long encoded query strings. Sending an explicit empty "Expect"
  //    header (same fix already used for the Students module's status
  //    update calls) avoids this.
  const fetchEnrollmentCards = useCallback(async () => {
    const isFirstLoad = !hasLoadedEnrollOnceRef.current;
    if (isFirstLoad) setEnrollLoading(true);
    setEnrollError(null);
    try {
      const params = new URLSearchParams();
      params.set('fields', JSON.stringify(['name', 'docstatus']));
      params.set('limit_page_length', '1000');
      const res = await fetch(`/api/resource/Program%20Enrollment?${params}`, {
        credentials: 'include',
        headers: { 'Expect': '' },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Program Enrollment fetch failed (${res.status}): ${errText.slice(0, 200)}`);
      }
      const d = await res.json();
      const list: any[] = d.data || [];
      const notCancelled = list.filter(e => e.docstatus !== 2);
      setTotalEnrollments(notCancelled.length);
      setActiveEnrollments(list.filter(e => e.docstatus === 1).length);
      hasLoadedEnrollOnceRef.current = true;
    } catch (err) {
      console.error('[Dashboard] Enrollment fetch error:', err);
      setEnrollError(err instanceof Error ? err.message : 'Failed to load enrolments');
    } finally {
      if (isFirstLoad) setEnrollLoading(false);
    }
  }, []);

  // ── Initial fetches ──────────────────────────────────────
  useEffect(() => {
    if (mountFetchedRef.current) return;
    mountFetchedRef.current = true;
    fetchAttendanceCards();
    fetchAssessmentSummary();
    fetchEnrollmentCards();
    // meetLinks already auto-fetches on mount inside useAcadMeetLinks
  }, [fetchAttendanceCards, fetchAssessmentSummary, fetchEnrollmentCards]);

  // ── Polling ──────────────────────────────────────────────
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      fetchAttendanceCards();
      fetchMeetLinks();
      fetchEnrollmentCards();
    }, POLL_INTERVAL_MS);
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [fetchAttendanceCards, fetchMeetLinks, fetchEnrollmentCards]);

  // ── Refetch on focus/visibility ─────────────────────────
  useEffect(() => {
    const onFocus = () => {
      fetchAttendanceCards();
      fetchAssessmentSummary();
      fetchMeetLinks();
      fetchEnrollmentCards();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAttendanceCards();
        fetchAssessmentSummary();
        fetchMeetLinks();
        fetchEnrollmentCards();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchAttendanceCards, fetchAssessmentSummary, fetchMeetLinks, fetchEnrollmentCards]);

  // ── Compute assessment stats when results change ────────
  useEffect(() => {
    if (!assFetched) return;
    const stats = getLocalStats(results);
    setAssessment({
      avg: stats.avg,
      passRate: stats.passRate,
      atRisk: stats.atRisk,
      pending: stats.pending,
    });
  }, [results, getLocalStats, assFetched]);

  // ── Compute Operational cards from REAL meetLinks data ──
  const operational: OperationalDashboardCards = useMemo(() => {
    const todayStr = fmtDate(new Date());

    // Same fallback principle as Attendance: if today's real calendar date
    // has no meet-link/schedule entries at all, don't report a false
    // "0 of 0 — all good" — fall back to the most recent day that actually
    // has data, and let the UI label it clearly as not-today.
    const datesPresent = Array.from(new Set(meetLinks.map(l => l.schedule_date).filter(Boolean))).sort();
    const hasToday = datesPresent.includes(todayStr);
    const referenceDate = hasToday
      ? todayStr
      : (datesPresent.length ? datesPresent[datesPresent.length - 1] : todayStr);
    const isToday = referenceDate === todayStr && hasToday;

    const refLinks = meetLinks.filter(l => l.schedule_date === referenceDate);

    const classesTotal = refLinks.length;
    const classesHeld = refLinks.filter(
      l => l.instructor && l.url && isValidMeetUrl(l.url)
    ).length;
    const ghostClasses = classesTotal - classesHeld;
    const teacherCompliance = classesTotal
      ? Math.round((classesHeld / classesTotal) * 100)
      : 0;

    return {
      classesTotal,
      classesHeld,
      ghostClasses,
      teacherCompliance,
      activeEnrollments,
      totalEnrollments,
      referenceDate,
      isToday,
    };
  }, [meetLinks, activeEnrollments, totalEnrollments]);

  const opsLoading = meetLoading || enrollLoading;
  const opsError = meetError || enrollError;

  const refetch = useCallback(() => {
    fetchAttendanceCards();
    fetchAssessmentSummary();
    fetchMeetLinks();
    fetchEnrollmentCards();
  }, [fetchAttendanceCards, fetchAssessmentSummary, fetchMeetLinks, fetchEnrollmentCards]);

  return {
    attendance,
    attLoading,
    attSyncing,
    attError,
    lastSynced,
    assessment,
    assLoading: assLoading || !assFetched,
    assError,
    operational,
    opsLoading,
    opsSyncing: false,
    opsError,
    refetch,
  };
}