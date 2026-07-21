# Core Backend Migration: Supabase → MongoDB + R2

## Problem

The app currently runs on Supabase: Postgres (via `profiles`, `applications`,
`application_documents` tables with RLS), Supabase Auth (signup/login/session),
and Supabase Storage (uploaded application documents). The Supabase project is
owned by the client, not the developer — the developer has no dashboard
access and no service-role key, which has repeatedly blocked work (most
recently, seeding the admin account for the in-progress admin dashboard
feature).

Rather than depend on the client's Supabase account (asking them to run SQL,
share keys, or create accounts on request), the project moves to
infrastructure the developer owns outright: MongoDB Atlas for data and
Cloudflare R2 for file storage, with custom authentication replacing Supabase
Auth.

## Goal

Replace Supabase (Postgres + Auth + Storage) with MongoDB Atlas + custom auth
+ Cloudflare R2, with no loss of existing functionality: signup/login,
the `/portal` application form, document upload/delete (max 10 docs/user),
and application submission. The in-progress admin dashboard (view registered
accounts) is **out of scope for this spec** — it lands as a follow-up spec
once this core migration is working, since it depends on this foundation
(the `role` field on `users`, and a working session system to protect
`/admin`).

## Non-goals

- Migrating existing Supabase data — confirmed test-data-only; the new
  Atlas project and R2 bucket start empty.
- The admin dashboard itself (separate follow-up spec).
- Password reset / email verification flows — not present in the current
  Supabase-based app either; out of scope here too.
- Multi-factor auth, OAuth/social login — not present today.

## Why not keep Cloudflare as the deploy target?

The project's Nitro config defaults to Cloudflare Workers. The standard
MongoDB Node.js driver requires raw TCP/TLS socket connections, which
Cloudflare Workers' runtime does not support the way a Node.js server does.
Workarounds (Prisma Accelerate as an HTTP proxy in front of Mongo, or the
now-deprecated MongoDB Atlas Data API) add a managed dependency and/or an ORM
layer not currently in this codebase. Since Nitro already has a working
Vercel preset, and Vercel's Node.js serverless functions support raw TCP,
switching the deploy target to Vercel is the simpler fix — confirmed with
the user.

## Design

### 1. Deploy target

Change the Nitro preset from Cloudflare to Vercel. `vite.config.ts` currently
relies on `@lovable.dev/vite-tanstack-config`'s default (Cloudflare); this
needs an explicit Vercel preset override (exact mechanism to be confirmed
during implementation planning — Nitro exposes this via `nitro.preset` or an
equivalent option surfaced by the wrapping config).

### 2. MongoDB Atlas connection

New file `src/integrations/mongodb/client.ts`: a cached singleton
`MongoClient` + `Db` handle (reused across serverless invocations, same
lazy-Proxy-init pattern already used in `src/integrations/supabase/client.ts`
for consistency). Reads `MONGODB_URI` from the environment.

Collections, each with a thin TypeScript interface (no ORM/schema library —
matches the existing minimal style):

- **`users`** — merges the old `profiles` table and Supabase `auth.users`
  into one collection, since there's no separate auth layer anymore:
  `{ _id: ObjectId, email: string, username: string, passwordHash: string,
  role: 'user' | 'admin' (default 'user'), createdAt: Date }`. Unique index
  on `email`.
- **`sessions`** — `{ _id: string (opaque token), userId: ObjectId,
  expiresAt: Date, createdAt: Date }`. TTL index on `expiresAt` for
  automatic cleanup.
- **`applications`** — same shape as the current Postgres table:
  `{ _id, userId: ObjectId, first_name, last_name, date_of_birth, address,
  phone, country, position, submitted: boolean, submitted_at, created_at,
  updated_at }`. Unique index on `userId` (one application per user, same
  as the existing `UNIQUE` constraint).
- **`application_documents`** — `{ _id, userId: ObjectId, file_name: string,
  r2_key: string, file_size: number, created_at: Date }`.

### 3. Authentication

New `src/integrations/mongodb/auth.ts`:

- **Password hashing**: `bcryptjs` (pure JS — avoids native-binding build
  issues in serverless bundling; Vercel's Node runtime would support real
  `bcrypt` too, but `bcryptjs` is simpler to deploy reliably).
- **Sessions**: opaque random tokens (`crypto.randomBytes(32)`, not JWTs) —
  stored in the `sessions` collection, set as the session cookie value.
  DB-backed sessions mean a session can be revoked by deleting its document
  (useful for the future admin dashboard, e.g. banning a user), and avoids
  JWT signing/verification complexity entirely.
- **Cookie**: httpOnly, `Secure`, `SameSite=Lax`. Session lifetime: 30 days
  (matches typical Supabase Auth default; adjustable later).

Server functions (TanStack Start `createServerFn`, following the existing
middleware pattern in `auth-middleware.ts`):

- `signupFn({ email, username, password })` — zod-validates input, checks
  email uniqueness (clear "already exists" error, same UX intent as the
  current duplicate-signup fix), hashes password, inserts into `users` with
  `role: 'user'`, creates a session, sets the cookie.
