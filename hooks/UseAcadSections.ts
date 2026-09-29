// hooks/UseAcadSections.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Student {
  name: string;
  student: string;
  student_name: string;
  group_roll_number: number;
  active: number;
  /** @internal true if the student's real ERP status is Active, regardless
   *  of whether Program Enrollment batch-matching kept them active in THIS
   *  particular section. Used only for orphan recovery — safe to ignore. */
  _statusActive?: boolean;
}

export interface Instructor {
  instructor: string;
  instructor_name: string;
  status?: string;
}

export interface Section {
  id: string;
  name: string;
  student_group_name: string;
  program: string;
  grade: number;
  academicYear: string;
  academicTerm: string;
  studentCount: number;
  maxStrength: number;
  occupancyPct: number;
  instructors: Instructor[];
  students: Student[];
  status: 'active' | 'inactive';
  creation: string;
  modified: string;
}

export interface SectionStats {
  totalSections: number;
  activeSections: number;
  inactiveSections: number;
  totalStudents: number;
  totalCapacity: number;
  avgOccupancy: number;
  totalInstructors: number;
  maxStudentCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;
const BATCH_SIZE = 500;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const extractGrade = (program: string): number => {
  const match = program.match(/Grade[-\s]?(\d+)/i);
  if (match?.[1]) return parseInt(match[1]);
  if (/kg1/i.test(program)) return 1;
  if (/kg2/i.test(program)) return 2;
  if (/kg3/i.test(program)) return 3;
  const lb = program.match(/(?:LB|FB)\s*Grade[-\s]?(\d+)/i);
  if (lb?.[1]) return parseInt(lb[1]);
  return 0;
};

async function fetchGroupDetail(groupName: string): Promise<any | null> {
  try {
    const result = await api.getAcadSectionDetail(groupName);
    if (!result.ok) return null;
    return result.data;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL STUDENT STATUS (source of truth) — same idea as Student Management page.
// A student can be "active: 1" inside a Student Group's child table row while
// their actual Student record is Inactive/Suspended/disabled — that row-level
// flag never gets synced automatically when status changes elsewhere. So we
// fetch the real ERP status for every student and use it to validate/override
// the section-level membership flag. This is what keeps Sections' counts
// identical to Student Management's counts, and keeps them correct after any
// add / update / delete / transfer.
// ─────────────────────────────────────────────────────────────────────────────

export type StudentStatusEntry = { status: string; enabled: number };
export type StudentStatusMap = Record<string, StudentStatusEntry>;

async function fetchAllPaginated(baseUrl: string, pageSize = 500): Promise<any[]> {
  const allRows: any[] = [];
  let start = 0;

  while (true) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}limit_page_length=${pageSize}&limit_start=${start}`;

    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!res.ok) break;

    const json = await res.json();
    const rows: any[] = json?.data ?? [];
    allRows.push(...rows);

    if (rows.length < pageSize) break;
    start += pageSize;
  }

  return allRows;
}

async function fetchStudentStatusMap(): Promise<StudentStatusMap> {
  try {
    const rows = await fetchAllPaginated(
      `/api/resource/Student?fields=["name","status","enabled"]`
    );
    const map: StudentStatusMap = {};
    for (const r of rows) {
      map[r.name] = { status: r.status, enabled: r.enabled };
    }
    return map;
  } catch {
    return {};
  }
}

/** A student is "really" active only if their ERP Student record confirms it.
 *  If we have no master data for some reason, we fall back to trusting the
 *  Student Group's own row-level flag rather than silently dropping the student. */
function isReallyActive(studentId: string, map: StudentStatusMap, fallback: boolean): boolean {
  const entry = map[studentId];
  if (!entry) return fallback;
  if (entry.enabled === 0) return false;
  if (entry.status && entry.status !== 'Active') return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM ENROLLMENT → each student's ONE authoritative current batch/section.
// A Student Group's embedded child-table row can go stale (a student never
// removed from an old section after being split into a new one), so several
// sections can simultaneously claim the same student as "active". Program
// Enrollment (submitted docs) is the actual ERP record of which batch a
// student currently belongs to — we use it to resolve those conflicts and
// only count the student in the ONE section whose `batch` matches.
// ─────────────────────────────────────────────────────────────────────────────

async function fetchStudentBatchMap(): Promise<Record<string, string>> {
  try {
    const rows = await fetchAllPaginated(
      `/api/resource/Program Enrollment?fields=["student","student_batch_name","docstatus","creation"]`
    );

    // Prefer a SUBMITTED (docstatus === 1) enrollment; among ties, the most
    // recently created one wins. This mirrors what ERPNext itself treats as
    // the student's current, valid enrollment.
    const best: Record<string, { batch: string; creation: string; docstatus: number }> = {};
    for (const r of rows) {
      if (!r.student || !r.student_batch_name) continue;
      const existing = best[r.student];
      const candidateScore = r.docstatus === 1 ? 1 : 0;

      if (!existing) {
        best[r.student] = { batch: r.student_batch_name, creation: r.creation, docstatus: r.docstatus };
        continue;
      }

      const existingScore = existing.docstatus === 1 ? 1 : 0;
      if (
        candidateScore > existingScore ||
        (candidateScore === existingScore && r.creation > existing.creation)
      ) {
        best[r.student] = { batch: r.student_batch_name, creation: r.creation, docstatus: r.docstatus };
      }
    }

    const map: Record<string, string> = {};
    for (const [student, v] of Object.entries(best)) map[student] = v.batch;
    return map;
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCURRENCY RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORM RAW ERP DATA → Section shape
// ─────────────────────────────────────────────────────────────────────────────

function transformSection(
  raw: any,
  statusMap: StudentStatusMap,
  studentBatchMap: Record<string, string>
): Section {
  const rawStudents: Student[] = raw.students ?? [];
  const sectionBatch: string | undefined = raw.batch || undefined;

  // ✅ A student's row only counts as active in THIS section if ALL of:
  //   1. The group membership row itself isn't marked inactive, AND
  //   2. The Student doctype confirms the student is currently Active/enabled, AND
  //   3. If we know their authoritative batch (from a submitted Program
  //      Enrollment) AND this section has a batch, they must match.
  //      (If we don't know their enrollment, or this section has no batch
  //      concept, we fall back to trusting the row — never silently drop
  //      a student we have no better information about.)
  const reconciledRows: Student[] = rawStudents.map((s) => {
    const rowSaysActive = s.active === 1;
    const statusOk = rowSaysActive && isReallyActive(s.student, statusMap, rowSaysActive);

    let batchOk = true;
    const enrolledBatch = studentBatchMap[s.student];
    if (statusOk && enrolledBatch && sectionBatch) {
      batchOk = enrolledBatch === sectionBatch;
    }

    return { ...s, active: statusOk && batchOk ? 1 : 0, _statusActive: statusOk };
  });

  // ✅ De-duplicate rows for the SAME student inside a SINGLE section.
  // This can happen when the add/transfer helpers race (double-click, retry,
  // or a partially-rolled-back transfer leaves two rows for one student in
  // the same Student Group). If ANY row for a student is active, treat the
  // student as active — but only keep ONE row for them in the final list.
  const byStudent = new Map<string, Student>();
  let duplicateRowsInSection = 0;
  for (const row of reconciledRows) {
    const key = row.student || row.name;
    const existing = byStudent.get(key);
    if (!existing) {
      byStudent.set(key, row);
    } else {
      duplicateRowsInSection++;
      // OR the active flags — if either row says active, the student counts.
      // Also OR _statusActive so orphan-recovery still works correctly.
      const mergedStatusActive = !!existing._statusActive || !!row._statusActive;
      if (row.active === 1 && existing.active !== 1) {
        byStudent.set(key, { ...row, _statusActive: mergedStatusActive });
      } else {
        byStudent.set(key, { ...existing, _statusActive: mergedStatusActive });
      }
    }
  }
  const reconciledStudents: Student[] = Array.from(byStudent.values());
  if (duplicateRowsInSection > 0) {
    console.warn(
      `⚠️ [Sections] "${raw.student_group_name || raw.name}" had ${duplicateRowsInSection} duplicate row(s) — merged.`
    );
  }

  const activeStudents = reconciledStudents.filter((s) => s.active === 1);
  const studentCount = activeStudents.length;

  const maxStrength = raw.max_strength || 0;
  const occupancyPct = maxStrength > 0 ? Math.round((studentCount / maxStrength) * 100) : 0;

  return {
    id: raw.name,
    name: raw.student_group_name || raw.name,
    student_group_name: raw.student_group_name || raw.name,
    program: raw.program || '',
    grade: extractGrade(raw.program || ''),
    academicYear: raw.academic_year || '',
    academicTerm: raw.academic_term || '',
    studentCount,
    maxStrength,
    occupancyPct,
    instructors: (raw.instructors ?? []).map((i: any) => ({
      instructor: i.instructor,
      instructor_name: i.instructor_name,
      status: i.status || 'Active',
    })),
    students: reconciledStudents,
    status: raw.disabled === 0 ? 'active' : 'inactive',
    creation: raw.creation || '',
    modified: raw.modified || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY NET: recover students who ended up active in ZERO sections purely
// because their Program Enrollment batch name didn't textually match any of
// their sections' `batch` field (e.g. naming inconsistencies like "KG1 AB"
// vs "KG1-AB"). Without this, a naming mismatch would silently DROP a
// genuinely active student from every count. We put them back in the first
// section they were found active in (by real ERP status), so we never lose
// a student outright — we only ever de-duplicate.
// ─────────────────────────────────────────────────────────────────────────────

function recoverOrphanedStudents(results: Section[]): Section[] {
  const activeSomewhere = new Set<string>();
  for (const sec of results) {
    for (const stu of sec.students) {
      if (stu.active === 1) activeSomewhere.add(stu.student);
    }
  }

  const recovered = new Set<string>();
  const updated = results.map((sec) => ({ ...sec, students: sec.students.map((s) => ({ ...s })) }));

  for (const sec of updated) {
    for (const stu of sec.students) {
      if (
        stu._statusActive &&
        stu.active !== 1 &&
        !activeSomewhere.has(stu.student) &&
        !recovered.has(stu.student)
      ) {
        stu.active = 1;
        recovered.add(stu.student);
      }
    }
  }

  if (recovered.size > 0) {
    for (const sec of updated) {
      const activeStudents = sec.students.filter((s) => s.active === 1);
      sec.studentCount = activeStudents.length;
      sec.occupancyPct = sec.maxStrength > 0 ? Math.round((sec.studentCount / sec.maxStrength) * 100) : 0;
    }
    console.warn(
      `⚠️ [Sections] ${recovered.size} student(s) had no Program Enrollment batch match in any of their sections (likely a naming mismatch) — kept active in their first listed section as a safe fallback.`
    );
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAcadSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [allInstructors, setAllInstructors] = useState<any[]>([]);

  const fetchedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  // Cache of the last-known real student status map + a quick "active count"
  // fingerprint so the poller can detect status changes even when no
  // Student Group document was touched.
  const statusMapRef = useRef<StudentStatusMap>({});
  const batchMapRef = useRef<Record<string, string>>({});
  const activeStudentFingerprintRef = useRef<string>('');

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH ALL INSTRUCTORS
  // ─────────────────────────────────────────────────────────────────────────
  const fetchAllInstructors = useCallback(async () => {
    try {
      const result = await api.getAllAcadInstructors({
        batchSize: BATCH_SIZE,
        includeInactive: true,
      });
      setAllInstructors(result || []);
      return result || [];
    } catch (err) {
      console.error('Failed to fetch instructors:', err);
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH SECTIONS - Gets ALL sections with their students (real-status verified)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSections = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setLoading(true);
    setError(null);

    try {
      // 1. Get ALL student groups from ERP
      const rawGroups = await api.getAllAcadStudentGroups({
        batchSize: BATCH_SIZE,
        includeInactive: true,
      });

      setLiveCount(rawGroups.length);

      // 2. Get ALL instructors + the REAL student status map + each student's
      //    authoritative batch (from Program Enrollment), in parallel
      const [instructors, statusMap, batchMap] = await Promise.all([
        fetchAllInstructors(),
        fetchStudentStatusMap(),
        fetchStudentBatchMap(),
      ]);
      statusMapRef.current = statusMap;
      batchMapRef.current = batchMap;

      if (rawGroups.length === 0) {
        setSections([]);
        if (!silent) setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // 3. Fetch FULL details for EACH section to get students
      const rawResults = await withConcurrency(rawGroups, 10, async (group: any) => {
        const detail = await fetchGroupDetail(group.name);

        if (detail) {
          return transformSection(detail, statusMap, batchMap);
        }

        return transformSection(
          {
            ...group,
            students: [],
            instructors: [],
          },
          statusMap,
          batchMap
        );
      });

      // Sort: grade asc, then name asc
      const results = recoverOrphanedStudents(rawResults);
      results.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.name.localeCompare(b.name);
      });

      setSections(results);

      // ── Diagnostics ──────────────────────────────────────────────────────
      const membership: Record<string, string[]> = {};
      let rawRowCount = 0;
      for (const section of results) {
        rawRowCount += section.students.length;
        for (const stu of section.students) {
          if (stu.active === 1) {
            (membership[stu.student] ??= []).push(section.name);
          }
        }
      }
      const uniqueActiveStudentIds = Object.keys(membership).filter(
        (id) => membership[id].length > 0
      );
      // Genuine unresolved conflicts: a student STILL active in >1 section
      // after Program Enrollment resolution — means either they have no
      // submitted Program Enrollment (so we couldn't judge), or none of
      // their duplicate sections' `batch` field matches their enrollment
      // (e.g. section has no `batch` set at all).
      const stillConflicted = Object.entries(membership).filter(([, secs]) => secs.length > 1);
      const resolvedByEnrollment = Object.keys(batchMap).length;

      console.log(
        `✅ [Sections] Total Students: ${uniqueActiveStudentIds.length} (raw rows: ${rawRowCount}, enrollment-matched: ${resolvedByEnrollment})`
      );
      if (stillConflicted.length > 0) {
        console.warn(
          `⚠️ [Sections] ${stillConflicted.length} student(s) could not be auto-resolved to a single section (no submitted Program Enrollment or no batch set on their sections).`
        );
      }

      // Fingerprint = unique active students across all sections + how many
      // students are currently marked active in ERP overall. Used by the
      // poller to detect status-only changes cheaply.
      const totalActiveInErp = Object.values(statusMap).filter(
        (e) => e.enabled !== 0 && (!e.status || e.status === 'Active')
      ).length;
      activeStudentFingerprintRef.current = `${uniqueActiveStudentIds.length}:${totalActiveInErp}`;

      setLastSynced(new Date());
      if (!silent) setLoading(false);
    } catch (err) {
      console.error('fetchSections error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch sections';
      setError(msg);
      if (!silent) toast.error(msg);
      if (!silent) setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchAllInstructors]);

  // ─────────────────────────────────────────────────────────────────────────
  // POLLING - Check for changes every 30s
  // Now also detects real Student status changes (Active/Inactive/Suspended
  // toggles, enable/disable) even when no Student Group document changed —
  // this is what was previously making Sections' counts go stale after a
  // status change made from the Students page.
  // ─────────────────────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      if (isFetchingRef.current) return;

      try {
        // 1a. Cheap check: has the real active-student count in ERP changed?
        const freshStatusMap = await fetchStudentStatusMap();
        const totalActiveInErp = Object.values(freshStatusMap).filter(
          (e) => e.enabled !== 0 && (!e.status || e.status === 'Active')
        ).length;

        // 1b. Cheap check: has the Student Group list changed?
        const result = await api.getAcadSections({ limit: 999999 });
        if (!result.ok) return;

        const lightRows = result.data || [];
        const newCount = lightRows.length;
        setLiveCount(newCount);

        setSections(prev => {
          const uniqueIds = new Set<string>();
          for (const s of prev) {
            for (const stu of s.students) {
              if (stu.active === 1) uniqueIds.add(stu.student);
            }
          }
          const fingerprint = `${uniqueIds.size}:${totalActiveInErp}`;
          const statusChanged = fingerprint !== activeStudentFingerprintRef.current;

          if (newCount !== prev.length) {
            const diff = newCount - prev.length;
            const msg = diff > 0
              ? `+${diff} section(s) added in ERP`
              : `${Math.abs(diff)} section(s) removed in ERP`;
            toast(msg, { icon: '🔄', duration: 4000 });
            setTimeout(() => fetchSections(true), 500);
            return prev;
          }

          const prevMap: Record<string, string> = {};
          for (const s of prev) prevMap[s.id] = s.modified;

          const anyGroupChanged = lightRows.some(
            (r: any) => prevMap[r.name] && r.modified !== prevMap[r.name]
          );

          if (anyGroupChanged || statusChanged) {
            if (statusChanged && !anyGroupChanged) {
              toast('Student status updated — refreshing section counts…', { icon: '🔄', duration: 3000 });
            } else {
              toast('Sections updated in ERP — refreshing…', { icon: '🔄', duration: 3000 });
            }
            setTimeout(() => fetchSections(true), 500);
            return prev;
          }

          let changed = false;
          const updated = prev.map(s => {
            const fresh = lightRows.find((r: any) => r.name === s.id);
            if (!fresh) return s;
            const newStatus: 'active' | 'inactive' = fresh.disabled === 0 ? 'active' : 'inactive';
            if (newStatus !== s.status) {
              changed = true;
              return { ...s, status: newStatus };
            }
            return s;
          });

          setLastSynced(new Date());
          return changed ? updated : prev;
        });
      } catch {
        // Silently ignore poll errors
      }
    }, POLL_INTERVAL_MS);
  }, [fetchSections]);

  // Mount
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSections(false).then(() => startPolling());
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchSections, startPolling]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH SINGLE SECTION DETAIL (also reconciled against real student status)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSectionDetails = useCallback(async (sectionName: string): Promise<Section | null> => {
    setSectionLoading(true);
    try {
      const detail = await fetchGroupDetail(sectionName);
      if (!detail) {
        toast.error('Failed to load section details');
        return null;
      }
      // Use cached maps if we have them; otherwise fetch fresh so a
      // single-section view is never less accurate than the list view.
      const statusMap = Object.keys(statusMapRef.current).length > 0
        ? statusMapRef.current
        : await fetchStudentStatusMap();
      const batchMap = Object.keys(batchMapRef.current).length > 0
        ? batchMapRef.current
        : await fetchStudentBatchMap();

      const section = transformSection(detail, statusMap, batchMap);
      setSelectedSection(section);

      // Keep the section in the main list in sync with this fresher read
      setSections(prev => prev.map(s => (s.id === section.id ? section : s)));

      return section;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load section details';
      toast.error(msg);
      return null;
    } finally {
      setSectionLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ✅ STATS - COMPUTED FROM SECTIONS DATA (like Student Management)
  // ─────────────────────────────────────────────────────────────────────────
  const getStats = useCallback((): SectionStats => {
    if (sections.length === 0) {
      return {
        totalSections: 0,
        activeSections: 0,
        inactiveSections: 0,
        totalStudents: 0,
        totalCapacity: 0,
        avgOccupancy: 0,
        totalInstructors: 0,
        maxStudentCount: 0,
      };
    }

    // ✅ Calculate totals from sections data
    let totalCapacity = 0;
    let activeSections = 0;
    let inactiveSections = 0;
    let maxStudentCount = 0;

    // ✅ Total Students = UNIQUE active students across all sections, not a
    // naive sum of per-section counts. A naive sum double-counts any student
    // who (due to an incomplete transfer, etc.) ended up marked active in
    // more than one section at the same time.
    const uniqueActiveStudentIds = new Set<string>();

    // Loop through all sections (like in Student Management)
    for (const section of sections) {
      for (const stu of section.students) {
        if (stu.active === 1) uniqueActiveStudentIds.add(stu.student);
      }

      // Add capacity
      totalCapacity += section.maxStrength;

      // Count active/inactive
      if (section.status === 'active') {
        activeSections++;
      } else {
        inactiveSections++;
      }

      // Track max student count
      if (section.studentCount > maxStudentCount) {
        maxStudentCount = section.studentCount;
      }
    }

    const totalStudents = uniqueActiveStudentIds.size;

    // Calculate average occupancy
    let avgOccupancy: number;
    if (totalCapacity > 0) {
      avgOccupancy = Math.round((totalStudents / totalCapacity) * 100);
    } else if (maxStudentCount > 0) {
      let sumPct = 0;
      for (const section of sections) {
        if (section.maxStrength > 0) {
          sumPct += (section.studentCount / section.maxStrength) * 100;
        } else {
          sumPct += (section.studentCount / maxStudentCount) * 100;
        }
      }
      avgOccupancy = Math.round(sumPct / sections.length);
    } else {
      avgOccupancy = 0;
    }

    // Total instructors from allInstructors state
    const totalInstructors = allInstructors.length;

    return {
      totalSections: sections.length,
      activeSections,
      inactiveSections,
      totalStudents, // ✅ Sum of REAL active students from all sections
      totalCapacity,
      avgOccupancy,
      totalInstructors,
      maxStudentCount,
    };
  }, [sections, allInstructors]);

  // ─────────────────────────────────────────────────────────────────────────
  // GET SECTIONS BY GRADE
  // ─────────────────────────────────────────────────────────────────────────
  const getSectionsByGrade = useCallback((grade: string): Section[] => {
    return sections.filter(s => s.grade === parseInt(grade) || s.program === grade);
  }, [sections]);

  // ─────────────────────────────────────────────────────────────────────────
  // MANUAL REFRESH
  // ─────────────────────────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    setSections([]);
    fetchSections(false).then(() => startPolling());
  }, [fetchSections, startPolling]);

  return {
    sections,
    loading,
    error,
    selectedSection,
    sectionLoading,
    lastSynced,
    liveCount,
    allInstructors,
    fetchSections: refetch,
    fetchSectionDetails,
    getStats,
    getSectionsByGrade,
    setSelectedSection,
  };
}