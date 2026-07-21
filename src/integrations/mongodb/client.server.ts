import { MongoClient, type Db, type Collection } from "mongodb";
import type {
  UserDoc,
  SessionDoc,
  ApplicationDoc,
  ApplicationDocumentDoc,
} from "./types";

const DATABASE_URL = process.env.DATABASE_URL;

let _dbPromise: Promise<Db> | undefined;

async function getDb(): Promise<Db> {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }
  if (!_dbPromise) {
    _dbPromise = (async () => {
      try {
        const client = new MongoClient(DATABASE_URL);
        await client.connect();
        const db = client.db();
        await Promise.all([
          db.collection("users").createIndex({ email: 1 }, { unique: true }),
          db
            .collection("sessions")
            .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
          db
            .collection("applications")
            .createIndex({ userId: 1 }, { unique: true }),
          db.collection("application_documents").createIndex({ userId: 1 }),
        ]);
        return db;
      } catch (err) {
        _dbPromise = undefined;
        throw err;
      }
    })();
  }
  return _dbPromise;
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
