# Admin User Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin view registered guest accounts (username, email, signup date) on a protected `/admin` page, fix a confusing error on duplicate signup, and seed one admin account.

**Architecture:** No new server-function layer. This codebase's existing pattern (see `src/routes/portal.tsx`) is: the browser calls the Supabase client directly, and Postgres Row-Level Security (RLS) is the access-control boundary. We follow that pattern — add a `role` column to `public.profiles`, add a `SECURITY DEFINER` helper function `public.is_admin()`, and add an RLS policy that lets admins `SELECT` every row while everyone else still only sees their own (existing policy, unchanged). The `/admin` route does a client-side role check for UX (redirect/unauthorized message), but the real enforcement is the RLS policy — even if the UI check were skipped, a non-admin's query still can't return other people's rows.

**Tech Stack:** TanStack Start (file-based routing, React 19), Supabase (Postgres + Auth), plain `@supabase/supabase-js` for the one-off seed script (no ts-node/tsx dependency exists in this repo, so the seed script is plain ESM JavaScript — `package.json` already has `"type": "module"`).

## Global Constraints

- No automated test runner exists in this repo (no vitest/jest in `package.json`). Every task's "test" step is manual verification: SQL query results, or the dev server (`npm run dev` / `vite dev`) in a browser. Do not add a test framework as part of this plan — out of scope.
- Follow the existing flat routing convention: one file per route directly under `src/routes/` (see `about.tsx`, `careers.tsx`, `portal.tsx`), not a subfolder.
- Match the existing visual style: `bg-cream` page background, `bg-forest-deep` header band, `text-forest-deep` headings, `rounded-2xl`/`shadow-sm`/`ring-1 ring-border` cards — copy patterns from `src/routes/portal.tsx`.
- Migrations go in `supabase/migrations/` with a timestamp-prefixed filename, following the three existing files.
- Applying a migration with `supabase db push` affects the live, linked Supabase project (`project_id = "gctujizewxkadiybqpyj"` in `supabase/config.toml`). Confirm with the user before running it — this is a real, shared database, not a local sandbox.
- Seeded admin credentials (explicit user request, weak password flagged and accepted): email `admin@gmail.com`, password `admin@123`, username `admin`.

---

## Task 1: Add `role` column, admin-check function, and admin RLS policy

**Files:**
- Create: `supabase/migrations/20260720213000_add_admin_role_to_profiles.sql`
- Modify: `src/integrations/supabase/types.ts:92-112` (the `profiles` table type block)

**Interfaces:**
- Produces: `public.profiles.role` column (`'user' | 'admin'`, default `'user'`), `public.is_admin()` SQL function (returns `boolean`, true when the current `auth.uid()` has `role = 'admin'`), and a `profiles.Row`/`Insert`/`Update` TypeScript type that includes `role: string`. Task 3 (admin route) reads `profiles.role` and relies on the RLS policy this task adds.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260720213000_add_admin_role_to_profiles.sql`:

```sql
-- Add role for admin access control
ALTER TABLE public.profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- SECURITY DEFINER helper avoids recursive RLS evaluation when a policy
-- on profiles needs to check the *current user's own* role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admins can read every profile row; the existing "Own profile select"
-- policy (auth.uid() = id) still applies for everyone else.
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_admin());
```

- [ ] **Step 2: Confirm with the user, then apply the migration**

This talks to the live linked Supabase project. Ask the user to confirm before running, then:

Run: `supabase db push`
Expected: CLI reports the new migration applied with no errors.

- [ ] **Step 3: Verify the schema change**

Run this query against the project (via `supabase db execute` if available, or the Supabase SQL editor):

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'role';
```

Expected: one row — `role | text | 'user'::text`.

- [ ] **Step 4: Update the generated types file**

In `src/integrations/supabase/types.ts`, replace the `profiles` block (currently lines 92-112):

```typescript
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          role?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          username?: string | null
        }
        Relationships: []
      }
```

- [ ] **Step 5: Verify the project still type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors related to `profiles` or `types.ts`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260720213000_add_admin_role_to_profiles.sql src/integrations/supabase/types.ts
git commit -m "feat: add admin role column and RLS policy to profiles"
```

---

## Task 2: Fix duplicate-signup error message on `/apply`

**Files:**
- Modify: `src/routes/apply.tsx:30-44`

**Interfaces:**
- Consumes: nothing new (uses the existing `supabase.auth.signUp` / `signInWithPassword` client already imported in this file).
- Produces: nothing consumed by other tasks — this is a standalone UX fix.

- [ ] **Step 1: Replace the signup branch**

In `src/routes/apply.tsx`, replace lines 30-44:

```typescript
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/portal`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          // email confirmation required — try immediate sign-in
          const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
          if (sErr) throw sErr;
        }
      } else {
```

with:

