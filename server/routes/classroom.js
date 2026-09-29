import { Router } from 'express';
import { getGoogleLink } from '../tokenStore.js';
import { oauthClientFromLink } from '../googleAuth.js';
import { getDashboardForTeacher, getCourseDetailForTeacher } from '../classroomLive.js';

const router = Router();

function requireLink(req, res) {
  const employeeId = String(req.query.employeeId || req.body?.employeeId || '');
  if (!employeeId) {
    res.status(400).json({ error: 'employeeId is required' });
    return null;
  }
  const link = getGoogleLink(employeeId);
  if (!link) {
    res.status(404).json({ error: 'not_connected', message: 'Teacher has not connected Google Classroom yet.' });
    return null;
  }
  return { employeeId, link };
}

// GET /api/classroom/status?employeeId=...
router.get('/status', (req, res) => {
  const employeeId = String(req.query.employeeId || '');
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });

  const link = getGoogleLink(employeeId);
  res.json({
    connected: !!link,
    googleEmail: link?.googleEmail || null,
    googleProfileName: link?.googleProfileName || null,
  });
});

// GET /api/classroom/dashboard?employeeId=...
// Hits the Google Classroom API live — courses, coursework and submissions are
// fetched fresh on every call. Nothing is cached or written to disk.
router.get('/dashboard', async (req, res) => {
  const ctx = requireLink(req, res);
  if (!ctx) return;
  try {
    const client = oauthClientFromLink(ctx.employeeId, ctx.link);
    const courses = await getDashboardForTeacher(client);
    res.json({ courses });
  } catch (err) {
    console.error('[classroom/dashboard] error:', err?.message);
    res.status(502).json({ error: 'classroom_fetch_failed', message: err?.message || 'Failed to reach Google Classroom' });
  }
});

// GET /api/classroom/courses/:classroomCourseId?employeeId=...
router.get('/courses/:classroomCourseId', async (req, res) => {
  const ctx = requireLink(req, res);
  if (!ctx) return;
  try {
    const client = oauthClientFromLink(ctx.employeeId, ctx.link);
    const detail = await getCourseDetailForTeacher(client, req.params.classroomCourseId);
    if (!detail) return res.status(404).json({ error: 'course_not_found' });
    res.json(detail);
  } catch (err) {
    console.error('[classroom/courses/:id] error:', err?.message);
    res.status(502).json({ error: 'classroom_fetch_failed', message: err?.message || 'Failed to reach Google Classroom' });
  }
});

export default router;
