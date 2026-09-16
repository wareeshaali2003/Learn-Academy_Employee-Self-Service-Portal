import { Router } from 'express';
import {
  buildAuthUrl,
  decodeState,
  exchangeCodeForTokens,
  fetchGoogleProfile,
} from '../googleAuth.js';
import { saveGoogleLink, disconnectGoogleLink } from '../tokenStore.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET /auth/google?employeeId=LA-00007
// Redirects the browser straight to Google's consent screen.
router.get('/google', (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });

  try {
    const url = buildAuthUrl(String(employeeId));
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/google/callback?code=...&state=...
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/#/faculty/classroom?connected=0&reason=${encodeURIComponent(String(error))}`);
  }

  const decoded = decodeState(String(state || ''));
  if (!decoded?.employeeId || !code) {
    return res.redirect(`${FRONTEND_URL}/#/faculty/classroom?connected=0&reason=invalid_state`);
  }

  try {
    const { oauth2Client, tokens } = await exchangeCodeForTokens(String(code));
    const profile = await fetchGoogleProfile(oauth2Client);
    saveGoogleLink(decoded.employeeId, profile, tokens);
    res.redirect(`${FRONTEND_URL}/#/faculty/classroom?connected=1`);
  } catch (err) {
    console.error('[auth/google/callback] error:', err?.message);
    res.redirect(`${FRONTEND_URL}/#/faculty/classroom?connected=0&reason=token_exchange_failed`);
  }
});

// POST /auth/google/disconnect  { employeeId }
router.post('/google/disconnect', (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
  disconnectGoogleLink(employeeId);
  res.json({ ok: true });
});

export default router;
