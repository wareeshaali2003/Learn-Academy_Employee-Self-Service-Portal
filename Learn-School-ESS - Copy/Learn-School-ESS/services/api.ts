// services/api.ts
import axios, { AxiosError, AxiosInstance } from "axios";

const PROD_HOST = "learnschool.online";

const isLocalDev =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const isSameDomain = window.location.hostname === PROD_HOST;

const BASE_URL =
  isSameDomain || isLocalDev ? "/api/method" : `https://${PROD_HOST}/api/method`;
const RESOURCE_BASE = isSameDomain || isLocalDev ? "" : `https://${PROD_HOST}`;

const AUTH_TOKEN_KEY = "erpnext_auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (!token) localStorage.removeItem(AUTH_TOKEN_KEY);
  else localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number; raw?: unknown };

export interface ActivityLogRecord {
  name: string;
  user: string;
  full_name?: string;
  operation: "Login" | "Logout";
  status: string;
  subject?: string;
  communication_date: string; // "YYYY-MM-DD HH:mm:ss.ffffff"
  ip_address?: string;
}

// ── Axios clients ─────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

const resourceClient: AxiosInstance = axios.create({
  baseURL: `${RESOURCE_BASE}/api/resource`,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

// ── CSRF Token ────────────────────────────────────────────────────────────────

let _cachedCsrf: string | null = null;

function readCsrfToken(): string | null {
  if (_cachedCsrf) return _cachedCsrf;

  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    _cachedCsrf = fromWindow;
    return fromWindow;
  }

  const meta =
    document.querySelector('meta[name="csrf-token"]') ||
    document.querySelector('meta[name="csrf_token"]');
  const fromMeta = meta?.getAttribute("content");
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    _cachedCsrf = fromMeta;
    return fromMeta;
  }

  const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
  if (m?.[2]) {
    _cachedCsrf = decodeURIComponent(m[2]);
    return _cachedCsrf;
  }

  fetchAndCacheCsrfToken().catch(() => {});
  return null;
}

export async function fetchAndCacheCsrfToken(): Promise<void> {
  try {
    const w = window as any;
    const fromWindow = w?.frappe?.csrf_token;
    if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
      _cachedCsrf = fromWindow;
      return;
    }

    const base = RESOURCE_BASE || "";
    const token = getAuthToken();
    const authH: Record<string, string> = token
      ? { Authorization: token.startsWith("token ") ? token : `token ${token}` }
      : {};

    await fetch(`${base}/api/method/frappe.auth.get_logged_user`, {
      credentials: "include",
      headers: { Accept: "application/json", ...authH },
    });

    const cookieMatch = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (cookieMatch?.[2]) {
      _cachedCsrf = decodeURIComponent(cookieMatch[2]);
    }
  } catch {
    // silent
  }
}

export function setCsrfToken(token: string) {
  _cachedCsrf = token;
}

fetchAndCacheCsrfToken().catch(() => {});

// ── Axios interceptors ────────────────────────────────────────────────────────

function attachInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const t = getAuthToken();
    if (t) {
      if (!config.headers) config.headers = {} as any;
      (config.headers as any)["Authorization"] = t.startsWith("token ") ? t : `token ${t}`;
    }
    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "delete", "patch"].includes(method)) {
      if (!config.headers) config.headers = {} as any;
      const csrf = readCsrfToken();
      if (csrf) (config.headers as any)["X-Frappe-CSRF-Token"] = csrf;
      (config.headers as any)["X-Requested-With"] = "XMLHttpRequest";
    }
    return config;
  });
}

attachInterceptors(apiClient);
attachInterceptors(resourceClient);

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractError(err: unknown): { status?: number; message: string; raw?: unknown } {
  if (!axios.isAxiosError(err)) return { message: "Unknown error", raw: err };
  const ae = err as AxiosError<any>;
  const status = ae.response?.status;
  const data = ae.response?.data;
  const message =
    (typeof data === "string" ? data : undefined) ||
    data?.message ||
    data?.exception ||
    ae.message ||
    "Request failed";
  return { status, message: String(message), raw: data ?? ae };
}

function unwrap<T>(body: any): T {
  if (body && typeof body === "object") {
    if ("data" in body && body.data !== undefined) return body.data as T;
    if ("message" in body && body.message !== undefined) return body.message as T;
  }
  return body as T;
}

const handleResponse = async <T>(promise: Promise<any>): Promise<ApiResult<T>> => {
  try {
    const res = await promise;
    return { ok: true, data: unwrap<T>(res.data) };
  } catch (err) {
    const { status, message, raw } = extractError(err);
    console.warn(`[API Error] ${status ?? "Network"}: ${message}`);
    return { ok: false, status, error: message, raw };
  }
};

function asArray<T>(val: any): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function extractList(raw: any, ...keys: string[]): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    for (const key of keys) {
      if (Array.isArray(raw[key])) return raw[key];
    }
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.message)) return raw.message;
    if (Array.isArray(raw.result)) return raw.result;
  }
  return [];
}

function extractTime(raw: any): string {
  if (!raw || typeof raw !== "string") return "--:--";
  const trimmed = raw.trim();
  if (!trimmed) return "--:--";
  const timePart = trimmed.includes(" ") ? trimmed.split(" ")[1] : trimmed;
  if (!timePart) return "--:--";
  return timePart.slice(0, 5) || "--:--";
}

function parseServerMessages(raw: any): string | null {
  try {
    if (!raw) return null;
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);
    const outer: string[] = JSON.parse(str);
    if (!Array.isArray(outer) || !outer.length) return null;
    const inner = JSON.parse(outer[0]);
    return inner?.message || outer[0];
  } catch {
    return typeof raw === "string" ? raw : null;
  }
}

function parseErpError(errBody: any, fallback: string): string {
  if (!errBody) return fallback;
  if (errBody._server_messages) {
    const msg = parseServerMessages(errBody._server_messages);
    if (msg) return msg;
  }
  if (errBody.exception) return String(errBody.exception);
  if (errBody.message && errBody.message !== "Invalid Request") return String(errBody.message);
  return fallback;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const t = getAuthToken();
  const csrf = readCsrfToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Expect": "",   // ← FIX: empty Expect header kills 417 Expectation Failed
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════════════
export interface Assignment {
  name: string;
  course: string;
  link_gdbv?: string;
  heading: string;
  description?: string;
  docstatus: number;
  creation?: string;
  modified?: string;
}
export type DirectoryEmployee = {
  name: string;
  employee_name: string;
  designation?: string;
  department?: string;
  company_email?: string;
  cell_number?: string;
  image?: string;
};

export type ProgramEnrollmentDetail = {
  name: string;
  student: string;
  student_name?: string;
  program?: string;
  academic_year?: string;
  student_batch_name?: string;
  enrollment_date?: string;
  docstatus?: number; // 0 = Draft, 1 = Submitted (active), 2 = Cancelled
};

export type AttendanceRecord = {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string;
};

export type TodoRecord = {
  name: string;
  description: string;
  status: "Open" | "Closed" | "Cancelled";
  priority: "Low" | "Medium" | "High";
  date?: string;
  owner?: string;
  assigned_by_full_name?: string;
  reference_type?: string;
  reference_name?: string;
  color?: string;
};

export type CalendarEvent = {
  name: string;
  subject: string;
  starts_on: string;
  ends_on?: string;
  color?: string;
  event_type?: string;
  status?: string;
  description?: string;
  all_day?: number;
};

export type CreateAttendancePayload = {
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: "Present" | "Absent" | "Leave";
};



// ═══════════════════════════════════════════════════════════════════════════════
// 🎓 ACADEMIC PORTAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AcadStudent = {
  name: string;
  student_name: string;
  first_name?: string;
  student_email_id?: string;
  date_of_birth?: string;
  joining_date?: string;
  enabled?: number;
  custom_batch?: string;
  custom_serial_no?: string;
  custom_student_id_number?: string;
  custom_student_id_type?: string;
  nationality?: string;
  city?: string;
  country?: string;
  blood_group?: string;
  image?: string;
  program?: string;
  student_group?: string;
};

export type AcadStudentDetail = AcadStudent & {
  siblings?: any[];
  guardians?: any[];
  docstatus?: number;
  creation?: string;
  modified?: string;
  customer?: string;
  customer_group?: string;
};

export type AcadStudentFilters = {
  search?: string;
  program?: string;
  group?: string;
  status?: "Active" | "Inactive" | "Suspended" | "On Leave" | "";
};

export type AcadSection = {
  name: string;
  student_group_name: string;
  program: string;
  academic_year: string;
  academic_term?: string;
  max_strength: number;
  disabled: 0 | 1;
  students?: any[];
  instructors?: any[];
  creation?: string;
  modified?: string;
  studentCount?: number; 
};

export type AcadSectionDetail = AcadSection & {
  students: Array<{
    name: string;
    student: string;
    student_name: string;
    group_roll_number: number;
    active: number;
  }>;
  instructors: Array<{
    name: string;
    instructor: string;
    instructor_name: string;
  }>;
};



// Student Attendance Types
export type StudentAttendance = {
  name: string;
  student: string;
  student_name: string;
  course_schedule: string;
  student_group: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave';
  creation?: string;
  modified?: string;
};

// Assessment Result Types
export type AssessmentResultDetail = {
  name?: string;
  assessment_criteria: string;
  maximum_score: number;
  score: number;
  grade?: string;
  idx?: number;
};

export type AssessmentResult = {
  name: string;
  student: string;
  student_name: string;
  assessment_plan: string;
  student_group: string;
  program: string;
  course: string;
  academic_year: string;
  academic_term: string;
  total_score: number;
  maximum_score: number;
  grade: string;
  comment?: string;
  details: AssessmentResultDetail[];
  docstatus?: number;
  creation?: string;
  modified?: string;
};

export type AssessmentResultFilters = {
  student?: string;
  course?: string;
  program?: string;
  assessment_plan?: string;
  student_group?: string;
  academic_year?: string;
  academic_term?: string;
  grade?: string;
  docstatus?: 0 | 1 | 2;
};

// ── Admin — Revenue types ────────────────────────────────────────────────

export type MonthlyRevenuePoint = {
  month: string;        // "Jan 2026"
  revenue: number;       // sum of grand_total
  collected: number;     // sum of paid_amount
  outstanding: number;   // sum of outstanding_amount
};

export type ProgramRevenueBreakdown = {
  program: string;
  paid: number;
  unpaid: number;
  draft: number;      
  cancelled: number;   
  totalInvoices: number;
};

export type InvoiceDisplayStatus = "paid" | "partially_paid" | "unpaid" | "draft" | "cancelled";

export type SalesInvoiceWithStatus = SalesInvoiceDetail & {
  displayStatus: InvoiceDisplayStatus;
};

export type StudentGroupChild = {
  student: string;
  student_name?: string;
  active?: number;
  group_roll_number?: number;
};

export type StudentGroupListItem = {
  name: string;
  student_group_name?: string;
  program?: string;
  academic_year?: string;
  max_strength?: number;
  disabled?: number;
};

export type StudentGroupFullDetail = StudentGroupListItem & {
  students?: StudentGroupChild[];
  instructors?: unknown[];
};

export type CeoGroupSummary = {
  name: string;
  student_group_name: string;
  program: string;
  academic_year?: string;
  max_strength: number;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
};

export type RevenueStats = {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  totalDraftAmount: number;      // NEW
  totalCancelledAmount: number;  // NEW
  collectionRate: number;
  monthlyTrend: MonthlyRevenuePoint[];
  programWiseBreakdown: ProgramRevenueBreakdown[];
  invoices: SalesInvoiceWithStatus[]; // NEW — per invoice detail table ke liye
};

export interface SalarySlipEarningRow {
  salary_component?: string;
  amount?: number;
}
export type BulkAttendanceRow = {
  student: string;
  student_name?: string;
  student_group: string;
  course_schedule: string;
  date: string; // "YYYY-MM-DD"
  status: "Present" | "Absent" | "Leave";
}

export type BulkAttendanceResult = {
  created: number;
  updated: number;
  failed: { student?: string; error: string }[];
}

// ════════════════════════════════════════════════════════════════════════════
// ── Add to Shared Types section in api.ts ────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

export type NoticeBoardType = "CIRCULAR" | "STREAMS" | "NEWS";

export type NoticeBoardListItem = {
  name: string;
};

export type NoticeBoardDetail = {
  name: string;
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: number;
  idx?: number;
  subject: string;
  message: string;
  type: NoticeBoardType | string;
  doctype?: string;
};

export type CreateNoticeBoardPayload = {
  subject: string;
  message: string;
  type: NoticeBoardType | string;
};

export type UpdateNoticeBoardPayload = Partial<CreateNoticeBoardPayload>;   // ✅ yahan add karo

export interface SalarySlipDetail {
  name: string;
  employee?: string;
  employee_name?: string;
  department?: string;
  designation?: string;
  company?: string;
  posting_date?: string;
  start_date?: string;
  end_date?: string;
  payroll_frequency?: string;
  gross_pay?: number;
  total_deduction?: number;
  net_pay?: number;
  total_working_days?: number;
  payment_days?: number;
  leave_without_pay?: number;
  absent_days?: number;
  currency?: string;
  status?: string;
  docstatus?: number;
  mode_of_payment?: string;
  bank_name?: string;
  bank_account_no?: string;
  earnings?: SalarySlipEarningRow[];
}
export type AttendanceDetail = {
  name: string;
  employee: string;
  employee_name?: string;
  attendance_date?: string;
  company?: string;
  shift?: string;
  working_hours?: number;
  status?: "Present" | "Absent" | "Half Day" | "On Leave" | string;
  late_entry?: number;
  early_exit?: number;
  actual_overtime_duration?: number;
  standard_working_hours?: number;
};


export type DepartmentListItem = {
  name: string;
};

export type DepartmentDetail = {
  name: string;
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: number;
  department_name?: string;
  parent_department?: string;
  company?: string;
  is_group?: number;
  disabled?: number;
  lft?: number;
  rgt?: number;
  doctype?: string;
  shift_request_approver?: unknown[];
  expense_approvers?: unknown[];
  leave_approvers?: unknown[];
};

export type EmployeeDetail = {
  name: string;
  employee_name?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  custom_employeeidtype?: string;
  custom_employee_nic?: string;
  marital_status?: string;
  blood_group?: string;

  cell_number?: string;
  personal_email?: string;
  user_id?: string;
  permanent_address?: string;

  company?: string;
  employment_type?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  default_shift?: string;
  holiday_list?: string;
  reports_to?: string;

  leave_approver?: string;
  expense_approver?: string;
  shift_request_approver?: string;

  salary_mode?: string;
  salary_currency?: string;
  bank_name?: string;
  iban?: string;

  status?: string;
  image?: string;
};

export type LeaveApplicationDetail = {
  name: string;
  employee: string;
  employee_name?: string;
  leave_type?: string;
  company?: string;
  from_date?: string;
  to_date?: string;
  half_day?: number;
  total_leave_days?: number;
  description?: string;
  leave_balance?: number;
  leave_approver?: string;
  leave_approver_name?: string;
  posting_date?: string;
  status?: "Open" | "Approved" | "Rejected" | "Cancelled" | "Draft" | string;
};

// ── Admin — Students / Fees types ───────────────────────────────────────────

export type StudentDetail = {
  name: string;
  student_name?: string;
  student_email_id?: string;
  gender?: string;
  enabled?: number; // 1 = active, 0 = inactive
  student_mobile_number?: string;
  image?: string;
};

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
};

export type StudentAttendanceRow = {
  name?: string;
  student: string;
  student_name?: string;
  status?: "Present" | "Absent" | "Half Day" | string;
  date: string;
  student_group?: string;
  course_schedule?: string;
  docstatus?: number;
};
export type SalesInvoiceDetail = {
  name: string;
  customer?: string;
  customer_name?: string;
  student?: string;
  company?: string;
  posting_date?: string;
  due_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  paid_amount?: number;
  status?: string;
  docstatus?: number;
  fee_schedule?: string;
};

export type CreateAssessmentResultPayload = {
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
  grade?: string;
  comment?: string;
  details: {
    assessment_criteria: string;
    score: number;
    maximum_score: number;
  }[];
};

let _cachedInstructorName: string | null = null;

async function getInstructorName(): Promise<string> {
  // Session ke andar cache — har API call pe dobara lookup na ho
  if (_cachedInstructorName) return _cachedInstructorName;

  // Step 1: Profile se Employee ID aur (agar available ho) user email lo
  const profileRes = await handleResponse<any>(
    apiClient.get("employee_self_service.mobile.v1.ess.get_profile")
  );

  if (!profileRes.ok) {
    console.warn("[API] Profile fetch failed:", profileRes.error);
    return "";
  }

  const employeeId: string | undefined = profileRes.data?.name;
  const userEmail: string | undefined =
    profileRes.data?.user_id || profileRes.data?.email;

  if (!employeeId && !userEmail) {
    console.warn("[API] Profile data missing employee id and user email");
    return "";
  }

  // Step 2: Instructor doctype ko query karo — pehle employee field se try karo
  if (employeeId) {
    const byEmployee = await handleResponse<any>(
      resourceClient.get("Instructor", {
        params: {
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["Instructor", "employee", "=", employeeId]]),
          limit_page_length: 1,
        },
      })
    );
    if (byEmployee.ok) {
      const rows = asArray<any>(byEmployee.data?.data ?? byEmployee.data);
      const found: string | undefined = rows[0]?.name;
      if (found) {
        _cachedInstructorName = found;
        return found;
      }
    }
  }

  // Step 3: Fallback — user_id (email) se try karo
  let resolvedEmail: string | undefined = userEmail;
  if (!resolvedEmail) {
    const emailRes = await api.getLoggedUserEmail();
    if (emailRes.ok) resolvedEmail = emailRes.data;
  }

  if (resolvedEmail) {
    const byUser = await handleResponse<any>(
      resourceClient.get("Instructor", {
        params: {
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["Instructor", "user_id", "=", resolvedEmail]]),
          limit_page_length: 1,
        },
      })
    );
    if (byUser.ok) {
      const rows = asArray<any>(byUser.data?.data ?? byUser.data);
      const found: string | undefined = rows[0]?.name;
      if (found) {
        _cachedInstructorName = found;
        return found;
      }
    }
  }

  // Step 4: Last resort — agar Instructor doctype mein employee ID hi
  // record ka name hai (jaisa aapke system mein hai — "LA-00007"),
  // toh seedha employeeId return karo.
  console.warn(
    "[API] Instructor lookup by employee/user_id failed, falling back to raw employeeId:",
    employeeId
  );
  const fallback = employeeId || "";
  _cachedInstructorName = fallback || null;
  return fallback;
}
// ─── Fetch with timeout ─────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Module-scope helpers for Reports (NEW)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAllResourcePages(
  doctype: string,
  fields: string[],
  filters: any[] = [],
  orderBy?: string,
  pageSize = 1000
): Promise<any[]> {
  let all: any[] = [];
  let start = 0;
  while (true) {
    const res = await handleResponse<any>(
      resourceClient.get(doctype, {
        params: {
          fields: JSON.stringify(fields),
          ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
          limit_start: start,
          limit_page_length: pageSize,
          ...(orderBy ? { order_by: orderBy } : {}),
        },
      })
    );
    if (!res.ok) break;
    const rows = asArray<any>(res.data?.data ?? res.data);
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    start += pageSize;
  }
  return all;
}

// Bulk group-enrollment fetch
async function fetchGroupEnrollmentsBulk(): Promise<{ ok: true; data: Record<string, number> } | { ok: false; error: string }> {
  try {
    const rows = await fetchAllResourcePages(
      "Student Group Student",
      ["parent", "student", "active"],
      [["Student Group Student", "parenttype", "=", "Student Group"]],
      undefined,
      2000
    );
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (!r.parent || r.active === 0) continue;
      map[r.parent] = (map[r.parent] || 0) + 1;
    }
    return { ok: true, data: map };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Bulk enrollment fetch failed" };
  }
}


async function saveInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 5
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ── Generic paginator (used by Faculty Management / AcadTeachers section) ──
async function fetchAllPages<T>(
  doctype: string,
  fields: string[],
  filters?: any[],
  orderBy?: string,
  pageSize = 500
): Promise<T[]> {
  let start = 0;
  let allRows: T[] = [];

  while (true) {
    const res = await handleResponse<any>(
      resourceClient.get(doctype, {
        params: {
          fields: JSON.stringify(fields),
          ...(filters ? { filters: JSON.stringify(filters) } : {}),
          ...(orderBy ? { order_by: orderBy } : {}),
          limit_page_length: pageSize,
          limit_start: start,
        },
      })
    );

    if (!res.ok) {
      throw new Error(res.error || `Failed to fetch ${doctype}`);
    }

    const rows = asArray<T>(res.data?.data ?? res.data);
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break; // this was genuinely the last page
    start += pageSize;
  }

  return allRows;
}

export const api = {

  // ─────────────────────────────────────────────────────────────────────────────
  // 📌 SESSION & AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────────

  logout: async () => {
    setAuthToken(null);
    _cachedCsrf = null;
    return handleResponse<any>(apiClient.get("logout"));
  },

  loginAsEmployee: async (usr: string, pwd: string) => {
    const fd = new FormData();
    fd.append("usr", usr);
    fd.append("pwd", pwd);
    const result = await handleResponse<any>(apiClient.post("login", fd));
    if (result.ok) {
      await fetchAndCacheCsrfToken();
    }
    return result;
  },


  // ─────────────────────────────────────────────────────────────────────────────
  // 👤 PROFILE (ESS)
  // ─────────────────────────────────────────────────────────────────────────────

 getProfile: () =>
  
    handleResponse<any>(apiClient.get("employee_self_service.mobile.v1.ess.get_profile")),
getInstructorName: async (): Promise<string> => {
    const profileRes = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_profile")
    );

    if (!profileRes.ok) {
      console.warn("[API] Profile fetch failed:", profileRes.error);
      return "";
    }

    const employeeId: string | undefined = profileRes.data?.name;
    if (!employeeId) {
      console.warn("[API] Profile data missing employee id");
      return "";
    }

    // Employee ID (e.g. "LA-00036") -> Instructor ID (e.g. "TA-00036")
    const instructorId = employeeId.startsWith("LA-")
      ? employeeId.replace(/^LA-/, "TA-")
      : employeeId.replace("LA", "TA");

    return instructorId;
  },
  updateProfilePicture: (formData: FormData) =>
    handleResponse<any>(
      apiClient.post(
        "employee_self_service.mobile.v1.ess.update_profile_picture",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
    ),

  changePassword: (data: { old_password: string; new_password: string }) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.change_password", {
        data: JSON.stringify(data),
      })
    ),

 getLoggedUserEmail: async (): Promise<ApiResult<string>> => {
  const res = await handleResponse<any>(
    apiClient.get("frappe.auth.get_logged_user")
  );
  if (!res.ok) return res as ApiResult<string>;
  const email = typeof res.data === "string" ? res.data : res.data?.message;
  return email ? { ok: true, data: email } : { ok: false, error: "No user found" };
},


