# Security Architecture Specification — Đạo Ký Cloud Sync

## 1. Access Control & Ownership
- Every user document lives under `/users/{userId}/...`.
- Only authenticated Firebase users with `request.auth.token.email_verified == true` and `request.auth.uid == userId` may read, create, update, or delete documents under `/users/{userId}/`.
- No secrets (GitHub PATs, OAuth tokens, social media tokens) are ever stored in Firestore.
- Top-level `/users/{userId}` and any undeclared subcollections default to deny-all.

## 2. Document Schemas & Constraints

### `/users/{userId}/config/{configId}`
- `configId` must match `^[a-zA-Z0-9_-]{1,64}$`.
- Required fields: `uid` (== `userId`), `siteTitle` (string <= 160), `themeMode` (`'light' | 'dark'`), `createdAt` (timestamp == `request.time` on create, immutable on update), `updatedAt` (timestamp == `request.time`).
- Strict `hasOnly` whitelist of allowed fields prevents unvalidated field injection or storing secrets.
- String lengths and array sizes are capped to prevent 1 MiB document exhaustion.

### `/users/{userId}/drafts/{draftId}`
- `draftId` must match `^[a-zA-Z0-9._-]{1,160}$`.
- Required fields: `id` (== `draftId`), `uid` (== `userId`), `collection` (`'bai_viet' | 'du_an' | 'sach' | 'cua_hang'`), `slug`, `title`, `date`, `category`, `tags` (list <= 25), `excerpt`, `draft` (bool), `markdownBody` (<= 400000 chars), `rawContent` (<= 450000 chars), `path` (<= 260 chars), `source` (`'local' | 'github' | 'sample'`), `createdAt` (timestamp == `request.time` on create, immutable on update), `updatedAt` (timestamp == `request.time`).
- Strict `hasOnly` whitelist of allowed fields; `uid` and `id` immutable on update.