- `loginFn({ email, password })` — looks up by email, verifies hash with a
  generic "Invalid email or password" error on failure (no user
  enumeration), creates a session, sets the cookie.
- `logoutFn()` — deletes the session document, clears the cookie.
- `getSessionFn()` — reads the cookie, looks up the session (checking
  `expiresAt`), joins `users`, returns `{ id, email, username, role }` or
  `null`. Used by both `/apply` (redirect away if already logged in, if
  that's current behavior) and `/portal` (redirect to `/apply` if `null`).

### 4. File storage (Cloudflare R2)

New `src/integrations/r2/client.ts`: `@aws-sdk/client-s3` configured with
R2's S3-compatible endpoint and credentials (`R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` env vars).

Upload flow avoids routing large files through a serverless function body
(Vercel functions have request size limits well under the ~25MB this app
accepts):

- `requestUploadFn({ fileName, fileSize })` — server-side: verifies the
  caller's session, enforces the existing 10-document-per-user cap, and
  returns a presigned S3 `PUT` URL (short-lived) plus the object key
  (`{userId}/{timestamp}-{fileName}`, same folder-per-user shape as today).
- Browser `PUT`s the file directly to that presigned URL (bypasses the app
  server entirely).
- `confirmUploadFn({ r2_key, file_name, file_size })` — server-side: verifies
  session/ownership, inserts the `application_documents` record. (Known
  limitation: this trusts the browser's report that the upload succeeded,
  rather than independently verifying via a `HEAD` request against R2 —
  acceptable for this app's scale; can be hardened later if needed.)
- `deleteDocumentFn({ docId })` — verifies the caller owns the document
  (server-side, not client-trusted), deletes the R2 object, then the Mongo
  document.

### 5. Route changes

`src/routes/apply.tsx` — replace `supabase.auth.signUp` /
`signInWithPassword` calls with `signupFn` / `loginFn`. Same duplicate-email
and validation error UX as the existing (already-shipped) fix, adapted to
the new error shape.

`src/routes/portal.tsx` — replace every direct `supabase.from(...)` /
`supabase.storage` call with the corresponding server function
(`getSessionFn`, `getApplicationFn`, `saveApplicationFn`,
`listDocumentsFn`, `requestUploadFn` + `confirmUploadFn`,
`deleteDocumentFn`, `submitApplicationFn`, `logoutFn`). UI/markup unchanged.

`src/integrations/supabase/*` — left in place but unused by these two routes
after this migration; fully removed once the follow-up admin-dashboard spec
also moves off it (that spec currently reads `profiles.role` via Supabase).

### 6. Environment variables

New: `MONGODB_URI`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. All developer-owned — created by
the developer in their own MongoDB Atlas and Cloudflare accounts, so no
client credential dependency going forward.

## Data flow

1. Guest signs up at `/apply` → `signupFn` creates a `users` doc + session
   → cookie set → redirected to `/portal`.
2. `/portal` loads → `getSessionFn` (redirect to `/apply` if none) →
   `getApplicationFn` + `listDocumentsFn` populate the form/doc list.
3. User saves the form → `saveApplicationFn` upserts `applications`.
4. User uploads a document → `requestUploadFn` (presigned URL) → direct
   browser→R2 `PUT` → `confirmUploadFn` records it.
5. User deletes a document → `deleteDocumentFn` removes it from R2 and Mongo.
6. User submits → `saveApplicationFn` with `submitted: true` (requires
   ≥1 document, same rule as today).
7. User signs out → `logoutFn` clears the session.

## Error handling

- Duplicate signup / invalid login → clear, non-leaking error messages
  (as above).
- No/expired session on a protected route or server function → redirect to
  `/apply` (route) or reject the call (server function) — this is the real
  authorization boundary now, not a UI-only check.
- Every mutating server function re-derives the caller's identity from their
  session and re-checks ownership server-side, regardless of what IDs the
  client sends — this replaces what Postgres RLS enforced before.
- Upload/delete failures (R2 unreachable, size/type/count limits) → inline
  error message in the existing upload modal UI, no partial state (a failed
  `confirmUploadFn` leaves an orphaned R2 object rather than a broken DB
  record pointing nowhere — acceptable at this scale, cleanup can be manual).
- Empty states unchanged from current behavior.

## Testing

No automated test runner exists in this repo (matches the existing
admin-dashboard plan's constraint) — manual verification against real Atlas
+ R2:

- Sign up, confirm redirected to `/portal` with a working session.
- Duplicate-email signup shows the existing clear error.
- Save application details, refresh, confirm they persist.
- Upload up to 10 documents; confirm the 11th is rejected client- and
  server-side; confirm files land in the R2 bucket under the right
  `{userId}/` prefix.
- Delete a document; confirm it's gone from both R2 and the document list.
- Submit application (after ≥1 upload); confirm the submitted-state UI
  renders and `submitted_at` is set.
- Sign out; confirm `/portal` redirects to `/apply` afterward.
- Attempt to call a server function for another user's data (e.g. a crafted
  request with someone else's document ID) and confirm it's rejected.
- Deploy a Vercel preview and repeat the signup → submit flow end-to-end to
  confirm the deploy-target switch works in practice, not just locally.
