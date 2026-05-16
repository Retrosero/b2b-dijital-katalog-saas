import sharp from "sharp";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import {
  uploadBufferToR2,
  deleteObjectFromR2,
  getPublicUrl,
  generateProductImageKeys,
} from "./storageService";

export async function processAndUploadProductImage(
  prisma: PrismaClient,
  {
    tenantId,
    productId,
    fileBuffer,
    mimeType,
  }: {
    tenantId: string;
    productId: string;
    fileBuffer: Buffer;
    mimeType: string;
  }
) {
  // ── 1. Env kontrolü ────────────────────────────────────────────────
  const requiredEnv = {
    R2_ACCOUNT_ID:        process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID:     process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME:       process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL:        process.env.R2_PUBLIC_URL,
  };
  const missing = Object.entries(requiredEnv).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`R2 environment variables not set: ${missing.join(", ")}`);
  }

  const imageId = randomUUID();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  console.log(`[ImageUpload] tenantId=${tenantId} tenantName=${tenant?.name} productId=${productId} imageId=${imageId}`);

  // ── 2. DB kaydı oluştur (status: uploading) ─────────────────────────
  const existingCount = await prisma.productImage.count({
    where: { productId, tenantId, status: "active" },
  });

  const isMain = existingCount === 0;

  const productImage = await prisma.productImage.create({
    data: {
      tenantId,
      productId,
      imageId,
      mimeType: "image/webp",
      isMain,
      status: "uploading",
      sortOrder: existingCount,
    },
  });

  try {
    // ── 3. sharp ile boyutlandır ─────────────────────────────────────
    console.log("[ImageUpload] Starting sharp processing, buffer size:", fileBuffer.length);

    const [thumbBuffer, mediumBuffer, largeBuffer, originalBuffer] = await Promise.all([
      sharp(fileBuffer).resize(300).webp({ quality: 75 }).toBuffer(),
      sharp(fileBuffer).resize(800).webp({ quality: 82 }).toBuffer(),
      sharp(fileBuffer).resize(1200).webp({ quality: 85 }).toBuffer(),
      sharp(fileBuffer).webp({ quality: 90 }).toBuffer(),
    ]);

    console.log("[ImageUpload] sharp done — thumb:", thumbBuffer.length, "medium:", mediumBuffer.length);

    // ── 4. R2 key'leri oluştur ──────────────────────────────────────
    const opts = { tenantId, tenantName: tenant?.name, productId, imageId };
    const thumbKey    = generateProductImageKeys({ ...opts, suffix: "thumb" });
    const mediumKey   = generateProductImageKeys({ ...opts, suffix: "medium" });
    const largeKey    = generateProductImageKeys({ ...opts, suffix: "large" });
    const originalKey = generateProductImageKeys({ ...opts, suffix: "original" });

    console.log("[ImageUpload] Uploading to R2 bucket:", process.env.R2_BUCKET_NAME);
    console.log("[ImageUpload] thumbKey:", thumbKey);

    // ── 5. R2'ye yükle ──────────────────────────────────────────────
    await Promise.all([
      uploadBufferToR2({ key: thumbKey,    buffer: thumbBuffer,    contentType: "image/webp" }),
      uploadBufferToR2({ key: mediumKey,   buffer: mediumBuffer,   contentType: "image/webp" }),
      uploadBufferToR2({ key: largeKey,    buffer: largeBuffer,    contentType: "image/webp" }),
      uploadBufferToR2({ key: originalKey, buffer: originalBuffer, contentType: "image/webp" }),
    ]);

    console.log("[ImageUpload] All R2 uploads done");

    // ── 6. URL'leri oluştur ─────────────────────────────────────────
    const thumbUrl    = getPublicUrl(thumbKey);
    const mediumUrl   = getPublicUrl(mediumKey);
    const largeUrl    = getPublicUrl(largeKey);
    const originalUrl = getPublicUrl(originalKey);

    const totalBytes = thumbBuffer.length + mediumBuffer.length + largeBuffer.length + originalBuffer.length;
    const metadata = await sharp(fileBuffer).metadata();

    // ── 7. DB güncelle (status: active) ─────────────────────────────
    const updatedImage = await prisma.productImage.update({
      where: { id: productImage.id },
      data: {
        thumbKey, mediumKey, largeKey, originalKey,
        thumbUrl, mediumUrl, largeUrl, originalUrl,
        sizeBytes: totalBytes,
        width:  metadata.width,
        height: metadata.height,
        status: "active",
      },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        usedStorageBytes: { increment: totalBytes },
        imageCount:       { increment: 1 },
      },
    });

    console.log("[ImageUpload] Success! imageId:", imageId, "totalBytes:", totalBytes);
    return updatedImage;

  } catch (error: any) {
    console.error("[ImageUpload] FAILED at step — error:", error?.message, error);

    await prisma.productImage.update({
      where: { id: productImage.id },
      data: { status: "failed" },
    }).catch(() => {}); // DB güncellemesi başarısız olsa bile orijinal hatayı fırlat

    throw error;
  }
}

export async function deleteProductImage(prisma: PrismaClient, productImage: any) {
  if (productImage.thumbKey)    await deleteObjectFromR2(productImage.thumbKey);
  if (productImage.mediumKey)   await deleteObjectFromR2(productImage.mediumKey);
  if (productImage.largeKey)    await deleteObjectFromR2(productImage.largeKey);
  if (productImage.originalKey) await deleteObjectFromR2(productImage.originalKey);

  await prisma.productImage.update({
    where: { id: productImage.id },
    data: { status: "deleted", deletedAt: new Date() },
  });

  if (productImage.sizeBytes && productImage.sizeBytes > 0) {
    await prisma.tenant.update({
      where: { id: productImage.tenantId },
      data: {
        usedStorageBytes: { decrement: productImage.sizeBytes },
        imageCount:       { decrement: 1 },
      },
    });
  }
}
