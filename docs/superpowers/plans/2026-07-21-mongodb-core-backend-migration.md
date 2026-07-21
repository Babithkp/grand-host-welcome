# MongoDB + R2 Core Backend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase (Postgres + Auth + Storage) with MongoDB Atlas, custom session-based authentication, and Cloudflare R2 file storage, so `/apply` (signup/login) and `/portal` (application form + document upload) work fully on infrastructure the developer owns — no dependency on the client's Supabase project.

**Architecture:** All data access moves behind TanStack Start server functions (`createServerFn`), since MongoDB isn't queried from the browser the way Supabase was. Every mutating/reading server function re-derives the caller's identity from an httpOnly session cookie and re-checks ownership server-side — this replaces what Postgres RLS enforced before, and is the real authorization boundary now. Sessions are DB-backed (opaque random token in a `sessions` collection with a TTL index), not JWTs, so they can be revoked by deleting the row. File uploads go browser → R2 directly via presigned URLs, not through the app server, to avoid serverless request-body size limits on ~25MB files.

**Tech Stack:** TanStack Start (`createServerFn`, `@tanstack/react-start/server` cookie helpers), MongoDB Atlas via the native `mongodb` driver (no ORM), `bcryptjs` for password hashing, Cloudflare R2 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, Vercel as the deploy target (Nitro `vercel` preset) instead of the default Cloudflare preset, since the MongoDB driver needs raw TCP sockets that Cloudflare Workers doesn't support.

## Global Constraints

- No automated test runner exists in this repo (no vitest/jest in `package.json`). Every task's verification is manual: `npx tsc --noEmit`, a one-off Node script, or the dev server in a browser. Do not add a test framework as part of this plan — out of scope.
- Env vars already set in `.env` (git-ignored, confirmed): `DATABASE_URL` (MongoDB Atlas connection string, includes the `grandhostwelcome` database name in its path), `CLOUDFLARE_REGION`, `CLOUDFLARE_BUCKET_NAME`, `CLOUDFLARE_ACCESS_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_ENDPOINT` (this one includes the bucket name as a URL path suffix — code must strip that to get the bare account endpoint the S3 client needs). Do not rename these — write code against the names as they exist.
- The R2 bucket is shared with other, unrelated work. Every object this app writes must be under the `grandhostwelcome/` key prefix to stay isolated from other projects' files (explicit user instruction).
- This migration covers auth + application data + document storage only. The admin dashboard (`src/routes/admin.tsx`) is explicitly out of scope (separate follow-up spec/plan) — do not modify it in this plan. Known, accepted consequence: once this migration ships, nobody will ever hold a Supabase Auth session again, so `admin.tsx`'s `supabase.auth.getSession()` check will always be empty and it will just redirect to `/apply` every time — not crash, not infinite-load, just non-functional until its own follow-up plan converts it to the new session system.
- `src/integrations/supabase/*` is left in place but becomes unused by `/apply` and `/portal` after this plan. Do not delete it — full removal happens once the admin-dashboard follow-up also moves off Supabase.
- Match existing code style: no ORM/schema-validation-library abstraction over MongoDB (plain `mongodb` driver + hand-written TS interfaces, mirroring how this repo calls `@supabase/supabase-js` directly). Secret-bearing modules (Mongo client, R2 client) are dynamically `import()`-ed inside server function handler bodies, not statically imported at the top of files that ship to the client bundle — this matches the existing convention in `src/integrations/supabase/client.server.ts`.
- Session cookie name: `session_token`. Session lifetime: 30 days. Cookie flags: `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`.

---

## Task 1: Switch deploy target to Vercel and install new dependencies

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json` (via `npm install`, not hand-edited)

**Interfaces:**
- Produces: `mongodb`, `bcryptjs`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` available as dependencies; `@types/bcryptjs` as a dev dependency. Nitro building with the `vercel` preset instead of the default `cloudflare-module` preset. All later tasks import these packages.

- [ ] **Step 1: Install the new dependencies**

Run:
```bash
npm install mongodb bcryptjs @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D @types/bcryptjs
```
Expected: `package.json` and `package-lock.json` updated with these packages; no install errors.

- [ ] **Step 2: Switch the Nitro preset to Vercel**

Replace the full contents of `vite.config.ts`:

```ts
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // MongoDB's driver needs raw TCP/TLS sockets, which Cloudflare Workers'
  // runtime doesn't support — Vercel's Node.js serverless functions do.
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
```

- [ ] **Step 3: Verify the production build targets Vercel**

