// ─── Google Classroom integration types (teacher view) ─────────────────────
// Mirrors the shapes returned by server/classroomLive.js (live Google Classroom API calls)

export interface ClassroomStatus {
  connected: boolean;
  googleEmail: string | null;
  googleProfileName: string | null;
}

export interface ClassroomDashboardCourse {
  classroomCourseId: string;
  name: string;
  section: string | null;
  classroomUrl: string | null;
  studentCount: number;
  courseWorkCount: number;
  ungradedCount: number;
  lastSyncedAt: string | null;
}

export interface ClassroomCourseWorkItem {
  id: string;
  title: string;
  description?: string;
  workType: string;
  isQuiz: boolean;
  dueDate: string | null;
  dueTime: string | null;
  maxPoints: number | null;
  topicId: string | null;
  classroomUrl: string | null;
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  lateCount: number;
  ungradedCount: number;
}

export interface ClassroomLessonPlanTopic {
  topicId: string | null;
  name: string;
  items: ClassroomCourseWorkItem[];
}

export interface ClassroomRosterStudent {
  userId: string;
  name: string;
  email: string | null;
}

export interface ClassroomCourseDetail {
  classroomCourseId: string;
  name: string;
  section: string | null;
  room: string | null;
  classroomUrl: string | null;
  roster: ClassroomRosterStudent[];
  lessonPlan: ClassroomLessonPlanTopic[];
  assignments: ClassroomCourseWorkItem[];
}
