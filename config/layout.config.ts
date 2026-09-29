// config/layout.config.ts
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  FileText,
  Contact2,
  GraduationCap,
  BookOpen,
  Layers,
  CheckSquare,
  CalendarDays,
  BookMarked,
  Calendar,
  Users,
  ClipboardCheck,
  UserRound,
  ClipboardList,
  FileCheck,
  Library,
  BarChart,
  DollarSign,
  Link,
  ShieldCheck,
  Banknote,
  Megaphone,
  School,
  Activity,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  iconName: string;
  allowedDesignations?: string[];
  allowedRoles?: string[]; // ← Frappe Role-based visibility (e.g. custom "Academics" role)
  dashboardOnly?: boolean;
  children?: NavItem[];
}

export const sidebarConfig: NavItem[] = [
  // ─── Main Dashboard ──────────────────────────────────────────
  { to: '/', label: 'Main Dashboard', iconName: 'LayoutDashboard' },

  // ─── ESS Dashboard ──────────────────────────────────────────
  {
    to: '/ess',
    label: 'ESS Dashboard',
    iconName: 'Layers',
    children: [
      { to: '/attendance',   label: 'My Attendance',      iconName: 'Clock' },
      { to: '/leave',        label: 'Leave Applications', iconName: 'CalendarCheck' },
      { to: '/salary-slip',  label: 'Salary Slips',       iconName: 'FileText' },
      { to: '/directory',    label: 'Contacts',           iconName: 'Contact2' },
      { to: '/profile',      label: 'My Profile',         iconName: 'GraduationCap' },
    ],
  },

  // ─── To Do ──────────────────────────────────────────────────
  { to: '/todo', label: 'To Do', iconName: 'CheckSquare' },

  // ─── Calendar ───────────────────────────────────────────────
  { to: '/calendar', label: 'Calendar', iconName: 'CalendarDays' },

  // ─── Teacher Dashboard ──────────────────────────────────────
  {
    to: '/faculty',
    label: 'Teacher Dashboard',
    iconName: 'BookOpen',
    allowedDesignations: ["Teacher"],
    children: [
      { to: '/faculty/programs',    label: 'Programs & Courses',  iconName: 'BookMarked' },
      { to: '/faculty/schedule',    label: 'Course Schedule',     iconName: 'CalendarIcon' },
      { to: '/faculty/students',    label: 'Student Groups',      iconName: 'Users' },
      { to: '/faculty/attendance',  label: 'Student Attendance',  iconName: 'ClipboardCheck' },
      { to: '/faculty/mark',        label: 'Mark Attendance',     iconName: 'UserRound' },
      { to: '/faculty/assessment',  label: 'Assessment Tool',     iconName: 'ClipboardList' },
      { to: '/faculty/viewresults', label: 'View Results',        iconName: 'FileCheck' },
       { to: '/faculty/assignments', label: 'Assignments',         iconName: 'ClipboardList' },
       { to: '/faculty/classroom',   label: 'Google Classroom',    iconName: 'Link' },
       { to: '/faculty/student-activity', label: 'Student Activity', iconName: 'Activity' },
    ],
  },

  // ─── Academics Dashboard ─────────────────────────────────────
  {
    to: '/academics',
    label: 'Academics Dashboard',
    iconName: 'Library',
    allowedRoles: ["Academics"], 
    children: [
      { to: '/academics/students',     label: 'Students Management',    iconName: 'Users' },
      { to: '/academics/teachers',     label: 'Teacher Management',     iconName: 'Users' },
      { to: '/academics/meetlinks',    label: 'Meet Links',             iconName: 'Link' },
      { to: '/academics/sections',     label: 'Sections',               iconName: 'Layers' },
      { to: '/academics/attendance',   label: 'Attendance',             iconName: 'CalendarCheck' },
      { to: '/academics/assessment',   label: 'Assessment',             iconName: 'BarChart' },
      { to: '/academics/reports',      label: 'Reports',                iconName: 'FileText' },
      { to: '/academics/audit',        label: 'Audit Log',              iconName: 'ClipboardList' },
    ],
  },

  // ─── Admin / Chief Dashboard ──────────────────────────────────
  {
    to: '/admin',
    label: 'Chief Dashboard',
    iconName: 'ShieldCheck',
    allowedDesignations: ['Chief Executive Officer', 'CEO'],
    children: [
      { to: '/admin/employees',          label: 'Employees',          iconName: 'Users' },
      { to: '/admin/leave',              label: 'Leave Approvals',    iconName: 'CalendarCheck' },
      { to: '/admin/attendance',         label: 'Attendance',         iconName: 'Clock' },
      { to: '/admin/schedule',           label: 'Class Schedule',     iconName: 'CalendarIcon' },
      { to: '/admin/students',           label: 'Students',           iconName: 'GraduationCap' },
      { to: '/admin/teacher-profiles',   label: 'Teacher Profiles',   iconName: 'FileCheck' },
      { to: '/admin/student-attendance', label: 'Student Attendance', iconName: 'CalendarCheck' },
      { to: '/admin/student-activity',   label: 'Student Activity',   iconName: 'Activity' },
      { to: '/admin/salary-slips',       label: 'Salary Slips',       iconName: 'Banknote' },
      { to: '/admin/revenue',            label: 'Total Revenue',      iconName: 'Banknote' },
      { to: '/admin/reports',            label: 'Reports',            iconName: 'FileText' },
    ],
  },
];

export const getIcon = (name: string) => {
  const icons: Record<string, any> = {
    LayoutDashboard,
    Clock,
    CalendarCheck,
    FileText,
    Contact2,
    GraduationCap,
    BookOpen,
    Layers,
    CheckSquare,
    CalendarDays,
    BookMarked,
    CalendarIcon: Calendar,
    Users,
    ClipboardCheck,
    UserRound,
    ClipboardList,
    FileCheck,
    Library,
    BarChart,
    DollarSign,
    Link,
    ShieldCheck,
    Banknote,
    Megaphone,
    School,
    Activity,
  };
  return icons[name] || LayoutDashboard;
};

export const sidebarNavItems = sidebarConfig.filter(() => true);

/**
 * Determines whether a nav item should be visible to the current user.
 *
 * Rules:
 * - No `allowedDesignations` and no `allowedRoles` → visible to everyone.
 * - If either rule is defined, the item is visible if the user matches
 *   EITHER the designation rule OR the role rule (OR logic, not AND).
 *   This lets you add a custom Frappe Role (e.g. "Academics") to grant
 *   access to a specific user without changing their designation.
 */
export function isNavItemVisible(
  item: NavItem,
  designation: string,
  roles: string[] = []
): boolean {
  const hasDesignationRule = !!item.allowedDesignations?.length;
  const hasRoleRule = !!item.allowedRoles?.length;

  // No restrictions at all → visible to everyone
  if (!hasDesignationRule && !hasRoleRule) return true;

  const matchesDesignation =
    hasDesignationRule &&
    item.allowedDesignations!.some(
      (d) => d.toLowerCase() === (designation || "").toLowerCase()
    );

  const matchesRole =
    hasRoleRule &&
    item.allowedRoles!.some((allowedRole) =>
      roles.some((userRole) => userRole.toLowerCase() === allowedRole.toLowerCase())
    );

  return matchesDesignation || matchesRole;
}