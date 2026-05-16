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
  const imageId = randomUUID();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  // Create empty DB record first
  const existingCount = await prisma.productImage.count({
    where: { productId, tenantId, status: "active" },
  });

  const isMain = existingCount === 0; // if first image, make it main

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
    const thumbBuffer = await sharp(fileBuffer)
      .resize(300)
      .webp({ quality: 75 })
      .toBuffer();

    const mediumBuffer = await sharp(fileBuffer)
      .resize(800)
      .webp({ quality: 82 })
      .toBuffer();

    const largeBuffer = await sharp(fileBuffer)
      .resize(1200)
      .webp({ quality: 85 })
      .toBuffer();

    // Optionally original
    const originalBuffer = await sharp(fileBuffer)
      .webp({ quality: 90 }) // Optimize original to webp as well
      .toBuffer();

    const thumbKey = generateProductImageKeys({ tenantId, tenantName: tenant?.name, productId, imageId, suffix: "thumb" });
    const mediumKey = generateProductImageKeys({ tenantId, tenantName: tenant?.name, productId, imageId, suffix: "medium" });
    const largeKey = generateProductImageKeys({ tenantId, tenantName: tenant?.name, productId, imageId, suffix: "large" });
    const originalKey = generateProductImageKeys({ tenantId, tenantName: tenant?.name, productId, imageId, suffix: "original" });

    await Promise.all([
      uploadBufferToR2({ key: thumbKey, buffer: thumbBuffer, contentType: "image/webp" }),
      uploadBufferToR2({ key: mediumKey, buffer: mediumBuffer, contentType: "image/webp" }),
      uploadBufferToR2({ key: largeKey, buffer: largeBuffer, contentType: "image/webp" }),
      uploadBufferToR2({ key: originalKey, buffer: originalBuffer, contentType: "image/webp" }),
    ]);

    const thumbUrl = getPublicUrl(thumbKey);
    const mediumUrl = getPublicUrl(mediumKey);
    const largeUrl = getPublicUrl(largeKey);
    const originalUrl = getPublicUrl(originalKey);

    const totalBytes =
      thumbBuffer.length + mediumBuffer.length + largeBuffer.length + originalBuffer.length;

    const metadata = await sharp(fileBuffer).metadata();

    const updatedImage = await prisma.productImage.update({
      where: { id: productImage.id },
      data: {
        thumbKey,
        mediumKey,
        largeKey,
        originalKey,
        thumbUrl,
        mediumUrl,
        largeUrl,
        originalUrl,
        sizeBytes: totalBytes,
        width: metadata.width,
        height: metadata.height,
        status: "active",
      },
    });

    // Update tenant storage
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        usedStorageBytes: { increment: totalBytes },
        imageCount: { increment: 1 },
      },
    });

    return updatedImage;
  } catch (error) {
    await prisma.productImage.update({
      where: { id: productImage.id },
      data: { status: "failed" },
    });
    throw error;
  }
}

export async function deleteProductImage(prisma: PrismaClient, productImage: any) {
  if (productImage.thumbKey) await deleteObjectFromR2(productImage.thumbKey);
  if (productImage.mediumKey) await deleteObjectFromR2(productImage.mediumKey);
  if (productImage.largeKey) await deleteObjectFromR2(productImage.largeKey);
  if (productImage.originalKey) await deleteObjectFromR2(productImage.originalKey);

  await prisma.productImage.update({
    where: { id: productImage.id },
    data: {
      status: "deleted",
      deletedAt: new Date(),
    },
  });

  if (productImage.sizeBytes && productImage.sizeBytes > 0) {
    // Only decrement if we can fetch tenant (might need extra select or update by tenantId)
    await prisma.tenant.update({
      where: { id: productImage.tenantId },
      data: {
        usedStorageBytes: { decrement: productImage.sizeBytes },
        imageCount: { decrement: 1 },
      },
    });
  }
}
