import { google } from 'googleapis';

function classroomFor(oauth2Client) {
  return google.classroom({ version: 'v1', auth: oauth2Client });
}

function isRateLimitError(err) {
  const status = err?.code ?? err?.response?.status;
  return status === 429 || (status === 403 && /quota|rate/i.test(err?.message || ''));
}

/** Retries a Classroom API call with exponential backoff if Google returns a rate-limit error. */
async function withRetry(fn, { retries = 4, baseDelayMs = 600 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= retries) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}

/**
 * Courses where the authenticated Google user is the teacher.
 * Defaults to ACTIVE courses only — a teacher can rack up dozens of ARCHIVED
 * courses from past terms, and pulling coursework/submissions/roster for every
 * one of those on every dashboard load is what was pushing requests past the
 * timeout. Pass includeArchived: true if a caller genuinely needs old courses too.
 */
export async function listTeachingCourses(oauth2Client, { includeArchived = false } = {}) {
  const classroom = classroomFor(oauth2Client);
  const courses = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.list({
        teacherId: 'me',
        courseStates: includeArchived ? ['ACTIVE', 'ARCHIVED'] : ['ACTIVE'],
        pageToken,
        pageSize: 100,
      })
    );
    courses.push(...(data.courses || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return courses;
}

export async function listTopics(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  try {
    const { data } = await withRetry(() => classroom.courses.topics.list({ courseId, pageSize: 200 }));
    return data.topic || [];
  } catch (err) {
    if (err?.code === 404 || err?.code === 403) return [];
    throw err;
  }
}

export async function listCourseWork(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  const work = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.courseWork.list({
        courseId,
        orderBy: 'dueDate desc',
        pageToken,
        pageSize: 100,
      })
    );
    work.push(...(data.courseWork || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return work;
}

/**
 * ALL students' submissions across every piece of courseWork in a course, in ONE call
 * (courseWorkId: '-' is a Classroom API wildcard for "all coursework in this course").
 * No userId filter — as the teacher, this returns every student's submission, which is
 * exactly the aggregate view a teacher's dashboard needs.
 */
export async function listAllSubmissionsForCourse(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  const submissions = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.courseWork.studentSubmissions.list({
        courseId,
        courseWorkId: '-',
        pageToken,
        pageSize: 100,
      })
    );
    submissions.push(...(data.studentSubmissions || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return submissions;
}

/** Full student roster for a course. */
export async function listStudents(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  const students = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.students.list({ courseId, pageToken, pageSize: 100 })
    );
    students.push(...(data.students || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return students;
}