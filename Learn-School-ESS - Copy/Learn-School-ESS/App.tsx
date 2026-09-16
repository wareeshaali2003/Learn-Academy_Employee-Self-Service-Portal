import React, { useEffect, useMemo, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { LeavePage } from "./pages/LeavePage";
import { AttendancePage } from "./pages/AttendancePage";
import { SalarySlipPage } from "./pages/SalarySlipPage";
import { ProfilePage } from "./pages/ProfilePage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { FacultyPage } from "./pages/FacultyPage";
import { EssDashboardPage } from "./pages/EssDashboardPage";
import { AdminDashboardPage } from "./pages/Admindashboardpage";
import CeoSchedulePage from "./pages/CeoSchedulePage";
import CeoTeacherProfilesPage from "./pages/CeoTeacherProfilesPage";
import { api } from "./services/api";
import { LoginPage } from "./pages/LoginPage";
import { TodoPage } from "./pages/TodoPage";
import { CalendarPage } from "./pages/Calendarpage";
import { useEmployee } from "./hooks/useEmployee";
import { AdminStudentsPage } from './pages/Adminstudentspage';
import Assignmentspage    from "./pages/AssignmentsPage";
// Teacher sub-pages
import ProgramsPage       from "./pages/Programspage";
import SchedulePage       from "./pages/Schedulepage";
import StdAttendancepage  from "./pages/StdAttendancepage";
import Studentspage       from "./pages/Studentspage";
import Markattendancepage from "./pages/Markattendancepage";
import Assessmentpage     from "./pages/Assessmentpage";
import Viewresultspage    from "./pages/Viewresultspage";
import FacultyClassroomPage from "./pages/FacultyClassroomPage";
import FacultyClassroomCourseDetailPage from "./pages/FacultyClassroomCourseDetail";
import FacultyStudentActivityPage from "./pages/FacultyStudentActivityPage";
import AdminStudentActivityPage from "./pages/AdminStudentActivityPage";

// Academics Dashboard pages
import AcademicDashboard from "./pages/AcademicDashboard";
import Acadstudentspage  from "./pages/Acadstudentspage";
import AcadSections      from "./pages/AcadSections";
import AcadMeetLinks     from "./pages/AcadMeetLinks";
import AcadAttendance    from "./pages/AcadAttendance";
import AcadAssessment    from "./pages/AcadAssessment";
import AcadReports       from "./pages/AcadReports";
import AcadTeachers      from "./pages/AcadTeachers";
import AcadAudit         from "./pages/AcadAudit";

// ─── Inner component (needs Router context so useEmployee can use navigation) ──
const AppRoutes: React.FC<{ onLoggedIn: () => void; guard: { state: "authed" | "guest" | "loading" } }> = ({
  onLoggedIn,
  guard,
}) => {
  const { employee } = useEmployee();
  const empData = employee as any;

  const designation  = empData?.designation   ?? "";
  const employeeName = empData?.employee_name ?? "";

  if (guard.state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Login ── */}
      <Route
        path="/login"
        element={
          guard.state === "authed"
            ? <Navigate to="/" replace />
            : <LoginPage onLoggedIn={onLoggedIn} />
        }
      />

      {/* ── Protected routes ── */}
      <Route
        path="/*"
        element={
          guard.state === "authed"
            ? (
              <Layout>
                <Routes>

                  {/* ── Main ── */}
                  <Route path="/"            element={<Dashboard />} />
                  <Route path="/todo"        element={<TodoPage />} />
                  <Route path="/calendar"    element={<CalendarPage />} />

                  {/* ── ESS Dashboard ── */}
                  <Route path="/ess"         element={<EssDashboardPage />} />
                  <Route path="/leave"       element={<LeavePage />} />
                  <Route path="/attendance"  element={<AttendancePage />} />
                  <Route path="/salary-slip" element={<SalarySlipPage />} />
                  <Route path="/profile"     element={<ProfilePage />} />
                  <Route path="/directory"   element={<DirectoryPage />} />

                {/* ── Teacher Dashboard ── */}
                <Route path="/faculty"             element={<FacultyPage />} />
                <Route path="/faculty/programs"    element={<ProgramsPage />} />
                <Route path="/faculty/schedule"    element={<SchedulePage />} />
                <Route path="/faculty/students"    element={<Studentspage />} />
                <Route path="/faculty/attendance"  element={<StdAttendancepage />} />
                <Route path="/faculty/mark"        element={<Markattendancepage />} />
                <Route path="/faculty/assessment"  element={<Assessmentpage />} />
                <Route path="/faculty/viewresults" element={<Viewresultspage />} />
                <Route path="/faculty/assignments" element={<Assignmentspage />} />
                <Route path="/faculty/classroom"   element={<FacultyClassroomPage />} />
                <Route path="/faculty/classroom/:courseId" element={<FacultyClassroomCourseDetailPage />} />
                <Route path="/faculty/student-activity" element={<FacultyStudentActivityPage />} />
                  {/* ── Academics Dashboard ── */}
                  <Route path="/academics"            element={<AcademicDashboard />} />
                  <Route path="/academics/students"   element={<Acadstudentspage />} />
                  <Route path="/academics/sections"   element={<AcadSections />} />
                  <Route path="/academics/meetlinks"  element={<AcadMeetLinks />} />
                  <Route path="/academics/attendance" element={<AcadAttendance />} />
                  <Route path="/academics/assessment" element={<AcadAssessment />} />
                  <Route path="/academics/reports"    element={<AcadReports />} />
                  <Route path="/academics/teachers"   element={<AcadTeachers />} />
                  <Route path="/academics/audit"      element={<AcadAudit />} />

                  {/* ── Admin Dashboard ── */}
                  <Route path="/admin"                    element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/employees"          element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/leave"               element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/attendance"          element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/student-attendance"  element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/schedule"             element={<CeoSchedulePage />} />
                  <Route path="/admin/teacher-profiles"     element={<CeoTeacherProfilesPage />} />
                  <Route path="/admin/salary-slips"         element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  {/* <Route path="/admin/departments" element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} /> */}
                  <Route path="/admin/students"            element={<AdminStudentsPage />} />
                  <Route path="/admin/student-groups"      element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/reports"              element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/revenue"               element={<AdminDashboardPage designation={designation} employeeName={employeeName} />} />
                  <Route path="/admin/student-activity"      element={<AdminStudentActivityPage />} />
                  {/* <Route path="/admin/student-groups" element={<CeoStudentGroupsPage />} /> */}

                  {/* ── Fallback ── */}
                  <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
              </Layout>
            )
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed]   = useState(false);

  const refreshAuth = async () => {
    setLoading(true);
    const res = await api.getProfile();
    setAuthed(res.ok);
    setLoading(false);
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const guard = useMemo(() => {
    if (loading) return { state: "loading" as const };
    if (authed)  return { state: "authed"  as const };
    return           { state: "guest"   as const };
  }, [loading, authed]);

  return (
    <>
      {/* ✅ Global toast container — required for react-hot-toast popups
          (toast.success / toast.error / toast()) to render anywhere in the app.
          Mounted once here at root level so every page's toasts show up. */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: 13,
            borderRadius: 10,
            padding: "10px 14px",
          },
          success: {
            iconTheme: { primary: "#0b8b6f", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#d94f4f", secondary: "#fff" },
          },
        }}
      />

      <Router>
        <AppRoutes
          guard={guard}
          onLoggedIn={() => { void refreshAuth(); }}
        />
      </Router>
    </>
  );
};

export default App;