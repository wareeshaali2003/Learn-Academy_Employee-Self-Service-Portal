// No database of any kind here — just a plain JS Map living in server process memory.
// Keyed by the teacher's Employee ID (e.g. "LA-00007"). Same trade-off as the student
// portal's classroom integration: this resets on server restart, at which point the
// teacher just clicks "Connect Google Classroom" again. For a production deployment
// behind multiple server instances, this would need to move to a shared session store
// (e.g. Redis) — but it's still just session state, not a data DB.

const linksByEmployeeId = new Map();

export function saveGoogleLink(employeeId, profile, tokens) {
  const existing = linksByEmployeeId.get(employeeId) || {};
  linksByEmployeeId.set(employeeId, {
    googleUserId: profile.id ?? existing.googleUserId ?? null,
    googleEmail: profile.email ?? existing.googleEmail ?? null,
    googleProfileName: profile.name ?? existing.googleProfileName ?? null,
    accessToken: tokens.access_token ?? existing.accessToken ?? null,
    // Google only sends a refresh_token the FIRST time a user consents (with
    // access_type=offline & prompt=consent) — keep the old one on later refreshes.
    refreshToken: tokens.refresh_token ?? existing.refreshToken ?? null,
    expiryDate: tokens.expiry_date ?? existing.expiryDate ?? null,
  });
}

/** Called automatically whenever google-auth-library silently refreshes the access token. */
export function updateTokens(employeeId, tokens) {
  const existing = linksByEmployeeId.get(employeeId);
  if (!existing) return;
  linksByEmployeeId.set(employeeId, {
    ...existing,
    accessToken: tokens.access_token ?? existing.accessToken,
    refreshToken: tokens.refresh_token ?? existing.refreshToken,
    expiryDate: tokens.expiry_date ?? existing.expiryDate,
  });
}

export function getGoogleLink(employeeId) {
  return linksByEmployeeId.get(employeeId) || null;
}

export function disconnectGoogleLink(employeeId) {
  linksByEmployeeId.delete(employeeId);
}