// ─────────────────────────────────────────────────────────────────────────────
  // 🔑 USER ROLES (Frappe generic REST — no custom backend needed)
  // ─────────────────────────────────────────────────────────────────────────────

  getUserRoles: async (userId: string): Promise<ApiResult<string[]>> => {
    if (!userId) return { ok: false, error: "No userId provided" };
    const res = await handleResponse<any>(
      resourceClient.get(`User/${encodeURIComponent(userId)}`, {
        params: { fields: JSON.stringify(["name", "roles"]) },
      })
    );
    if (!res.ok) return res as ApiResult<string[]>;
    const data = res.data?.data ?? res.data;
    const rawRoles = asArray<any>(data?.roles ?? []);
    const roles = rawRoles
      .map((r: any) => (typeof r === "string" ? r : r?.role))
      .filter(Boolean);
    return { ok: true, data: roles };
  },

  
    // ── Admin — Attendance ─────────────────────────
getAllAttendance: async (
  options?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    employee?: string;
  }
): Promise<ApiResult<AttendanceDetail[]>> => {

  const LIST_FIELDS = [
    "name",
    "employee",
    "employee_name",
    "attendance_date",
    "status",
    "company",
    "shift",
    "working_hours",
  ];

  const { status, from_date, to_date, employee } = options ?? {};

  const filterClauses: any[] = [];

  if (status && status !== "all") {
    filterClauses.push(["status", "=", status]);
  }

  // Date range is the key fix: without this, every attendance record
  // ever created (all employees, all years) gets fetched in one call.
  if (from_date && to_date) {
    filterClauses.push(["attendance_date", "between", [from_date, to_date]]);
  } else if (from_date) {
    filterClauses.push(["attendance_date", ">=", from_date]);
  } else if (to_date) {
    filterClauses.push(["attendance_date", "<=", to_date]);
  }

  if (employee) {
    filterClauses.push(["employee", "=", employee]);
  }

  // Pagination cap: 0 means "no limit" in Frappe, which forces the
  // server to return every matching row in one shot. Even with a date
  // filter, that can still be thousands of rows for a large school.
  // Fetch in bounded pages instead of a single unlimited call.
  const PAGE_SIZE = 500;
  const MAX_PAGES = 20; // hard safety cap: 10,000 rows max
  let allRows: any[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await handleResponse<any>(
      resourceClient.get("Attendance", {
        params: {
          fields: JSON.stringify(LIST_FIELDS),

          ...(filterClauses.length
            ? { filters: JSON.stringify(filterClauses) }
            : {}),

          limit_page_length: PAGE_SIZE,
          limit_start: page * PAGE_SIZE,

          order_by: "attendance_date desc",
        },
      })
    );

    if (!res.ok)
      return res as ApiResult<AttendanceDetail[]>;

    const pageRows = asArray<AttendanceDetail>(
      res.data?.data ?? res.data
    );

    allRows = allRows.concat(pageRows);

    // Stop once a page comes back short — no more pages left to fetch.
    if (pageRows.length < PAGE_SIZE) break;
  }

  const rows = allRows;

  if (rows.length === 0)
    return {
      ok: true,
      data: [],
    };

  const hasRichData = rows.some(
    (r) =>
      r.employee_name ||
      r.status ||
      r.attendance_date
  );

  if (hasRichData)
    return {
      ok: true,
      data: rows,
    };

  // Fallback: list endpoint didn't return full fields, so fetch each
  // record's detail individually — but in parallel chunks, not one
  // sequential await per row, which would be far slower for large lists.
  const names = rows
    .map((r) => r.name)
    .filter(Boolean);

  const CHUNK_SIZE = 10;
  const details: AttendanceDetail[] = [];

  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((name) => api.getAttendanceDetail(name))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) {
        details.push(r.value.data);
      }
    }
  }

  return {
    ok: true,
    data: details,
  };
},

getAttendanceDetail: async (
  id: string
): Promise<ApiResult<AttendanceDetail>> => {

  const DETAIL_FIELDS = [

    "name",

    "employee",

    "employee_name",

    "attendance_date",

    "company",

    "shift",

    "working_hours",

    "status",

    "late_entry",

    "early_exit",

    "actual_overtime_duration",

    "standard_working_hours",
  ];

  const res = await handleResponse<any>(
    resourceClient.get(
      `Attendance/${encodeURIComponent(id)}`,
      {
        params: {
          fields: JSON.stringify(
            DETAIL_FIELDS
          ),
        },
      }
    )
  );

  if (!res.ok)
    return res as ApiResult<AttendanceDetail>;

  return {
    ok: true,
    data: res.data,
  };
},
  // ── Admin — Departments ───────────────────────────────────────────────────
 
getAllDepartments: async (): Promise<ApiResult<DepartmentListItem[]>> => {
  const LIST_FIELDS = [
    "name",
    "department_name",
    "parent_department",
    "company",
    "is_group",
    "disabled",
  ];

  const res = await handleResponse<any>(
    resourceClient.get("Department", {
      params: {
        fields: JSON.stringify(LIST_FIELDS),
        limit_page_length: 0,
      },
    })
  );

  if (!res.ok) return res as ApiResult<DepartmentListItem[]>;

  const rows = asArray<DepartmentListItem>(res.data?.data ?? res.data);

  if (rows.length === 0) return { ok: true, data: [] };

  const hasRichData = rows.some((r) => (r as any).department_name);

  if (hasRichData) {
    // Sort client-side
    rows.sort((a: any, b: any) =>
      (a.department_name || a.name || "").localeCompare(
        b.department_name || b.name || ""
      )
    );
    return { ok: true, data: rows };
  }

  // Fallback: fetch each record individually
  const names = rows.map((r) => r.name).filter(Boolean);
  const CHUNK_SIZE = 10;
  const details: DepartmentListItem[] = [];

  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((n) => api.getDepartmentDetail(n))
    );
    settled.forEach((s) => {
      if (s.status === "fulfilled" && s.value.ok) {
        details.push(s.value.data as unknown as DepartmentListItem);
      }
    });
  }

  // Sort fallback results too
  details.sort((a: any, b: any) =>
    (a.department_name || a.name || "").localeCompare(
      b.department_name || b.name || ""
    )
  );

  return { ok: true, data: details };
},

getDepartmentDetail: async (
  name: string
): Promise<ApiResult<DepartmentDetail>> => {
  const DETAIL_FIELDS = [
    "name",
    "owner",
    "creation",
    "modified",
    "modified_by",
    "docstatus",
    "department_name",
    "parent_department",
    "company",
    "is_group",
    "disabled",
    "lft",
    "rgt",
    "doctype",
    "shift_request_approver",
    "expense_approvers",
    "leave_approvers",
  ];

  const res = await handleResponse<any>(
    resourceClient.get(
      `Department/${encodeURIComponent(name)}`,
      {
        params: {
          fields: JSON.stringify(DETAIL_FIELDS),
        },
      }
    )
  );

  if (!res.ok) return res as ApiResult<DepartmentDetail>;
  return { ok: true, data: res.data as DepartmentDetail };
},
  // Full doc (students child table ke sath) — count nikalne ke liye zaroori,
  // kyunke list endpoint child tables return nahi karta.
  getStudentGroupFullDetail: async (
    name: string
  ): Promise<ApiResult<StudentGroupFullDetail>> => {
    const res = await handleResponse<any>(
      resourceClient.get(`Student Group/${encodeURIComponent(name)}`)
    );
    if (!res.ok) return res as ApiResult<StudentGroupFullDetail>;
    return { ok: true, data: res.data as StudentGroupFullDetail };
  },

  // CEO Dashboard ke liye ready-made summary: har group ka total/active/inactive count.
  getCeoStudentGroupSummary: async (): Promise<ApiResult<CeoGroupSummary[]>> => {
    const listRes = await api.getAllStudentGroups();
    if (!listRes.ok) return listRes as ApiResult<CeoGroupSummary[]>;

    const names = listRes.data.map((g) => g.name).filter(Boolean);
    if (names.length === 0) return { ok: true, data: [] };

    const CHUNK_SIZE = 8;
    const fullDocs: StudentGroupFullDetail[] = [];

    for (let i = 0; i < names.length; i += CHUNK_SIZE) {
      const chunk = names.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map((n) => api.getStudentGroupFullDetail(n))
      );
      settled.forEach((s) => {
        if (s.status === "fulfilled" && s.value.ok) fullDocs.push(s.value.data);
      });
    }

    const summary: CeoGroupSummary[] = fullDocs.map((doc) => {
      const students = doc.students ?? [];
      const activeCount = students.filter((s) => s.active !== 0).length;
      return {
        name: doc.name,
        student_group_name: doc.student_group_name || doc.name,
        program: doc.program || "Unassigned",
        academic_year: doc.academic_year,
        max_strength: doc.max_strength ?? 0,
        totalCount: students.length,
        activeCount,
        inactiveCount: students.length - activeCount,
      };
    });

    summary.sort((a, b) => b.totalCount - a.totalCount);
    return { ok: true, data: summary };
  },
  
  getCourseSchedules: async (filters?: {
  program?: string;
  student_group?: string;
  instructor?: string;
  from_date?: string;
  to_date?: string;
}): Promise<ApiResult<CourseSchedule[]>> => {
  const erpFilters: any[] = [];

  if (filters?.program) {
    erpFilters.push(["Course Schedule", "program", "=", filters.program]);
  }
  if (filters?.student_group) {
    erpFilters.push(["Course Schedule", "student_group", "=", filters.student_group]);
  }
  if (filters?.instructor) {
    erpFilters.push(["Course Schedule", "instructor", "=", filters.instructor]);
  }
  if (filters?.from_date) {
    erpFilters.push(["Course Schedule", "schedule_date", ">=", filters.from_date]);
  }
  if (filters?.to_date) {
    erpFilters.push(["Course Schedule", "schedule_date", "<=", filters.to_date]);
  }

  const fields = JSON.stringify([
    "name",
    "student_group",
    "instructor",
    "instructor_name",
    "program",
    "course",
    "schedule_date",
    "room",
    "custom_meeting_link",
    "from_time",
    "to_time",
    "title",
    "color",
    "class_schedule_color",
    "modified",
    "creation",
  ]);

  const PAGE_SIZE = 500;
  let start = 0;
  const allRows: CourseSchedule[] = [];

  try {
    while (true) {
      const res = await handleResponse<any>(
        resourceClient.get("Course Schedule", {
          params: {
            fields,
            ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
            limit_page_length: PAGE_SIZE,
            limit_start: start,
            order_by: "schedule_date desc, from_time asc",
          },
        })
      );

      if (!res.ok) return res as ApiResult<CourseSchedule[]>;

      const rows = asArray<CourseSchedule>(res.data?.data ?? res.data);
      allRows.push(...rows);

      if (rows.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }

    return { ok: true, data: allRows };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to fetch course schedules" };
  }
},
// ── Admin — Students ─────────────────────────────────────────────────────

getAllStudents: async (): Promise<ApiResult<StudentDetail[]>> => {
  const LIST_FIELDS = [
    "name",
    "student_name",
    "student_email_id",
    "gender",
    "enabled",
    "student_mobile_number",
    "image",
  ];

  const res = await handleResponse<any>(
    resourceClient.get("Student", {
      params: {
        fields: JSON.stringify(LIST_FIELDS),
        limit_page_length: 0,
        order_by: "student_name asc",
      },
    })
  );

  if (!res.ok) return res as ApiResult<StudentDetail[]>;

  const rows = asArray<StudentDetail>(res.data?.data ?? res.data);
  if (rows.length === 0) return { ok: true, data: [] };

  const hasRichData = rows.some((r) => r.student_name || r.student_email_id);
  if (hasRichData) return { ok: true, data: rows };

  // Fallback: fetch each record individually, same pattern as Employees/Departments
  const names = rows.map((r) => r.name).filter(Boolean);
  const CHUNK_SIZE = 10;
  const details: StudentDetail[] = [];
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((n) => api.getStudentDetail(n))
    );
    settled.forEach((s) => {
      if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
    });
  }
  return { ok: true, data: details };
},

getStudentDetail: async (name: string): Promise<ApiResult<StudentDetail>> => {
  const DETAIL_FIELDS = [
    "name",
    "student_name",
    "student_email_id",
    "gender",
    "enabled",
    "student_mobile_number",
    "image",
  ];

  const res = await handleResponse<any>(
    resourceClient.get(`Student/${encodeURIComponent(name)}`, {
      params: { fields: JSON.stringify(DETAIL_FIELDS) },
    })
  );

  if (!res.ok) return res as ApiResult<StudentDetail>;
  return { ok: true, data: res.data as StudentDetail };
},

  // ── Student Login Activity (Activity Log) ───────────────────────────────
  // CEO aur Teacher/Faculty dono is se ek student ka login/logout history
  // dekh saktay hain — "user" field Activity Log mein login email hoti hai.

getStudentLoginActivity: async (
  studentEmail: string
): Promise<ApiResult<ActivityLogRecord[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get("Activity Log", {
      params: {
        filters: JSON.stringify([
          ["user", "=", studentEmail],
          ["operation", "in", ["Login", "Logout"]],
          ["status", "=", "Success"],
        ]),
        fields: JSON.stringify([
          "name", "user", "full_name", "operation",
          "status", "subject", "communication_date", "ip_address",
        ]),
        order_by: "communication_date asc",
        limit_page_length: 0,
      },
    })
  );

  if (!res.ok) return res as ApiResult<ActivityLogRecord[]>;
  const rows = asArray<ActivityLogRecord>(res.data?.data ?? res.data);
  return { ok: true, data: rows };
},

  // ── Admin — Revenue ──────────────────────────────────────────────────────

getRevenueStats: async (options?: {
  from_date?: string;
  to_date?: string;
}): Promise<ApiResult<RevenueStats>> => {
  const feesRes = await api.getAllFees();

  if (!feesRes.ok) {
    console.warn("[getRevenueStats] getAllFees failed:", feesRes.error);
    return feesRes as ApiResult<RevenueStats>;
  }

  const { from_date, to_date } = options ?? {};
  let rows = feesRes.data;

  if (from_date || to_date) {
    rows = rows.filter((r) => {
      if (!r.posting_date) return false;
      if (from_date && r.posting_date < from_date) return false;
      if (to_date && r.posting_date > to_date) return false;
      return true;
    });
  }

  let totalRevenue = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalDraftAmount = 0;
  let totalCancelledAmount = 0;

  const monthMap = new Map<string, MonthlyRevenuePoint>();
  const programMap = new Map<string, ProgramRevenueBreakdown>();
  const invoices: SalesInvoiceWithStatus[] = [];

  for (const row of rows) {
    const total = row.grand_total ?? 0;
    const paid = row.paid_amount ?? 0;
    const outstanding = row.outstanding_amount ?? 0;
    const docstatus = row.docstatus ?? 1;

    // ── Derive display status ──
    // 0 = Draft (Accounts approval pending), 1 = Submitted, 2 = Cancelled
    let displayStatus: InvoiceDisplayStatus;
    if (docstatus === 2) {
      displayStatus = "cancelled";
    } else if (docstatus === 0) {
      displayStatus = "draft";
    } else if (outstanding <= 0) {
      displayStatus = "paid";
    } else if (paid > 0 && outstanding > 0) {
      displayStatus = "partially_paid";
    } else {
      displayStatus = "unpaid";
    }

    invoices.push({ ...row, displayStatus });

    // ── Program-wise breakdown bucket (grade abhi "Unassigned" — Student/Fee Schedule join baaki hai) ──
    const program = ((row as any).program as string) || "Unassigned";
    const existingProgram = programMap.get(program) ?? {
      program,
      paid: 0,
      unpaid: 0,
      draft: 0,
      cancelled: 0,
      totalInvoices: 0,
    };
    existingProgram.totalInvoices += 1;

    // ── Single branch: totals + program breakdown + monthly trend, sab yahin handle ──
    // (continue use nahi kiya, taake TS narrowing dobara check karne se na roke,
    // aur cancelled invoices bhi programMap mein sahi count hon)
    if (displayStatus === "cancelled") {
      totalCancelledAmount += total;
      existingProgram.cancelled += total;
    } else if (displayStatus === "draft") {
      totalDraftAmount += total;
      existingProgram.draft += total;
    } else {
      // paid / partially_paid / unpaid — ye teeno "submitted" invoices hain
      totalRevenue += total;
      totalCollected += paid;
      totalOutstanding += outstanding;
      existingProgram.paid += paid;
      existingProgram.unpaid += outstanding;

      // ── Monthly trend (sirf submitted invoices) ──
      if (row.posting_date) {
        const date = new Date(row.posting_date);
        const monthKey = date.toLocaleString("default", { month: "short", year: "numeric" });

        const existingMonth = monthMap.get(monthKey) ?? {
          month: monthKey,
          revenue: 0,
          collected: 0,
          outstanding: 0,
        };
        existingMonth.revenue += total;
        existingMonth.collected += paid;
        existingMonth.outstanding += outstanding;
        monthMap.set(monthKey, existingMonth);
      }
    }

    programMap.set(program, existingProgram);
  }

  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

  const monthlyTrend = Array.from(monthMap.values()).sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  const programWiseBreakdown = Array.from(programMap.values()).sort((a, b) =>
    a.program.localeCompare(b.program)
  );

  // Sabse recent invoice pehle dikhein
  invoices.sort((a, b) => (b.posting_date || "").localeCompare(a.posting_date || ""));

  return {
    ok: true,
    data: {
      totalRevenue,
      totalCollected,
      totalOutstanding,
      totalDraftAmount,
      totalCancelledAmount,
      collectionRate,
      monthlyTrend,
      programWiseBreakdown,
      invoices,
    },
  };
},

// ── Admin — Student Attendance (dashboard-wide, not tied to a course) ──────
getAllStudentAttendance: async (options?: {
  from_date?: string;
  to_date?: string;
  student_group?: string;
}): Promise<ApiResult<StudentAttendanceRow[]>> => {
  const LIST_FIELDS = [
    "name", "student", "student_name", "status",
    "date", "student_group", "course_schedule", "docstatus",
  ];

  const { from_date, to_date, student_group } = options ?? {};
  const filterClauses: any[] = [["docstatus", "!=", 2]];

  if (from_date && to_date) {
    filterClauses.push(["date", "between", [from_date, to_date]]);
  } else if (from_date) {
    filterClauses.push(["date", ">=", from_date]);
  } else if (to_date) {
    filterClauses.push(["date", "<=", to_date]);
  }
  if (student_group) {
    filterClauses.push(["student_group", "=", student_group]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Student Attendance", {
      params: {
        fields: JSON.stringify(LIST_FIELDS),
        filters: JSON.stringify(filterClauses),
        limit_page_length: 0, // 0 = sab records, no limit
        order_by: "date desc",
      },
    })
  );

  if (!res.ok) return res as ApiResult<StudentAttendanceRow[]>;
  const rows = asArray<StudentAttendanceRow>(res.data?.data ?? res.data);
  return { ok: true, data: rows };
},
getStudentAttendanceDetail: async (name: string): Promise<ApiResult<StudentAttendanceRow>> => {
  const DETAIL_FIELDS = ["name", "student", "student_name", "course_schedule", "student_group", "date", "status", "docstatus"];
  const res = await handleResponse<any>(
    resourceClient.get(`Student Attendance/${encodeURIComponent(name)}`, {
      params: { fields: JSON.stringify(DETAIL_FIELDS) },
    })
  );
  if (!res.ok) return res as ApiResult<StudentAttendanceRow>;
  return { ok: true, data: res.data as StudentAttendanceRow };
},
// ── Admin — Sales Invoice (asal revenue source) ──────────────────────────

getAllFees: async (): Promise<ApiResult<SalesInvoiceDetail[]>> => {
  const LIST_FIELDS = [
    "name",
    "student",
    "customer",
    "customer_name",
    "fee_schedule",
    "company",
    "grand_total",
    "outstanding_amount",
    "paid_amount",
    "status",
    "docstatus",
    "due_date",
    "posting_date",
  ];

  const res = await handleResponse<any>(
    resourceClient.get("Sales Invoice", {
      params: {
        fields: JSON.stringify(LIST_FIELDS),
        // ✅ Sirf submitted invoices — cancelled/draft revenue mein count nahi honi chahiye
        filters: JSON.stringify([["docstatus", "=", 1]]),
        limit_page_length: 0,
        order_by: "due_date desc",
      },
    })
  );

  if (!res.ok) return res as ApiResult<SalesInvoiceDetail[]>;

  const rows = asArray<SalesInvoiceDetail>(res.data?.data ?? res.data);
  if (rows.length === 0) return { ok: true, data: [] };

  const hasRichData = rows.some((r) => r.customer_name || r.grand_total !== undefined);
  if (hasRichData) return { ok: true, data: rows };

  const names = rows.map((r) => r.name).filter(Boolean);
  const CHUNK_SIZE = 10;
  const details: SalesInvoiceDetail[] = [];
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((n) => api.getFeesDetail(n))
    );
    settled.forEach((s) => {
      if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
    });
  }
  return { ok: true, data: details };
},

