import {
  listTeachingCourses,
  listTopics,
  listCourseWork,
  listAllSubmissionsForCourse,
  listStudents,
} from './classroomClient.js';

function dueDateToString(dueDate) {
  if (!dueDate?.year) return null;
  const { year, month, day } = dueDate;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dueTimeToString(dueTime) {
  if (!dueTime) return null;
  const { hours = 23, minutes = 59 } = dueTime;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Rolls up one assignment's submissions across the whole class into counts a teacher cares about. */
function summarizeSubmissions(subs) {
  let submitted = 0;
  let graded = 0;
  let late = 0;
  for (const s of subs) {
    if (s.state === 'TURNED_IN' || s.state === 'RETURNED') submitted += 1;
    if (s.assignedGrade != null) graded += 1;
    if (s.late) late += 1;
  }
  return { submitted, graded, late };
}

function toCourseWorkView(cw, subsForThisWork, totalStudents) {
  const { submitted, graded, late } = summarizeSubmissions(subsForThisWork);
  return {
    id: cw.id,
    title: cw.title || '',
    description: cw.description || '',
    workType: cw.workType || 'ASSIGNMENT',
    isQuiz: !!cw.workType && cw.workType.includes('QUESTION'),
    dueDate: dueDateToString(cw.dueDate),
    dueTime: dueTimeToString(cw.dueTime),
    maxPoints: cw.maxPoints ?? null,
    topicId: cw.topicId || null,
    classroomUrl: cw.alternateLink || null,
    totalStudents,
    submittedCount: submitted,
    gradedCount: graded,
    lateCount: late,
    ungradedCount: Math.max(submitted - graded, 0),
  };
}

/**
 * Runs async work over a list with limited concurrency, so we don't fire a burst of
 * requests across many courses at once and trip the per-minute rate limit.
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** "My Classes" dashboard rows — one row per live Classroom course this teacher teaches. */
export async function getDashboardForTeacher(oauth2Client) {
  const courses = await listTeachingCourses(oauth2Client);

  return mapWithConcurrency(courses, 3, async (course) => {
    const [courseWork, submissions, students] = await Promise.all([
      listCourseWork(oauth2Client, course.id),
      listAllSubmissionsForCourse(oauth2Client, course.id),
      listStudents(oauth2Client, course.id),
    ]);

    const submissionsByCourseWorkId = new Map();
    for (const s of submissions) {
      const list = submissionsByCourseWorkId.get(s.courseWorkId) || [];
      list.push(s);
      submissionsByCourseWorkId.set(s.courseWorkId, list);
    }

    let ungradedCount = 0;
    for (const cw of courseWork) {
      const subs = submissionsByCourseWorkId.get(cw.id) || [];
      const { submitted, graded } = summarizeSubmissions(subs);
      ungradedCount += Math.max(submitted - graded, 0);
    }

    return {
      classroomCourseId: course.id,
      name: course.name,
      section: course.section || null,
      classroomUrl: course.alternateLink || null,
      studentCount: students.length,
      courseWorkCount: courseWork.length,
      ungradedCount,
      lastSyncedAt: new Date().toISOString(), // "as of right now" — nothing is cached
    };
  });
}

/** Course detail: roster, topics (lesson plan) with per-assignment class-wide stats — all live. */
export async function getCourseDetailForTeacher(oauth2Client, classroomCourseId) {
  const [courses, topics, courseWork, submissions, students] = await Promise.all([
    listTeachingCourses(oauth2Client, { includeArchived: true }),
    listTopics(oauth2Client, classroomCourseId),
    listCourseWork(oauth2Client, classroomCourseId),
    listAllSubmissionsForCourse(oauth2Client, classroomCourseId),
    listStudents(oauth2Client, classroomCourseId),
  ]);

  const course = courses.find((c) => c.id === classroomCourseId);
  if (!course) return null;

  const submissionsByCourseWorkId = new Map();
  for (const s of submissions) {
    const list = submissionsByCourseWorkId.get(s.courseWorkId) || [];
    list.push(s);
    submissionsByCourseWorkId.set(s.courseWorkId, list);
  }

  const assignments = courseWork.map((cw) =>
    toCourseWorkView(cw, submissionsByCourseWorkId.get(cw.id) || [], students.length)
  );

  const lessonPlan = topics.map((t) => ({
    topicId: t.topicId,
    name: t.name,
    items: assignments.filter((a) => a.topicId === t.topicId),
  }));
  const untopicked = assignments.filter((a) => !a.topicId);
  if (untopicked.length) lessonPlan.push({ topicId: null, name: 'Other', items: untopicked });

  const roster = students
    .map((s) => ({
      userId: s.userId,
      name: s.profile?.name?.fullName || 'Unknown',
      email: s.profile?.emailAddress || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    classroomCourseId: course.id,
    name: course.name,
    section: course.section || null,
    room: course.room || null,
    classroomUrl: course.alternateLink || null,
    roster,
    lessonPlan,
    assignments,
  };
}