# Admin Dashboard: Applications, Documents, and Status Decisions (MongoDB)

## Problem

The original admin dashboard (2026-07-20) was built against Supabase and only
listed username/email/signup date. The backend has since fully migrated to
MongoDB + Cloudflare R2 (2026-07-21 migration), and `/admin`
(`src/routes/admin.tsx`) was explicitly left out of that migration's scope —
it still calls `supabase.auth.getSession()`, which is now always empty, so it
just redirects to `/apply` and is otherwise non-functional. Separately, the
application/document system (`/portal`) didn't exist yet when the original
admin spec was written, so there is currently no way for anyone to review
submitted applications or uploaded documents at all.

## Goal

Rebuild `/admin` on the MongoDB/R2 stack as a dashboard that shows every
registered user's application progress and documents, lets an admin approve
or reject submitted applications, and is reachable via one fixed, pre-seeded
admin account logging in through the existing sign-in form.

## Non-goals

- Audit log of admin actions or per-login history
- Pagination / search / filtering (small user base expected)
- A separate admin login page (admin uses the existing `/apply` sign-in form)
- Self-service admin promotion (only the one seeded account is admin)
- Editing application field values from the dashboard (only status changes)
- Email notifications to applicants on status change (out of scope; the
  existing "you will receive an email notification" copy on `/portal`
  remains aspirational, unchanged by this feature)

## Design

### 1. Application status field

Add `status: "pending" | "approved" | "rejected"` to `ApplicationDoc`
(`src/integrations/mongodb/types.ts`). Set only when an application is
submitted:

- No `applications` row for a user → **Not started**
- Row exists, `submitted: false` → **In progress** (saved, not submitted)
- Row exists, `submitted: true`, `status: "pending"` → **Pending** (set
  automatically the moment `submit: true` happens in `saveApplicationFn`)
- `status: "approved"` / `"rejected"` → set only by an admin, only after
  submission

No migration step needed (MongoDB is schemaless and there is no production
data yet); `saveApplicationFn`'s existing `$set`/`$setOnInsert` logic for the
`submit: true` branch gains `status: "pending"` alongside the existing
`submitted: true, submitted_at: now`.

### 2. Admin role check

New `requireAdmin(): Promise<UserDoc>` in
`src/integrations/mongodb/auth.server.ts`, built on the existing
`getCurrentUser()`: throws `"Not authenticated."` if there's no session
(reusing the existing message), and `"Not authorized."` if the session's user
has `role !== "admin"`. Every admin-only server function calls this first —
that is the actual authorization boundary. The route's client-side session
check is UX only (redirect a logged-out visitor to `/apply`), never security.

### 3. Login redirect by role

