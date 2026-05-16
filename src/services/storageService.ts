import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "../lib/r2Client";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "catalog-media";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

function toPathSafe(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
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
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

export async function deleteObjectFromR2(key: string) {
  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error("Error deleting from R2:", error);
  }
}

export function getPublicUrl(key: string) {
  if (!key) return null;
  // Make sure PUBLIC_URL does not end with a slash and key does not start with a slash
  const baseUrl = PUBLIC_URL.replace(/\/$/, "");
  const safeKey = key.replace(/^\//, "");
  return `${baseUrl}/${safeKey}`;
}

export function generateProductImageKeys({
  tenantId,
  tenantName,
  productId,
  imageId,
  suffix = "medium", // thumb, medium, large, original
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