Run: `npm run build`
Expected: build succeeds with no errors, and a `.vercel/output` directory is created at the project root (Nitro's `vercel` preset writes Vercel's Build Output API v3 structure there — `.vercel/output/functions` and `.vercel/output/static`). This directory is already git-ignored.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git commit -m "chore: switch deploy target to Vercel, add MongoDB/R2 dependencies"
```

---

## Task 2: MongoDB connection singleton, collection types, and indexes

**Files:**
- Create: `src/integrations/mongodb/types.ts`
- Create: `src/integrations/mongodb/client.server.ts`
- Create: `scripts/verify-mongo.mjs`

**Interfaces:**
- Produces: `UserDoc`, `SessionDoc`, `ApplicationDoc`, `ApplicationDocumentDoc` types; `getUsersCollection()`, `getSessionsCollection()`, `getApplicationsCollection()`, `getApplicationDocumentsCollection()` — each `async () => Promise<Collection<T>>`. Every later task that touches MongoDB imports these.

- [ ] **Step 1: Define the collection document types**

Create `src/integrations/mongodb/types.ts`:

```ts
import type { ObjectId } from "mongodb";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: Date;
}

export interface SessionDoc {
  _id: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export interface ApplicationDoc {
  _id: ObjectId;
  userId: ObjectId;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  country: string | null;
  position: string | null;
  submitted: boolean;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationDocumentDoc {
  _id: ObjectId;
  userId: ObjectId;
  file_name: string;
  r2_key: string;
  file_size: number | null;
  created_at: Date;
}
```

- [ ] **Step 2: Write the connection singleton**

Create `src/integrations/mongodb/client.server.ts`:

```ts
import { MongoClient, type Db, type Collection } from "mongodb";
import type {
  UserDoc,
  SessionDoc,
  ApplicationDoc,
  ApplicationDocumentDoc,
} from "./types";

const DATABASE_URL = process.env.DATABASE_URL;

let _client: MongoClient | undefined;
let _db: Db | undefined;
let _indexesEnsured = false;

async function getDb(): Promise<Db> {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }
  if (!_client) {
    _client = new MongoClient(DATABASE_URL);
    await _client.connect();
    _db = _client.db();
  }
  if (!_indexesEnsured) {
    _indexesEnsured = true;
    await Promise.all([
      _db!.collection("users").createIndex({ email: 1 }, { unique: true }),
      _db!
        .collection("sessions")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      _db!
        .collection("applications")
        .createIndex({ userId: 1 }, { unique: true }),
      _db!.collection("application_documents").createIndex({ userId: 1 }),
    ]);
  }
  return _db!;
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export async function getSessionsCollection(): Promise<
  Collection<SessionDoc>
> {
  return (await getDb()).collection<SessionDoc>("sessions");
}

export async function getApplicationsCollection(): Promise<
  Collection<ApplicationDoc>
> {
  return (await getDb()).collection<ApplicationDoc>("applications");
}

export async function getApplicationDocumentsCollection(): Promise<
  Collection<ApplicationDocumentDoc>
> {
  return (await getDb()).collection<ApplicationDocumentDoc>(
    "application_documents",
  );
}
```

- [ ] **Step 3: Write a standalone connection-verification script**

Create `scripts/verify-mongo.mjs`:

```js
import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const client = new MongoClient(DATABASE_URL);
try {
  await client.connect();
  await client.db().command({ ping: 1 });
  console.log("MongoDB connection OK");
} finally {
  await client.close();
}
```

- [ ] **Step 4: Run the verification script**

Run: `node --env-file=.env scripts/verify-mongo.mjs`
Expected output: `MongoDB connection OK`

If this fails with an auth or network error, stop and confirm the `DATABASE_URL` in `.env` (Atlas project network access must allow connections from this machine — Atlas's "Allow access from anywhere" during setup, or add this machine's IP).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/integrations/mongodb/`.

- [ ] **Step 6: Commit**

```bash
git add src/integrations/mongodb/types.ts src/integrations/mongodb/client.server.ts scripts/verify-mongo.mjs
git commit -m "feat: add MongoDB connection singleton and collection types"
```

---

## Task 3: Cloudflare R2 client and presigned-upload helpers

**Files:**
- Create: `src/integrations/r2/client.server.ts`
- Create: `scripts/verify-r2.mjs`

**Interfaces:**
- Produces: `buildDocumentKey(userId: string, fileName: string): string`, `getUploadUrl(key: string, contentType: string): Promise<string>`, `deleteDocument(key: string): Promise<void>`. Task 6 (document server functions) consumes all three.

- [ ] **Step 1: Write the R2 client module**

Create `src/integrations/r2/client.server.ts`:

```ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const CLOUDFLARE_ENDPOINT = process.env.CLOUDFLARE_ENDPOINT;
const CLOUDFLARE_ACCESS_ID = process.env.CLOUDFLARE_ACCESS_ID;
const CLOUDFLARE_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const CLOUDFLARE_BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME;
const CLOUDFLARE_REGION = process.env.CLOUDFLARE_REGION || "auto";

// Every object this app writes lives under this prefix, since the bucket
// is shared with other, unrelated projects.
const KEY_PREFIX = "grandhostwelcome";

function requireEnv(): void {
  const missing = [
    ...(!CLOUDFLARE_ENDPOINT ? ["CLOUDFLARE_ENDPOINT"] : []),
    ...(!CLOUDFLARE_ACCESS_ID ? ["CLOUDFLARE_ACCESS_ID"] : []),
    ...(!CLOUDFLARE_SECRET_ACCESS_KEY ? ["CLOUDFLARE_SECRET_ACCESS_KEY"] : []),
    ...(!CLOUDFLARE_BUCKET_NAME ? ["CLOUDFLARE_BUCKET_NAME"] : []),
  ];
  if (missing.length) {
    throw new Error(
      `Missing Cloudflare R2 environment variable(s): ${missing.join(", ")}`,
    );
  }
}

// CLOUDFLARE_ENDPOINT in this project's .env includes the bucket name as a
// path suffix (".../<bucket>"); the S3 client wants only the account's
// R2 endpoint (bucket is passed separately per-request).
function accountEndpoint(): string {
  const url = new URL(CLOUDFLARE_ENDPOINT!);
  return `${url.protocol}//${url.host}`;
}

let _s3: S3Client | undefined;

function getS3Client(): S3Client {
  requireEnv();
  if (!_s3) {
    _s3 = new S3Client({
      region: CLOUDFLARE_REGION,
      endpoint: accountEndpoint(),
      credentials: {
        accessKeyId: CLOUDFLARE_ACCESS_ID!,
        secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

export function buildDocumentKey(userId: string, fileName: string): string {
  return `${KEY_PREFIX}/${userId}/${Date.now()}-${fileName}`;
}

export async function getUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  requireEnv();
  const command = new PutObjectCommand({
    Bucket: CLOUDFLARE_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 300 });
}

export async function deleteDocument(key: string): Promise<void> {
  requireEnv();
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: CLOUDFLARE_BUCKET_NAME!, Key: key }),
  );
}
```

- [ ] **Step 2: Write a standalone R2 verification script**

Create `scripts/verify-r2.mjs`:

```js
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const {
  CLOUDFLARE_ENDPOINT,
  CLOUDFLARE_ACCESS_ID,
  CLOUDFLARE_SECRET_ACCESS_KEY,
  CLOUDFLARE_BUCKET_NAME,
  CLOUDFLARE_REGION,
} = process.env;

const missing = [
  "CLOUDFLARE_ENDPOINT",
  "CLOUDFLARE_ACCESS_ID",
  "CLOUDFLARE_SECRET_ACCESS_KEY",
  "CLOUDFLARE_BUCKET_NAME",
].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const url = new URL(CLOUDFLARE_ENDPOINT);
const endpoint = `${url.protocol}//${url.host}`;

const s3 = new S3Client({
  region: CLOUDFLARE_REGION || "auto",
  endpoint,
  credentials: {
    accessKeyId: CLOUDFLARE_ACCESS_ID,
    secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

const key = "grandhostwelcome/_verify/test.txt";
await s3.send(
  new PutObjectCommand({
    Bucket: CLOUDFLARE_BUCKET_NAME,
    Key: key,
    Body: "verify",
    ContentType: "text/plain",
  }),
);
console.log("Upload OK");
await s3.send(
  new DeleteObjectCommand({ Bucket: CLOUDFLARE_BUCKET_NAME, Key: key }),
);
console.log("Delete OK");
```

- [ ] **Step 3: Run the verification script**

Run: `node --env-file=.env scripts/verify-r2.mjs`
Expected output:
```
Upload OK
Delete OK
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/integrations/r2/`.

- [ ] **Step 5: Commit**

```bash
git add src/integrations/r2/client.server.ts scripts/verify-r2.mjs
git commit -m "feat: add Cloudflare R2 client and presigned-upload helpers"
```

---

## Task 4: Auth core, auth server functions, and wire `/apply`

**Files:**
- Create: `src/integrations/mongodb/auth.server.ts`
- Create: `src/server-functions/auth.ts`
- Modify: `src/routes/apply.tsx`

**Interfaces:**
- Consumes: `getUsersCollection`, `getSessionsCollection` (Task 2).
- Produces: `signupFn`, `loginFn`, `logoutFn`, `getSessionFn` — client-callable server functions. `signupFn`/`loginFn` resolve to `{ id: string, email: string, username: string, role: 'user' | 'admin' }` or throw an `Error` with a user-facing message. `getSessionFn` resolves to that same shape or `null`. Also produces `requireUserId(): Promise<ObjectId>` from `auth.server.ts`, consumed by Tasks 5 and 6. `logoutFn` resolves to `{ ok: true }`.

- [ ] **Step 1: Write the auth core module**

Create `src/integrations/mongodb/auth.server.ts`:

```ts
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getCookie } from "@tanstack/react-start/server";
import { getSessionsCollection, getUsersCollection } from "./client.server";
import type { UserDoc } from "./types";

export const SESSION_COOKIE = "session_token";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(
  userId: ObjectId,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const sessions = await getSessionsCollection();
  await sessions.insertOne({
    _id: token,
    userId,
    expiresAt,
    createdAt: new Date(),
  });
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await getSessionsCollection();
  await sessions.deleteOne({ _id: token });
}

async function getUserBySessionToken(
  token: string,
): Promise<UserDoc | null> {
  const sessions = await getSessionsCollection();
  const session = await sessions.findOne({ _id: token });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  const users = await getUsersCollection();
  return users.findOne({ _id: session.userId });
}

export async function getCurrentUser(): Promise<UserDoc | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function requireUserId(): Promise<ObjectId> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  return user._id;
}
```

- [ ] **Step 2: Write the auth server functions**

Create `src/server-functions/auth.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const signupFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    const { getUsersCollection } = await import(
      "@/integrations/mongodb/client.server"
    );
    const { hashPassword, createSession, SESSION_COOKIE } = await import(
      "@/integrations/mongodb/auth.server"
    );

    const users = await getUsersCollection();
    const existing = await users.findOne({ email: data.email });
    if (existing) {
      throw new Error(
        "An account with this email already exists — please sign in instead.",
      );
    }

    const passwordHash = await hashPassword(data.password);
    const insertResult = await users.insertOne({
      email: data.email,
      username: data.username,
      passwordHash,
      role: "user",
      createdAt: new Date(),
    });

    const { token, expiresAt } = await createSession(insertResult.insertedId);
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return {
      id: insertResult.insertedId.toString(),
      email: data.email,
      username: data.username,
      role: "user" as const,
    };
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const { getUsersCollection } = await import(
      "@/integrations/mongodb/client.server"
    );
    const { verifyPassword, createSession, SESSION_COOKIE } = await import(
      "@/integrations/mongodb/auth.server"
    );

    const users = await getUsersCollection();
    const user = await users.findOne({ email: data.email });
    if (!user) throw new Error("Invalid email or password.");

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password.");

    const { token, expiresAt } = await createSession(user._id);
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { SESSION_COOKIE, deleteSession } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const token = getCookie(SESSION_COOKIE);
    if (token) await deleteSession(token);
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  },
);

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getCurrentUser } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const user = await getCurrentUser();
    if (!user) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    };
  },
);
```

- [ ] **Step 3: Wire `/apply` to the new auth functions**

In `src/routes/apply.tsx`, replace the import on line 3:

```tsx
import { supabase } from "@/integrations/supabase/client";
```

with:

```tsx
import { signupFn, loginFn } from "@/server-functions/auth";
```

Replace the entire `submit` function (lines 25-69):

```tsx
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/portal`,
          },
        });
        if (error) {
          // With email confirmation disabled, Supabase rejects a duplicate
          // signup with this error directly rather than the silent
          // empty-identities signal used when confirmation is required.
          if (error.message.toLowerCase().includes("already registered")) {
            throw new Error("An account with this email already exists — please sign in instead.");
          }
          throw error;
        }
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/portal" });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
```