getFeesDetail: async (name: string): Promise<ApiResult<SalesInvoiceDetail>> => {
  const DETAIL_FIELDS = [
    "name",
    "student",
    "customer",
    "customer_name",
    "fee_schedule",
    "company",
    "grand_total",
    "outstanding_amount",
    "paid_amount",
    "status",
    "docstatus",
    "due_date",
    "posting_date",
  ];

  const res = await handleResponse<any>(
    resourceClient.get(`Sales Invoice/${encodeURIComponent(name)}`, {
      params: { fields: JSON.stringify(DETAIL_FIELDS) },
    })
  );

  if (!res.ok) return res as ApiResult<SalesInvoiceDetail>;
  return { ok: true, data: res.data as SalesInvoiceDetail };
},



// ── Admin — Salary Slip ─────────────────────────

getAllSalarySlips: async (
  options?: {
    status?: string;        // Draft | Submitted | Cancelled
    from_date?: string;     // filters on start_date
    to_date?: string;       // filters on end_date
    employee?: string;
  }
): Promise<ApiResult<SalarySlipDetail[]>> => {

  const LIST_FIELDS = [
    "name",
    "employee",
    "employee_name",
    "department",
    "designation",
    "company",
    "posting_date",
    "start_date",
    "end_date",
    "gross_pay",
    "total_deduction",
    "net_pay",
    "currency",
    "status",
    "docstatus",
  ];

  const { status, from_date, to_date, employee } = options ?? {};

  const filterClauses: any[] = [];

  if (status && status !== "all") {
    filterClauses.push(["status", "=", status]);
  }
  // Without a date range, this pulls every salary slip ever generated
  // for every employee — same trap as Attendance. Scope it by default.
  if (from_date) {
    filterClauses.push(["start_date", ">=", from_date]);
  }
  if (to_date) {
    filterClauses.push(["end_date", "<=", to_date]);
  }

  if (employee) {
    filterClauses.push(["employee", "=", employee]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Salary Slip", {
      params: {
        fields: JSON.stringify(LIST_FIELDS),

        ...(filterClauses.length
          ? { filters: JSON.stringify(filterClauses) }
          : {}),

        limit_page_length: 0,

        order_by: "start_date desc",
      },
    })
  );

  if (!res.ok)
    return res as ApiResult<SalarySlipDetail[]>;

  const rows = asArray<SalarySlipDetail>(
    res.data?.data ?? res.data
  );

  return {
    ok: true,
    data: rows,
  };
},

getSalarySlipDetail: async (
  id: string
): Promise<ApiResult<SalarySlipDetail>> => {

  const DETAIL_FIELDS = [
    "name",
    "employee",
    "employee_name",
    "department",
    "designation",
    "company",
    "posting_date",
    "start_date",
    "end_date",
    "payroll_frequency",
    "gross_pay",
    "total_deduction",
    "net_pay",
    "total_working_days",
    "payment_days",
    "leave_without_pay",
    "absent_days",
    "currency",
    "status",
    "docstatus",
    "mode_of_payment",
    "bank_name",
    "bank_account_no",
    "earnings",
    "deductions",
  ];

  const res = await handleResponse<any>(
    resourceClient.get(
      `Salary Slip/${encodeURIComponent(id)}`,
      {
        params: {
          fields: JSON.stringify(DETAIL_FIELDS),
        },
      }
    )
  );

  if (!res.ok)
    return res as ApiResult<SalarySlipDetail>;

  return {
    ok: true,
    data: res.data,
  };
},
  // ── Dashboard ─────────────────────────────────────────────────────────────

  getDashboard: () =>
    handleResponse<any>(apiClient.get("employee_self_service.mobile.v1.ess.get_dashboard")),

  // ── Leaves ────────────────────────────────────────────────────────────────

 getLeaveSummary: async () => {
    const res = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_leave_type")
    );
    if (!res.ok) return res;
    const list = Array.isArray(res.data) ? res.data : extractList(res.data, "data");
    return { ok: true as const, data: list };
  },

 getLeaveHistory: async () => {
    const res = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_leave_application_list")
    );
    if (!res.ok) return res;
    return { ok: true as const, data: res.data };
  },

  makeLeave: (payload: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason?: string;
  }) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.make_leave_application", payload)
    ),

  getLeaveTypes: async (): Promise<ApiResult<string[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("Leave Type", {
        params: { fields: JSON.stringify(["name"]) },
      })
    );
    if (!res.ok) return res as ApiResult<string[]>;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true, data: rows.map((r: any) => r.name).filter(Boolean) };
  },

  
  // ── Payroll ───────────────────────────────────────────────────────────────

  getSalarySlips: async () => {
    const res = await handleResponse<any[]>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_salary_sllip")
    );
    if (!res.ok) return res;
    const list = extractList(res.data, "salary_slips", "slips");
    return { ok: true as const, data: list };
  },
  getSalarySlipDownloadUrl: (ss_id: string) =>
    `${BASE_URL}/employee_self_service.mobile.v1.ess.download_salary_slip?ss_id=${encodeURIComponent(ss_id)}`,

  // ── Notifications (Notification Log doctype — asal per-user notifications) ──

