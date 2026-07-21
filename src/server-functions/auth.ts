import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie, getCookie } from "@tanstack/react-start/server";
import { ObjectId } from "mongodb";
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
      _id: new ObjectId(),
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
