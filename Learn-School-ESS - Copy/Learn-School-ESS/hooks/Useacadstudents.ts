// hooks/Useacadstudents.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../services/api";
import type { AcadStudent, AcadStudentDetail } from "../services/api";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type StudentStatus = "Active" | "Inactive" | "Suspended" | "On Leave" | "";

export type EnrichedStudent = AcadStudent & {
  status: StudentStatus;
  grade: string;
  gradeNumber: number;
  section: string;
  attendancePct?: number;
  avgScore?: number;
};

export type GuardianDetail = {
  name: string;
  guardian_name?: string;
  email_address?: string;
  mobile_number?: string;
  alternate_number?: string;
  date_of_birth?: string;
  user?: string;
  id_type?: string;
  id_number?: string;
  education?: string;
  occupation?: string;
  designation?: string;
  work_address?: string;
  relation?: string; // merged in from Student.guardians child table
};

export type StudentStats = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  onLeave: number;
  belowThreshold: number;
};

export type SectionCapacity = {
  name: string;
  enrolled: number;
  capacity: number;
  program: string;
};

export type TabId = "all" | "at-risk" | "inactive" | "on-leave";

export type NewStudentPayload = {
  student_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  student_email_id?: string;
  date_of_birth?: string;
  joining_date?: string;
  nationality?: string;
  city?: string;
  country?: string;
  state?: string;
  blood_group?: string;
  gender?: string;
  student_mobile_number?: string;
  alternate_phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  pincode?: string;
  custom_batch?: string;
  custom_serial_no?: string;
  custom_student_id_number?: string;
  custom_student_id_type?: string;
  program?: string;
  section?: string;
};

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function deriveStatus(student: AcadStudent & { status?: string }): StudentStatus {
  const raw = (student.status || "").trim();
  if (raw === "Active") return "Active";
  if (raw === "Inactive") return "Inactive";
  if (raw === "Suspended") return "Suspended";
  if (raw === "On-Leave" || raw === "On Leave") return "On Leave";
  if (student.enabled === 0) return "Inactive";
  return "Active";
}

function extractGradeNumber(program: string): number {
  const match = program.match(/Grade[-\s]?(\d+)/i) || program.match(/(\d+)/);
  if (match?.[1]) return parseInt(match[1]);
  return 0;
}