with:

```tsx
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signupFn({ data: { email, username, password } });
      } else {
        await loginFn({ data: { email, password } });
      }
      navigate({ to: "/portal" });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manually verify — signup works end-to-end**

Run: `npm run dev`
In the browser, go to `/apply`, sign up with a brand-new email/username/password (8+ chars).
Expected: redirected to `/portal` (it will error loading application/document data until Tasks 5-7 land — that's expected at this point; the goal of this step is confirming the account was created and the session cookie was set).

Confirm the user landed in Atlas: in MongoDB Atlas's web UI, browse to the `grandhostwelcome` database → `users` collection → confirm one document with the email used, a `passwordHash` that is not the plaintext password, and `role: "user"`.

- [ ] **Step 6: Manually verify — duplicate signup shows the existing error message**

On `/apply`, stay in "signup" mode, enter the same email from Step 5 with any password, submit.
Expected: red error box reads "An account with this email already exists — please sign in instead."

- [ ] **Step 7: Manually verify — sign-in works and invalid credentials are rejected**

Toggle to "Sign in", enter the Step 5 email with the wrong password, submit.
Expected: red error box reads "Invalid email or password."
Then submit again with the correct password.
Expected: redirected to `/portal`.

- [ ] **Step 8: Commit**

```bash
git add src/integrations/mongodb/auth.server.ts src/server-functions/auth.ts src/routes/apply.tsx
git commit -m "feat: replace Supabase Auth with MongoDB-backed signup/login/session"
```

---

## Task 5: Application data server functions

**Files:**
- Create: `src/server-functions/application.ts`

**Interfaces:**
- Consumes: `requireUserId` (Task 4), `getApplicationsCollection`, `getApplicationDocumentsCollection` (Task 2).
- Produces: `getApplicationFn` (resolves to `{ first_name, last_name, date_of_birth, address, phone, country, position, submitted } | null`), `saveApplicationFn` (accepts `{ first_name, last_name, date_of_birth, address, phone, country, position, submit? }`, resolves to `{ ok: true }`, throws if `submit: true` and the caller has zero uploaded documents). Task 7 (portal.tsx wiring) consumes both.

- [ ] **Step 1: Write the application server functions**

Create `src/server-functions/application.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getApplicationFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const applications = await getApplicationsCollection();
    const app = await applications.findOne({ userId });
    if (!app) return null;

    return {
      first_name: app.first_name,
      last_name: app.last_name,
      date_of_birth: app.date_of_birth,
      address: app.address,
      phone: app.phone,
      country: app.country,
      position: app.position,
      submitted: app.submitted,
    };
  },
);

const applicationSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  date_of_birth: z.string().nullable(),
  address: z.string(),
  phone: z.string(),
  country: z.string(),
  position: z.string(),
  submit: z.boolean().optional(),
});

export const saveApplicationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => applicationSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationsCollection, getApplicationDocumentsCollection } =
      await import("@/integrations/mongodb/client.server");

    const userId = await requireUserId();

    if (data.submit) {
      const documents = await getApplicationDocumentsCollection();
      const docCount = await documents.countDocuments({ userId });
      if (docCount === 0) {
        throw new Error(
          "Please upload at least one document before submitting.",
        );
      }
    }

    const applications = await getApplicationsCollection();
    const now = new Date();
    await applications.updateOne(
      { userId },
      {
        $set: {
          userId,
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth,
          address: data.address,
          phone: data.phone,
          country: data.country,
          position: data.position,
          updated_at: now,
          ...(data.submit ? { submitted: true, submitted_at: now } : {}),
        },
        $setOnInsert: {
          created_at: now,
          ...(data.submit ? {} : { submitted: false }),
        },
      },
      { upsert: true },
    );

    return { ok: true };
  });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/server-functions/application.ts
git commit -m "feat: add MongoDB-backed application data server functions"
```

---

## Task 6: Document server functions (R2 upload/delete)

**Files:**
- Create: `src/server-functions/documents.ts`

**Interfaces:**
- Consumes: `requireUserId` (Task 4), `getApplicationDocumentsCollection` (Task 2), `buildDocumentKey`/`getUploadUrl`/`deleteDocument` (Task 3).
- Produces: `listDocumentsFn` (resolves to `Array<{ id: string, file_name: string, file_size: number | null, created_at: string }>`), `requestUploadFn` (accepts `{ file_name, content_type }`, resolves to `{ uploadUrl: string, key: string }`, throws at the 10-document cap), `confirmUploadFn` (accepts `{ key, file_name, file_size }`, resolves to `{ ok: true }`), `deleteDocumentFn` (accepts `{ id }`, resolves to `{ ok: true }`, throws if the document doesn't belong to the caller). Task 7 consumes all four.

- [ ] **Step 1: Write the document server functions**

Create `src/server-functions/documents.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { z } from "zod";

