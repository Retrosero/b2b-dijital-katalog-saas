import { S3Client } from "@aws-sdk/client-s3";

// Lazy initialization: client is created on first use so that env vars
// are guaranteed to be loaded (dotenv/config runs in server.ts entry point).
let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2) return _r2;

  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error(
      "[R2] MISSING CREDENTIALS – R2_ACCOUNT_ID, R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is empty. " +
        "Check your environment variables on the server."
    );
  }

  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _r2;
}

/** @deprecated use getR2Client() instead */
export const r2 = new Proxy({} as S3Client, {
  get(_target, prop) {
    return (getR2Client() as any)[prop];
  },
});
