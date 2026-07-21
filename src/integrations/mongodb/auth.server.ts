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

export async function requireAdmin(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (user.role !== "admin") throw new Error("Not authorized.");
  return user;
}