const MAX_DOCUMENTS = 10;

export const listDocumentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    const docs = await documents
      .find({ userId })
      .sort({ created_at: -1 })
      .toArray();

    return docs.map((d) => ({
      id: d._id.toString(),
      file_name: d.file_name,
      file_size: d.file_size,
      created_at: d.created_at.toISOString(),
    }));
  },
);

const requestUploadSchema = z.object({
  file_name: z.string().min(1),
  content_type: z.string().min(1),
});

export const requestUploadFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => requestUploadSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    const count = await documents.countDocuments({ userId });
    if (count >= MAX_DOCUMENTS) {
      throw new Error("You can upload a maximum of 10 documents.");
    }

    const { buildDocumentKey, getUploadUrl } = await import(
      "@/integrations/r2/client.server"
    );
    const key = buildDocumentKey(userId.toString(), data.file_name);
    const uploadUrl = await getUploadUrl(key, data.content_type);
    return { uploadUrl, key };
  });

const confirmUploadSchema = z.object({
  key: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().nonnegative(),
});

export const confirmUploadFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => confirmUploadSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    await documents.insertOne({
      userId,
      file_name: data.file_name,
      r2_key: data.key,
      file_size: data.file_size,
      created_at: new Date(),
    });
    return { ok: true };
  });