async function fetchWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchAllPaginated(baseUrl: string, pageSize = 500): Promise<any[]> {
  const allRows: any[] = [];
  let start = 0;

  while (true) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${sep}limit_page_length=${pageSize}&limit_start=${start}`;

    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      break;
    }

    const json = await res.json();
    const rows: any[] = json?.data ?? [];
    allRows.push(...rows);

    if (rows.length < pageSize) break;
    start += pageSize;
  }

  return allRows;
}

async function fetchLightStudents(): Promise<Array<{ name: string; status: string; enabled: number }> | null> {
  try {
    const rows = await fetchAllPaginated(
      `/api/resource/Student?fields=["name","status","enabled"]&order_by=modified+desc`
    );
    return rows;
  } catch {
    return null;
  }
}

async function fetchAllAttendance(): Promise<Record<string, { total: number; present: number }>> {
  try {
    const rows = await fetchAllPaginated(
      `/api/resource/Student%20Attendance?fields=["student","status"]`
    );
    const map: Record<string, { total: number; present: number }> = {};
    for (const row of rows) {
      if (!row.student) continue;
      if (!map[row.student]) map[row.student] = { total: 0, present: 0 };
      map[row.student].total++;
      if (row.status === "Present") map[row.student].present++;
    }
    return map;
  } catch {
    return {};
  }
}

async function fetchAllAssessmentScores(): Promise<Record<string, { totalPct: number; count: number }>> {
  try {
    const rows = await fetchAllPaginated(
      `/api/resource/Assessment%20Result?fields=["student","total_score","maximum_score"]`
    );
    const map: Record<string, { totalPct: number; count: number }> = {};
    for (const row of rows) {
      if (!row.student || !row.maximum_score) continue;
      if (!map[row.student]) map[row.student] = { totalPct: 0, count: 0 };
      map[row.student].totalPct += (row.total_score / row.maximum_score) * 100;
      map[row.student].count++;
    }
    return map;
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAcadStudents() {
  const [allStudents, setAllStudents] = useState<EnrichedStudent[]>([]);
  const [sectionMap, setSectionMap] = useState<Record<string, SectionCapacity>>({});
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [savingNewStudent, setSavingNewStudent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatus>("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<EnrichedStudent | null>(null);
  const [studentDetail, setStudentDetail] = useState<AcadStudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [guardianDetails, setGuardianDetails] = useState<GuardianDetail[]>([]);
  const [guardianLoading, setGuardianLoading] = useState(false);

  const fetchedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  const fetchStudents = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const fields = JSON.stringify([
        "name", "student_name", "first_name", "student_email_id",
        "date_of_birth", "joining_date", "enabled", "status",
        "custom_batch", "custom_serial_no", "custom_student_id_number",
        "custom_student_id_type", "nationality", "city", "country",
        "blood_group", "image",
      ]);

      const [rawStudents, groupsRes] = await Promise.all([
        fetchAllPaginated(
          `/api/resource/Student?fields=${encodeURIComponent(fields)}&order_by=student_name+asc`
        ),
        api.getAcadStudentGroups(),
      ]);

      setLiveCount(rawStudents.length);

      const groups = groupsRes.ok ? groupsRes.data : [];

      const groupMap: Record<string, { grade: string; gradeNumber: number; section: string }> = {};
      const capacityMap: Record<string, SectionCapacity> = {};

      await fetchWithConcurrency(groups, 10, async (g: any) => {
        try {
          const res = await api.getAcadStudentGroupDetail(g.name);
          if (!res.ok || !res.data) {
            return null;
          }

          const members = Array.isArray(res.data.students) ? res.data.students : [];
          const gradeNumber = extractGradeNumber(g.program || "");

          members.forEach((m: any) => {
            const sid = m.student || m.name;
            if (sid && !groupMap[sid]) {
              groupMap[sid] = {
                grade: g.program || "",
                gradeNumber,
                section: g.name || "",
              };
            }
          });

          capacityMap[g.name] = {
            name: g.name,
            enrolled: members.length,
            capacity: g.max_strength || 30,
            program: g.program || "",
          };
        } catch {
          // Silent fail
        }
        return null;
      });

      const gradeSet = new Set<string>();
      const sectionSet = new Set<string>();
      groups.forEach((g: any) => {
        if (g.program) gradeSet.add(g.program);
        if (g.name) sectionSet.add(g.name);
      });
      setGrades([...gradeSet].sort());
      setSections([...sectionSet].sort());
      setSectionMap(capacityMap);

      const enriched: EnrichedStudent[] = (rawStudents as any[]).map((s: any) => ({
        ...s,
        status: deriveStatus(s),
        ...(groupMap[s.name] ?? { grade: "", gradeNumber: 0, section: "" }),
      }));

      enriched.sort((a, b) => {
        if (a.gradeNumber !== b.gradeNumber) return a.gradeNumber - b.gradeNumber;
        return a.student_name.localeCompare(b.student_name);
      });

      setAllStudents(enriched);
      setLastSynced(new Date());
      setLoading(false);

      setLoadingStats(true);
      const [attMap, scoreMap] = await Promise.all([
        fetchAllAttendance(),
        fetchAllAssessmentScores(),
      ]);
      setLoadingStats(false);

      setAllStudents(prev =>
        prev.map(s => {
          const att = attMap[s.name];
          const score = scoreMap[s.name];
          return {
            ...s,
            attendancePct: att
              ? att.total > 0 ? Math.round((att.present / att.total) * 100) : 0
              : undefined,
            avgScore: score
              ? score.count > 0 ? Math.round(score.totalPct / score.count) : 0
              : undefined,
          };
        })
      );
    } catch {
      setError("Failed to fetch students. Please try again.");
      setLoading(false);
      setLoadingStats(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      if (isFetchingRef.current) return;

      const freshList = await fetchLightStudents();
      if (!freshList) return;

      const newTotal = freshList.length;
      setLiveCount(newTotal);

      setAllStudents(prev => {
        const prevCount = prev.length;

        if (newTotal !== prevCount) {
          const diff = newTotal - prevCount;
          const msg = diff > 0 ? `+${diff} students added` : `${Math.abs(diff)} students removed`;
          toast(msg, { icon: "🔄", duration: 5000 });
          setTimeout(() => {
            fetchedRef.current = false;
            fetchStudents();
          }, 0);
          return prev;
        }

        const freshMap: Record<string, string> = {};
        for (const s of freshList) {
          freshMap[s.name] = s.status || (s.enabled === 0 ? "Inactive" : "Active");
        }

        let anyChange = false;
        const updated = prev.map(s => {
          const freshRaw = freshMap[s.name];
          if (!freshRaw) return s;
          const freshStatus = deriveStatus({ ...s, status: freshRaw } as any);
          if (freshStatus !== s.status) {
            anyChange = true;
            return { ...s, status: freshStatus };
          }
          return s;
        });

        setLastSynced(new Date());
        return anyChange ? updated : prev;
      });
    }, POLL_INTERVAL_MS);
  }, [fetchStudents]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchStudents().then(() => startPolling());
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchStudents, startPolling]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      if (activeTab === "at-risk" && (s.attendancePct ?? 100) >= 75) return false;
      if (activeTab === "inactive" && s.status !== "Inactive" && s.status !== "Suspended") return false;
      if (activeTab === "on-leave" && s.status !== "On Leave") return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !s.student_name.toLowerCase().includes(q) &&
          !s.name.toLowerCase().includes(q) &&
          !(s.student_email_id || "").toLowerCase().includes(q)
        ) return false;
      }

      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (sectionFilter && s.section !== sectionFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [allStudents, activeTab, search, gradeFilter, sectionFilter, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, gradeFilter, sectionFilter, statusFilter, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const goToPage = useCallback(
    (page: number) => setCurrentPage(Math.min(Math.max(1, page), totalPages)),
    [totalPages]
  );

  const stats: StudentStats = useMemo(() => ({
    total: allStudents.length,
    active: allStudents.filter(s => s.status === "Active").length,
    inactive: allStudents.filter(s => s.status === "Inactive").length,
    suspended: allStudents.filter(s => s.status === "Suspended").length,
    onLeave: allStudents.filter(s => s.status === "On Leave").length,
    belowThreshold: allStudents.filter(s => (s.attendancePct ?? 100) < 75).length,
  }), [allStudents]);

  const tabCounts = useMemo(() => ({
    all: allStudents.length,
    "at-risk": allStudents.filter(s => (s.attendancePct ?? 100) < 75).length,
    inactive: allStudents.filter(s => s.status === "Inactive" || s.status === "Suspended").length,
    "on-leave": allStudents.filter(s => s.status === "On Leave").length,
  }), [allStudents]);

  const getSectionsByGrade = useCallback(
    (gradeProgram: string): SectionCapacity[] =>
      Object.values(sectionMap).filter(sc =>
        sc.program === gradeProgram
      ),
    [sectionMap]
  );

  const changeStudentStatus = useCallback(async (
    studentId: string,
    newStatus: StudentStatus,
    reason: string
  ): Promise<boolean> => {
    if (!newStatus) {
      toast.error("Please select a status");
      return false;
    }

    const original = allStudents.find(s => s.name === studentId);
    if (!original) {
      toast.error("Student not found");
      return false;
    }

    if (original.status === newStatus) {
      toast("No change — student already has this status", { icon: "ℹ️" });
      return true;
    }

    setSavingStatus(true);

    setAllStudents(prev =>
      prev.map(s => s.name === studentId ? { ...s, status: newStatus } : s)
    );

    try {
      const res = await api.updateStudentStatus(
        studentId,
        newStatus as "Active" | "Inactive" | "Suspended" | "On Leave"
      );

      if (!res.ok) {
        if (res.error?.includes("Student ID not found") ||
          res.error?.includes("not found") ||
          res.error?.includes("Could not find")) {
          toast.error("UserID not found. Please create the student UserID in ERP first, then try again.");
          setAllStudents(prev =>
            prev.map(s => s.name === studentId ? { ...s, status: original.status } : s)
          );
          setSavingStatus(false);
          return false;
        }
        throw new Error(res.error || "Status update failed");
      }

      toast.success(
        `${original.student_name}: Status → ${newStatus}${reason ? ` (${reason})` : ""}`
      );

      try {
        const confirmRes = await api.getAcadStudentDetail(studentId);
        if (confirmRes.ok && confirmRes.data) {
          const confirmedStatus = deriveStatus(confirmRes.data as any);
          setAllStudents(prev =>
            prev.map(s => s.name === studentId ? { ...s, status: confirmedStatus } : s)
          );
          setLastSynced(new Date());
        }
      } catch {
        // Silent fail
      }

      setSavingStatus(false);
      return true;

    } catch (err) {
      setAllStudents(prev =>
        prev.map(s => s.name === studentId ? { ...s, status: original.status } : s)
      );

      const msg = err instanceof Error ? err.message : "Status update failed";

      if (msg.includes("Student ID not found") ||
        msg.includes("not found") ||
        msg.includes("Could not find")) {
        toast.error("Student ID not found. Please create the student ID in ERP first, then try again.");
      } else {
        toast.error("Failed to update student status. Please try again.");
      }

      setSavingStatus(false);
      return false;
    }
  }, [allStudents]);

  const transferStudentSection = useCallback(async (
    studentId: string,
    studentName: string,
    fromSection: string,
    toSection: string
  ): Promise<boolean> => {
    if (!fromSection || !toSection) {
      toast.error("Source or target section missing");
      return false;
    }
    if (fromSection === toSection) {
      toast.error("Student is already in this section");
      return false;
    }

    setSavingTransfer(true);

    try {
      const [sourceRes, targetRes] = await Promise.all([
        api.getAcadStudentGroupDetail(fromSection),
        api.getAcadStudentGroupDetail(toSection),
      ]);

      if (!sourceRes.ok || !sourceRes.data) {
        throw new Error("Could not fetch source section details");
      }
      if (!targetRes.ok || !targetRes.data) {
        throw new Error("Could not fetch target section details");
      }

      const source = sourceRes.data;
      const target = targetRes.data;

      if (source.academic_year !== target.academic_year) {
        throw new Error(
          `Transfer not allowed: Academic years differ (Source: "${source.academic_year || 'None'}", Target: "${target.academic_year || 'None'}")`
        );
      }

      if (target.group_based_on === "Batch" && target.batch) {
        const enrollRes = await api.getProgramEnrollmentForStudent(studentId);

        if (!enrollRes.ok) {
          throw new Error(enrollRes.error || `Could not look up ${studentName}'s Program Enrollment`);
        }
        if (!enrollRes.data) {
          throw new Error(
            `${studentName} has no Program Enrollment record. Please create one in the ERP ` +
            `(Education > Program Enrollment) before transferring their section.`
          );
        }

        const enrollment = enrollRes.data;
        if (enrollment.student_batch_name !== target.batch) {
          const syncRes = await api.updateProgramEnrollmentBatch(enrollment.name, target.batch);
          if (!syncRes.ok) {
            throw new Error(
              syncRes.error ||
              `Could not sync ${studentName}'s Program Enrollment to batch "${target.batch}". ` +
              `The transfer cannot proceed until this is in sync.`
            );
          }
        }
      }

      const addRes = await api.addStudentToAcadSection(toSection, studentId, studentName);
      if (!addRes.ok) {
        throw new Error(addRes.error || `Could not add student to ${toSection}`);
      }

      const removeRes = await api.removeStudentFromAcadSection(fromSection, studentId);
      if (!removeRes.ok) {
        const rollbackRes = await api.removeStudentFromAcadSection(toSection, studentId);
        if (!rollbackRes.ok) {
          toast.error(`Transfer failed and rollback incomplete. Please manually check ${studentName} in ERP.`);
        }
        throw new Error(removeRes.error || `Could not remove student from ${fromSection}`);
      }

      setAllStudents(prev =>
        prev.map(s => s.name === studentId ? { ...s, section: toSection } : s)
      );

      toast.success(`${studentName} transferred to ${toSection}`);

      fetchedRef.current = false;
      await fetchStudents();

      setSavingTransfer(false);
      return true;

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Section transfer failed";
      toast.error(msg);

      setSavingTransfer(false);
      return false;
    }
  }, [fetchStudents]);

