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
