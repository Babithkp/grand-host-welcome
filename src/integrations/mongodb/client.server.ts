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
