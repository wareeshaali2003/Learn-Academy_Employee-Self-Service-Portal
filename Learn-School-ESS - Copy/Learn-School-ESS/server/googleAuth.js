import { google } from 'googleapis';
import { updateTokens } from './tokenStore.js';

const REDIRECT_URI = () => process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4100/auth/google/callback';

// Read-only scopes only — the portal displays Classroom data for teachers, it never
// posts announcements, creates coursework, or grades on their behalf. Teachers keep
// doing that directly in Google Classroom; this is a mirror, not a replacement.
export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.topics.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function createOAuthClient() {
  // Read process.env lazily (inside the function) rather than at module load —
  // ESM import bodies all run before dotenv.config() in index.js executes, so
  // reading these at the top of the file would always see them as undefined.
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set. Add them to your server .env — see server/.env.example.'
    );
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI());
}

export function buildAuthUrl(employeeId) {
  const oauth2Client = createOAuthClient();
  const state = Buffer.from(JSON.stringify({ employeeId })).toString('base64url');
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',   // needed to receive a refresh_token
    prompt: 'consent',
    scope: CLASSROOM_SCOPES,
    state,
  });
}

export function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return { oauth2Client, tokens };
}

export function oauthClientFromLink(employeeId, link) {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: link.accessToken,
    refresh_token: link.refreshToken,
    expiry_date: link.expiryDate,
  });
  // google-auth-library silently exchanges the refresh_token for a new access_token
  // when it expires. Persist the new one in memory so the next request reuses it
  // instead of refreshing again.
  oauth2Client.on('tokens', (tokens) => {
    updateTokens(employeeId, tokens);
  });
  return oauth2Client;
}

export async function fetchGoogleProfile(oauth2Client) {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data; // { id, email, name, picture, ... }
}
