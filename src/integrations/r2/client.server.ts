import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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

export async function getDownloadUrl(key: string): Promise<string> {
  requireEnv();
  const command = new GetObjectCommand({
    Bucket: CLOUDFLARE_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: 300 });
}

export async function deleteDocument(key: string): Promise<void> {
  requireEnv();
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: CLOUDFLARE_BUCKET_NAME!, Key: key }),
  );
}
