// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type Program = { name: string; program_name?: string };
export type Course  = { name: string; course_name?: string };

// ✅ Added — used in Dashboard, AttendancePage, useAttendance
export type AttendanceRecord = {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string;
};

export type CreateAttendancePayload = {
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: "Present" | "Absent" | "Leave";
};
// ── Bulk attendance types (used by api.bulkMarkAttendance) ─────────────────
export type BulkAttendanceRow = {
  student: string;
  student_name?: string;
  student_group: string;
  course_schedule: string;
  date: string; // "YYYY-MM-DD"
  status: "Present" | "Absent" | "Leave";
};

// Meet Links Types
export type CourseSchedule = {
  name: string;
  student_group: string;
  instructor: string;
  instructor_name: string;
  program: string;
  course: string;
  schedule_date: string;
  room: string;
  custom_meeting_link: string;
  from_time: string;
  to_time: string;
  title: string;
  color?: string;
  class_schedule_color?: string;
  custom_is_holiday?: boolean;      // ✅ holiday-aware schedule — excluded from screen-time totals
  custom_holiday_name?: string;
};
export type BulkAttendanceResult = {
  created: number;
  updated: number;
  failed: { student?: string; error: string }[];
};
// ✅ Added — used in Dashboard, useLeave
export type LeaveBalance = {
  type: string;
  available: number;
  used?: number;
  total?: number;
};

export interface NavItem {
  to: string;
  label: string;
  iconName: string;
  allowedDesignations?: string[];
  allowedRoles?: string[];   // 👈 yeh line add karein
  dashboardOnly?: boolean;
  children?: NavItem[];
}
// ✅ Added — used in LeavePage
export type LeaveApplication = {
  id?: string;
  name?: string;
  type?: string;
  leave_type?: string;
  startDate?: string;
  from_date?: string;
  endDate?: string;
  to_date?: string;
  status?: string;
  workflow_state?: string;
  reason?: string;
  description?: string;
};

export type ScheduleEntry = {
  name: string;
  student_group: string;
  instructor: string;
  instructor_name: string;
  program: string;
  course: string;
  color?: string;
  class_schedule_color?: string;
  schedule_date: string;
  room?: string;
  from_time: string;
  to_time: string;
  title?: string;
  is_holiday?: boolean;      // ✅ Added — holiday-aware schedule
  holiday_name?: string;     // ✅ Added — holiday-aware schedule
};

export type StudentAttendance = {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: string;
  link_nvfk?: string;
  is_holiday?: boolean;      // ✅ Added — holiday-aware attendance
  holiday_name?: string;     // ✅ Added — holiday-aware attendance
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

export type StudentScoreRow = {
  student: string;
  student_name: string;
  group_roll_number?: number;
  scores: Record<string, string>;
  comments: string;
};

// ─────────────────────────────────────────────
// BASE URL
// ─────────────────────────────────────────────

const PROD_HOST = "learnschool.online";

export const BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "/api/resource"
    : `https://${PROD_HOST}/api/resource`;

// ─────────────────────────────────────────────
// AUTH HEADERS
// ─────────────────────────────────────────────

export function authHeader(): Record<string, string> {
  const t = localStorage.getItem("erpnext_auth_token");
  return t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {};
}

export function csrfHeader(): Record<string, string> {
  if (localStorage.getItem("erpnext_auth_token")) return {};
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? { "X-Frappe-CSRF-Token": decodeURIComponent(match[1]) } : {};
}

// ─────────────────────────────────────────────
// GENERIC FETCH HELPERS
// ─────────────────────────────────────────────

export async function erpList<T>(
  doctype: string,
  fields: string[],
  filters?: any[],
  limit = 200
): Promise<T[]> {
  const url = new URL(
    `${BASE}/${encodeURIComponent(doctype.trim())}`,
    window.location.origin
  );
  url.searchParams.set("fields", JSON.stringify(fields));
  url.searchParams.set("limit_page_length", String(limit));
  if (filters) url.searchParams.set("filters", JSON.stringify(filters));

  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { Accept: "application/json", ...authHeader() },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export async function erpGet<T>(doctype: string, docname: string): Promise<T> {
  const url = `${BASE}/${encodeURIComponent(doctype.trim())}/${encodeURIComponent(docname.trim())}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json", ...authHeader() },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

// ─────────────────────────────────────────────
// DOMAIN API FUNCTIONS
// ─────────────────────────────────────────────

export async function createAttendance(payload: {
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: "Present" | "Absent";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/Student Attendance`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader(),
        ...csrfHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.exception || `${res.status} ${res.statusText}` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
}

export async function createAssessmentResult(payload: {
  student: string;
  student_name: string;
  assessment_plan: string;
  student_group: string;
  program?: string;
  course?: string;
  academic_year?: string;
  academic_term?: string;
  assessment_group?: string;
  grading_scale?: string;
  maximum_score?: number;
  comment?: string;
  details: { assessment_criteria: string; score: number; maximum_score: number }[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/Assessment Result`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader(),
        ...csrfHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err?.exception || err?._server_messages || `${res.status} ${res.statusText}`,
      };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
}