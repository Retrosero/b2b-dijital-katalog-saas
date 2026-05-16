import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "../lib/r2Client";

// Read at call-time so env vars loaded by dotenv are always fresh
function getBucketName() {
  return (process.env.R2_BUCKET_NAME || "catalog-media").trim();
}
function getPublicBase() {
  return (process.env.R2_PUBLIC_URL || "").trim().replace(/\/$/, "");
}

function toPathSafe(value: string) {
  const trMap: Record<string, string> = {
    "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
    "Ç": "c", "Ğ": "g", "İ": "i", "I": "i", "Ö": "o", "Ş": "s", "Ü": "u",
  };
  const mapped = value.replace(/[çğıöşüÇĞİIÖŞÜ]/g, (ch) => trMap[ch] || ch);
  return mapped
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function uploadBufferToR2({
  key,
  buffer,
  contentType,
}: {
  key: string;
  buffer: Buffer;
  contentType: string;
}) {
  const bucket = getBucketName();
  // Log message removed sensitive info but keeps debugging useful
  console.log(`[R2] Uploading key="${key}" bucket="${bucket}" size=${buffer.length}`);

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  console.log(`[R2] Upload success: ${key}`);
}

export async function deleteObjectFromR2(key: string) {
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      })
    );
  } catch (error) {
    console.error("[R2] Error deleting object:", key, error);
  }
}

export function getPublicUrl(key: string) {
  if (!key) return null;
  const safeKey = key.replace(/^\//, "");
  return `${getPublicBase()}/${safeKey}`;
}

export function generateProductImageKeys({
  tenantId,
  tenantName,
  productId,
  imageId,
  suffix = "medium",
}: {
  tenantId: string;
  tenantName?: string;
  productId: string;
  imageId: string;
  suffix?: string;
}) {
  const safeTenantName = tenantName ? toPathSafe(tenantName) : "";
  const tenantFolder = safeTenantName ? `${safeTenantName}-${tenantId}` : tenantId;
  return `tenants/${tenantFolder}/products/${productId}/images/${imageId}/${suffix}.webp`;
}
