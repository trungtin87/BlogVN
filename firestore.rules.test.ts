// Verification matrix for Đạo Ký Firestore Security Rules (Dirty Dozen Coverage)
export const SECURITY_TEST_CASES = [
  { name: 'Deny unauthenticated reads on /users/{uid}/config/site', expected: 'DENY' },
  { name: 'Deny unverified email token writes on /users/{uid}/drafts/{id}', expected: 'DENY' },
  { name: 'Deny cross-tenant read/write when auth.uid !== userId', expected: 'DENY' },
  { name: 'Deny injecting gh_pat or secret keys into UserConfig (hasOnly rejection)', expected: 'DENY' },
  { name: 'Deny client-spoofed createdAt/updatedAt timestamps (!= request.time)', expected: 'DENY' },
  { name: 'Deny mutating createdAt or uid on update', expected: 'DENY' },
  { name: 'Deny oversized markdownBody > 400000 chars', expected: 'DENY' },
  { name: 'Deny invalid collection outside [bai_viet, du_an, sach, cua_hang]', expected: 'DENY' },
  { name: 'Allow owner with email_verified to create/update valid UserConfig with serverTimestamp()', expected: 'ALLOW' },
  { name: 'Allow owner with email_verified to create/update/delete valid UserDraft with serverTimestamp()', expected: 'ALLOW' },
] as const;