```typescript
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/portal`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Supabase's anti-enumeration behavior returns no error and no
          // session for an email that's already registered — an empty
          // identities array is how it signals that case.
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            throw new Error("An account with this email already exists — please sign in instead.");
          }
          // otherwise: email confirmation is required — try immediate sign-in
          const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
          if (sErr) throw sErr;
        }
      } else {
```

- [ ] **Step 2: Manually verify — new signup still works**

Run: `npm run dev`
In the browser, go to `/apply`, sign up with a brand-new email/password (8+ chars).
Expected: redirected to `/portal` with no error shown.

- [ ] **Step 3: Manually verify — duplicate signup shows the new message**

On `/apply`, stay in "signup" mode (don't toggle to sign-in), enter the **same email** used in Step 2 with any password, submit.
Expected: red error box reads "An account with this email already exists — please sign in instead." (not "Invalid login credentials").

- [ ] **Step 4: Manually verify — normal sign-in still works**

Toggle to "Sign in", enter the Step 2 email and its correct password, submit.
Expected: redirected to `/portal`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/apply.tsx
git commit -m "fix: show clear error when signing up with an already-registered email"
```

---

## Task 3: Admin dashboard route (`/admin`)

**Files:**
- Create: `src/routes/admin.tsx`

**Interfaces:**
- Consumes: `supabase` client from `@/integrations/supabase/client` (existing); `public.profiles.role` and the `"Admins can view all profiles"` RLS policy from Task 1; `Header` component from `@/components/Header` (existing, used by `portal.tsx`/`apply.tsx`).
- Produces: the `/admin` route. Nothing else depends on this file.

- [ ] **Step 1: Create the route file**

Create `src/routes/admin.tsx`:

```tsx
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Grand Host Care Home" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type ProfileRow = { username: string | null; email: string | null; created_at: string };
type Status = "loading" | "unauthorized" | "ready" | "error";

function AdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate({ to: "/apply" });
        return;
      }

      const uid = sessionData.session.user.id;
      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (ownProfile?.role !== "admin") {
        setStatus("unauthorized");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, email, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      setProfiles((data as ProfileRow[]) ?? []);
      setStatus("ready");
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-20 pt-32 text-primary-foreground md:pb-24 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-5xl">
          <span className="eyebrow text-gold">Admin</span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">Registered accounts</h1>
        </div>
      </div>

      <section className="container-x mx-auto max-w-5xl py-16">
        {status === "loading" && (
          <p className="text-center text-muted-foreground">Loading…</p>
        )}

        {status === "unauthorized" && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-forest-deep">You don't have access to this page.</p>
            <Link to="/" className="mt-4 inline-block font-semibold text-forest underline-offset-4 hover:underline">
              ← Back home
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-red-700">{errorMsg}</p>
          </div>
        )}

        {status === "ready" && profiles.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-muted-foreground">No registered accounts yet.</p>
          </div>
        )}

        {status === "ready" && profiles.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-forest-deep">
                  <th className="px-6 py-4 font-semibold">Username</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 text-forest-deep">{p.username ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify — non-admin is blocked**

Run: `npm run dev` (if not already running from Task 2).
Sign in at `/apply` as the regular account created in Task 2, then navigate to `/admin`.
Expected: "You don't have access to this page." message, no table shown.

- [ ] **Step 3: Manually verify — no session redirects**

Sign out (via `/portal`'s sign-out button), then navigate directly to `/admin`.
Expected: redirected to `/apply`.

- [ ] **Step 4: Manually verify — admin sees the table**

This requires the admin account from Task 4 to exist first. If Task 4 isn't done yet, come back to this step after it. Sign in at `/apply` with `admin@gmail.com` / `admin@123`, navigate to `/admin`.
Expected: a table listing every registered account (including the one from Task 2), newest first, with the admin account itself also listed.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin.tsx
git commit -m "feat: add admin dashboard listing registered accounts"
```

---

## Task 4: Seed the admin account

**Files:**
- Create: `scripts/seed-admin.mjs`

**Interfaces:**
- Consumes: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables (same names `src/integrations/supabase/client.server.ts` expects); the `role` column and `public.profiles` table from Task 1.
- Produces: one Supabase Auth user (`admin@gmail.com`) with `profiles.role = 'admin'`, which Task 3 Step 4 depends on.

- [ ] **Step 1: Check for the service role key**

Run: `grep SUPABASE_SERVICE_ROLE_KEY .env`
Expected: currently **no match** — this repo's `.env` only has `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Ask the user for the service role key from the Supabase project dashboard (Project Settings → API → service_role key) and add this line to `.env` (it's already git-ignored, so this is safe to add locally):

```
SUPABASE_SERVICE_ROLE_KEY="<value from Supabase dashboard>"
```

Do not commit this value or ask the user to paste it into chat — have them add it to `.env` directly.

- [ ] **Step 2: Write the seed script**

Create `scripts/seed-admin.mjs`:

```javascript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin@123";
const ADMIN_USERNAME = "admin";

// New-format Supabase secret keys (sb_secret_...) are opaque strings, not
// JWTs — mirrors the fetch wrapper in src/integrations/supabase/client.server.ts
// so this script works the same way the app's server code does.
function isNewSupabaseApiKey(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: { fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY) },
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { username: ADMIN_USERNAME },
  });

  if (error) {
    console.error(`Failed to create admin user: ${error.message}`);
    process.exit(1);
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", data.user.id);

  if (updateError) {
    console.error(`Created auth user but failed to set admin role: ${updateError.message}`);
    process.exit(1);
  }

  console.log(`Admin account ready: ${ADMIN_EMAIL} (role=admin)`);
}

main();
```

- [ ] **Step 3: Confirm with the user, then run it**

This creates a real account on the live linked Supabase project. Confirm with the user before running, then:

Run: `node scripts/seed-admin.mjs`
Expected output: `Admin account ready: admin@gmail.com (role=admin)`

- [ ] **Step 4: Verify the account**

Run this query via the Supabase SQL editor or CLI:

```sql
select username, email, role from public.profiles where email = 'admin@gmail.com';
```

Expected: one row — `admin | admin@gmail.com | admin`.

- [ ] **Step 5: Go back and finish Task 3 Step 4**

Now that the admin account exists, sign in at `/apply` with `admin@gmail.com` / `admin@123` and confirm `/admin` shows the full account table (this is Task 3 Step 4 — complete it now if not already done).

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-admin.mjs
git commit -m "chore: add one-time script to seed the admin account"
```
