import { Express, Request, Response } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { processAndUploadProductImage, deleteProductImage } from "../services/productImageService";

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
        return res.status(403).json({ success: false, message: "Product not found or forbidden." });
      }

      const updatedImage = await processAndUploadProductImage(prisma, {
        tenantId: req.user.tenantId,
        productId: req.params.productId,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });

      return res.json({ success: true, image: updatedImage });
    } catch (error: any) {
      console.error("R2 upload error:", error);
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
        return res.status(403).json({ success: false, message: "Image not found or forbidden." });
      }

      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId, tenantId: req.user.tenantId },
          data: { isMain: false },
        }),
        prisma.productImage.update({ where: { id: imageId }, data: { isMain: true } }),
      ]);

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
        return res.status(403).json({ success: false, message: "Image not found or forbidden." });
      }

      await deleteProductImage(prisma, image);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Image delete failed." });
    }
  });
}