`src/routes/apply.tsx`: after a successful **login** (not signup — signups
always create `role: "user"` via `signupFn`, so there is no admin-signup
path), branch on the returned `role`: `"admin"` → `navigate({ to: "/admin"
})`, `"user"` → `navigate({ to: "/portal" })` (today's behavior, unchanged).

### 4. Admin server functions

New file `src/server-functions/admin.ts`:

- **`getAdminDashboardFn`** (`method: "GET"`, no input): calls
  `requireAdmin()`, then runs three independent queries — all `users`, all
  `applications`, all `application_documents` — and merges them in
  application code by `userId` into one array:
  ```ts
  {
    userId: string;
    username: string;
    email: string;
    signedUpAt: string; // ISO
    application: {
      first_name: string | null; last_name: string | null;
      date_of_birth: string | null; address: string | null;
      phone: string | null; country: string | null; position: string | null;
      submitted: boolean; status: "pending" | "approved" | "rejected" | null;
      submitted_at: string | null;
    } | null; // null when no applications row exists yet
    documents: Array<{ id: string; file_name: string; file_size: number | null; created_at: string }>;
  }[]
  ```
  Three separate queries (not a `$lookup` aggregation) to match this
  codebase's existing plain-driver, no-aggregation-pipeline convention used
  everywhere else (`getApplicationFn`, `listDocumentsFn`, etc.). Acceptable
  at the "small user base expected" scale already assumed by the original
  spec's non-goals.

- **`updateApplicationStatusFn`** (`method: "POST"`): validates
  `{ userId: string, status: z.enum(["approved", "rejected"]) }`, calls
  `requireAdmin()`, looks up the target `applications` row by `userId`
  (`new ObjectId(data.userId)`), throws `"Application not found."` if no row
  exists and `"Cannot update an application that has not been submitted."` if
  `submitted` is `false`, otherwise `$set`s `status`. Returns `{ ok: true }`.

- **`getAdminDocumentUrlFn`** (`method: "POST"`): validates
  `{ documentId: string }`, calls `requireAdmin()`, looks up the
  `application_documents` row by its own `_id`
  (`new ObjectId(data.documentId)`) — **no ownership filter by design**,
  since any admin may view any user's document — throws `"Document not
  found."` if missing, then calls the new `getDownloadUrl(doc.r2_key)` and
  returns `{ url: string }`. The R2 key always comes from the DB row, never
  from client input, so this can't be pointed at an arbitrary key the way an
  unvalidated client-supplied key could (the exact class of bug fixed in the
  document-confirm path during the migration's final review).

### 5. R2 download helper

`src/integrations/r2/client.server.ts` gains `getDownloadUrl(key: string):
Promise<string>`, mirroring the existing `getUploadUrl` but with
`GetObjectCommand` in place of `PutObjectCommand`, same 300-second expiry,
same dynamic-import-inside-handler convention as every other secret-bearing
call site.

### 6. `/admin` route (full rewrite of `src/routes/admin.tsx`)

States, in order:

1. **Loading** — checking session.
2. **No session** → `navigate({ to: "/apply" })`.
3. **Session, not admin** → visible "You don't have access to this page."
   message with a link home (not a silent redirect — a logged-in non-admin
   should understand why they can't proceed, matching the original spec's
   unauthorized state).
4. **Admin** → calls `getAdminDashboardFn`, renders one row per user:
   - Username, email, signed-up date
   - Status badge: Not started / In progress / Pending / Approved / Rejected
   - Application field summary (name, phone, country, position) when present
   - Document list with a "View" action per document — on click, calls
     `getAdminDocumentUrlFn` for a fresh presigned URL and opens it in a new
     tab (URLs are not pre-fetched for every document up front, since they
     expire in 5 minutes and there's no reason to mint one before it's
     needed)
   - Approve / Reject buttons, shown only when status is Pending; on click,
     call `updateApplicationStatusFn` and refresh that row's status locally

### 7. `/portal` status display

`getApplicationFn`'s return type gains `status: "pending" | "approved" |
"rejected" | null`. The post-submit screen in `portal.tsx` (currently a
hardcoded "Application pending" pill) branches on `status`:
- `"pending"` → today's existing "Application pending" copy, unchanged
- `"approved"` → a distinct approved state (e.g. green check + "Application
  approved")
- `"rejected"` → a distinct rejected state (e.g. "Application not successful"
  — kept neutral/professional in tone)

### 8. Seed script

`scripts/seed-mongo-admin.mjs`, following the existing standalone-script
pattern (`scripts/verify-mongo.mjs`): connects to `DATABASE_URL`, upserts
(`updateOne` with `upsert: true`, matched by `email`) a `users` document:
`email: "admin@gmail.com"`, `username: "admin"`, `passwordHash:
bcrypt.hash("admin@123", 10)`, `role: "admin"`. Idempotent — safe to re-run.
Run manually once: `node --env-file=.env scripts/seed-mongo-admin.mjs`.

**Security note (carried forward from the original 2026-07-20 spec, and
reconfirmed by the user this round):** `admin@123` is a weak, guessable
password protecting a page that now exposes every applicant's PII and
uploaded identity/reference documents — materially more sensitive than the
account-list-only dashboard the original note was written against.
Recommended to change it immediately after first login. Proceeding with
these exact credentials per explicit, twice-confirmed user request.

## Data flow

1. Site owner runs `seed-mongo-admin.mjs` once → `users` collection has one
   `role: "admin"` document.
2. Admin logs in at `/apply` (existing `loginFn`, unchanged) → response
   includes `role: "admin"` → client redirects to `/admin` instead of
   `/portal`.
3. `/admin` calls `getAdminDashboardFn` → server verifies `role === "admin"`
   server-side → returns merged user/application/document data.
4. Admin clicks "View" on a document → `getAdminDocumentUrlFn` → presigned
   URL → opens in new tab.
5. Admin clicks Approve/Reject on a pending application →
   `updateApplicationStatusFn` → `applications.status` updated.
6. That applicant's next `/portal` load (or refresh) calls `getApplicationFn`
   → sees the new `status` → sees the corresponding UI state.

## Error handling

- No session at `/admin` → redirect to `/apply`.
- Session but not admin → visible unauthorized message; `requireAdmin()`
  denies all three admin server functions regardless of what the route
  renders, so no data ever reaches a non-admin caller even via a direct call.
- `updateApplicationStatusFn` on a not-yet-submitted application → rejected
  with a clear error, surfaced in the dashboard UI, not a silent no-op.
- `getAdminDocumentUrlFn` on a nonexistent document ID → `"Document not
  found."`, surfaced in the UI.
- Empty user list (shouldn't happen post-seed, but the users collection
  could theoretically be empty in a fresh environment) → empty-state
  message, not a blank/broken table.
- Server function failure (network/DB error) → error banner, no crash,
  matching the existing pattern in `/portal`.

## Testing

No automated test runner in this repo (unchanged constraint from the
migration plan) — verification is `npx tsc --noEmit`, `npm run build`, and
manual dev-server/browser testing:

- Sign up as a normal user, confirm `/admin` shows the unauthorized message
  (not a crash, not a silent redirect while logged in).
- Run the seed script, log in as `admin@gmail.com` / `admin@123`, confirm
  redirect to `/admin` (not `/portal`).
- Confirm the dashboard shows all five states correctly: a brand-new signup
  with no application row (Not started), a saved-but-unsubmitted one (In
  progress), and a submitted one (Pending).
- Approve a pending application as admin; confirm that applicant's `/portal`
  shows the approved state on next load.
- Reject a different pending application; confirm the rejected state shows
  correctly and does not offer Approve/Reject buttons again.
- View a document from the dashboard; confirm the presigned URL opens the
  correct file.
- Confirm a regular (non-admin) login still redirects to `/portal` exactly
  as before this feature.
