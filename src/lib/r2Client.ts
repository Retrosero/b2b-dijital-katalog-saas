import { S3Client } from "@aws-sdk/client-s3";

// Lazy initialization: client is created on first use so that env vars
// are guaranteed to be loaded (dotenv/config runs in server.ts entry point).
let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2) return _r2;

  // Değerleri alırken başındaki ve sonundaki olası boşlukları/hatalı karakterleri temizliyoruz
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error(
      "[R2] MISSING CREDENTIALS – R2_ACCOUNT_ID, R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is empty. " +
        "Check your environment variables on the server."
    );
  }

  _r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // R2 için forcePathStyle true olması bazı imza hatalarını önleyebilir
    forcePathStyle: true,
  });

  return _r2;
}

/** @deprecated use getR2Client() instead */
export const r2 = new Proxy({} as S3Client, {
  get(_target, prop) {
    return (getR2Client() as any)[prop];
  },
});