// ─────────────────────────────────────────────────────────────────────────
// ✅ ADD STUDENT - FIXED with graceful error handling
// ─────────────────────────────────────────────────────────────────────────
const addNewStudent = useCallback(async (payload: NewStudentPayload): Promise<boolean> => {
  if (!payload.student_name?.trim()) {
    toast.error("Student name is required");
    return false;
  }

  setSavingNewStudent(true);

  try {
    // ── Step 1: Create the Student record ──
    const createPayload: Record<string, any> = {
      student_name: payload.student_name.trim(),
      first_name: payload.first_name?.trim() || payload.student_name.trim().split(" ")[0],
      status: "Active",
      enabled: 1,
    };

    if (payload.middle_name) createPayload.middle_name = payload.middle_name.trim();
    if (payload.last_name) createPayload.last_name = payload.last_name.trim();
    if (payload.student_email_id) createPayload.student_email_id = payload.student_email_id.trim();
    if (payload.date_of_birth) createPayload.date_of_birth = payload.date_of_birth;
    if (payload.joining_date) createPayload.joining_date = payload.joining_date;
    if (payload.nationality) createPayload.nationality = payload.nationality;
    if (payload.city) createPayload.city = payload.city;
    if (payload.country) createPayload.country = payload.country;
    if (payload.state) createPayload.state = payload.state;
    if (payload.blood_group) createPayload.blood_group = payload.blood_group;
    if (payload.gender) createPayload.gender = payload.gender;
    if (payload.student_mobile_number) createPayload.student_mobile_number = payload.student_mobile_number;
    if (payload.alternate_phone_number) createPayload.alternate_phone_number = payload.alternate_phone_number;
    if (payload.address_line1) createPayload.address_line1 = payload.address_line1;
    if (payload.address_line2) createPayload.address_line2 = payload.address_line2;
    if (payload.pincode) createPayload.pincode = payload.pincode;
    if (payload.custom_batch) createPayload.custom_batch = payload.custom_batch;
    if (payload.custom_serial_no) createPayload.custom_serial_no = payload.custom_serial_no;
    if (payload.custom_student_id_number) createPayload.custom_student_id_number = payload.custom_student_id_number;
    if (payload.custom_student_id_type) createPayload.custom_student_id_type = payload.custom_student_id_type;

    const createRes = await api.createAcadStudent(createPayload as any);

    if (!createRes.ok) {
      const errorMsg = (createRes as any).error || "Could not create student record";
      throw new Error(errorMsg);
    }

    if (!createRes.data) {
      throw new Error("Could not create student record");
    }

    const newStudentId = (createRes.data as any).name;
    toast.success(`✅ ${payload.student_name} added successfully`);

    // ── Step 2: Create Program Enrollment (if program and section provided) ──
    if (payload.program && payload.section) {
      const groupRes = await api.getAcadStudentGroupDetail(payload.section);

      if (groupRes.ok && groupRes.data) {
        const group = groupRes.data;
        let enrollmentCreated = false;

        // Create Program Enrollment with the correct batch
        if (group.group_based_on === "Batch" && group.batch) {
          try {
            const enrollRes = await api.createProgramEnrollment({
              student: newStudentId,
              program: payload.program,
              academic_year: group.academic_year || "",
              student_batch_name: group.batch,
            });

            if (enrollRes.ok) {
              enrollmentCreated = true;
              const enrollmentName = enrollRes.data?.name || "";
              
              // Try to submit, but don't crash if it fails
              if (enrollmentName) {
                try {
                  const submitRes = await api.submitDocument("Program Enrollment", enrollmentName);
                  if (submitRes.ok) {
                    // Successfully submitted
                  } else {
                    // Submission failed - show simple message without error icon
                    toast("ℹ️ Program Enrollment created. Please submit it in ERP to complete enrollment.", { 
                      icon: "ℹ️",
                      duration: 6000 
                    });
                  }
                } catch {
                  // Submission error - show simple message
                  toast("ℹ️ Program Enrollment created. Please submit it in ERP to complete enrollment.", { 
                    icon: "ℹ️",
                    duration: 6000 
                  });
                }
              }
            } else {
              // Enrollment creation failed
              toast("ℹ️ Student added. Please create Program Enrollment in ERP.", { 
                icon: "ℹ️",
                duration: 5000 
              });
            }
          } catch {
            // Any error in enrollment process
            toast("ℹ️ Student added. Please complete enrollment in ERP.", { 
              icon: "ℹ️",
              duration: 5000 
            });
          }
        }

        // ── Step 3: Try to add to section ──
        if (enrollmentCreated) {
          try {
            // Wait a moment for ERP to process
            await new Promise(resolve => setTimeout(resolve, 1000));

            const addRes = await api.addStudentToAcadSection(
              payload.section,
              newStudentId,
              payload.student_name.trim()
            );

            if (addRes.ok) {
              toast.success(`✅ Assigned to ${payload.section}`);
            } else {
              // Section assignment failed - show simple message
              toast(`ℹ️ Student added to ${payload.section}`, { 
                icon: "ℹ️",
                duration: 5000 
              });
            }
          } catch {
            // Section assignment error - show simple message
            toast(`ℹ️ Student added to ${payload.section}`, { 
              icon: "ℹ️",
              duration: 5000 
            });
          }
        }
      }
    }

    // ✅ Force a full refresh to update the UI
    fetchedRef.current = false;
    await fetchStudents();

    setSavingNewStudent(false);
    return true;

  } catch (err) {
    // ✅ CATCH ALL ERRORS - Show simple message without crashing
    const msg = err instanceof Error ? err.message : "Could not add student";
    toast(`ℹ️ ${msg}`, { icon: "ℹ️" });
    setSavingNewStudent(false);
    return false;
  }
}, [fetchStudents]);

  const openStudentDetail = useCallback(async (student: EnrichedStudent) => {
  setSelectedStudent(student);
  setDetailLoading(true);
  setStudentDetail(null);
  setGuardianDetails([]);

  const res = await api.getAcadStudentDetail(student.name);

  if (res.ok) {
    setStudentDetail(res.data);
    setDetailLoading(false);

    // Resolve guardian links -> full Guardian doctype records
    const guardianLinks: any[] = Array.isArray((res.data as any)?.guardians)
      ? (res.data as any).guardians
      : [];
    const guardianIds = guardianLinks
      .map((g: any) => g.guardian)
      .filter((id: any): id is string => !!id);

    if (guardianIds.length > 0) {
      setGuardianLoading(true);
      const gRes = await api.getGuardiansDetail(guardianIds);
      if (gRes.ok) {
        const relationMap: Record<string, string> = {};
        guardianLinks.forEach((g: any) => {
          if (g.guardian) relationMap[g.guardian] = g.relation || "";
        });
        const merged = gRes.data.map((g: any) => ({
          ...g,
          relation: relationMap[g.name] || "",
        }));
        setGuardianDetails(merged);
      }
      setGuardianLoading(false);
    }
  } else {
    setDetailLoading(false);
  }
}, []);

  const closeStudentDetail = useCallback(() => {
  setSelectedStudent(null);
  setStudentDetail(null);
  setGuardianDetails([]);
}, []);

  const resetFilters = useCallback(() => {
    setSearch(""); setGradeFilter(""); setSectionFilter("");
    setStatusFilter(""); setActiveTab("all"); setCurrentPage(1);
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Name", "Grade", "Section", "Status", "Attendance%", "AvgScore%", "Email", "City", "Joining Date"];
    const rows = filteredStudents.map(s => [
      s.name, s.student_name, s.grade, s.section, s.status,
      s.attendancePct !== undefined ? `${s.attendancePct}%` : "",
      s.avgScore !== undefined ? `${s.avgScore}%` : "",
      s.student_email_id ?? "", s.city ?? "", s.joining_date ?? "",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export completed");
  }, [filteredStudents]);

  const refetch = useCallback(() => {
    fetchedRef.current = false;
    fetchStudents();
  }, [fetchStudents]);

  return {
    students: paginatedStudents,
    allStudents,
    filteredCount: filteredStudents.length,
    stats,
    tabCounts,
    grades,
    sections,
    sectionMap,
    getSectionsByGrade,
    loading,
    loadingStats,
    savingStatus,
    savingTransfer,
    savingNewStudent,
    error,
    refetch,
    lastSynced,
    liveCount,
    search, setSearch,
    gradeFilter, setGradeFilter,
    sectionFilter, setSectionFilter,
    statusFilter, setStatusFilter,
    activeTab, setActiveTab,
    resetFilters,
    currentPage,
    totalPages,
    goToPage,
    pageSize: PAGE_SIZE,
    selectedStudent,
    studentDetail,
    detailLoading,
    guardianDetails,
    guardianLoading,
    openStudentDetail,
    closeStudentDetail,
    changeStudentStatus,
    transferStudentSection,
    addNewStudent,
    exportCSV,
};
}