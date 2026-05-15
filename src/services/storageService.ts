import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "../lib/r2Client";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "catalog-media";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

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
  productId,
  imageId,
  suffix = "medium", // thumb, medium, large, original
}: {
  tenantId: string;
  productId: string;
  imageId: string;
  suffix?: string;
}) {
  return `tenants/${tenantId}/products/${productId}/images/${imageId}/${suffix}.webp`;
}
