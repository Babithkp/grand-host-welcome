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
