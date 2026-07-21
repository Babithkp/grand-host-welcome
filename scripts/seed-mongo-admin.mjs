import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin@123";
const ADMIN_USERNAME = "admin";

console.warn(
  `WARNING: seeding admin with a known, weak password (${ADMIN_PASSWORD}). ` +
    "Change it after first login.",
);

const client = new MongoClient(DATABASE_URL);
try {
  await client.connect();
  const users = client.db().collection("users");
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await users.updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        passwordHash,
        role: "admin",
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  console.log(`Admin account ready: ${ADMIN_EMAIL} (role=admin)`);
} finally {
  await client.close();
}
