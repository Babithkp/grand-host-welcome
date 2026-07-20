# Admin Dashboard: View Registered User Accounts

## Problem

Guests can already sign up / log in at `/apply` (Supabase Auth). On signup, an
existing DB trigger auto-inserts a row into `public.profiles` (`id`,
`username`, `email`, `created_at`), so account data is already being stored.
There is currently no way for an admin to view that data — no `/admin` route
exists, and there is no concept of an "admin" user.

## Goal

Add an admin-only dashboard page that lists registered accounts (username,
email, signup date). No login-activity/audit log — just the current account
data, per user request.

## Non-goals

- Per-login audit log (timestamps of every sign-in, IP, device, etc.)
- Pagination / search / filtering (small user base expected)
- A separate admin login form or admin signup flow
- Editing or deleting accounts from the dashboard

## Design

### 1. Admin role

Add a `role` column to `public.profiles`:

```sql
alter table public.profiles
  add column role text not null default 'user'
  check (role in ('user', 'admin'));
```

New migration file under `supabase/migrations/`, following the existing
timestamp-prefixed naming convention.

No self-service way to become admin. After this ships, the site owner
promotes their own account once via the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'owner@example.com';
```

### 2. Admin route

New file-based route `src/routes/admin/index.tsx` → `/admin`.

- No new login UI. Admins authenticate through the existing `/apply`
  sign-in form (same Supabase Auth session used everywhere else).
- On load, the route:
  1. Checks for a session (same pattern as `src/routes/portal.tsx`). No
     session → redirect to `/apply`.
  2. Calls a server function to fetch the account list. The server function
     is the actual authorization boundary (see below) — the client-side
     session check is just for UX/redirect, not security.

### 3. Server function: `getAdminProfiles`

Location: alongside other server functions (following the pattern already
established by `auth-middleware.ts` / `client.server.ts`).

- Wrapped with the existing `requireSupabaseAuth` middleware to validate the
  caller's bearer token.
- Looks up the caller's own `profiles.role` using the **service-role**
  client (`client.server.ts`), since RLS would otherwise restrict a normal
  client to only the caller's own row.
- If `role !== 'admin'`, throws/returns an unauthorized error (no data is
  returned — this is the actual access-control check, not just the
  route's client-side redirect).
- If `role === 'admin'`, queries all rows from `public.profiles`
  (`username`, `email`, `created_at`), ordered by `created_at desc`, and
  returns them.

### 4. Dashboard UI

`src/routes/admin/index.tsx` renders a simple table styled with the site's
existing design system:

| Username | Email | Signed up |
|---|---|---|

- Empty state: "No registered accounts yet" if the list is empty.
- Error state: if the server function call fails or returns unauthorized,
  show an error message / redirect home (no partial data shown).

## Data flow

1. Guest signs up at `/apply` → Supabase Auth creates the user → existing
   trigger inserts into `profiles` with `role` defaulting to `'user'`.
   (Unchanged.)
2. Site owner promotes their own account to `role = 'admin'` via one-time
   SQL.
3. Admin logs in at `/apply` (existing flow, unchanged) and navigates to
   `/admin`.
4. `/admin` calls `getAdminProfiles`, which verifies the caller is an admin
   server-side, then returns all profiles via the service-role client.
5. Dashboard renders the table.

## Error handling

- No session at `/admin` → redirect to `/apply`.
- Session but not admin → server function denies; UI shows
  unauthorized/redirects home. No account data is ever sent to a
  non-admin caller.
- Empty `profiles` table → empty-state message, not a blank/broken table.
- Server function failure (network/DB error) → error banner, no crash.

## Testing

- Manual: sign up as a normal user, confirm `/admin` redirects/denies
  access.
- Manual: promote that account to `admin` via SQL, confirm `/admin` now
  shows the account list including that user.
- Manual: confirm a second signup appears in the list after refresh.
- Manual: confirm empty-state renders correctly on a fresh/empty
  `profiles` table (e.g. in a scratch Supabase project, or by reasoning
  about the empty-array code path).

## Amendment: duplicate-signup error message

`src/routes/apply.tsx` currently mishandles re-signup with an already
registered email. When Supabase's anti-enumeration protection is active,
`supabase.auth.signUp()` can return no error and no session for an
existing email, so the code falls into its "email confirmation required"
fallback (`signInWithPassword` with the newly typed password), which then
fails with a confusing "Invalid login credentials" message instead of
telling the user the account already exists.

Fix: after a successful (no-error) `signUp` call with no session, check
`data.user?.identities`. An empty array (`identities.length === 0`) is
Supabase's signal that the email is already registered. In that case, skip
the sign-in fallback and show: "An account with this email already
exists — please sign in instead." Only attempt the sign-in fallback when
`identities` is non-empty (the genuine "needs email confirmation" case).

## Amendment: seed admin account

A one-time, manually-run script `scripts/seed-admin.ts` creates the first
admin account, so there's no need to hand-write raw SQL against
`auth.users` (Supabase passwords require hashing that only the auth admin
API performs correctly).

- Uses the service-role client (`client.server.ts`'s admin client, or an
  equivalent one-off client built from `SUPABASE_SERVICE_ROLE_KEY`) and
  calls `supabase.auth.admin.createUser({ email, password, email_confirm:
  true, user_metadata: { username } })`.
- Credentials: email `admin@gmail.com`, password `admin@123`, username
  `admin`.
- After creation, updates that user's `public.profiles.role` to
  `'admin'` (the profile row itself is created by the existing signup
  trigger, same as any other signup).
- Run manually once (`SUPABASE_SERVICE_ROLE_KEY=... npx tsx
  scripts/seed-admin.ts` or similar) — not part of the automatic
  migrations, since it creates a real credential rather than schema.
- **Security note**: `admin@123` is a weak, guessable password. Flagged
  to the user; recommended to change it after first login. Proceeding
  with these exact credentials per explicit user request.
