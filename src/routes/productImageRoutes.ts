import { Express, Request, Response } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { processAndUploadProductImage, deleteProductImage } from "../services/productImageService";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Desteklenmeyen dosya formatı. Sadece JPEG, PNG ve WEBP."));
    }
  },
});

export function addProductImageRoutes(
  app: Express,
  prisma: PrismaClient,
  requireAuth: any
) {
  app.post("/api/products/:productId/images", requireAuth, upload.single("image"), async (req: Request, res: Response): Promise<any> => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Dosya bulunamadı." });
    }

    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      if (!tenant) return res.status(401).json({ success: false, message: "Yetkisiz" });

      if (tenant.storageLimitBytes && tenant.usedStorageBytes + req.file.size > tenant.storageLimitBytes) {
        return res.status(400).json({ success: false, message: "Medya alanı kotanız dolmuştur." });
      }

      const product = await prisma.product.findUnique({
        where: { id: req.params.productId },
      });

      if (!product || product.tenantId !== req.user.tenantId) {
        return res.status(403).json({ success: false, message: "Ürün bulunamadı veya yetkiniz yok." });
      }

      const updatedImage = await processAndUploadProductImage(prisma, {
        tenantId: req.user.tenantId,
        productId: req.params.productId,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });

      res.json({ success: true, image: updatedImage });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: "Yükleme sırasında hata oluştu.", error: error.message });
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
      res.status(500).json({ success: false, message: "Görseller getirilemedi." });
    }
  });

  app.patch("/api/products/:productId/images/:imageId/main", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const { productId, imageId } = req.params;

      const image = await prisma.productImage.findUnique({ where: { id: imageId } });
      if (!image || image.tenantId !== req.user.tenantId || image.productId !== productId) {
        return res.status(403).json({ success: false, message: "Görsel bulunamadı veya yetkiniz yok." });
      }

      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId, tenantId: req.user.tenantId },
          data: { isMain: false },
        }),
        prisma.productImage.update({
          where: { id: imageId },
          data: { isMain: true },
        }),
      ]);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Ana görsel ayarlanamadı." });
    }
  });

  app.delete("/api/products/:productId/images/:imageId", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const { productId, imageId } = req.params;

      const image = await prisma.productImage.findUnique({ where: { id: imageId } });
      if (!image || image.tenantId !== req.user.tenantId || image.productId !== productId) {
        return res.status(403).json({ success: false, message: "Görsel bulunamadı veya yetkiniz yok." });
      }

      await deleteProductImage(prisma, image);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Silme sırasında hata oluştu." });
    }
  });
}
