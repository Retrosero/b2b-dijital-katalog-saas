import { Express, Request, Response } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { processAndUploadProductImage, deleteProductImage } from "../services/productImageService";
import { writeRequestAuditLog } from "../services/auditLogService";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported format. Only JPEG, PNG and WEBP are allowed."));
  },
});

export function addProductImageRoutes(app: Express, prisma: PrismaClient, requireAuth: any) {
  app.post("/api/products/:productId/images", requireAuth, upload.single("image"), async (req: Request, res: Response): Promise<any> => {
    if (!req.file) return res.status(400).json({ success: false, message: "File is required." });

    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      if (!tenant) return res.status(401).json({ success: false, message: "Unauthorized tenant." });

      if (tenant.storageLimitBytes && tenant.usedStorageBytes + req.file.size > tenant.storageLimitBytes) {
        return res.status(400).json({ success: false, message: "Storage quota exceeded." });
      }

      const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
      if (!product || product.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "product",
          action: "unauthorized_image_upload",
          entityType: "Product",
          entityId: req.params.productId,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized product image upload attempt.",
          metadata: { productId: req.params.productId, file: { mimeType: req.file.mimetype, size: req.file.size } }
        });
        return res.status(403).json({ success: false, message: "Product not found or forbidden." });
      }

      const existingImageCount = await prisma.productImage.count({
        where: { productId: req.params.productId, tenantId: req.user.tenantId, status: "active" }
      });
      if (existingImageCount >= 10) {
        return res.status(400).json({ success: false, message: "Bir ürüne en fazla 10 adet fotoğraf yükleyebilirsiniz." });
      }

      const updatedImage = await processAndUploadProductImage(prisma, {
        tenantId: req.user.tenantId,
        productId: req.params.productId,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });

      await writeRequestAuditLog(prisma, req, {
        module: "product",
        action: "image_upload",
        entityType: "ProductImage",
        entityId: updatedImage.id,
        entityName: product.name,
        status: "success",
        severity: "info",
        description: "Product image uploaded.",
        metadata: { productId: product.id, imageId: updatedImage.id, mimeType: req.file.mimetype, sizeBytes: req.file.size }
      });

      return res.json({ success: true, image: updatedImage });
    } catch (error: any) {
      console.error("R2 upload error:", error);
      await writeRequestAuditLog(prisma, req, {
        module: "system",
        action: "storage_error",
        entityType: "Product",
        entityId: req.params.productId,
        status: "failed",
        severity: "error",
        description: "Product image upload failed.",
        metadata: { error: error?.message || "Unknown upload error", code: error?.name || error?.code || "UPLOAD_ERROR" }
      });
      return res.status(500).json({
        success: false,
        message: "Image upload failed.",
        error: error?.message || "Unknown upload error",
        code: error?.name || error?.code || "UPLOAD_ERROR",
        hint: "Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.",
      });
    }
  });

  app.get("/api/products/:productId/images", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const images = await prisma.productImage.findMany({
        where: {
          productId: req.params.productId,
          tenantId: req.user.tenantId,
          status: "active",
        },
        orderBy: { sortOrder: "asc" },
      });
      res.json({ success: true, images });
    } catch (error) {
      res.status(500).json({ success: false, message: "Images could not be fetched." });
    }
  });

  app.patch("/api/products/:productId/images/:imageId/main", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const { productId, imageId } = req.params;
      const image = await prisma.productImage.findUnique({ where: { id: imageId } });
      if (!image || image.tenantId !== req.user.tenantId || image.productId !== productId) {
        await writeRequestAuditLog(prisma, req, {
          module: "product",
          action: "unauthorized_image_main_update",
          entityType: "ProductImage",
          entityId: imageId,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized product main image update attempt.",
          metadata: { productId, imageId }
        });
        return res.status(403).json({ success: false, message: "Image not found or forbidden." });
      }

      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId, tenantId: req.user.tenantId },
          data: { isMain: false },
        }),
        prisma.productImage.update({ where: { id: imageId }, data: { isMain: true } }),
      ]);

      await writeRequestAuditLog(prisma, req, {
        module: "product",
        action: "image_set_main",
        entityType: "ProductImage",
        entityId: imageId,
        status: "success",
        severity: "info",
        description: "Product main image updated.",
        metadata: { productId, imageId }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Main image update failed." });
    }
  });

  app.delete("/api/products/:productId/images/:imageId", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const { productId, imageId } = req.params;
      const image = await prisma.productImage.findUnique({ where: { id: imageId } });
      if (!image || image.tenantId !== req.user.tenantId || image.productId !== productId) {
        await writeRequestAuditLog(prisma, req, {
          module: "product",
          action: "unauthorized_image_delete",
          entityType: "ProductImage",
          entityId: imageId,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized product image delete attempt.",
          metadata: { productId, imageId }
        });
        return res.status(403).json({ success: false, message: "Image not found or forbidden." });
      }

      await deleteProductImage(prisma, image);
      await writeRequestAuditLog(prisma, req, {
        module: "product",
        action: "image_delete",
        entityType: "ProductImage",
        entityId: image.id,
        status: "success",
        severity: "warning",
        description: "Product image deleted.",
        metadata: { productId, imageId: image.id, sizeBytes: image.sizeBytes, keys: { originalKey: image.originalKey, thumbKey: image.thumbKey, mediumKey: image.mediumKey, largeKey: image.largeKey } }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Image delete failed." });
    }
  });

  // URL ile Görsel Ekleme
  app.post("/api/products/:productId/images/url", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, message: "Görsel URL'si zorunludur." });

      const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
      if (!product || product.tenantId !== req.user.tenantId) {
        return res.status(403).json({ success: false, message: "Ürün bulunamadı." });
      }

      // Check image limit (max 10)
      const existingImageCount = await prisma.productImage.count({
        where: { productId: req.params.productId, tenantId: req.user.tenantId, status: "active" }
      });
      if (existingImageCount >= 10) {
        return res.status(400).json({ success: false, message: "Bir ürüne en fazla 10 adet fotoğraf yükleyebilirsiniz." });
      }

      const isMain = existingImageCount === 0;

      const newImage = await prisma.productImage.create({
        data: {
          tenantId: req.user.tenantId,
          productId: req.params.productId,
          imageId: randomUUID(),
          mimeType: "image/jpeg",
          isMain,
          status: "active",
          sortOrder: existingImageCount,
          originalUrl: url,
          thumbUrl: url,
          mediumUrl: url,
          largeUrl: url
        }
      });

      await writeRequestAuditLog(prisma, req, {
        module: "product",
        action: "image_url_add",
        entityType: "ProductImage",
        entityId: newImage.id,
        entityName: product.name,
        status: "success",
        severity: "info",
        description: "Product image URL added.",
        metadata: { productId: product.id, imageId: newImage.id, url }
      });

      return res.json({ success: true, image: newImage });
    } catch (error: any) {
      console.error("URL image save error:", error);
      return res.status(500).json({ success: false, message: "Görsel URL kaydı başarısız oldu." });
    }
  });
}