getUnreadNotificationCount: async (): Promise<ApiResult<number>> => {
  const userRes = await handleResponse<any>(
    apiClient.get("frappe.auth.get_logged_user")
  );
  if (!userRes.ok) return userRes as ApiResult<number>;

  const currentUser = userRes.data;

  const res = await handleResponse<any>(
    resourceClient.get("Notification Log", {
      params: {
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([
          ["for_user", "=", currentUser],
          ["read", "=", 0],
        ]),
        limit_page_length: 0,
      },
    })
  );

  if (!res.ok) return res as ApiResult<number>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  return { ok: true, data: rows.length };
},

  getNotifications: async (): Promise<ApiResult<any[]>> => {
    const userRes = await handleResponse<any>(
      apiClient.get("frappe.auth.get_logged_user")
    );
    if (!userRes.ok) return userRes;

    const currentUser = userRes.data;

    const res = await handleResponse<any>(
      resourceClient.get("Notification Log", {
        params: {
          fields: JSON.stringify([
            "name", "subject", "email_content", "for_user", "from_user",
            "type", "document_type", "document_name", "read", "creation",
          ]),
          filters: JSON.stringify([["for_user", "=", currentUser]]),
          limit_page_length: 50,
          order_by: "creation desc",
        },
      })
    );

    if (!res.ok) return res as ApiResult<any[]>;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  markRead: (id: string) =>
    handleResponse<any>(
      resourceClient.put(`Notification Log/${encodeURIComponent(id)}`, { read: 1 })
    ),

// ─────────────────────────────────────────────────────────────────────────────
  // 📞 DIRECTORY (ESS)
  // ─────────────────────────────────────────────────────────────────────────────

  getDirectory: async (search?: string): Promise<ApiResult<DirectoryEmployee[]>> => {
    const filters = search
      ? JSON.stringify([["Employee", "employee_name", "like", `%${search}%`]])
      : undefined;
    const res = await handleResponse<any>(
      resourceClient.get("Employee", {
        params: {
          fields: JSON.stringify([
            "name", "employee_name", "designation", "department",
            "company_email", "cell_number", "image",
          ]),
          ...(filters ? { filters } : {}),
          limit_page_length: 50,
        },
      })
    );
    if (!res.ok) return res as ApiResult<DirectoryEmployee[]>;
    const rows = asArray<DirectoryEmployee>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  // ── Admin — Employees ────────────────────────────────────────────────────
  // Used by the Admin dashboard's Employees module (AdminEmployeesPage).
  // getAllEmployees: lightweight fields for the list/grid view.
  // getEmployeeDetail: full profile fields for the detail side panel.

  getAllEmployees: async (): Promise<ApiResult<EmployeeDetail[]>> => {
    const LIST_FIELDS = [
      "name", "employee_name", "designation", "department",
      "employment_type", "status", "image", "cell_number",
    ];

    const res = await handleResponse<any>(
      resourceClient.get("Employee", {
        params: {
          fields: JSON.stringify(LIST_FIELDS),
          limit_page_length: 0, // 0 = no limit, return every record
          order_by: "employee_name asc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<EmployeeDetail[]>;

    const rows = asArray<EmployeeDetail>(res.data?.data ?? res.data);
    if (rows.length === 0) return { ok: true, data: [] };

    // Frappe's list endpoint only returns `name` if `fields` isn't honoured
    // (older version / permission edge case). Fall back to per-record detail
    // fetches so the UI never silently renders blank cards.
    const hasRichData = rows.some((r) => r.employee_name || r.designation || r.status);
    if (hasRichData) return { ok: true, data: rows };

    const names = rows.map((r) => r.name).filter(Boolean);
    const CHUNK_SIZE = 10;
    const details: EmployeeDetail[] = [];
    for (let i = 0; i < names.length; i += CHUNK_SIZE) {
      const chunk = names.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map((n) => api.getEmployeeDetail(n))
      );
      settled.forEach((s) => {
        if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
      });
    }
    return { ok: true, data: details };
  },

  getEmployeeDetail: async (id: string): Promise<ApiResult<EmployeeDetail>> => {
    const DETAIL_FIELDS = [
      "name", "employee_name", "first_name", "last_name", "gender", "date_of_birth",
      "custom_employeeidtype", "custom_employee_nic", "marital_status", "blood_group",
      "cell_number", "personal_email", "user_id", "permanent_address",
      "company", "employment_type", "designation", "department", "date_of_joining",
      "default_shift", "holiday_list", "reports_to",
      "leave_approver", "expense_approver", "shift_request_approver",
      "salary_mode", "salary_currency", "bank_name", "iban",
      "status", "image",
    ];

    const res = await handleResponse<any>(
      resourceClient.get(`Employee/${encodeURIComponent(id)}`, {
        params: { fields: JSON.stringify(DETAIL_FIELDS) },
      })
    );
    if (!res.ok) return res as ApiResult<EmployeeDetail>;
    return { ok: true, data: res.data as EmployeeDetail };
  },

  // ── Admin — Leave Applications ────────────────────────────────────────────

  getAllLeaveApplications: async (
    status?: string
  ): Promise<ApiResult<LeaveApplicationDetail[]>> => {
    const LIST_FIELDS = [
      "name", "employee", "employee_name", "leave_type",
      "from_date", "to_date", "total_leave_days", "status",
      "leave_approver_name", "posting_date",
    ];

    const filters =
      status && status !== "all"
        ? JSON.stringify([["Leave Application", "status", "=", status]])
        : undefined;

    const res = await handleResponse<any>(
      resourceClient.get("Leave Application", {
        params: {
          fields: JSON.stringify(LIST_FIELDS),
          ...(filters ? { filters } : {}),
          limit_page_length: 0, // 0 = no limit, return every record
          order_by: "posting_date desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<LeaveApplicationDetail[]>;

    const rows = asArray<LeaveApplicationDetail>(res.data?.data ?? res.data);
    if (rows.length === 0) return { ok: true, data: [] };

    // Fallback: server only returned bare `{ name }` rows.
    const hasRichData = rows.some((r) => r.employee_name || r.status || r.leave_type);
    if (hasRichData) return { ok: true, data: rows };

    const names = rows.map((r) => r.name).filter(Boolean);
    const CHUNK_SIZE = 10;
    const details: LeaveApplicationDetail[] = [];
    for (let i = 0; i < names.length; i += CHUNK_SIZE) {
      const chunk = names.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map((n) => api.getLeaveApplicationDetail(n))
      );
      settled.forEach((s) => {
        if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
      });
    }
    return { ok: true, data: details };
  },

  getLeaveApplicationDetail: async (
    id: string
  ): Promise<ApiResult<LeaveApplicationDetail>> => {
    const DETAIL_FIELDS = [
      "name", "employee", "employee_name", "leave_type", "company",
      "from_date", "to_date", "half_day", "total_leave_days",
      "description", "leave_balance", "leave_approver",
      "leave_approver_name", "posting_date", "status",
    ];

    const res = await handleResponse<any>(
      resourceClient.get(`Leave Application/${encodeURIComponent(id)}`, {
        params: { fields: JSON.stringify(DETAIL_FIELDS) },
      })
    );
    if (!res.ok) return res as ApiResult<LeaveApplicationDetail>;
    return { ok: true, data: res.data as LeaveApplicationDetail };
  },
  updateLeaveApplicationStatus: (
    id: string,
    status: "Open" | "Approved" | "Rejected" | "Cancelled"
  ) =>
    handleResponse<any>(
      resourceClient.put(`Leave Application/${encodeURIComponent(id)}`, { status })
    ),

  // ── ToDo ──────────────────────────────────────────────────────────────────

  getTodos: async (): Promise<ApiResult<TodoRecord[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("ToDo", {
        params: {
          fields: JSON.stringify([
            "name", "description", "status", "priority",
            "date", "owner", "assigned_by_full_name",
            "reference_type", "reference_name", "color",
          ]),
          limit_page_length: 100,
          order_by: "modified desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<TodoRecord[]>;
    const rows = asArray<TodoRecord>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  createTodo: (payload: {
    description: string;
    status?: string;
    priority?: string;
    date?: string;
  }) => handleResponse<any>(resourceClient.post("ToDo", payload)),

  updateTodo: (
    name: string,
    payload: { status?: string; priority?: string; description?: string; date?: string }
  ) =>
    handleResponse<any>(resourceClient.put(`ToDo/${encodeURIComponent(name)}`, payload)),

  deleteTodo: (name: string) =>
    handleResponse<any>(resourceClient.delete(`ToDo/${encodeURIComponent(name)}`)),


  

// ════════════════════════════════════════════════════════════════════════════
// ── Add inside `export const api = { ... }` — Admin — Notice Board ──────────
// (Mirrors the Department module's list/detail/fallback pattern, plus
//  create/update/delete since admin can fully manage notices.)
// ════════════════════════════════════════════════════════════════════════════

  // ── Admin — Notice Board ───────────────────────────────────────────────────

  getAllNoticeBoard: async (): Promise<ApiResult<NoticeBoardDetail[]>> => {
    const LIST_FIELDS = ["name", "subject", "message", "type", "creation", "modified"];

    const res = await handleResponse<any>(
      resourceClient.get("NoticeBoard", {
        params: {
          fields: JSON.stringify(LIST_FIELDS),
          limit_page_length: 0,
          order_by: "creation desc",
        },
      })
    );

    if (!res.ok) return res as ApiResult<NoticeBoardDetail[]>;

    const rows = asArray<NoticeBoardDetail>(res.data?.data ?? res.data);
    if (rows.length === 0) return { ok: true, data: [] };

    // Same fallback as Department/Employee: if the list endpoint only
    // returns bare `{ name }` rows, fetch each record's detail individually.
    const hasRichData = rows.some((r) => (r as any).subject || (r as any).message);
    if (hasRichData) return { ok: true, data: rows };

    const names = rows.map((r) => r.name).filter(Boolean);
    const CHUNK_SIZE = 10;
    const details: NoticeBoardDetail[] = [];

    for (let i = 0; i < names.length; i += CHUNK_SIZE) {
      const chunk = names.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map((n) => api.getNoticeBoardDetail(n))
      );
      settled.forEach((s) => {
        if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
      });
    }

    return { ok: true, data: details };
  },

  getNoticeBoardDetail: async (
    name: string
  ): Promise<ApiResult<NoticeBoardDetail>> => {
    const DETAIL_FIELDS = [
      "name", "owner", "creation", "modified", "modified_by",
      "docstatus", "idx", "subject", "message", "type", "doctype",
    ];

    const res = await handleResponse<any>(
      resourceClient.get(`NoticeBoard/${encodeURIComponent(name)}`, {
        params: { fields: JSON.stringify(DETAIL_FIELDS) },
      })
    );

    if (!res.ok) return res as ApiResult<NoticeBoardDetail>;
    return { ok: true, data: res.data as NoticeBoardDetail };
  },

  createNoticeBoard: (payload: CreateNoticeBoardPayload) =>
    handleResponse<NoticeBoardDetail>(
      resourceClient.post("NoticeBoard", payload)
    ),

  updateNoticeBoard: (name: string, payload: UpdateNoticeBoardPayload) =>
    handleResponse<NoticeBoardDetail>(
      resourceClient.put(`NoticeBoard/${encodeURIComponent(name)}`, payload)
    ),

  deleteNoticeBoard: (name: string) =>
    handleResponse<any>(
      resourceClient.delete(`NoticeBoard/${encodeURIComponent(name)}`)
    ),
  // ── Calendar Events ───────────────────────────────────────────────────────

  getEvents: async (startDate?: string, endDate?: string, employeeName?: string): Promise<ApiResult<CalendarEvent[]>> => {
    const filters: any[] = [["Event", "event_type", "=", "Public"]];
    if (employeeName) {
      filters.push(["Event", "owner", "=", employeeName]);
    }
    if (startDate) filters.push(["Event", "starts_on", ">=", `${startDate} 00:00:00`]);
    if (endDate)   filters.push(["Event", "ends_on", "<=", `${endDate} 23:59:59`]);

    const res = await handleResponse<any>(
      resourceClient.get("Event", {
        params: {
          fields: JSON.stringify([
            "name", "subject", "starts_on", "ends_on",
            "color", "event_type", "status", "all_day",
          ]),
          filters: JSON.stringify(filters),
          limit_page_length: 500,
          order_by: "starts_on asc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<CalendarEvent[]>;
    const rows = asArray<CalendarEvent>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  createEvent: (payload: {
    subject: string;
    starts_on: string;
    ends_on?: string;
    color?: string;
    event_type?: string;
    description?: string;
    all_day?: number;
  }) => handleResponse<any>(resourceClient.post("Event", payload)),

  deleteEvent: (name: string) =>
    handleResponse<any>(resourceClient.delete(`Event/${encodeURIComponent(name)}`)),




// ── Admin — Student Groups (ALL groups, no instructor resolution) ──────────

  // ─────────────────────────────────────────────────────────────────────────────
  // 📅 ATTENDANCE (ESS)
  // ─────────────────────────────────────────────────────────────────────────────
getAttendanceList: (year: number, month: number) =>
    handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_attendance_list", {
        params: { year, month },
      })
    ),

  getAttendance: async (year: number, month: number): Promise<ApiResult<AttendanceRecord[]>> => {
    const res = await handleResponse<any>(
      apiClient.get("employee_self_service.mobile.v1.ess.get_attendance_list", {
        params: { year, month },
      })
    );
    if (!res.ok) return res as ApiResult<AttendanceRecord[]>;
    const rawList = extractList(res.data, "attendance_list", "attendance");
    const mapped: AttendanceRecord[] = rawList.map((item: any, idx: number) => ({
      id: item.name || `rec-${idx}`,
      date: item.attendance_date || item.date || "",
      inTime: extractTime(item.in_time),
      outTime: extractTime(item.out_time),
      status: item.status || "Other",
    }));
    return { ok: true, data: mapped };
  },

  createLog: (data: any) =>
    handleResponse<any>(
      apiClient.post("employee_self_service.mobile.v1.ess.create_employee_log", data)
    ),


  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 👨‍🏫 FACULTY / TEACHER DASHBOARD (ESS Teacher)
  // ═══════════════════════════════════════════════════════════════════════════════

  getFacultyPrograms: async () => {
    
    const instructorName = await getInstructorName();
    if (!instructorName) return { ok: false as const, error: "Instructor name not found" };

    const res = await handleResponse<any>(
      resourceClient.get("Course Schedule", {
        params: {
          fields: JSON.stringify(["program"]),
          filters: JSON.stringify([
            // ✅ instructor = Instructor ID (TA-XXXXX derived from employee LA-XXXXX)
            ["Course Schedule", "instructor", "=", instructorName],
          ]),
          limit_page_length: 500,
        },
      })
    );
    if (!res.ok) return res;

    const rows = asArray<any>(res.data?.data ?? res.data);
    const seen = new Map<string, any>();
    rows.forEach((r: any) => {
      if (r.program && !seen.has(r.program)) {
        seen.set(r.program, { name: r.program, program_name: r.program });
      }
    });

    return { ok: true as const, data: Array.from(seen.values()) };
  },

 getFacultyCourses: async () => {
    const instructorName = await getInstructorName();
    if (!instructorName) return { ok: false as const, error: "Instructor name not found" };

    const res = await handleResponse<any>(
      resourceClient.get("Course Schedule", {
        params: {
          fields: JSON.stringify(["course"]),
          filters: JSON.stringify([
            // ✅ instructor = Instructor ID (TA-XXXXX derived from employee LA-XXXXX)
            ["Course Schedule", "instructor", "=", instructorName],
          ]),
          limit_page_length: 500,
        },
      })
    );
    if (!res.ok) return res;

    const rows = asArray<any>(res.data?.data ?? res.data);
    const seen = new Map<string, any>();
    rows.forEach((r: any) => {
      if (r.course && !seen.has(r.course)) {
        seen.set(r.course, { name: r.course, course_name: r.course });
      }
    });

    return { ok: true as const, data: Array.from(seen.values()) };
  },


   // ── Faculty — Course Schedule ─────────────────────────────────────────────
  // ✅ CHANGE: instructor_name ki jagah instructor (ID) se filter

 getCourseSchedule: async (programFilter?: string) => {
    try {
      const instructorName = await getInstructorName();
      if (!instructorName) return { ok: false as const, error: "Instructor name not found" };

      const filters: any[] = [
        // ✅ instructor = Instructor ID (TA-XXXXX derived from employee LA-XXXXX)
        ["Course Schedule", "instructor", "=", instructorName],
      ];
      if (programFilter) filters.push(["Course Schedule", "program", "=", programFilter]);

      const res = await handleResponse<any>(
        resourceClient.get("Course Schedule", {
          params: {
            fields: JSON.stringify([
              "name", "student_group", "instructor", "instructor_name",
              "program", "course", "schedule_date", "room",
              "from_time", "to_time", "title", "color", "class_schedule_color",
            ]),
            filters: JSON.stringify(filters),
            limit_page_length: 500,
            order_by: "schedule_date asc, from_time asc",
          },
        })
      );

      if (!res.ok) return res;
      return { ok: true as const, data: asArray<any>(res.data?.data ?? res.data) };

    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Network error" };
    }
  },
// services/api.ts mein add karo

getStudentGroupsByNames: async (names: string[]) => {
  if (names.length === 0) return { ok: true as const, data: [] };

  const res = await handleResponse<any>(
    resourceClient.get("Student Group", {
      params: {
        fields: JSON.stringify(["name", "student_group_name", "program", "course", "batch"]),
        filters: JSON.stringify([["Student Group", "name", "in", names]]),
        limit_page_length: names.length,
      },
    })
  );
  if (!res.ok) return res;
  return { ok: true as const, data: asArray<any>(res.data?.data ?? res.data) };
},

  getStudentGroups: async (programFilter?: string, instructorName?: string) => {
    // Agar instructorName pass nahi hua toh profile se lo
    const resolvedName = instructorName || await getInstructorName();

    if (resolvedName) {
      const scheduleFilters: any[] = [
        // ✅ instructor = Instructor ID (TA-XXXXX derived from employee LA-XXXXX)
        ["Course Schedule", "instructor", "=", resolvedName],
      ];
      if (programFilter) {
        scheduleFilters.push(["Course Schedule", "program", "=", programFilter]);
      }

      const res = await handleResponse<any>(
        resourceClient.get("Course Schedule", {
          params: {
            fields: JSON.stringify(["student_group", "program", "course"]),
            filters: JSON.stringify(scheduleFilters),
            limit_page_length: 500,
          },
        })
      );
      if (!res.ok) return res;

      const rows = asArray<any>(res.data?.data ?? res.data);
      const seen = new Map<string, any>();
      rows.forEach((r: any) => {
        if (r.student_group && !seen.has(r.student_group)) {
          seen.set(r.student_group, {
            name: r.student_group,
            student_group_name: r.student_group,
            program: r.program,
            course: r.course,
          });
        }
      });

      return { ok: true as const, data: Array.from(seen.values()) };
    }

    // Bina instructor filter ke fallback
    const filters = programFilter
      ? JSON.stringify([["Student Group", "program", "=", programFilter]])
      : undefined;

    const res = await handleResponse<any>(
      resourceClient.get("Student Group", {
        params: {
          fields: JSON.stringify(["name", "student_group_name", "program", "course", "batch"]),
          ...(filters ? { filters } : {}),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    return { ok: true as const, data: asArray<any>(res.data?.data ?? res.data) };
  },

  getStudentGroupDetail: (groupName: string) =>
    handleResponse<any>(
      resourceClient.get(`Student Group/${encodeURIComponent(groupName)}`)
    ),


  // ── Faculty — Student Groups ──────────────────────────────────────────────
  // ✅ CHANGE: instructor_name ki jagah instructor (ID) se filter
  // Ye function sirf faculty/instructor ke liye hai — Course Schedule se
  // filter hota hai. Admin ke liye getAllStudentGroups() use karo neeche.

  // ── Faculty — Student Attendance ──────────────────────────────────────────

   getStudentAttendance: async (courseSchedule: string) => {
    const res = await handleResponse<any>(
      resourceClient.get("Student Attendance", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name",
            "course_schedule", "student_group", "date", "status",
          ]),
          filters: JSON.stringify([
            ["Student Attendance", "course_schedule", "=", courseSchedule],
          ]),
          limit_page_length: 200,
        },
      })
    );
    if (!res.ok) return res;
    return { ok: true as const, data: asArray<any>(res.data?.data ?? res.data) };
  },

  saveStudentAttendance: async (
    payload: CreateAttendancePayload
  ): Promise<{ success: boolean; error?: string }> => {
    const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;

    try {
      const checkUrl = new URL(
        `${RESOURCE_URL}/Student%20Attendance`,
        window.location.origin
      );
      checkUrl.searchParams.set("fields", JSON.stringify(["name", "status", "docstatus"]));
      checkUrl.searchParams.set(
        "filters",
        JSON.stringify([
          ["course_schedule", "=", payload.course_schedule],
          ["student", "=", payload.student],
        ])
      );
      checkUrl.searchParams.set("limit_page_length", "1");

      const checkRes = await fetchWithTimeout(checkUrl.toString(), {
        credentials: "include",
        headers: buildHeaders(),
      });
      const checkJson = await checkRes.json().catch(() => ({ data: [] }));
      const existing: any[] = Array.isArray(checkJson.data) ? checkJson.data : [];

      if (existing.length > 0) {
        const rec = existing[0];

        if (rec.docstatus === 1) {
          const cancelRes = await fetchWithTimeout(
            `${RESOURCE_URL}/Student%20Attendance/${encodeURIComponent(rec.name)}`,
            {
              method: "PUT",
              credentials: "include",
              headers: buildHeaders(),
              body: JSON.stringify({ docstatus: 2 }),
            }
          );
          if (!cancelRes.ok) {
            const err = await cancelRes.json().catch(() => ({}));
            return {
              success: false,
              error: parseErpError(err, "Could not cancel existing submitted record"),
            };
          }
        }

        const putRes = await fetchWithTimeout(
          `${RESOURCE_URL}/Student%20Attendance/${encodeURIComponent(rec.name)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: buildHeaders(),
            body: JSON.stringify({ status: payload.status, docstatus: 0 }),
          }
        );
        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}));
          return {
            success: false,
            error: parseErpError(err, `Update failed: ${putRes.status}`),
          };
        }
        return { success: true };
      }

      const postRes = await fetchWithTimeout(`${RESOURCE_URL}/Student%20Attendance`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({
          doctype: "Student Attendance",
          student: payload.student,
          student_name: payload.student_name,
          course_schedule: payload.course_schedule,
          student_group: payload.student_group,
          date: payload.date,
          status: payload.status,
        }),
      });
      if (!postRes.ok) {
        const err = await postRes.json().catch(() => ({}));
        return {
          success: false,
          error: parseErpError(err, `Create failed: ${postRes.status}`),
        };
      }
          return { success: true };
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return { success: false, error: "Request timed out — server took too long to respond" };
      }
      return { success: false, error: e?.message || "Network error" };
    }
  },
  
  bulkMarkAttendance: async (
    rows: BulkAttendanceRow[]
  ): Promise<ApiResult<BulkAttendanceResult>> => {
    return handleResponse<BulkAttendanceResult>(
      apiClient.post("learnacademy_ess.api.attendance.bulk_mark_attendance", { rows })
    );
  },
    // ── Faculty — Assessment Plans ────────────────────────────────────────────
    // ── Faculty — Assessment Plans ────────────────────────────────────────────

  getAssessmentPlans: async () => {
    const res = await handleResponse<any>(
      resourceClient.get("Assessment Plan", {
        params: {
          fields: JSON.stringify([
            "name", "student_group", "program", "course",
            "academic_year", "academic_term", "assessment_group",
            "grading_scale", "maximum_assessment_score",
          ]),
          limit_page_length: 500,
        },
      })
    );
    if (!res.ok) return res;
    return { ok: true as const, data: asArray<any>(res.data?.data ?? res.data) };
  },

  getAssessmentPlanDetail: (planName: string) =>
    handleResponse<any>(
      resourceClient.get(`Assessment Plan/${encodeURIComponent(planName)}`)
    ),
 

 // ── Faculty — Assessment Results ──────────────────────────────────────────

 getAssessmentResults: async (planName?: string, groupName?: string) => {
    const filters: any[] = [];
    if (planName) filters.push(["assessment_plan", "=", planName]);
    if (groupName) filters.push(["student_group", "=", groupName]);

    const res = await handleResponse<any>(
      resourceClient.get("Assessment Result", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name",
            "assessment_plan", "student_group",
            "program", "course",
            "total_score", "maximum_score", "grade",
            "comment",
          ]),
          ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
          limit_page_length: 500,
        },
      })
    );
    if (!res.ok) return res;
    return { ok: true as const, data: asArray<any>(res.data?.data ?? res.data) };
  },
 
// ═══════════════════════════════════════════════════════════════════════════════
// 🎓 ACADEMICS PORTAL - STUDENTS MANAGEMENT (FULL CRUD) — COMPLETE (v2)

// Includes: original student CRUD + status update (UNCHANGED) + section
// transfer helpers + NEW Program Enrollment sync helpers (fixes batch
// validation error on Section Transfer).
// ═══════════════════════════════════════════════════════════════════════════════

getAcadStudents: async (filters?: AcadStudentFilters): Promise<ApiResult<AcadStudent[]>> => {
  const erpFilters: any[] = [];

  if (filters?.search) {
    erpFilters.push(["Student", "student_name", "like", `%${filters.search}%`]);
  }
  if (filters?.status) {
    // Map frontend "On Leave" (space) -> ERP "On-Leave" (hyphen)
    const erpStatus = filters.status === "On Leave" ? "On-Leave" : filters.status;
    erpFilters.push(["Student", "status", "=", erpStatus]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Student", {
      params: {
        fields: JSON.stringify([
          "name",
          "student_name",
          "first_name",
          "student_email_id",
          "date_of_birth",
          "joining_date",
          "enabled",
          "status",
          "custom_batch",
          "custom_serial_no",
          "custom_student_id_number",
          "custom_student_id_type",
          "nationality",
          "city",
          "country",
          "blood_group",
          "image",
        ]),
        ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
        limit_page_length: 500,
        order_by: "student_name asc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<AcadStudent[]>;
  const rows = asArray<AcadStudent>(res.data?.data ?? res.data);
  return { ok: true, data: rows };
},

getAcadStudentDetail: async (studentId: string): Promise<ApiResult<AcadStudentDetail>> => {
  const res = await handleResponse<any>(
    resourceClient.get(`Student/${encodeURIComponent(studentId)}`)
  );
  if (!res.ok) return res as ApiResult<AcadStudentDetail>;
  const data = res.data?.data ?? res.data;
  return { ok: true, data };
},

createAcadStudent: async (payload: Partial<AcadStudent>): Promise<ApiResult<AcadStudent>> => {
  const body = { doctype: "Student", ...payload };
  const res = await handleResponse<any>(resourceClient.post("Student", body));
  if (!res.ok) return res as ApiResult<AcadStudent>;
  return { ok: true, data: res.data?.data ?? res.data };
},

updateAcadStudent: async (
  studentId: string,
  payload: Partial<AcadStudent>
): Promise<ApiResult<AcadStudent>> => {
  const res = await handleResponse<any>(
    resourceClient.put(`Student/${encodeURIComponent(studentId)}`, payload)
  );
  if (!res.ok) return res as ApiResult<AcadStudent>;
  return { ok: true, data: res.data?.data ?? res.data };
},

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STUDENT STATUS
// ⚠️ UNCHANGED — working correctly, do not modify.
// Writes to the REAL ERPNext `status` field (Active / Inactive / Suspended / On-Leave)
// and keeps `enabled` in sync (0 only when Inactive, 1 for all enrolled states).
// ─────────────────────────────────────────────────────────────────────────────
updateStudentStatus: async (
  studentId: string,
  newStatus: "Active" | "Inactive" | "Suspended" | "On Leave"
): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  const erpStatus = newStatus === "On Leave" ? "On-Leave" : newStatus;
  const enabled: 0 | 1 = newStatus === "Inactive" ? 0 : 1;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    // First, check if the student exists
    const checkRes = await fetch(
      `${METHOD_URL}/frappe.client.get_value`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: "Student",
          fieldname: "name",
          filters: JSON.stringify({ name: studentId }),
        }),
      }
    );

    if (!checkRes.ok) {
      // Student not found - return a friendly message
      return {
        ok: false,
        error: "Student ID not found. Please create the student ID in ERP first, then try again.",
      };
    }

    const checkData = await checkRes.json().catch(() => ({}));
    if (!checkData?.message) {
      return {
        ok: false,
        error: "Student ID not found. Please create the student ID in ERP first, then try again.",
      };
    }

    // Student exists - proceed with status update
    const statusRes = await fetch(
      `${METHOD_URL}/frappe.client.set_value`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: "Student",
          name: studentId,
          fieldname: "status",
          value: erpStatus,
        }),
      }
    );

    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({}));
      return {
        ok: false,
        error: parseErpError(err, `Status update failed (HTTP ${statusRes.status})`),
      };
    }

    await fetch(
      `${METHOD_URL}/frappe.client.set_value`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: "Student",
          name: studentId,
          fieldname: "enabled",
          value: enabled,
        }),
      }
    );

    const json = await statusRes.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };

  } catch (e: any) {
    // Check if the error contains "Could not find User ID" message
    if (e?.message?.includes("Could not find User ID") || 
        e?.message?.includes("User ID") ||
        e?.message?.includes("not found")) {
      return {
        ok: false,
        error: "Student ID not found. Please create the student ID in ERP first, then try again.",
      };
    }
    return { ok: false, error: e?.message ?? "Network error during status update" };
  }
},

deleteAcadStudent: async (studentId: string): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.delete(`Student/${encodeURIComponent(studentId)}`)
  );
  return res;
},

getAcadStudentGroups: async (): Promise<ApiResult<any[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get("Student Group", {
      params: {
        fields: JSON.stringify([
          "name",
          "student_group_name",
          "program",
          "batch",
          "max_strength",
          "academic_year",
          "academic_term",
          "disabled",
        ]),
        filters: JSON.stringify([["Student Group", "disabled", "=", 0]]),
        limit_page_length: 500,
        order_by: "program asc, name asc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<any[]>;
  return { ok: true, data: asArray<any>(res.data?.data ?? res.data) };
},

// ── GET SINGLE STUDENT GROUP DETAIL (batch, program, year, term, students) ──
getAcadStudentGroupDetail: async (groupName: string): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.get(`Student Group/${encodeURIComponent(groupName)}`)
  );
  if (!res.ok) return res as ApiResult<any>;
  const detail = res.data?.data ?? res.data;
  return { ok: true, data: detail };
},

// ─────────────────────────────────────────────────────────────────────────────
// ADD STUDENT TO SECTION 
// ─────────────────────────────────────────────────────────────────────────────
addStudentToAcadSection: async (
  sectionName: string,
  studentId: string,
  studentName: string,
  groupRollNumber?: number
): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    // Step 1: fetch current group (fresh, avoid stale data)
    const currentRes = await fetch(`${METHOD_URL}/frappe.client.get`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ doctype: "Student Group", name: sectionName }),
    });

    if (!currentRes.ok) {
      const err = await currentRes.json().catch(() => ({}));
      return { ok: false, error: parseErpError(err, "Could not fetch section details") };
    }

    const currentData = await currentRes.json().catch(() => ({}));
    const groupData = currentData?.message || currentData?.data || {};
    const existing: any[] = asArray<any>(groupData?.students ?? []);

    // Already a member — no-op
    if (existing.some((m: any) => (m.student || m.name) === studentId)) {
      return { ok: true, data: groupData };
    }

    const nextRoll =
      groupRollNumber ??
      (existing.length > 0
        ? Math.max(...existing.map((m: any) => m.group_roll_number || 0)) + 1
        : 1);

    const updatedStudents = [
      ...existing,
      {
        student: studentId,
        student_name: studentName,
        group_roll_number: nextRoll,
        active: 1,
      },
    ];

    // Step 2: set_value with proper CSRF headers (this is what actually works)
    const updateRes = await fetch(`${METHOD_URL}/frappe.client.set_value`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        doctype: "Student Group",
        name: sectionName,
        fieldname: "students",
        value: updatedStudents,
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      const errorMsg = parseErpError(err, `Could not add student to section (HTTP ${updateRes.status})`);
      if (errorMsg.includes("not enrolled in the Batch")) {
        return {
          ok: false,
          error: "Student is not enrolled in the batch. Please complete enrollment in ERP first.",
        };
      }
      return { ok: false, error: errorMsg };
    }

    const json = await updateRes.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error while adding student to section" };
  }
},

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE STUDENT FROM SECTION
// Fetches full list, filters out target, updates via set_value (CSRF-safe).
// ─────────────────────────────────────────────────────────────────────────────
removeStudentFromAcadSection: async (
  sectionName: string,
  studentId: string
): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    const currentRes = await fetch(`${METHOD_URL}/frappe.client.get`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ doctype: "Student Group", name: sectionName }),
    });

    if (!currentRes.ok) {
      const err = await currentRes.json().catch(() => ({}));
      return { ok: false, error: parseErpError(err, "Could not fetch section details") };
    }

    const currentData = await currentRes.json().catch(() => ({}));
    const groupData = currentData?.message || currentData?.data || {};
    const existing: any[] = asArray<any>(groupData?.students ?? []);
    const filtered = existing.filter((m: any) => (m.student || m.name) !== studentId);

    const updateRes = await fetch(`${METHOD_URL}/frappe.client.set_value`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        doctype: "Student Group",
        name: sectionName,
        fieldname: "students",
        value: filtered,
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return {
        ok: false,
        error: parseErpError(err, `Could not remove student from section (HTTP ${updateRes.status})`),
      };
    }

    const json = await updateRes.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error while removing student from section" };
  }
},


// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: Program Enrollment helpers — needed for Section Transfer.
// ─────────────────────────────────────────────────────────────────────────────

// ── Find the student's most recent Program Enrollment ──
getProgramEnrollmentForStudent: async (studentId: string): Promise<ApiResult<any | null>> => {
  try {
    const res = await handleResponse<any>(
      resourceClient.get("Program Enrollment", {
        params: {
          fields: JSON.stringify(["name", "student", "program", "academic_year", "student_batch_name"]),
          filters: JSON.stringify([["Program Enrollment", "student", "=", studentId]]),
          limit_page_length: 1,
          order_by: "creation desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<any | null>;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true, data: rows.length ? rows[0] : null };
  } catch (e: any) {
    return { ok: false, error: e.message || "Network error" };
  }
},

// ── Update Program Enrollment's student_batch_name (works on submitted docs) ──
updateProgramEnrollmentBatch: async (
  enrollmentName: string,
  newBatchName: string
): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    const res = await fetch(`${METHOD_URL}/frappe.client.set_value`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        doctype: "Program Enrollment",
        name: enrollmentName,
        fieldname: "student_batch_name",
        value: newBatchName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: parseErpError(err, `Batch sync failed (HTTP ${res.status})`) };
    }

    const json = await res.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error during batch sync" };
  }
},

getStudentAttendanceSummary: async (
  studentId: string,
  academicYear?: string
): Promise<ApiResult<{ total: number; present: number; absent: number; late: number; attendancePct: number }>> => {
  const erpFilters: any[] = [
    ["Student Attendance", "student", "=", studentId],
  ];
  if (academicYear) {
    erpFilters.push(["Student Attendance", "academic_year", "=", academicYear]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Student Attendance", {
      params: {
        fields: JSON.stringify(["status"]),
        filters: JSON.stringify(erpFilters),
        limit_page_length: 1000,
      },
    })
  );
  if (!res.ok) return res as ApiResult<any>;

  const rows = asArray<any>(res.data?.data ?? res.data);
  const total   = rows.length;
  const present = rows.filter((r: any) => r.status === "Present").length;
  const absent  = rows.filter((r: any) => r.status === "Absent").length;
  const late    = rows.filter((r: any) => r.status === "Late").length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

  return { ok: true, data: { total, present, absent, late, attendancePct } };
},

getStudentAssessmentResults: async (
  studentId: string,
  academicYear?: string
): Promise<ApiResult<{ results: any[]; avgScore: number }>> => {
  const erpFilters: any[] = [
    ["Assessment Result", "student", "=", studentId],
  ];
  if (academicYear) {
    erpFilters.push(["Assessment Result", "academic_year", "=", academicYear]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Assessment Result", {
      params: {
        fields: JSON.stringify([
          "name",
          "assessment_plan",
          "course",
          "total_score",
          "maximum_score",
          "grade",
          "academic_year",
          "academic_term",
        ]),
        filters: JSON.stringify(erpFilters),
        limit_page_length: 100,
        order_by: "creation desc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<any>;

  const rows = asArray<any>(res.data?.data ?? res.data);
  const results = rows.map((r: any) => ({
    ...r,
    percentage:
      r.maximum_score > 0
        ? Math.round((r.total_score / r.maximum_score) * 100)
        : 0,
  }));
  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum: number, r: any) => sum + r.percentage, 0) /
            results.length
        )
      : 0;

  return { ok: true, data: { results, avgScore } };
},

getAcadYears: async (): Promise<ApiResult<string[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get("Academic Year", {
      params: {
        fields: JSON.stringify(["name", "year_start_date", "year_end_date"]),
        limit_page_length: 20,
        order_by: "year_start_date desc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<string[]>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  return { ok: true, data: rows.map((r: any) => r.name) };
},

getAcadTerms: async (academicYear?: string): Promise<ApiResult<string[]>> => {
  const erpFilters = academicYear
    ? JSON.stringify([["Academic Term", "academic_year", "=", academicYear]])
    : undefined;

  const res = await handleResponse<any>(
    resourceClient.get("Academic Term", {
      params: {
        fields: JSON.stringify(["name", "term_start_date", "term_end_date"]),
        ...(erpFilters ? { filters: erpFilters } : {}),
        limit_page_length: 20,
      },
    })
  );
  if (!res.ok) return res as ApiResult<string[]>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  return { ok: true, data: rows.map((r: any) => r.name) };
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: Create Program Enrollment — used by "Add Student" when a section
// is assigned at creation time (Batch-based Student Groups require this).
// ─────────────────────────────────────────────────────────────────────────────
createProgramEnrollment: async (payload: {
  student: string;
  program: string;
  academic_year: string;
  student_batch_name?: string;
  enrollment_date?: string;
}): Promise<ApiResult<any>> => {
  try {
    const body: any = {
      doctype: "Program Enrollment",
      student: payload.student,
      program: payload.program,
      academic_year: payload.academic_year,
      enrollment_date: payload.enrollment_date || new Date().toISOString().split("T")[0],
    };
    if (payload.student_batch_name) body.student_batch_name = payload.student_batch_name;

    const res = await handleResponse<any>(resourceClient.post("Program Enrollment", body));
    if (!res.ok) return res as ApiResult<any>;
    return { ok: true, data: res.data?.data ?? res.data };
  } catch (e: any) {
    return { ok: false, error: e.message || "Network error" };
  }
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: Submit a document (for Program Enrollment submission)
// ─────────────────────────────────────────────────────────────────────────────
submitDocument: async (doctype: string, docname: string): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    // First, check if the document can be submitted
    const checkRes = await fetch(
      `${METHOD_URL}/frappe.client.get`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: doctype,
          name: docname,
        }),
      }
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json().catch(() => ({}));
      const doc = checkData?.message || checkData?.data || {};
      
      // If already submitted, return success
      if (doc.docstatus === 1) {
        return { ok: true, data: doc };
      }
    }

    // Submit the document
    const res = await fetch(`${METHOD_URL}/frappe.client.submit`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        doctype: doctype,
        name: docname,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err?.exception?.includes("already submitted") || err?.message?.includes("already submitted")) {
        return { ok: true, data: { name: docname } };
      }
      return { ok: false, error: parseErpError(err, `Submit failed (HTTP ${res.status})`) };
    }

    const json = await res.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error during submit" };
  }
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: Add student to section directly with proper save
// ─────────────────────────────────────────────────────────────────────────────
addStudentToSectionDirect: async (
  sectionName: string,
  studentId: string,
  studentName: string
): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    // Step 1: Get the current student group details
    const currentRes = await fetch(
      `${METHOD_URL}/frappe.client.get`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: "Student Group",
          name: sectionName,
        }),
      }
    );

    if (!currentRes.ok) {
      const err = await currentRes.json().catch(() => ({}));
      return { ok: false, error: parseErpError(err, "Could not fetch section details") };
    }

    const currentData = await currentRes.json().catch(() => ({}));
    const groupData = currentData?.message || currentData?.data || {};
    const existingStudents = groupData?.students || [];

    // Check if student is already in the section
    if (existingStudents.some((s: any) => (s.student || s.name) === studentId)) {
      return { ok: true, data: groupData };
    }

    // Calculate next roll number
    const nextRoll = existingStudents.length > 0
      ? Math.max(...existingStudents.map((s: any) => s.group_roll_number || 0)) + 1
      : 1;

    // Add the new student to the list
    const updatedStudents = [
      ...existingStudents,
      {
        student: studentId,
        student_name: studentName,
        group_roll_number: nextRoll,
        active: 1,
      },
    ];

    // Step 2: Update the Student Group with the new students list
    const updateRes = await fetch(
      `${METHOD_URL}/frappe.client.set_value`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: "Student Group",
          name: sectionName,
          fieldname: "students",
          value: updatedStudents,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return { ok: false, error: parseErpError(err, "Could not add student to section") };
    }

    // Step 3: IMPORTANT - Save the document to persist changes
    const saveRes = await fetch(
      `${METHOD_URL}/frappe.client.save`,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          doctype: "Student Group",
          name: sectionName,
        }),
      }
    );

    if (!saveRes.ok) {
      // Even if save fails, the set_value might have worked
      console.warn("Save warning:", await saveRes.text());
    }

    const updateData = await updateRes.json().catch(() => ({}));
    return { ok: true, data: updateData?.message || updateData };

  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error during section addition" };
  }
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: Submit Program Enrollment using method call (fallback)
// ─────────────────────────────────────────────────────────────────────────────
submitProgramEnrollment: async (enrollmentName: string): Promise<ApiResult<any>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    const res = await fetch(`${METHOD_URL}/frappe.client.submit`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        doctype: "Program Enrollment",
        name: enrollmentName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err?.exception?.includes("already submitted") || err?.message?.includes("already submitted")) {
        return { ok: true, data: { name: enrollmentName } };
      }
      return { ok: false, error: parseErpError(err, `Submit failed (HTTP ${res.status})`) };
    }

    const json = await res.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error during submit" };
  }
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: Fetch full Guardian record(s) from Guardian doctype
// Student.guardians child table only stores {guardian, relation} link —
// this resolves each guardian link to its full Guardian doctype record.
// ─────────────────────────────────────────────────────────────────────────────
getGuardiansDetail: async (guardianIds: string[]): Promise<ApiResult<any[]>> => {
  try {
    const uniqueIds = [...new Set(guardianIds.filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: true, data: [] };

    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await handleResponse<any>(
            resourceClient.get(`Guardian/${encodeURIComponent(id)}`)
          );
          return res;
        } catch {
          return { ok: false as const, error: "fetch failed" };
        }
      })
    );

    const guardians = results
      .filter((r: any) => r?.ok && r?.data)
      .map((r: any) => {
        const d = r.data?.data ?? r.data;
        return {
          name: d.name,
          guardian_name: d.guardian_name,
          email_address: d.email_address,
          mobile_number: d.mobile_number,
          alternate_number: d.alternate_number,
          date_of_birth: d.date_of_birth,
          user: d.user,
          id_type: d.id_type,
          id_number: d.id_number,
          education: d.education,
          occupation: d.occupation,
          designation: d.designation,
          work_address: d.work_address,
        };
      });

    return { ok: true, data: guardians };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error while fetching guardians" };
  }
},


// ─────────────────────────────────────────────────────────────────────────────
// 🎓 ACADEMICS PORTAL - SECTIONS (STUDENT GROUPS) API
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET SECTIONS WITH FILTERS ─────────────────────────────────────────────
getAcadSections: async (filters?: {
  program?: string;
  academicYear?: string;
  disabled?: 0 | 1;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<any[]>> => {
  const erpFilters: any[] = [];

  if (filters?.program) {
    erpFilters.push(["Student Group", "program", "=", filters.program]);
  }
  if (filters?.academicYear) {
    erpFilters.push(["Student Group", "academic_year", "=", filters.academicYear]);
  }
  if (filters?.disabled !== undefined) {
    erpFilters.push(["Student Group", "disabled", "=", filters.disabled]);
  }

  const limit = filters?.limit || 999999;
  const offset = filters?.offset || 0;

  const res = await handleResponse<any>(
    resourceClient.get("Student Group", {
      params: {
        fields: JSON.stringify([
          "name",
          "student_group_name",
          "program",
          "academic_year",
          "academic_term",
          "max_strength",
          "disabled",
          "creation",
          "modified",
        ]),
        ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
        limit_page_length: limit,
        limit_start: offset,
        order_by: "modified desc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<any[]>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  return { ok: true, data: rows };
},
// ── Admin — Program Enrollment (source of truth for Total/Active Students) ─

getAllProgramEnrollments: async (): Promise<ApiResult<ProgramEnrollmentDetail[]>> => {
  const LIST_FIELDS = [
    "name",
    "student",
    "student_name",
    "program",
    "academic_year",
    "student_batch_name",
    "enrollment_date",
    "docstatus",
  ];

  // docstatus != 2 → cancelled enrollments kabhi bhi count mein shamil nahi honi chahiye
  const res = await handleResponse<any>(
    resourceClient.get("Program Enrollment", {
      params: {
        fields: JSON.stringify(LIST_FIELDS),
        filters: JSON.stringify([["Program Enrollment", "docstatus", "!=", 2]]),
        limit_page_length: 0, // 0 = sab records
        order_by: "student asc",
      },
    })
  );

  if (!res.ok) return res as ApiResult<ProgramEnrollmentDetail[]>;

  const rows = asArray<ProgramEnrollmentDetail>(res.data?.data ?? res.data);
  if (rows.length === 0) return { ok: true, data: [] };

  const hasRichData = rows.some((r) => r.student || r.student_name);
  if (hasRichData) return { ok: true, data: rows };

  // Fallback: same pattern as Employees/Departments/Students
  const names = rows.map((r) => r.name).filter(Boolean);
  const CHUNK_SIZE = 10;
  const details: ProgramEnrollmentDetail[] = [];
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((n) => api.getProgramEnrollmentDetail(n))
    );
    settled.forEach((s) => {
      if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
    });
  }
  return { ok: true, data: details };
},

getProgramEnrollmentDetail: async (
  name: string
): Promise<ApiResult<ProgramEnrollmentDetail>> => {
  const DETAIL_FIELDS = [
    "name",
    "student",
    "student_name",
    "program",
    "academic_year",
    "student_batch_name",
    "enrollment_date",
    "docstatus",
  ];

  const res = await handleResponse<any>(
    resourceClient.get(`Program Enrollment/${encodeURIComponent(name)}`, {
      params: { fields: JSON.stringify(DETAIL_FIELDS) },
    })
  );

  if (!res.ok) return res as ApiResult<ProgramEnrollmentDetail>;
  return { ok: true, data: res.data as ProgramEnrollmentDetail };
},

// ─── GET ALL SECTIONS WITH PAGINATION ──────────────────────────────────────
getAllAcadStudentGroups: async (options?: {
  batchSize?: number;
  includeInactive?: boolean;
}): Promise<any[]> => {
  const batchSize = options?.batchSize || 500;
  let allGroups: any[] = [];
  let start = 0;
  let hasMore = true;

  const fields = [
    "name",
    "student_group_name",
    "program",
    "academic_year",
    "academic_term",
    "max_strength",
    "disabled",
    "creation",
    "modified",
  ];

  // ✅ Fetch ALL groups regardless of status
  const filters: any[] = [];

  while (hasMore) {
    try {
      const res = await handleResponse<any>(
        resourceClient.get("Student Group", {
          params: {
            fields: JSON.stringify(fields),
            limit_page_length: batchSize,
            limit_start: start,
            ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
            order_by: "modified desc",
          },
        })
      );

      if (!res.ok) {
        console.warn('Failed to fetch student groups batch:', res.error);
        break;
      }

      const batch = res.data?.data || res.data || [];
      allGroups = [...allGroups, ...batch];

      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        start += batchSize;
      }
    } catch (err) {
      console.error('Error fetching student groups:', err);
      break;
    }
  }

  console.log(`✅ [Student Groups] Found ${allGroups.length} groups`);
  return allGroups;
},

// ─── GET SECTION WITH FULL DETAILS (includes students list) ──────────────
getAcadSectionDetail: async (sectionName: string): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.get(`Student Group/${encodeURIComponent(sectionName)}`)
  );
  if (!res.ok) return res as ApiResult<any>;
  const data = res.data?.data ?? res.data;
  return { ok: true, data };
},

// ─── GET ALL INSTRUCTORS ───────────────────────────────────────────────────
getAllAcadInstructors: async (options?: {
  batchSize?: number;
  includeInactive?: boolean;
}): Promise<any[]> => {
  const batchSize = options?.batchSize || 500;
  let allInstructors: any[] = [];
  let start = 0;
  let hasMore = true;

  const fields = [
    "name",
    "instructor_name",
    "status",
    "employee",
    "gender",
    "user_id",
    "image",
  ];

  const filters: any[] = [];
  if (!options?.includeInactive) {
    filters.push(["Instructor", "status", "=", "Active"]);
  }

  while (hasMore) {
    try {
      const res = await handleResponse<any>(
        resourceClient.get("Instructor", {
          params: {
            fields: JSON.stringify(fields),
            limit_page_length: batchSize,
            limit_start: start,
            ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
            order_by: "instructor_name asc",
          },
        })
      );

      if (!res.ok) {
        console.warn('Failed to fetch instructors batch:', res.error);
        break;
      }

      const batch = res.data?.data || res.data || [];
      allInstructors = [...allInstructors, ...batch];

      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        start += batchSize;
      }
    } catch (err) {
      console.error('Error fetching instructors:', err);
      break;
    }
  }

  console.log(`✅ [Instructors] Found ${allInstructors.length} instructors`);
  return allInstructors;
},

// ─── GET SECTION STUDENTS ──────────────────────────────────────────────────
getAcadSectionStudents: async (sectionName: string): Promise<ApiResult<any[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get(`Student Group/${encodeURIComponent(sectionName)}`)
  );
  if (!res.ok) return res as ApiResult<any[]>;
  const detail = res.data?.data ?? res.data;
  const students = asArray<any>(detail?.students ?? []);
  return { ok: true, data: students };
},

// ─── GET SECTION INSTRUCTORS ───────────────────────────────────────────────
getAcadSectionInstructors: async (sectionName: string): Promise<ApiResult<any[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get(`Student Group/${encodeURIComponent(sectionName)}`)
  );
  if (!res.ok) return res as ApiResult<any[]>;
  const detail = res.data?.data ?? res.data;
  const instructors = asArray<any>(detail?.instructors ?? []);
  return { ok: true, data: instructors };
},

// ─── CREATE SECTION ────────────────────────────────────────────────────────
createAcadSection: async (payload: {
  student_group_name: string;
  program: string;
  academic_year: string;
  academic_term?: string;
  max_strength?: number;
  instructors?: Array<{ instructor: string; instructor_name?: string }>;
}): Promise<ApiResult<any>> => {
  const body = {
    doctype: "Student Group",
    student_group_name: payload.student_group_name,
    program: payload.program,
    academic_year: payload.academic_year,
    academic_term: payload.academic_term,
    max_strength: payload.max_strength || 0,
    group_based_on: "Batch",
    ...(payload.instructors?.length ? { instructors: payload.instructors } : {}),
  };
  const res = await handleResponse<any>(
    resourceClient.post("Student Group", body)
  );
  return res;
},

// ─── UPDATE SECTION ────────────────────────────────────────────────────────
updateAcadSection: async (
  sectionName: string,
  payload: {
    program?: string;
    academic_year?: string;
    academic_term?: string;
    max_strength?: number;
    disabled?: 0 | 1;
  }
): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.put(`Student Group/${encodeURIComponent(sectionName)}`, payload)
  );
  return res;
},

// ─── ADD INSTRUCTOR TO SECTION ─────────────────────────────────────────────
addInstructorToAcadSection: async (
  sectionName: string,
  instructorId: string,
  instructorName: string
): Promise<ApiResult<any>> => {
  const body = {
    instructors: [
      {
        instructor: instructorId,
        instructor_name: instructorName,
      },
    ],
  };
  const res = await handleResponse<any>(
    resourceClient.put(`Student Group/${encodeURIComponent(sectionName)}`, body)
  );
  return res;
},

// ─── REMOVE INSTRUCTOR FROM SECTION ────────────────────────────────────────
removeInstructorFromAcadSection: async (
  sectionName: string,
  instructorId: string
): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.put(`Student Group/${encodeURIComponent(sectionName)}`, {
      remove_instructors: [{ instructor: instructorId }],
    })
  );
  return res;
},

// ─── TOGGLE SECTION STATUS ─────────────────────────────────────────────────
toggleAcadSectionStatus: async (
  sectionName: string,
  disabled: 0 | 1
): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.put(`Student Group/${encodeURIComponent(sectionName)}`, { disabled })
  );
  return res;
},

// ─── DELETE SECTION ────────────────────────────────────────────────────────
deleteAcadSection: async (sectionName: string): Promise<ApiResult<any>> => {
  const res = await handleResponse<any>(
    resourceClient.delete(`Student Group/${encodeURIComponent(sectionName)}`)
  );
  return res;
},

// ─── GET SECTION PROGRAMS ──────────────────────────────────────────────────
getAcadSectionPrograms: async (): Promise<ApiResult<string[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get("Student Group", {
      params: {
        fields: JSON.stringify(["program"]),
        limit_page_length: 999999,
      },
    })
  );
  if (!res.ok) return res as ApiResult<string[]>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  const programs = [...new Set(rows.map((r: any) => r.program).filter(Boolean))];
  return { ok: true, data: programs };
},

// ─── GET SECTION ACADEMIC YEARS ────────────────────────────────────────────
getAcadSectionAcademicYears: async (): Promise<ApiResult<string[]>> => {
  const res = await handleResponse<any>(
    resourceClient.get("Student Group", {
      params: {
        fields: JSON.stringify(["academic_year"]),
        limit_page_length: 999999,
      },
    })
  );
  if (!res.ok) return res as ApiResult<string[]>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  const years = [...new Set(rows.map((r: any) => r.academic_year).filter(Boolean))];
  return { ok: true, data: years };
},
  

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 ACADEMICS PORTAL - MEET LINKS (COURSE SCHEDULE)
// ═══════════════════════════════════════════════════════════════════════════════

getCourseSchedulesByDateRange: async (filters?: {
  program?: string;
  student_group?: string;
  instructor?: string;
  from_date?: string;
  to_date?: string;
}): Promise<ApiResult<CourseSchedule[]>> => {
  const erpFilters: any[] = [];

  if (filters?.program) {
    erpFilters.push(["Course Schedule", "program", "=", filters.program]);
  }
  if (filters?.student_group) {
    erpFilters.push(["Course Schedule", "student_group", "=", filters.student_group]);
  }
  if (filters?.instructor) {
    erpFilters.push(["Course Schedule", "instructor", "=", filters.instructor]);
  }
  if (filters?.from_date) {
    erpFilters.push(["Course Schedule", "schedule_date", ">=", filters.from_date]);
  }
  if (filters?.to_date) {
    erpFilters.push(["Course Schedule", "schedule_date", "<=", filters.to_date]);
  }

  const fields = JSON.stringify([
    "name",
    "student_group",
    "instructor",
    "instructor_name",
    "program",
    "course",
    "schedule_date",
    "room",
    "custom_meeting_link",
    "from_time",
    "to_time",
    "title",
    "color",
    "class_schedule_color",
    "modified",
    "creation",
  ]);

  const PAGE_SIZE = 500;
  let start = 0;
  const allRows: CourseSchedule[] = [];

  try {
    while (true) {
      const res = await handleResponse<any>(
        resourceClient.get("Course Schedule", {
          params: {
            fields,
            ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
            limit_page_length: PAGE_SIZE,
            limit_start: start,
            order_by: "schedule_date desc, from_time asc",
          },
        })
      );

      if (!res.ok) return res as ApiResult<CourseSchedule[]>;

      const rows = asArray<CourseSchedule>(res.data?.data ?? res.data);
      allRows.push(...rows);

      if (rows.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }

    return { ok: true, data: allRows };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to fetch course schedules" };
  }
},

getCourseScheduleDetail: async (scheduleName: string): Promise<ApiResult<CourseSchedule>> => {
  const res = await handleResponse<any>(
    resourceClient.get(`Course Schedule/${encodeURIComponent(scheduleName)}`)
  );
  if (!res.ok) return res as ApiResult<CourseSchedule>;
  const data = res.data?.data ?? res.data;
  return { ok: true, data };
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ FIXED: CSRF-safe update, actually persists to ERP now
// ─────────────────────────────────────────────────────────────────────────────
updateCourseScheduleMeetLink: async (
  scheduleName: string,
  meetingLink: string
): Promise<ApiResult<CourseSchedule>> => {
  const METHOD_URL = isSameDomain || isLocalDev
    ? "/api/method"
    : `https://${PROD_HOST}/api/method`;

  await fetchAndCacheCsrfToken();

  let csrf: string | null = null;
  const w = window as any;
  const fromWindow = w?.frappe?.csrf_token;
  if (typeof fromWindow === "string" && fromWindow.trim() && fromWindow !== "{{ csrf_token }}") {
    csrf = fromWindow;
  } else {
    const m = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    if (m?.[2]) csrf = decodeURIComponent(m[2]);
  }

  const t = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {}),
    ...(csrf ? { "X-Frappe-CSRF-Token": csrf } : {}),
  };

  try {
    const res = await fetch(`${METHOD_URL}/frappe.client.set_value`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({
        doctype: "Course Schedule",
        name: scheduleName,
        fieldname: "custom_meeting_link",
        value: meetingLink,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: parseErpError(err, `Update failed (HTTP ${res.status})`) };
    }

    const json = await res.json().catch(() => ({}));
    return { ok: true, data: json?.message ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error while updating meet link" };
  }
},

// ─────────────────────────────────────────────────────────────────────────────
// ✅ FIXED: batch update now reuses the CSRF-safe single-update function
// ─────────────────────────────────────────────────────────────────────────────
batchUpdateCourseScheduleMeetLinks: async (
  updates: Array<{ name: string; custom_meeting_link: string }>
): Promise<ApiResult<any>> => {
  const results = await Promise.all(
    updates.map(u => api.updateCourseScheduleMeetLink(u.name, u.custom_meeting_link))
  );
  const failed = results.filter(r => !r.ok);

  if (failed.length > 0) {
    return {
      ok: false,
      error: `${failed.length} of ${updates.length} updates failed`,
    };
  }

  return { ok: true, data: results };
},

getMissingMeetLinksCount: async (): Promise<ApiResult<number>> => {
  const filters = JSON.stringify([
    ["Course Schedule", "custom_meeting_link", "in", ["", null]],
  ]);

  const PAGE_SIZE = 500;
  let start = 0;
  let count = 0;

  try {
    while (true) {
      const res = await handleResponse<any>(
        resourceClient.get("Course Schedule", {
          params: {
            fields: JSON.stringify(["name"]),
            filters,
            limit_page_length: PAGE_SIZE,
            limit_start: start,
          },
        })
      );
      if (!res.ok) return res as ApiResult<number>;
      const rows = asArray<any>(res.data?.data ?? res.data);
      count += rows.length;
      if (rows.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }
    return { ok: true, data: count };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to count missing links" };
  }
},



  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎓 ACADEMICS PORTAL - STUDENT ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════════════════

  getAcadAttendanceList: async (filters?: {
    student?: string;
    student_group?: string;
    course_schedule?: string;
    from_date?: string;
    to_date?: string;
    status?: 'Present' | 'Absent' | 'Leave';
    limit?: number;
  }): Promise<ApiResult<StudentAttendance[]>> => {
    const erpFilters: any[] = [];

    if (filters?.student) {
      erpFilters.push(["Student Attendance", "student", "=", filters.student]);
    }
    if (filters?.student_group) {
      erpFilters.push(["Student Attendance", "student_group", "=", filters.student_group]);
    }
    if (filters?.course_schedule) {
      erpFilters.push(["Student Attendance", "course_schedule", "=", filters.course_schedule]);
    }
    if (filters?.from_date) {
      erpFilters.push(["Student Attendance", "date", ">=", filters.from_date]);
    }
    if (filters?.to_date) {
      erpFilters.push(["Student Attendance", "date", "<=", filters.to_date]);
    }
    if (filters?.status) {
      erpFilters.push(["Student Attendance", "status", "=", filters.status]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Student Attendance", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name", "course_schedule",
            "student_group", "date", "status", "creation", "modified", "docstatus"
          ]),
          ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
          limit_page_length: filters?.limit || 500,
          order_by: "date desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<StudentAttendance[]>;
    const rows = asArray<StudentAttendance>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  getAcadAttendanceDetail: async (attendanceName: string): Promise<ApiResult<StudentAttendance>> => {
    const res = await handleResponse<any>(
      resourceClient.get(`Student Attendance/${encodeURIComponent(attendanceName)}`)
    );
    if (!res.ok) return res as ApiResult<StudentAttendance>;
    const data = res.data?.data ?? res.data;
    return { ok: true, data };
  },

  getAcadAttendanceByStudent: async (
    studentId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ApiResult<StudentAttendance[]>> => {
    const erpFilters: any[] = [
      ["Student Attendance", "student", "=", studentId],
    ];
    if (fromDate) {
      erpFilters.push(["Student Attendance", "date", ">=", fromDate]);
    }
    if (toDate) {
      erpFilters.push(["Student Attendance", "date", "<=", toDate]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Student Attendance", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name", "course_schedule",
            "student_group", "date", "status", "docstatus"
          ]),
          filters: JSON.stringify(erpFilters),
          limit_page_length: 200,
          order_by: "date desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<StudentAttendance[]>;
    const rows = asArray<StudentAttendance>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  getAcadAttendanceByStudentGroup: async (
    studentGroup: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ApiResult<StudentAttendance[]>> => {
    const erpFilters: any[] = [
      ["Student Attendance", "student_group", "=", studentGroup],
    ];
    if (fromDate) {
      erpFilters.push(["Student Attendance", "date", ">=", fromDate]);
    }
    if (toDate) {
      erpFilters.push(["Student Attendance", "date", "<=", toDate]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Student Attendance", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name", "course_schedule",
            "student_group", "date", "status", "docstatus"
          ]),
          filters: JSON.stringify(erpFilters),
          limit_page_length: 500,
          order_by: "date desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<StudentAttendance[]>;
    const rows = asArray<StudentAttendance>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },


  getStudentGroupRoster: async (
    studentGroup: string
  ): Promise<ApiResult<{ student: string; student_name: string }[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get(`Student Group/${encodeURIComponent(studentGroup)}`)
    );
    if (!res.ok) return res as ApiResult<{ student: string; student_name: string }[]>;
    const doc = res.data?.data ?? res.data;
    const students = (doc.students || [])
      .filter((s: any) => s.active === undefined || s.active === 1)
      .map((s: any) => ({ student: s.student, student_name: s.student_name }));
    return { ok: true, data: students };
  },

  getAllStudentGroups: async (programFilter?: string): Promise<ApiResult<StudentGroupListItem[]>> => {
    const LIST_FIELDS = [
      "name",
      "student_group_name",
      "program",
      "academic_year",
      "max_strength",
      "disabled",
    ];

    const filters: any[] = [["disabled", "=", 0]];
    if (programFilter) {
      filters.push(["program", "=", programFilter]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Student Group", {
        params: {
          fields: JSON.stringify(LIST_FIELDS),
          filters: JSON.stringify(filters),
          limit_page_length: 0, // 0 = sab records
          order_by: "student_group_name asc",
        },
      })
    );

    if (!res.ok) return res as ApiResult<StudentGroupListItem[]>;

    const rows = asArray<StudentGroupListItem>(res.data?.data ?? res.data);
    if (rows.length === 0) return { ok: true, data: [] };

    // Same fallback pattern as Employee/Department: agar list endpoint ne
    // sirf bare { name } rows di hain, toh har record individually fetch karo.
    const hasRichData = rows.some((r) => r.student_group_name || r.program);
    if (hasRichData) return { ok: true, data: rows };

    const names = rows.map((r) => r.name).filter(Boolean);
    const CHUNK_SIZE = 10;
    const details: StudentGroupListItem[] = [];
    for (let i = 0; i < names.length; i += CHUNK_SIZE) {
      const chunk = names.slice(i, i + CHUNK_SIZE);
      const settled = await Promise.allSettled(
        chunk.map((n) => api.getStudentGroupFullDetail(n))
      );
      settled.forEach((s) => {
        if (s.status === "fulfilled" && s.value.ok) details.push(s.value.data);
      });
    }

    // Fallback path mein program field bare rows mein nahi thi, isliye
    // yahan full-detail fetch hone ke baad filter lagana hoga.
    const finalDetails = programFilter
      ? details.filter((d) => d.program === programFilter)
      : details;

    return { ok: true, data: finalDetails };
  },

  getAcadAttendanceStats: async (studentGroup?: string): Promise<ApiResult<{ total: number; present: number; absent: number; leave: number }>> => {
    const erpFilters = studentGroup
      ? JSON.stringify([["Student Attendance", "student_group", "=", studentGroup]])
      : undefined;

    const res = await handleResponse<any>(
      resourceClient.get("Student Attendance", {
        params: {
          fields: JSON.stringify(["status"]),
          ...(erpFilters ? { filters: erpFilters } : {}),
          limit_page_length: 1000,
        },
      })
    );
    if (!res.ok) return res as ApiResult<any>;
    const rows = asArray<any>(res.data?.data ?? res.data);
    const stats = {
      total: rows.length,
      present: rows.filter((r: any) => r.status === 'Present').length,
      absent: rows.filter((r: any) => r.status === 'Absent').length,
      leave: rows.filter((r: any) => r.status === 'Leave').length,
    };
    return { ok: true, data: stats };
  },

  createAcadAttendance: async (payload: {
    student: string;
    student_name: string;
    course_schedule: string;
    student_group: string;
    date: string;
    status: 'Present' | 'Absent' | 'Leave';
  }): Promise<ApiResult<StudentAttendance>> => {
    const body = {
      doctype: "Student Attendance",
      student: payload.student,
      student_name: payload.student_name,
      course_schedule: payload.course_schedule,
      student_group: payload.student_group,
      date: payload.date,
      status: payload.status,
    };
    const res = await handleResponse<any>(
      resourceClient.post("Student Attendance", body)
    );
    return res;
  },

  updateAcadAttendance: async (
    attendanceName: string,
    payload: { status?: 'Present' | 'Absent' | 'Leave' }
  ): Promise<ApiResult<StudentAttendance>> => {
    const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;
    const encodedName = encodeURIComponent(attendanceName);

    try {
      const getUrl = `${RESOURCE_URL}/Student%20Attendance/${encodedName}`;
      const getRes = await fetch(getUrl, {
        method: 'GET',
        credentials: 'include',
        headers: buildHeaders(),
      });
      if (!getRes.ok) {
        const err = await getRes.json().catch(() => ({}));
        return { ok: false, error: err.message || `Failed to fetch record (${getRes.status})` };
      }
      const fullRecord = await getRes.json().then((d: any) => d.data ?? d);
      const currentDocstatus = fullRecord.docstatus;

      if (currentDocstatus === 2) {
        return { ok: false, error: 'This record is cancelled and cannot be edited directly. It needs to be amended (create a new record referencing amended_from).' };
      }

      if (currentDocstatus === 1) {
        const cancelUrl = `${RESOURCE_URL}/Student%20Attendance/${encodedName}`;
        const cancelRes = await fetch(cancelUrl, {
          method: 'PUT',
          credentials: 'include',
          headers: buildHeaders(),
          body: JSON.stringify({ docstatus: 2 }),
        });
        if (!cancelRes.ok) {
          const err = await cancelRes.json().catch(() => ({}));
          return { ok: false, error: err.message || `Cancel failed (${cancelRes.status})` };
        }
      }

      const updateBody = {
        status: payload.status,
        docstatus: 0,
      };

      const updateUrl = `${RESOURCE_URL}/Student%20Attendance/${encodedName}`;
      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify(updateBody),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        return { ok: false, error: err.message || `Update failed (${updateRes.status})` };
      }

      const updatedData = await updateRes.json().then((d: any) => d.data ?? d);
      return { ok: true, data: updatedData };

    } catch (err) {
      console.error('updateAcadAttendance error:', err);
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  },

  bulkUpsertAcadAttendance: async (rows: {
    student: string;
    student_name: string;
    student_group: string;
    course_schedule?: string;
    date: string;
    status: 'Present' | 'Absent' | 'Leave';
    existingName?: string;
    existingDocstatus?: number;
  }[]): Promise<ApiResult<{ created: number; updated: number; skipped: number; failed: number }>> => {
    const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;
    let created = 0, updated = 0, skipped = 0, failed = 0;

    await Promise.all(rows.map(async (row) => {
      try {
        if (row.existingName) {
          const encodedName = encodeURIComponent(row.existingName);

          if (row.existingDocstatus === 2) {
            skipped++;
            return;
          }
          if (row.existingDocstatus === 1) {
            const cancelRes = await fetch(`${RESOURCE_URL}/Student%20Attendance/${encodedName}`, {
              method: 'PUT',
              credentials: 'include',
              headers: buildHeaders(),
              body: JSON.stringify({ docstatus: 2 }),
            });
            if (!cancelRes.ok) throw new Error('cancel failed');
          }
          const res = await fetch(`${RESOURCE_URL}/Student%20Attendance/${encodedName}`, {
            method: 'PUT',
            credentials: 'include',
            headers: buildHeaders(),
            body: JSON.stringify({ status: row.status, docstatus: 0 }),
          });
          if (!res.ok) throw new Error('update failed');
          updated++;
        } else {
          const res = await fetch(`${RESOURCE_URL}/Student%20Attendance`, {
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

    return { ok: true, data: { created, updated, skipped, failed } };
  },

  deleteAcadAttendance: async (attendanceName: string): Promise<ApiResult<any>> => {
    const res = await handleResponse<any>(
      resourceClient.delete(`Student Attendance/${encodeURIComponent(attendanceName)}`)
    );
    return res;
  },


// ═══════════════════════════════════════════════════════════════════════════════
// 🎓 ACADEMICS PORTAL - TEACHER ATTENDANCE (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET ATTENDANCE LIST ──────────────────────────────────────
getAcadTeacherAttendanceList: async (filters?: {
  employee?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  limit?: number;
}): Promise<ApiResult<AttendanceDetail[]>> => {
  const erpFilters: any[] = [];

  if (filters?.employee) {
    erpFilters.push(["Attendance", "employee", "=", filters.employee]);
  }
  if (filters?.from_date) {
    erpFilters.push(["Attendance", "attendance_date", ">=", filters.from_date]);
  }
  if (filters?.to_date) {
    erpFilters.push(["Attendance", "attendance_date", "<=", filters.to_date]);
  }
  if (filters?.status) {
    erpFilters.push(["Attendance", "status", "=", filters.status]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Attendance", {
      params: {
        fields: JSON.stringify([
          "name", "employee", "employee_name", "attendance_date",
          "status", "shift", "working_hours", "late_entry", "early_exit", "docstatus"
        ]),
        ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
        limit_page_length: filters?.limit || 500,
        order_by: "attendance_date desc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<AttendanceDetail[]>;
  const rows = asArray<AttendanceDetail>(res.data?.data ?? res.data);
  return { ok: true, data: rows };
},

// ── GET ATTENDANCE BY EMPLOYEE ──────────────────────────────
getAcadTeacherAttendanceByEmployee: async (
  employee: string,
  fromDate?: string,
  toDate?: string
): Promise<ApiResult<AttendanceDetail[]>> => {
  const erpFilters: any[] = [
    ["Attendance", "employee", "=", employee],
  ];
  if (fromDate) {
    erpFilters.push(["Attendance", "attendance_date", ">=", fromDate]);
  }
  if (toDate) {
    erpFilters.push(["Attendance", "attendance_date", "<=", toDate]);
  }

  const res = await handleResponse<any>(
    resourceClient.get("Attendance", {
      params: {
        fields: JSON.stringify([
          "name", "employee", "employee_name", "attendance_date",
          "status", "shift", "working_hours", "docstatus"
        ]),
        filters: JSON.stringify(erpFilters),
        limit_page_length: 200,
        order_by: "attendance_date desc",
      },
    })
  );
  if (!res.ok) return res as ApiResult<AttendanceDetail[]>;
  const rows = asArray<AttendanceDetail>(res.data?.data ?? res.data);
  return { ok: true, data: rows };
},

// ── CREATE ATTENDANCE ──────────────────────────────────────
createAcadTeacherAttendance: async (payload: {
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string;
}): Promise<ApiResult<AttendanceDetail>> => {
  const body = {
    doctype: "Attendance",
    employee: payload.employee,
    employee_name: payload.employee_name,
    attendance_date: payload.attendance_date,
    status: payload.status,
  };
  const res = await handleResponse<any>(
    resourceClient.post("Attendance", body)
  );
  return res;
},

// ── UPDATE ATTENDANCE (UPDATED - NO employee_name) ──────────
updateAcadTeacherAttendance: async (payload: {
  name: string;
  employee: string;
  attendance_date: string;
  status: string;
}): Promise<ApiResult<AttendanceDetail>> => {
  // ✅ ONLY: employee, attendance_date, status
  // ❌ NO: employee_name
  const body = {
    doctype: "Attendance",
    employee: payload.employee,
    attendance_date: payload.attendance_date,
    status: payload.status,
  };
  const res = await handleResponse<any>(
    resourceClient.put(`Attendance/${payload.name}`, body)
  );
  return res;
},

// ── BULK CREATE ATTENDANCE ──────────────────────────────
bulkCreateAcadTeacherAttendance: async (rows: {
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string;
}[]): Promise<ApiResult<{ created: number; failed: number }>> => {
  let created = 0, failed = 0;

  await Promise.all(rows.map(async (row) => {
    try {
      const res = await handleResponse<any>(
        resourceClient.post("Attendance", {
          doctype: "Attendance",
          employee: row.employee,
          employee_name: row.employee_name,
          attendance_date: row.attendance_date,
          status: row.status,
        })
      );
      if (res.ok) created++;
      else failed++;
    } catch {
      failed++;
    }
  }));

  return { ok: true, data: { created, failed } };
},

// ── BULK UPDATE/CREATE ATTENDANCE (UPDATED - NO employee_name for update) ──
bulkUpdateAcadTeacherAttendance: async (rows: {
  name?: string;
  employee: string;
  employee_name?: string;  // Optional - only for create
  attendance_date: string;
  status: string;
}[]): Promise<ApiResult<{ updated: number; created: number; failed: number }>> => {
  let updated = 0, created = 0, failed = 0;

  for (const row of rows) {
    try {
      if (row.name) {
        // ── UPDATE: NO employee_name ──
        // ✅ ONLY: employee, attendance_date, status
        const body = {
          doctype: "Attendance",
          employee: row.employee,
          attendance_date: row.attendance_date,
          status: row.status,
        };
        // ❌ NO employee_name
        
        console.log('🔄 UPDATE body:', body);
        const res = await handleResponse<any>(
          resourceClient.put(`Attendance/${row.name}`, body)
        );
        console.log('✅ UPDATE response:', res);
        
        if (res.ok) updated++;
        else failed++;
      } else {
        // ── CREATE: Include employee_name ──
        const body = {
          doctype: "Attendance",
          employee: row.employee,
          employee_name: row.employee_name || row.employee,
          attendance_date: row.attendance_date,
          status: row.status,
        };
        
        console.log('📝 CREATE body:', body);
        const res = await handleResponse<any>(
          resourceClient.post("Attendance", body)
        );
        console.log('✅ CREATE response:', res);
        
        if (res.ok) created++;
        else failed++;
      }
    } catch (err) {
      failed++;
      console.error('❌ Error:', err);
    }
  }

  return { ok: true, data: { updated, created, failed } };
},

// ── GET ATTENDANCE STATS ──────────────────────────────────
getAcadTeacherAttendanceStats: async (
  fromDate?: string,
  toDate?: string
): Promise<ApiResult<{ total: number; present: number; absent: number; leave: number; halfDay: number }>> => {
  const erpFilters: any[] = [];
  if (fromDate) erpFilters.push(["Attendance", "attendance_date", ">=", fromDate]);
  if (toDate) erpFilters.push(["Attendance", "attendance_date", "<=", toDate]);

  const res = await handleResponse<any>(
    resourceClient.get("Attendance", {
      params: {
        fields: JSON.stringify(["status"]),
        ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
        limit_page_length: 1000,
      },
    })
  );
  if (!res.ok) return res as ApiResult<any>;
  const rows = asArray<any>(res.data?.data ?? res.data);
  const stats = {
    total: rows.length,
    present: rows.filter((r: any) => r.status === 'Present').length,
    absent: rows.filter((r: any) => r.status === 'Absent').length,
    leave: rows.filter((r: any) => r.status === 'On Leave').length,
    halfDay: rows.filter((r: any) => r.status === 'Half Day').length,
  };
  return { ok: true, data: stats };
},

  // ═══════════════════════════════════════════════════════════════════════════════
  // 📊 ACADEMICS PORTAL - ASSESSMENT RESULTS (Full CRUD)
  // ═══════════════════════════════════════════════════════════════════════════════

  getAcadAssessmentResults: async (filters?: AssessmentResultFilters): Promise<ApiResult<AssessmentResult[]>> => {
    const erpFilters: any[] = [];

    if (filters?.student) {
      erpFilters.push(["Assessment Result", "student", "=", filters.student]);
    }
    if (filters?.course) {
      erpFilters.push(["Assessment Result", "course", "=", filters.course]);
    }
    if (filters?.program) {
      erpFilters.push(["Assessment Result", "program", "=", filters.program]);
    }
    if (filters?.assessment_plan) {
      erpFilters.push(["Assessment Result", "assessment_plan", "=", filters.assessment_plan]);
    }
    if (filters?.student_group) {
      erpFilters.push(["Assessment Result", "student_group", "=", filters.student_group]);
    }
    if (filters?.academic_year) {
      erpFilters.push(["Assessment Result", "academic_year", "=", filters.academic_year]);
    }
    if (filters?.academic_term) {
      erpFilters.push(["Assessment Result", "academic_term", "=", filters.academic_term]);
    }
    if (filters?.grade) {
      erpFilters.push(["Assessment Result", "grade", "=", filters.grade]);
    }
    if (filters?.docstatus !== undefined) {
      erpFilters.push(["Assessment Result", "docstatus", "=", filters.docstatus]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Assessment Result", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name", "assessment_plan",
            "student_group", "program", "course", "academic_year",
            "academic_term", "total_score", "maximum_score", "grade",
            "comment", "docstatus", "creation", "modified"
          ]),
          ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
          limit_page_length: 500,
          order_by: "creation desc",
        },
      })
    );

    if (!res.ok) {
      return { ok: false, error: res.error || "Failed to fetch assessment results" };
    }

    const results = asArray<any>(res.data?.data ?? res.data);

    if (results.length === 0) {
      return { ok: true, data: [] };
    }

    const CONCURRENCY = 8;
    const resultsWithDetails: AssessmentResult[] = new Array(results.length);

    let cursor = 0;
    const worker = async () => {
      while (cursor < results.length) {
        const idx = cursor++;
        const result = results[idx];
        try {
          const detailRes = await handleResponse<any>(
            resourceClient.get(`Assessment Result/${encodeURIComponent(result.name)}`)
          );
          if (detailRes.ok && detailRes.data) {
            const fullResult = detailRes.data?.data ?? detailRes.data;
            resultsWithDetails[idx] = {
              ...result,
              details: asArray<any>(fullResult?.details ?? []),
            } as AssessmentResult;
          } else {
            resultsWithDetails[idx] = { ...result, details: [] } as AssessmentResult;
          }
        } catch {
          resultsWithDetails[idx] = { ...result, details: [] } as AssessmentResult;
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, results.length) }, () => worker());
    await Promise.all(workers);

    return { ok: true, data: resultsWithDetails };
  },

  getAcadAssessmentResultById: async (resultId: string): Promise<ApiResult<AssessmentResult>> => {
    const res = await handleResponse<any>(
      resourceClient.get(`Assessment Result/${encodeURIComponent(resultId)}`)
    );
    if (!res.ok) return res as ApiResult<AssessmentResult>;
    const data = res.data?.data ?? res.data;
    return { ok: true, data };
  },

  createAcadAssessmentResult: async (payload: {
    assessment_plan: string;
    student: string;
    student_name: string;
    student_group: string;
    program?: string;
    course?: string;
    academic_year?: string;
    academic_term?: string;
    assessment_group?: string;
    grading_scale?: string;
    maximum_score?: number;
    total_score?: number;
    grade?: string;
    comment?: string;
    details: Array<{
      assessment_criteria: string;
      maximum_score: number;
      score: number;
      grade?: string;
    }>;
  }): Promise<ApiResult<AssessmentResult>> => {
    const body = {
      doctype: "Assessment Result",
      assessment_plan: payload.assessment_plan,
      student: payload.student,
      student_name: payload.student_name,
      student_group: payload.student_group,
      ...(payload.program && { program: payload.program }),
      ...(payload.course && { course: payload.course }),
      ...(payload.academic_year && { academic_year: payload.academic_year }),
      ...(payload.academic_term && { academic_term: payload.academic_term }),
      ...(payload.assessment_group && { assessment_group: payload.assessment_group }),
      ...(payload.grading_scale && { grading_scale: payload.grading_scale }),
      ...(payload.maximum_score && { maximum_score: payload.maximum_score }),
      ...(payload.total_score && { total_score: payload.total_score }),
      ...(payload.grade && { grade: payload.grade }),
      ...(payload.comment && { comment: payload.comment }),
      details: payload.details.map((d, idx) => ({
        idx: idx + 1,
        doctype: "Assessment Result Detail",
        parenttype: "Assessment Result",
        parentfield: "details",
        assessment_criteria: d.assessment_criteria,
        maximum_score: d.maximum_score,
        score: d.score,
        grade: d.grade || "",
      })),
    };
    const res = await handleResponse<any>(
      resourceClient.post("Assessment Result", body)
    );
    return res;
  },

  updateAcadAssessmentResult: async (
    resultId: string,
    payload: {
      total_score?: number;
      maximum_score?: number;
      grade?: string;
      comment?: string;
      details?: Array<{
        assessment_criteria: string;
        maximum_score: number;
        score: number;
        grade?: string;
      }>;
    }
  ): Promise<ApiResult<AssessmentResult>> => {
    const existingRes = await api.getAcadAssessmentResultById(resultId);
    if (!existingRes.ok || !existingRes.data) {
      return { ok: false, error: "Assessment result not found" };
    }

    const existing = existingRes.data;
    const updateBody: any = {
      ...existing,
      docstatus: 0,
    };

    if (payload.total_score !== undefined) updateBody.total_score = payload.total_score;
    if (payload.maximum_score !== undefined) updateBody.maximum_score = payload.maximum_score;
    if (payload.grade) updateBody.grade = payload.grade;
    if (payload.comment !== undefined) updateBody.comment = payload.comment;

    if (payload.details) {
      updateBody.details = payload.details.map((d, idx) => ({
        ...d,
        idx: idx + 1,
        doctype: "Assessment Result Detail",
        parenttype: "Assessment Result",
        parentfield: "details",
        grade: d.grade || "",
      }));
    }

    const res = await handleResponse<any>(
      resourceClient.put(`Assessment Result/${encodeURIComponent(resultId)}`, updateBody)
    );
    return res;
  },

  submitAcadAssessmentResult: async (resultId: string): Promise<ApiResult<AssessmentResult>> => {
    const existingRes = await api.getAcadAssessmentResultById(resultId);
    if (!existingRes.ok || !existingRes.data) {
      return { ok: false, error: "Assessment result not found" };
    }

    const existing = existingRes.data;
    const updateBody = {
      ...existing,
      docstatus: 1,
    };

    const res = await handleResponse<any>(
      resourceClient.put(`Assessment Result/${encodeURIComponent(resultId)}`, updateBody)
    );
    return res;
  },

  cancelAcadAssessmentResult: async (resultId: string): Promise<ApiResult<AssessmentResult>> => {
    const existingRes = await api.getAcadAssessmentResultById(resultId);
    if (!existingRes.ok || !existingRes.data) {
      return { ok: false, error: "Assessment result not found" };
    }

    const existing = existingRes.data;
    const updateBody = {
      ...existing,
      docstatus: 2,
    };

    const res = await handleResponse<any>(
      resourceClient.put(`Assessment Result/${encodeURIComponent(resultId)}`, updateBody)
    );
    return res;
  },

  deleteAcadAssessmentResult: async (resultId: string): Promise<ApiResult<any>> => {
    const res = await handleResponse<any>(
      resourceClient.delete(`Assessment Result/${encodeURIComponent(resultId)}`)
    );
    return res;
  },

  getAcadAssessmentResultsByStudent: async (
    studentId: string,
    academicYear?: string
  ): Promise<ApiResult<AssessmentResult[]>> => {
    const erpFilters: any[] = [
      ["Assessment Result", "student", "=", studentId],
    ];
    if (academicYear) {
      erpFilters.push(["Assessment Result", "academic_year", "=", academicYear]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Assessment Result", {
        params: {
          fields: JSON.stringify([
            "name", "student", "student_name", "assessment_plan",
            "student_group", "program", "course", "academic_year",
            "academic_term", "total_score", "maximum_score", "grade", "comment"
          ]),
          filters: JSON.stringify(erpFilters),
          limit_page_length: 100,
          order_by: "creation desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<AssessmentResult[]>;

    const results = asArray<any>(res.data?.data ?? res.data);

    if (results.length === 0) {
      return { ok: true, data: [] };
    }

    const CONCURRENCY = 8;
    const resultsWithDetails: AssessmentResult[] = new Array(results.length);

    let cursor = 0;
    const worker = async () => {
      while (cursor < results.length) {
        const idx = cursor++;
        const result = results[idx];
        const detailRes = await api.getAcadAssessmentResultById(result.name);
        resultsWithDetails[idx] = detailRes.ok && detailRes.data
          ? (detailRes.data as AssessmentResult)
          : ({ ...result, details: [] } as AssessmentResult);
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, results.length) }, () => worker());
    await Promise.all(workers);

    return { ok: true, data: resultsWithDetails };
  },

  getAcadAssessmentResultStats: async (filters?: {
    program?: string;
    course?: string;
    student_group?: string;
    academic_year?: string;
  }): Promise<ApiResult<{
    total_results: number;
    average_score: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    grade_distribution: { A: number; B: number; C: number; D: number; F: number };
    top_performer?: { student_name: string; student: string; percentage: number; grade: string };
  }>> => {
    const resultsRes = await api.getAcadAssessmentResults(filters);
    if (!resultsRes.ok) {
      return { ok: false, error: resultsRes.error || "Failed to fetch results for stats" };
    }

    const results = resultsRes.data || [];
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let totalPercentage = 0;
    let passCount = 0;
    let failCount = 0;
    let topPerformer: { student_name: string; student: string; percentage: number; grade: string } | undefined;

    results.forEach(result => {
      const percentage = result.maximum_score > 0
        ? (result.total_score / result.maximum_score) * 100
        : 0;
      totalPercentage += percentage;

      if (percentage >= 60) {
        passCount++;
      } else {
        failCount++;
      }

      if (percentage >= 90) gradeDistribution.A++;
      else if (percentage >= 80) gradeDistribution.B++;
      else if (percentage >= 70) gradeDistribution.C++;
      else if (percentage >= 60) gradeDistribution.D++;
      else gradeDistribution.F++;

      if (!topPerformer || percentage > topPerformer.percentage) {
        topPerformer = {
          student_name: result.student_name,
          student: result.student,
          percentage: Math.round(percentage),
          grade: result.grade,
        };
      }
    });

    const averageScore = results.length > 0 ? totalPercentage / results.length : 0;
    const passRate = results.length > 0 ? (passCount / results.length) * 100 : 0;

    return {
      ok: true,
      data: {
        total_results: results.length,
        average_score: Math.round(averageScore),
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: Math.round(passRate),
        grade_distribution: gradeDistribution,
        top_performer: topPerformer,
      },
    };
  },

  getAcadAssessmentPlans: async (filters?: {
    program?: string;
    course?: string;
    student_group?: string;
    academic_year?: string;
  }): Promise<ApiResult<any[]>> => {
    const erpFilters: any[] = [];

    if (filters?.program) {
      erpFilters.push(["Assessment Plan", "program", "=", filters.program]);
    }
    if (filters?.course) {
      erpFilters.push(["Assessment Plan", "course", "=", filters.course]);
    }
    if (filters?.student_group) {
      erpFilters.push(["Assessment Plan", "student_group", "=", filters.student_group]);
    }
    if (filters?.academic_year) {
      erpFilters.push(["Assessment Plan", "academic_year", "=", filters.academic_year]);
    }

    const res = await handleResponse<any>(
      resourceClient.get("Assessment Plan", {
        params: {
          fields: JSON.stringify([
            "name", "student_group", "program", "course",
            "academic_year", "academic_term", "assessment_group",
            "grading_scale", "maximum_assessment_score"
          ]),
          ...(erpFilters.length ? { filters: JSON.stringify(erpFilters) } : {}),
          limit_page_length: 500,
          order_by: "creation desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<any[]>;
    const rows = asArray<any>(res.data?.data ?? res.data);
    return { ok: true, data: rows };
  },

  getAssessmentPlanDetailFull: async (planName: string): Promise<ApiResult<any>> => {
    const res = await handleResponse<any>(
      resourceClient.get(`Assessment Plan/${encodeURIComponent(planName)}`)
    );
    if (!res.ok) return res;
    const data = res.data?.data ?? res.data;
    return { ok: true, data };
  },

  saveAssessmentResult: async (
  payload: CreateAssessmentResultPayload
): Promise<{ success: boolean; error?: string }> => {
  const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;
  const METHOD_URL =
    isSameDomain || isLocalDev
      ? "/api/method"
      : `https://${PROD_HOST}/api/method`;

  const detailRows = payload.details.map((d) => ({
    doctype: "Assessment Result Detail",
    parenttype: "Assessment Result",
    parentfield: "details",
    assessment_criteria: d.assessment_criteria,
    score: d.score,
    maximum_score: d.maximum_score,
  }));

  try {
    const checkUrl = new URL(
      `${RESOURCE_URL}/Assessment%20Result`,
      window.location.origin
    );
    checkUrl.searchParams.set("fields", JSON.stringify(["name", "docstatus"]));
    checkUrl.searchParams.set(
      "filters",
      JSON.stringify([
        ["assessment_plan", "=", payload.assessment_plan],
        ["student", "=", payload.student],
      ])
    );
    checkUrl.searchParams.set("limit_page_length", "1");

    const checkRes = await fetchWithTimeout(checkUrl.toString(), {
      credentials: "include",
      headers: buildHeaders(),
    });
    const checkJson = await checkRes.json().catch(() => ({ data: [] }));
    const existing: any[] = Array.isArray(checkJson.data) ? checkJson.data : [];

    if (existing.length > 0) {
      const docname = encodeURIComponent(existing[0].name);

      if (existing[0].docstatus === 1) {
        const cancelRes = await fetchWithTimeout(
          `${RESOURCE_URL}/Assessment%20Result/${docname}`,
          {
            method: "PUT",
            credentials: "include",
            headers: buildHeaders(),
            body: JSON.stringify({ docstatus: 2 }),
          }
        );
        if (!cancelRes.ok) {
          const err = await cancelRes.json().catch(() => ({}));
          return {
            success: false,
            error: parseErpError(err, "Could not cancel existing submitted result"),
          };
        }
      }

      const putRes = await fetchWithTimeout(`${RESOURCE_URL}/Assessment%20Result/${docname}`, {
        method: "PUT",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({
          doctype: "Assessment Result",
          comment: payload.comment ?? "",
          maximum_score: payload.maximum_score,
          grade: payload.grade,
          details: detailRows,
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        return {
          success: false,
          error: parseErpError(err, `Update failed: ${putRes.status}`),
        };
      }
      return { success: true };
    }

    const postBody = {
      doctype: "Assessment Result",
      assessment_plan: payload.assessment_plan,
      student: payload.student,
      student_name: payload.student_name,
      student_group: payload.student_group,
      ...(payload.program          ? { program: payload.program }                   : {}),
      ...(payload.course           ? { course: payload.course }                     : {}),
      ...(payload.academic_year    ? { academic_year: payload.academic_year }       : {}),
      ...(payload.academic_term    ? { academic_term: payload.academic_term }       : {}),
      ...(payload.assessment_group ? { assessment_group: payload.assessment_group } : {}),
      ...(payload.grading_scale    ? { grading_scale: payload.grading_scale }       : {}),
      ...(payload.maximum_score    ? { maximum_score: payload.maximum_score }       : {}),
      ...(payload.grade            ? { grade: payload.grade }                       : {}),
      ...(payload.comment          ? { comment: payload.comment }                   : {}),
      details: detailRows,
    };

    const postRes = await fetchWithTimeout(`${RESOURCE_URL}/Assessment%20Result`, {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify(postBody),
    });

    if (!postRes.ok) {
      const err = await postRes.json().catch(() => ({}));
      return {
        success: false,
        error: parseErpError(err, `Create failed: ${postRes.status}`),
      };
    }

    const newDoc = await postRes.json().catch(() => ({}));
    const newName = newDoc?.data?.name;
    if (newName) {
      // ⚠️ FIX: pehle yeh "fire and forget" thi (.catch se error silently ignore
      // hoti thi, response ka .ok kabhi check nahi hota tha). Ab timeout ke
      // saath properly await aur check karte hain.
      try {
        const submitRes = await fetchWithTimeout(`${METHOD_URL}/frappe.client.submit`, {
          method: "POST",
          credentials: "include",
          headers: buildHeaders(),
          body: JSON.stringify({
            doc: { doctype: "Assessment Result", name: newName, docstatus: 1 },
          }),
        });
        if (!submitRes.ok) {
          console.warn("[API] Submit failed for", newName);
        }
      } catch {
        console.warn("[API] Submit request timed out or failed for", newName);
      }
    }

    return { success: true };
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { success: false, error: "Request timed out — server took too long to respond" };
    }
    return { success: false, error: e?.message || "Network error" };
  }
},
// ═══════════════════════════════════════════════════════════════════════════════
// 📊 REPORTS API METHODS 
// ═══════════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────
  // R0. GET ALL INSTRUCTORS FOR REPORTS (Active + Left + Inactive)
  // Yeh method Reports page ke liye hai - Sections page wale se ALAG
  // ─────────────────────────────────────────────────────────────────────────
  getAllInstructorsForReports: async (options?: {
    batchSize?: number;
    includeInactive?: boolean;
  }): Promise<any[]> => {
    const batchSize = options?.batchSize || 500;
    const includeInactive = options?.includeInactive !== false; // Default: true (saare instructors)
    let allInstructors: any[] = [];
    let start = 0;
    let hasMore = true;

    const fields = [
      "name",
      "instructor_name",
      "employee_name",
      "status",
      "employee",
      "gender",
      "user_id",
      "department",
      "designation",
      "date_of_joining",
      "date_of_leaving",
      "enabled",
      "image",
    ];

    const filters: any[] = [];
    
    // Agar includeInactive false hai TAB hi filter lagao
    if (!includeInactive) {
      filters.push(["Instructor", "status", "=", "Active"]);
    }

    console.log('📊 [Reports] Fetching ALL instructors - includeInactive:', includeInactive);

    while (hasMore) {
      try {
        const res = await handleResponse<any>(
          resourceClient.get("Instructor", {
            params: {
              fields: JSON.stringify(fields),
              limit_page_length: batchSize,
              limit_start: start,
              ...(filters.length ? { filters: JSON.stringify(filters) } : {}),
              order_by: "instructor_name asc",
            },
          })
        );

        if (!res.ok) {
          console.warn('❌ [Reports] Failed to fetch instructors batch:', res.error);
          break;
        }

        const batch = res.data?.data || res.data || [];
        const batchArray = Array.isArray(batch) ? batch : [];
        
        allInstructors = [...allInstructors, ...batchArray];

        if (batchArray.length < batchSize) {
          hasMore = false;
        } else {
          start += batchSize;
        }
      } catch (err) {
        console.error('❌ [Reports] Error fetching instructors:', err);
        break;
      }
    }

    // Status breakdown for debugging
    const statusBreakdown = allInstructors.reduce((acc: any, inst: any) => {
      const status = inst.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ [Reports] Total instructors fetched: ${allInstructors.length}`);
    console.log(`✅ [Reports] Status breakdown:`, statusBreakdown);
    console.log(`✅ [Reports] Active: ${allInstructors.filter(i => i.status === 'Active').length}`);
    console.log(`✅ [Reports] Left/Inactive: ${allInstructors.filter(i => i.status !== 'Active').length}`);
    console.log(`✅ [Reports] Full list:`, allInstructors.map((i: any) => ({
      id: i.name,
      name: i.instructor_name || i.employee_name || i.name,
      status: i.status || 'Unknown',
    })));

    return allInstructors;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // R1. GET TEACHER COURSE SCHEDULES
  // ─────────────────────────────────────────────────────────────────────────
  getTeacherCourseSchedules: async (filters?: {
    from_date?: string;
    to_date?: string;
    program?: string;
    instructor?: string;
  }): Promise<ApiResult<any[]>> => {
    const erpFilters: any[] = [];
    if (filters?.from_date)  erpFilters.push(["Course Schedule", "schedule_date", ">=", filters.from_date]);
    if (filters?.to_date)    erpFilters.push(["Course Schedule", "schedule_date", "<=", filters.to_date]);
    if (filters?.program)    erpFilters.push(["Course Schedule", "program", "=", filters.program]);
    if (filters?.instructor) erpFilters.push(["Course Schedule", "instructor", "=", filters.instructor]);

    try {
      const rows = await fetchAllResourcePages(
        "Course Schedule",
        ["name", "instructor", "instructor_name", "student_group", "program", "course",
         "schedule_date", "from_time", "to_time", "room", "custom_meeting_link"],
        erpFilters,
        "schedule_date desc",
        99999
      );
      console.log(`✅ [Reports] Schedules fetched: ${rows.length}`);
      return { ok: true, data: rows };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch schedules" };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // R2. GET ALL ATTENDANCE RECORDS
  // ─────────────────────────────────────────────────────────────────────────
  getAllAttendanceRecords: async (filters?: {
    from_date?: string;
    to_date?: string;
    student_group?: string;
  }): Promise<ApiResult<any[]>> => {
    const erpFilters: any[] = [];
    if (filters?.student_group) erpFilters.push(["Student Attendance", "student_group", "=", filters.student_group]);
    if (filters?.from_date)     erpFilters.push(["Student Attendance", "date", ">=", filters.from_date]);
    if (filters?.to_date)       erpFilters.push(["Student Attendance", "date", "<=", filters.to_date]);

    try {
      const rows = await fetchAllResourcePages(
        "Student Attendance",
        ["name", "student", "student_name", "course_schedule", "student_group", "date", "status"],
        erpFilters,
        "date desc",
        99999
      );
      console.log(`✅ [Reports] Attendance records fetched: ${rows.length}`);
      return { ok: true, data: rows };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch attendance" };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // R3. GET ALL ASSESSMENT RESULTS
  // ─────────────────────────────────────────────────────────────────────────
  getAllAssessmentResults: async (filters?: {
    from_date?: string;
    to_date?: string;
    program?: string;
    course?: string;
    student_group?: string;
  }): Promise<ApiResult<any[]>> => {
    const erpFilters: any[] = [];
    if (filters?.program)       erpFilters.push(["Assessment Result", "program", "=", filters.program]);
    if (filters?.course)        erpFilters.push(["Assessment Result", "course", "=", filters.course]);
    if (filters?.student_group) erpFilters.push(["Assessment Result", "student_group", "=", filters.student_group]);
    if (filters?.from_date)     erpFilters.push(["Assessment Result", "creation", ">=", filters.from_date]);
    if (filters?.to_date)       erpFilters.push(["Assessment Result", "creation", "<=", filters.to_date + " 23:59:59"]);

    try {
      const rows = await fetchAllResourcePages(
        "Assessment Result",
        ["name", "student", "student_name", "assessment_plan", "student_group", "program", "course",
         "academic_year", "academic_term", "total_score", "maximum_score", "grade", "docstatus", "creation", "modified"],
        erpFilters,
        "creation desc",
        99999
      );
      console.log(`✅ [Reports] Assessment results fetched: ${rows.length}`);
      return { ok: true, data: rows };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch assessment results" };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // R4. GET STUDENT GROUPS WITH ENROLLMENT - INDIVIDUAL FETCH (NO 403)
  // ─────────────────────────────────────────────────────────────────────────
  getStudentGroupsWithEnrollment: async (): Promise<ApiResult<any[]>> => {
    // Step 1: Get all Student Groups
    const groupsRes = await handleResponse<any>(
      resourceClient.get("Student Group", {
        params: {
          fields: JSON.stringify([
            "name", 
            "student_group_name", 
            "program", 
            "max_strength", 
            "academic_year", 
            "academic_term", 
            "disabled"
          ]),
          filters: JSON.stringify([["Student Group", "disabled", "=", 0]]),
          limit_page_length: 99999,
          order_by: "program asc, name asc",
        },
      })
    );
    
    if (!groupsRes.ok) return groupsRes as ApiResult<any[]>;
    const groups = asArray<any>(groupsRes.data?.data ?? groupsRes.data);

    console.log('📊 Total Student Groups found:', groups.length);

    // Step 2: Fetch each group individually to get students
    const results: any[] = [];
    
    for (const g of groups) {
      try {
        // Fetch full group details with students
        const detailRes = await handleResponse<any>(
          resourceClient.get(`Student Group/${encodeURIComponent(g.name)}`, {
            params: {
              fields: JSON.stringify([
                "name", 
                "student_group_name", 
                "program", 
                "max_strength", 
                "students"
              ]),
            },
          })
        );
        
        if (detailRes.ok) {
          const data = detailRes.data?.data || detailRes.data;
          const students = asArray<any>(data?.students || []);
          // Count only active students
          const enrolled = students.filter((s: any) => s.active !== 0).length;
          
          results.push({
            name: g.name,
            student_group_name: g.student_group_name || g.name,
            program: g.program,
            academic_year: g.academic_year,
            academic_term: g.academic_term,
            enrolled: enrolled || 0,
            capacity: g.max_strength || 30,
          });
        } else {
          // If detail fetch fails, return with 0
          results.push({
            name: g.name,
            student_group_name: g.student_group_name || g.name,
            program: g.program,
            academic_year: g.academic_year,
            academic_term: g.academic_term,
            enrolled: 0,
            capacity: g.max_strength || 30,
          });
        }
      } catch (err) {
        // On error, return with 0
        results.push({
          name: g.name,
          student_group_name: g.student_group_name || g.name,
          program: g.program,
          academic_year: g.academic_year,
          academic_term: g.academic_term,
          enrolled: 0,
          capacity: g.max_strength || 30,
        });
      }
    }

    console.log('📊 Total Sections with enrollment:', results.length);
    console.log('📊 Total Enrolled Students:', results.reduce((sum, g) => sum + g.enrolled, 0));
    
    // Log sections with students
    const withStudents = results.filter(g => g.enrolled > 0);
    console.log(`📊 Sections with students: ${withStudents.length} / ${results.length}`);

    return { ok: true, data: results };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // R5. GET COMPLIANCE AUDIT
  // ─────────────────────────────────────────────────────────────────────────
  getComplianceAudit: async (limit = 500): Promise<ApiResult<any[]>> => {
    const relevantDoctypes = ["Student", "Student Group", "Course Schedule", "Student Attendance", "Assessment Result"];

    const actionFor = (field: string): string => {
      const f = field.toLowerCase();
      if (f === "status" || f === "enabled")           return "Status Change";
      if (f === "student_group" || f === "section")    return "Section Transfer";
      if (f.includes("link") || f.includes("meeting")) return "Link Update";
      if (f === "docstatus")                           return "Submit/Cancel";
      return "Field Update";
    };

    let versionRows: any[] = [];
    try {
      versionRows = await fetchAllResourcePages(
        "Version",
        ["name", "creation", "owner", "ref_doctype", "docname", "data"],
        [["Version", "ref_doctype", "in", relevantDoctypes]],
        "creation desc",
        limit
      );
    } catch { /* Version may not be accessible */ }

    const versionLogs: any[] = [];
    for (const v of versionRows) {
      try {
        const parsed = typeof v.data === "string" ? JSON.parse(v.data) : v.data;
        const changed: any[] = parsed?.changed ?? [];
        if (!changed.length) continue;

        const beforeParts: string[] = [];
        const afterParts: string[] = [];
        let action = "Update";
        for (const [field, oldVal, newVal] of changed) {
          if (["modified", "modified_by", "idx"].includes(field)) continue;
          beforeParts.push(`${field}: ${oldVal ?? "—"}`);
          afterParts.push(`${field}: ${newVal ?? "—"}`);
          action = actionFor(field);
        }
        if (!beforeParts.length) continue;

        versionLogs.push({
          time:   v.creation ? String(v.creation).slice(0, 19).replace("T", " ") : "—",
          action,
          entity: `${v.ref_doctype}: ${v.docname}`,
          by:     v.owner || "—",
          ip:     "—",
          before: beforeParts.join("; "),
          after:  afterParts.join("; "),
        });
      } catch { /* unparseable version row, skip */ }
    }

    let activityLogs: any[] = [];
    try {
      const rows = await fetchAllResourcePages(
        "Activity Log",
        ["name", "creation", "subject", "content", "user", "reference_doctype", "reference_name", "status", "ip_address"],
        [["Activity Log", "reference_doctype", "in", relevantDoctypes]],
        "creation desc",
        limit
      );
      activityLogs = rows
        .map((log: any) => {
          const subj = (log.subject || "").toLowerCase();
          const cont = (log.content || "").toLowerCase();
          let action = "";
          if (subj.includes("creat") || cont.includes("creat"))       action = "Create";
          else if (subj.includes("delet") || cont.includes("delet"))  action = "Delete";
          else if (subj.includes("submit") || cont.includes("submit")) action = "Submit/Cancel";
          if (!action) return null;
          return {
            time:   log.creation ? String(log.creation).slice(0, 19).replace("T", " ") : "—",
            action,
            entity: `${log.reference_doctype}: ${log.reference_name || "—"}`,
            by:     log.user || "—",
            ip:     log.ip_address || "—",
            before: "—",
            after:  log.subject || (log.content || "").slice(0, 80) || "—",
          };
        })
        .filter(Boolean) as any[];
    } catch { /* Activity Log may not be accessible */ }

    const merged = [...versionLogs, ...activityLogs]
      .sort((a, b) => (a.time < b.time ? 1 : -1))
      .slice(0, limit);

    return { ok: true, data: merged };
  },
  
    // ═══════════════════════════════════════════════════════════════════════════════
  // 👨‍🏫 FACULTY MANAGEMENT (ACADTEACHERS) – COMPLETE FIXED API (v6 — NO PAGE LIMITS)
  // ═══════════════════════════════════════════════════════════════════════════════

  // ── Helper to parse ERP error responses (also reads _server_messages) ──
  parseErpError: (err: any, defaultMsg: string): string => {
    if (err?._server_messages) {
      try {
        const messages = JSON.parse(err._server_messages);
        const first = JSON.parse(messages[0]);
        if (first?.message) return first.message;
      } catch { /* ignore parse errors, fall through */ }
    }
    if (err?.exception) return err.exception;
    if (err?.message) return err.message;
    if (err?.error) {
      if (typeof err.error === 'string') return err.error;
      if (err.error.message) return err.error.message;
    }
    if (typeof err === 'string') return err;
    return defaultMsg;
  },

  // Get all programs (grades) — ✅ NO CAP
  getPrograms: async (): Promise<ApiResult<{ name: string; program_name?: string }[]>> => {
    try {
      const data = await fetchAllPages<any>('Program', ['name', 'program_name']);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // Get all courses (subjects) — ✅ NO CAP
  getCourses: async (): Promise<ApiResult<{ name: string; course_name: string }[]>> => {
    try {
      const data = await fetchAllPages<any>('Course', ['name', 'course_name']);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // Get program courses (curriculum) — single-doc fetch, child table comes
  // back whole with the parent doc, no list-endpoint page limit here.
  getProgramCourses: async (program: string): Promise<ApiResult<{ course: string; course_name: string; required: number }[]>> => {
    try {
      const res = await handleResponse<any>(
        resourceClient.get(`Program/${encodeURIComponent(program)}`, {
          params: {
            fields: JSON.stringify(['name', 'program_name']),
          },
        })
      );

      if (!res.ok) return { ok: false, error: res.error || 'Failed to fetch program details' };

      const programData = res.data?.data ?? res.data;
      const programCourses = programData?.courses || [];

      if (Array.isArray(programCourses) && programCourses.length > 0) {
        const courses = programCourses.map((pc: any) => ({
          course: pc.course,
          course_name: pc.course_name || pc.course,
          required: pc.required || 0,
        }));
        return { ok: true, data: courses };
      }

      return { ok: true, data: [] };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // Get student groups (sections) — filtered by program, or ALL if no program given
  // ✅ NO CAP
  getStudentGroupsByProgram: async (program?: string): Promise<ApiResult<any[]>> => {
    try {
      const filters = program
        ? [['Student Group', 'program', '=', program]]
        : undefined;

      const data = await fetchAllPages<any>(
        'Student Group',
        ['name', 'student_group_name', 'program'],
        filters
      );
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // Get all instructors — ✅ NO CAP
  getInstructors: async (): Promise<ApiResult<{ name: string; employee_name: string }[]>> => {
    try {
      const rows = await fetchAllPages<any>(
        'Instructor',
        ['name', 'instructor_name'],
        undefined,
        'instructor_name asc'
      );

      const instructors = rows.map((r: any) => ({
        name: r.name,
        employee_name: (r.instructor_name && r.instructor_name.trim()) || r.name,
      }));

      return { ok: true, data: instructors };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  getTeachersFromUsers: async (): Promise<ApiResult<{ name: string; employee_name: string }[]>> => {
    try {
      const users = await fetchAllPages<any>(
        'User',
        ['name', 'full_name'],
        [['User', 'role', '=', 'Teacher']]
      );
      const instructors = users.map(u => ({
        name: u.name,
        employee_name: u.full_name || u.name,
      }));
      return { ok: true, data: instructors };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // Get course schedules with optional program filter
  getCourseSchedulesForAssignment: async (program?: string): Promise<ApiResult<any[]>> => {
    try {
      const filters = program
        ? [['Course Schedule', 'program', '=', program]]
        : undefined;

      const data = await fetchAllPages<any>(
        'Course Schedule',
        [
          'name', 'course', 'student_group', 'instructor', 'instructor_name',
          'schedule_date', 'from_time', 'to_time', 'program'
        ],
        filters
      );
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // ✅ NO CAP
  getRooms: async (): Promise<ApiResult<{ name: string; room_name?: string }[]>> => {
    try {
      const data = await fetchAllPages<any>('Room', ['name', 'room_name']);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  getDefaultRoom: async (): Promise<string> => {
    try {
      const res = await api.getRooms();
      if (res.ok && res.data.length > 0) return res.data[0].name;
    } catch (e) {
      console.error('getDefaultRoom error', e);
    }
    return '';
  },

  getValidScheduleDateForGroup: async (studentGroup: string): Promise<string> => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const sgRes = await handleResponse<any>(
        resourceClient.get(`Student Group/${encodeURIComponent(studentGroup)}`, {
          params: { fields: JSON.stringify(['name', 'academic_year']) },
        })
      );

      const academicYear = sgRes.ok
        ? (sgRes.data?.data?.academic_year || sgRes.data?.academic_year)
        : null;

      if (!academicYear) return today;

      const ayRes = await handleResponse<any>(
        resourceClient.get(`Academic Year/${encodeURIComponent(academicYear)}`, {
          params: { fields: JSON.stringify(['name', 'year_start_date', 'year_end_date']) },
        })
      );

      const ayData = ayRes.ok ? (ayRes.data?.data ?? ayRes.data) : null;
      const startDate = ayData?.year_start_date;
      const endDate = ayData?.year_end_date;

      if (!startDate || !endDate) return today;

      if (today >= startDate && today <= endDate) return today;
      return startDate;
    } catch (e) {
      console.error('getValidScheduleDateForGroup error', e);
      return today;
    }
  },

  assignTeacherToCourseGroup: async (
    course: string,
    studentGroup: string,
    instructor: string,
    instructorName: string,
    program: string
  ): Promise<ApiResult<any>> => {
    const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;
    try {
      const findRes = await handleResponse<any>(
        resourceClient.get('Course Schedule', {
          params: {
            fields: JSON.stringify(['name', 'schedule_date', 'from_time', 'to_time', 'docstatus', 'room']),
            filters: JSON.stringify([
              ['Course Schedule', 'course', '=', course],
              ['Course Schedule', 'student_group', '=', studentGroup],
            ]),
            limit_page_length: 1,
          },
        })
      );

      const existing = findRes.ok && findRes.data?.length ? findRes.data[0] : null;

      const resolvedRoom = existing?.room || (await api.getDefaultRoom());
      if (!resolvedRoom) {
        return {
          ok: false,
          error: 'No Room exists in the ERP. Please create at least one Room record (Education > Room) before assigning teachers.',
        };
      }

      const body: any = {
        course: course,
        student_group: studentGroup,
        instructor: instructor || '',
        instructor_name: instructorName || instructor || '',
        program: program,
        title: `${course} - ${studentGroup}`,
        room: resolvedRoom,
      };

      if (existing) {
        body.schedule_date = existing.schedule_date || (await api.getValidScheduleDateForGroup(studentGroup));
        body.from_time = existing.from_time || '09:00:00';
        body.to_time = existing.to_time || '10:00:00';
      } else {
        body.schedule_date = await api.getValidScheduleDateForGroup(studentGroup);
        body.from_time = '09:00:00';
        body.to_time = '10:00:00';
      }

      if (existing) {
        const updateRes = await fetch(`${RESOURCE_URL}/Course%20Schedule/${encodeURIComponent(existing.name)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            ...buildHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          let errJson;
          try { errJson = JSON.parse(errText); } catch { errJson = { message: errText }; }
          return {
            ok: false,
            error: api.parseErpError(errJson, `Update failed: ${updateRes.status} ${updateRes.statusText}`)
          };
        }

        const result = await updateRes.json();
        return { ok: true, data: result };
      } else {
        const createBody = {
          doctype: 'Course Schedule',
          ...body,
          naming_series: 'CS-',
        };

        const createRes = await fetch(`${RESOURCE_URL}/Course%20Schedule`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...buildHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createBody),
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          let errJson;
          try { errJson = JSON.parse(errText); } catch { errJson = { message: errText }; }
          return {
            ok: false,
            error: api.parseErpError(errJson, `Create failed: ${createRes.status} ${createRes.statusText}`)
          };
        }

        const result = await createRes.json();
        return { ok: true, data: result };
      }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  async getAssignments(course?: string): Promise<ApiResult<Assignment[]>> {
    const filters: any[] = [["docstatus", "!=", 2]];
    if (course) filters.push(["course", "=", course]);

    return handleResponse(
      resourceClient.get("/Academic Assignments", {
        params: {
          fields: JSON.stringify([
            "name", "course", "link_gdbv", "heading", "description", "docstatus", "creation",
          ]),
          filters: JSON.stringify(filters),
          limit_page_length: 0,
          order_by: "creation desc",
        },
      })
    );
  },

  async createAssignment(payload: {
    course: string;
    link_gdbv: string;
    heading: string;
    description?: string;
  }): Promise<ApiResult<Assignment>> {
    return handleResponse(
      resourceClient.post("/Academic Assignments", payload)
    );
  },

  getStudentGroupDetails: async (groupName: string): Promise<ApiResult<any>> => {
    try {
      const res = await handleResponse<any>(
        resourceClient.get(`Student Group/${encodeURIComponent(groupName)}`, {
          params: {
            fields: JSON.stringify([
              'name', 'student_group_name', 'program', 'academic_year',
              'academic_term', 'max_strength', 'batch', 'group_based_on',
            ]),
          },
        })
      );
      if (!res.ok) return { ok: false, error: res.error || 'Failed to fetch group details' };
      return { ok: true, data: res.data?.data || res.data };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  getStudentGroupTemplateFields: async (program: string): Promise<Record<string, any> | null> => {
    try {
      const listRes = await handleResponse<any>(
        resourceClient.get('Student Group', {
          params: {
            fields: JSON.stringify(['name']),
            filters: JSON.stringify([['Student Group', 'program', '=', program]]),
            limit_page_length: 1,
          },
        })
      );
      const rows = listRes.ok ? asArray<any>(listRes.data?.data ?? listRes.data) : [];
      if (!rows.length) return null;
      const templateName = rows[0].name;

      const docRes = await handleResponse<any>(
        resourceClient.get(`Student Group/${encodeURIComponent(templateName)}`)
      );
      if (!docRes.ok) return null;
      return docRes.data?.data ?? docRes.data;
    } catch (e) {
      console.error('getStudentGroupTemplateFields error', e);
      return null;
    }
  },

  createStudentGroup: async (program: string, sectionName: string): Promise<ApiResult<any>> => {
    const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;
    try {
      if (!sectionName || !sectionName.trim()) {
        return { ok: false, error: 'Section name is required' };
      }

      const template = await api.getStudentGroupTemplateFields(program);

      const body: any = {
        doctype: 'Student Group',
        student_group_name: sectionName.trim(),
        program: program,
        group_based_on: template?.group_based_on || 'Batch',
      };

      if (template) {
        if (template.academic_year) body.academic_year = template.academic_year;
        if (template.academic_term) body.academic_term = template.academic_term;
        if (template.batch) body.batch = template.batch;
        if (template.max_strength) body.max_strength = template.max_strength;
      }

      const createRes = await fetch(`${RESOURCE_URL}/Student%20Group`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...buildHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        let errJson;
        try { errJson = JSON.parse(errText); } catch { errJson = { message: errText }; }
        return {
          ok: false,
          error: api.parseErpError(errJson, `Add Section failed: ${createRes.status} ${createRes.statusText}`),
        };
      }

      const result = await createRes.json();
      return { ok: true, data: result };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  removeTeacherFromCourseGroup: async (course: string, studentGroup: string): Promise<ApiResult<any>> => {
    const RESOURCE_URL = `${RESOURCE_BASE}/api/resource`;
    try {
      const findRes = await handleResponse<any>(
        resourceClient.get('Course Schedule', {
          params: {
            fields: JSON.stringify(['name']),
            filters: JSON.stringify([
              ['Course Schedule', 'course', '=', course],
              ['Course Schedule', 'student_group', '=', studentGroup],
            ]),
            limit_page_length: 1,
          },
        })
      );

      if (!findRes.ok || !findRes.data?.length) {
        return { ok: true, data: { alreadyRemoved: true } };
      }

      const existing = findRes.data[0];

      const deleteRes = await fetch(`${RESOURCE_URL}/Course%20Schedule/${encodeURIComponent(existing.name)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...buildHeaders(),
        },
      });

      if (!deleteRes.ok) {
        const errText = await deleteRes.text();
        let errJson;
        try { errJson = JSON.parse(errText); } catch { errJson = { message: errText }; }
        return { ok: false, error: api.parseErpError(errJson, `Remove failed: ${deleteRes.status} ${deleteRes.statusText}`) };
      }

      return { ok: true, data: { deleted: true } };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },

  // ✅ NO CAP — previously hardcapped at 500 schedule rows per teacher scan
  getTeacherScheduleConflicts: async (teacher: string): Promise<ApiResult<any[]>> => {
    try {
      const schedules = await fetchAllPages<any>(
        'Course Schedule',
        ['course', 'student_group', 'schedule_date', 'from_time', 'to_time'],
        [['Course Schedule', 'instructor', '=', teacher]]
      );

      const conflicts: any[] = [];
      for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
          if (schedules[i].schedule_date === schedules[j].schedule_date) {
            const from1 = schedules[i].from_time, to1 = schedules[i].to_time;
            const from2 = schedules[j].from_time, to2 = schedules[j].to_time;
            if (from1 < to2 && from2 < to1) {
              conflicts.push({
                teacher,
                course1: schedules[i].course,
                section1: schedules[i].student_group,
                course2: schedules[j].course,
                section2: schedules[j].student_group,
                date: schedules[i].schedule_date,
                time: `${from1}-${to1} overlaps ${from2}-${to2}`,
              });
            }
          }
        }
      }
      return { ok: true, data: conflicts };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' };
    }
  },


  // ═══════════════════════════════════════════════════════════════════════════════
  // 🛡️ AUDIT LOG API METHODS (kept separate from reports)
  // ═══════════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────────
  // A1. GET STATUS CHANGE AUDIT ENTRIES
  // ─────────────────────────────────────────────────────────────────────────────
  getAuditStatusChanges: async (limit = 200): Promise<ApiResult<any[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("Student", {
        params: {
          fields: JSON.stringify([
            "name", "student_name", "status",
            "modified", "modified_by", "owner",
          ]),
          filters: JSON.stringify([
            ["Student", "status", "in", ["Inactive", "Suspended", "On-Leave", "Active"]],
          ]),
          limit_page_length: limit,
          order_by: "modified desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<any[]>;

    const rows = asArray<any>(res.data?.data ?? res.data);
    const mapped = rows.map((s: any) => ({
      id:         `STA-${s.name}`,
      timestamp:  s.modified || "",
      action:     "Status Change" as const,
      entity:     s.student_name || s.name,
      entityId:   s.name,
      changedBy:  s.modified_by || s.owner || "—",
      ip:         "—",
      before:     "—",
      after:      s.status === "On-Leave" ? "On Leave" : (s.status || "Active"),
      severity:   s.status === "Suspended" ? "critical"
                : s.status === "Inactive"  ? "warning"
                : s.status === "On-Leave"  ? "warning"
                : "info",
    }));
    return { ok: true, data: mapped };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // A2. GET SECTION TRANSFER AUDIT ENTRIES
  // ─────────────────────────────────────────────────────────────────────────────
  getAuditTransfers: async (limit = 200): Promise<ApiResult<any[]>> => {
    const groupsRes = await handleResponse<any>(
      resourceClient.get("Student Group", {
        params: {
          fields: JSON.stringify(["name", "student_group_name", "modified", "modified_by"]),
          filters: JSON.stringify([["Student Group", "disabled", "=", 0]]),
          limit_page_length: 300,
          order_by: "modified desc",
        },
      })
    );
    if (!groupsRes.ok) return groupsRes as ApiResult<any[]>;
    const groups = asArray<any>(groupsRes.data?.data ?? groupsRes.data).slice(0, 100);

    const CONCURRENCY = 8;
    const allEntries: any[][] = new Array(groups.length).fill([]);
    let cursor = 0;

    const worker = async () => {
      while (cursor < groups.length) {
        const idx = cursor++;
        const g = groups[idx];
        try {
          const detailRes = await handleResponse<any>(
            resourceClient.get(`Student Group/${encodeURIComponent(g.name)}`)
          );
          if (detailRes.ok) {
            const detail = detailRes.data?.data ?? detailRes.data;
            const members = asArray<any>(detail?.students ?? []);
            allEntries[idx] = members.map((m: any) => ({
              id:         `TRF-${g.name}-${m.name || m.student}`,
              timestamp:  m.modified || g.modified || "",
              action:     "Transfer" as const,
              entity:     m.student_name || m.student || "—",
              entityId:   m.student || "—",
              changedBy:  g.modified_by || "—",
              ip:         "—",
              before:     "—",
              after:      `${g.student_group_name || g.name}`,
              severity:   "info" as const,
            }));
          }
        } catch { /* skip failed group */ }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, groups.length) }, () => worker());
    await Promise.all(workers);

    const flat = allEntries.flat();
    flat.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return { ok: true, data: flat.slice(0, limit) };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // A3. GET MEET LINK UPDATE AUDIT ENTRIES
  // ─────────────────────────────────────────────────────────────────────────────
  getAuditMeetLinks: async (limit = 200): Promise<ApiResult<any[]>> => {
    const res = await handleResponse<any>(
      resourceClient.get("Course Schedule", {
        params: {
          fields: JSON.stringify([
            "name", "student_group", "course",
            "custom_meeting_link", "modified", "modified_by",
          ]),
          filters: JSON.stringify([
            ["Course Schedule", "custom_meeting_link", "not in", ["", null]],
          ]),
          limit_page_length: limit,
          order_by: "modified desc",
        },
      })
    );
    if (!res.ok) return res as ApiResult<any[]>;

    const rows = asArray<any>(res.data?.data ?? res.data);
    const mapped = rows.map((c: any) => ({
      id:         `MTL-${c.name}`,
      timestamp:  c.modified || "",
      action:     "Meet Link" as const,
      entity:     `${c.student_group || "—"} — ${c.course || "—"}`,
      entityId:   c.name,
      changedBy:  c.modified_by || "—",
      ip:         "—",
      before:     "—",
      after:      c.custom_meeting_link || "—",
      severity:   "info" as const,
    }));
    return { ok: true, data: mapped };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // A4. GET COMBINED AUDIT TRAIL
  // ─────────────────────────────────────────────────────────────────────────────
  getAuditTrail: async (limit = 300): Promise<ApiResult<any[]>> => {
    const [statusRes, transferRes, meetRes] = await Promise.all([
      api.getAuditStatusChanges(limit),
      api.getAuditTransfers(limit),
      api.getAuditMeetLinks(limit),
    ]);

    const combined: any[] = [
      ...(statusRes.ok ? statusRes.data : []),
      ...(transferRes.ok ? transferRes.data : []),
      ...(meetRes.ok ? meetRes.data : []),
    ];

    combined.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
    return { ok: true, data: combined.slice(0, limit) };
  },

};