const deleteDocumentSchema = z.object({
  id: z.string().min(1),
});

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteDocumentSchema.parse(data))
  .handler(async ({ data }) => {
    const { requireUserId } = await import(
      "@/integrations/mongodb/auth.server"
    );
    const { getApplicationDocumentsCollection } = await import(
      "@/integrations/mongodb/client.server"
    );

    const userId = await requireUserId();
    const documents = await getApplicationDocumentsCollection();
    const doc = await documents.findOne({
      _id: new ObjectId(data.id),
      userId,
    });
    if (!doc) {
      throw new Error("Document not found.");
    }

    const { deleteDocument } = await import("@/integrations/r2/client.server");
    await deleteDocument(doc.r2_key);
    await documents.deleteOne({ _id: doc._id });
    return { ok: true };
  });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/server-functions/documents.ts
git commit -m "feat: add MongoDB/R2-backed document upload, list, and delete server functions"
```

---

## Task 7: Rewire `/portal` end-to-end

**Files:**
- Modify: `src/routes/portal.tsx` (full rewrite of the data-access logic; markup/JSX unchanged)

**Interfaces:**
- Consumes: `getSessionFn`, `logoutFn` (Task 4); `getApplicationFn`, `saveApplicationFn` (Task 5); `listDocumentsFn`, `requestUploadFn`, `confirmUploadFn`, `deleteDocumentFn` (Task 6).
- Produces: nothing consumed by later tasks — this is the last route needing conversion in this plan.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/routes/portal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, Upload, FileText, Trash2, LogOut, CheckCircle, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { getSessionFn, logoutFn } from "@/server-functions/auth";
import { getApplicationFn, saveApplicationFn } from "@/server-functions/application";
import {
  listDocumentsFn,
  requestUploadFn,
  confirmUploadFn,
  deleteDocumentFn,
} from "@/server-functions/documents";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Your Application Portal — Grand Host Care Home" },
      { name: "description", content: "Complete your job application at Grand Host Care Home." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

type DocRow = { id: string; file_name: string; file_size: number | null; created_at: string };

const positions = [
  "Palliative Care Assistant",
  "Elderly Care Assistant",
  "Registered Nurse",
  "Other",
];

function PortalPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string>("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    address: "",
    phone: "",
    country: "",
    position: positions[0],
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSessionFn();
      if (!session) {
        navigate({ to: "/apply" });
        return;
      }
      setUsername(session.username || session.email);

      const app = await getApplicationFn();
      if (app) {
        setForm({
          first_name: app.first_name ?? "",
          last_name: app.last_name ?? "",
          date_of_birth: app.date_of_birth ?? "",
          address: app.address ?? "",
          phone: app.phone ?? "",
          country: app.country ?? "",
          position: app.position ?? positions[0],
        });
        setSubmitted(!!app.submitted);
      }
      await loadDocs();
      setReady(true);
    })();
  }, [navigate]);

  async function loadDocs() {
    const rows = await listDocumentsFn();
    setDocs(rows);
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveApplicationFn({
        data: { ...form, date_of_birth: form.date_of_birth || null },
      });
      setSaveMsg("Saved.");
    } catch (err: any) {
      setSaveMsg(`Error: ${err?.message ?? "Something went wrong"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setUploadErr(null);
    if (docs.length + e.target.files.length > 10) {
      setUploadErr("You can upload a maximum of 10 documents.");
      return;
    }
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      try {
        const { uploadUrl, key } = await requestUploadFn({
          data: {
            file_name: file.name,
            content_type: file.type || "application/octet-stream",
          },
        });
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload to storage failed.");
        await confirmUploadFn({
          data: { key, file_name: file.name, file_size: file.size },
        });
      } catch (err: any) {
        setUploadErr(err?.message ?? "Upload failed.");
      }
    }
    await loadDocs();
    setUploading(false);
    e.target.value = "";
  }

  async function deleteDoc(d: DocRow) {
    await deleteDocumentFn({ data: { id: d.id } });
    await loadDocs();
  }

  async function submitApplication() {
    setSubmitMsg(null);
    if (docs.length === 0) {
      setSubmitMsg("Please upload at least one document before submitting.");
      return;
    }
    try {
      await saveApplicationFn({
        data: { ...form, date_of_birth: form.date_of_birth || null, submit: true },
      });
      setSubmitted(true);
      setShowUpload(false);
    } catch (err: any) {
      setSubmitMsg(`Error: ${err?.message ?? "Something went wrong"}`);
    }
  }

  async function signOut() {
    await logoutFn();
    navigate({ to: "/" });
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="bg-forest-deep pb-24 pt-32"><Header /></div>
        <p className="mt-12 text-center text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-20 pt-32 text-primary-foreground md:pb-24 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="eyebrow text-gold">Application portal</span>
              <h1 className="mt-4 font-display text-4xl md:text-5xl">Welcome, {username}</h1>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-4 py-2 text-sm text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </div>

      {submitted ? (
        <section className="container-x mx-auto max-w-2xl py-16 text-center">
          <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-border md:p-14">
            <div className="flex justify-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-green-100">
                <CheckCircle className="text-green-600" size={40} strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="mt-6 font-display text-3xl text-forest-deep md:text-4xl">
              Application submitted successfully
            </h2>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-sm font-medium text-forest-deep">
              <Clock className="text-gold" size={18} />
              Application pending
            </div>

            <p className="mt-8 text-muted-foreground">
              When your documents has been accessed and verified, you will receive an email
              notification regarding the status of your application.
            </p>
          </div>
        </section>
      ) : (
        <section className="container-x mx-auto max-w-4xl py-16">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-border md:p-10">
            <p className="text-muted-foreground">
              To apply for a job position at our care home you would have to fill the form below and
              upload the following documents.
            </p>

            <form onSubmit={saveForm} className="mt-8 grid gap-5 md:grid-cols-2">
              <Field label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
              <Field label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
              <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} required />
              <Field label="Phone number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required className="md:col-span-2" />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} required />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-forest-deep">Position applying for</span>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-forest"
                >
                  {positions.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>

              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-forest-deep disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save details"}
                </button>
                {saveMsg && <span className="text-sm text-muted-foreground">{saveMsg}</span>}
              </div>
            </form>

            <div className="mt-12 border-t border-border pt-8">
              <p className="font-semibold text-forest-deep">To submit your application upload the following documents:</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
                <li><strong>Identification Document:</strong> International Passport, National identity card, or Driver's licence.</li>
                <li><strong>CV.</strong></li>
                <li><strong>Academic transcript and certificate from high school.</strong></li>
                <li>
                  <strong>Professional Certifications:</strong> any of the following will be accepted —
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Elderly care (Certificate)</li>
                    <li>Dementia care (Certificate)</li>
                    <li>Diploma in Nursing (Certificate and transcript)</li>
                    <li>Bachelor's or Master's degree in Nursing (Certificate and transcript)</li>
                  </ul>
                </li>
                <li><strong>Reference letter:</strong> a reference from previous or current employment as a nurse or caregiver.</li>
                <li><strong>Cover letter:</strong> a letter detailing why you would like to work in our care home and the contribution you can make as staff.</li>
              </ol>

              <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-forest-deep">
                All required application documents — except your identification document — must be
                officially translated to Dutch by the Rotterdam International Translation Service (ITS).
              </div>

              <button
                onClick={() => setShowUpload(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-forest-deep"
              >
                <Upload size={16} /> Upload
              </button>
            </div>
          </div>
        </section>
      )}

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-forest-deep/70 p-4 backdrop-blur-sm md:items-center"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="relative my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUpload(false)}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-forest text-primary-foreground hover:bg-forest-deep"
            >
              <X size={18} />
            </button>

            <h3 className="font-display text-2xl text-forest-deep">Upload documents</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You can upload and save up to 10 documents ({docs.length}/10 used).
            </p>
            <p className="mt-2 text-sm font-medium text-forest-deep">
              Only official translated documents in Dutch language by International Translation Service (ITS) will be accepted.
            </p>
            <p className="mt-2 text-sm font-medium text-forest-deep">
              ID documents such as passports, National ID cards, and driver's license can be submitted without translation.
            </p>


            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-forest/40 bg-white p-10 text-center hover:border-forest">
              <Upload className="text-forest" size={32} />
              <span className="font-medium text-forest-deep">Browse documents to upload</span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX up to ~25 MB each</span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={uploading || docs.length >= 10}
                className="hidden"
              />
            </label>
            {uploading && <p className="mt-3 text-sm text-muted-foreground">Uploading…</p>}
            {uploadErr && <p className="mt-3 text-sm text-red-700">{uploadErr}</p>}

            {docs.length > 0 && (
              <ul className="mt-6 space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg bg-white p-3 ring-1 ring-border">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-forest-deep">
                      <FileText size={16} className="shrink-0 text-forest" />
                      <span className="truncate">{d.file_name}</span>
                    </span>
                    <button
                      onClick={() => deleteDoc(d)}
                      aria-label="Delete"
                      className="rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={submitApplication}
              className="mt-8 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-forest-deep hover:brightness-95"
            >
              Submit Application
            </button>
            {submitMsg && <p className="mt-4 text-center text-sm text-forest-deep">{submitMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-forest-deep">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-forest"
      />
    </label>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manually verify — session redirect**

Run: `npm run dev` (if not already running).
With no active session (fresh browser profile or after clearing cookies), navigate directly to `/portal`.
Expected: redirected to `/apply`.

- [ ] **Step 4: Manually verify — application form save/reload**

Sign up or sign in at `/apply`, land on `/portal`. Fill in the form fields and click "Save details".
Expected: "Saved." message appears. Refresh the page.
Expected: the same values are still populated (confirms `saveApplicationFn`/`getApplicationFn` round-trip through Atlas).

- [ ] **Step 5: Manually verify — document upload**

Click "Upload", select 1-2 small files (e.g. a PDF and a JPG).
Expected: files appear in the list after upload completes, no error shown.

Confirm in the R2 bucket (via Cloudflare dashboard or `rclone`/`aws s3 ls` if configured) that the objects exist under `grandhostwelcome/<userId>/...`. Confirm in Atlas that `application_documents` has matching rows with `r2_key` pointing at those objects.

- [ ] **Step 6: Manually verify — 10-document cap**

Attempt to upload an 11th document (reuse small files if needed).
Expected: "You can upload a maximum of 10 documents." error shown, no 11th document created.

- [ ] **Step 7: Manually verify — delete a document**

Click the trash icon next to one uploaded document.
Expected: it disappears from the list. Confirm in R2 that the object is gone and in Atlas that the `application_documents` row is gone.

- [ ] **Step 8: Manually verify — submit application**

With at least one document uploaded, click "Submit Application".
Expected: the "Application submitted successfully" state renders. Confirm in Atlas that the `applications` document has `submitted: true` and a `submitted_at` timestamp.

- [ ] **Step 9: Manually verify — sign out**

Click "Sign out".
Expected: redirected to `/`. Navigating back to `/portal` afterward redirects to `/apply` (confirms the session was actually deleted, not just the cookie cleared client-side — check in Atlas that the corresponding `sessions` document is gone).

- [ ] **Step 10: Commit**

```bash
git add src/routes/portal.tsx
git commit -m "feat: rewire /portal to MongoDB/R2-backed server functions"
```

---

## Task 8: End-to-end verification and Vercel deploy check

**Files:** none (verification only).

**Interfaces:** none produced — this is the final task confirming the whole migration works together and deploys.

- [ ] **Step 1: Full signup-to-submit flow with a fresh account**

Run: `npm run dev` (if not already running).
Using a brand-new email:
1. Sign up at `/apply`.
2. On `/portal`, fill and save the application form.
3. Upload 2 documents.
4. Delete 1 of them.
5. Submit the application (1 document remaining satisfies the ≥1 requirement).
6. Sign out.
7. Sign back in at `/apply` with the same credentials.

Expected: every step succeeds with no console errors; after step 7, `/portal` shows the submitted state with the previously saved form data.

- [ ] **Step 2: Confirm cross-user isolation**

While signed in as the account from Step 1, open the browser devtools Network tab, find the `deleteDocumentFn` or `getApplicationFn` request, and note its cookie. Sign out, create a second account, and note its session cookie is different. (This confirms sessions are per-account, not shared — the actual authorization boundary from the design spec.)

- [ ] **Step 3: Deploy a Vercel preview**

This requires your own Vercel account (interactive login — cannot be automated).

Run: `npx vercel login` (follow the browser prompt), then `npx vercel link` to create/link a Vercel project for this repo.

In the Vercel project's dashboard (Settings → Environment Variables), add: `DATABASE_URL`, `CLOUDFLARE_REGION`, `CLOUDFLARE_BUCKET_NAME`, `CLOUDFLARE_ACCESS_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_ENDPOINT` — same values as your local `.env`.

Run: `npx vercel` (preview deploy, not `--prod`).
Expected: build succeeds; Vercel prints a preview URL.

- [ ] **Step 4: Repeat the core flow against the Vercel preview URL**

Using the preview URL, repeat Step 1's signup → save → upload → submit → sign out → sign in flow.
Expected: same results as Step 1, confirming the app works under the actual Vercel Node.js runtime, not just the local dev server.

- [ ] **Step 5: Report status**

No commit for this task — it's verification-only. If any step fails, stop and treat it as a bug in the relevant earlier task rather than patching around it here.
