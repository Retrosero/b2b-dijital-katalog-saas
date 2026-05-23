import { Express, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeAuditLog, writeRequestAuditLog } from "./services/auditLogService";

export function addApiRoutes(
  app: Express,
  prisma: PrismaClient,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void
) {
  // Generate sequential order number per tenant: SIP-1, SIP-2, SIP-3...
  const generateOrderNumber = async (prisma: PrismaClient, tenantId: string) => {
    const sipOrders = await prisma.order.findMany({
      where: {
        tenantId,
        orderNumber: { startsWith: "SIP-" }
      },
      select: { orderNumber: true }
    });

    let maxNumber = 0;
    for (const order of sipOrders) {
      const match = order.orderNumber.match(/^SIP-(\d+)$/);
      if (!match) continue;
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }

    return `SIP-${maxNumber + 1}`;
  };

  const isOrderNumberUniqueError = (error: any) => {
    if (!error || error.code !== "P2002") return false;
    const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(",") : String(error?.meta?.target || "");
    const message = String(error?.message || "");
    return target.includes("orderNumber") || message.includes("Order_orderNumber_key");
  };

  const withOrderNumberRetry = async (
    tenantId: string,
    operation: (orderNumber: string) => Promise<any>,
    maxAttempts = 5
  ) => {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const orderNumber = await generateOrderNumber(prisma, tenantId);
      try {
        return await operation(orderNumber);
      } catch (error: any) {
        if (!isOrderNumberUniqueError(error) || attempt === maxAttempts) {
          throw error;
        }
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 15));
      }
    }
    throw lastError || new Error("Sipariş numarası üretilemedi.");
  };

  const estimateTenantUsageBytes = async (tenantId: string) => {
    const [imageAgg, metricsRows] = await Promise.all([
      prisma.productImage.aggregate({
        _sum: { sizeBytes: true },
        where: { tenantId, status: "active", deletedAt: null }
      }),
      prisma.$queryRaw<any[]>`
        SELECT
          (
            SELECT COUNT(*) FROM Product WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COUNT(*) FROM Category WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COUNT(*) FROM Brand WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COUNT(*) FROM Catalog WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COUNT(*) FROM Customer WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COUNT(*) FROM \`Order\` WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COUNT(*) FROM User WHERE tenantId = ${tenantId}
          ) AS totalRows,
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(name,'')) +
              LENGTH(COALESCE(description,'')) +
              LENGTH(COALESCE(barcode,'')) +
              LENGTH(COALESCE(sku,'')) +
              LENGTH(COALESCE(packagingType,''))
            ), 0) FROM Product WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(name,''))
            ), 0) FROM Category WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(name,'')) +
              LENGTH(COALESCE(imageUrl,''))
            ), 0) FROM Brand WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(name,'')) +
              LENGTH(COALESCE(description,'')) +
              LENGTH(COALESCE(slug,''))
            ), 0) FROM Catalog WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(name,'')) +
              LENGTH(COALESCE(email,'')) +
              LENGTH(COALESCE(phone,'')) +
              LENGTH(COALESCE(address,'')) +
              LENGTH(COALESCE(username,'')) +
              LENGTH(COALESCE(categoryDiscounts,''))
            ), 0) FROM Customer WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(orderNumber,'')) +
              LENGTH(COALESCE(status,'')) +
              LENGTH(COALESCE(paymentType,'')) +
              LENGTH(COALESCE(notes,'')) +
              LENGTH(COALESCE(logisticsCompany,''))
            ), 0) FROM \`Order\` WHERE tenantId = ${tenantId}
          ) +
          (
            SELECT COALESCE(SUM(
              LENGTH(COALESCE(name,'')) +
              LENGTH(COALESCE(email,'')) +
              LENGTH(COALESCE(role,'')) +
              LENGTH(COALESCE(allowedPages,'')) +
              LENGTH(COALESCE(customerAccess,'')) +
              LENGTH(COALESCE(fastSalesSettings,''))
            ), 0) FROM User WHERE tenantId = ${tenantId}
          ) AS textBytes
      `
    ]);

    const row = metricsRows?.[0] || { totalRows: 0, textBytes: 0 };
    const imageBytes = Number(imageAgg._sum.sizeBytes || 0);
    const textBytes = Number(row.textBytes || 0);
    const totalRows = Number(row.totalRows || 0);
    const rowOverheadBytes = totalRows * 180;
    return Math.max(0, Math.round(imageBytes + textBytes + rowOverheadBytes));
  };

  const slugify = (input: string) =>
    String(input || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  const createUniqueCatalogSlug = async (baseName: string) => {
    const base = slugify(baseName) || `katalog-${Date.now()}`;
    let slug = base;
    let counter = 1;
    while (await prisma.catalog.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  };
  // --- TENANTS ---
  app.get("/api/tenants", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response) => {
    const tenants = await prisma.tenant.findMany({
      include: { _count: { select: { users: true } } }
    });
    res.json(tenants);
  });

  app.post("/api/tenants", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, adminName, adminEmail, adminPassword, planName } = req.body;
    try {
      const tenantName = String(name || "").trim();
      const email = String(adminEmail || "").trim().toLowerCase();
      const password = String(adminPassword || "");
      const resolvedAdminName = String(adminName || "").trim() || (email.includes("@") ? email.split("@")[0] : "Tenant Admin");

      if (!tenantName || !email || !password) {
        return res.status(400).json({ error: "Eksik bilgi" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      let storageLimit = 5 * 1024 * 1024 * 1024; // 5GB
      if (planName === "Premium" || planName === "Pro") storageLimit = 20 * 1024 * 1024 * 1024;
      if (planName === "Enterprise") storageLimit = 100 * 1024 * 1024 * 1024;
      
      const tenant = await prisma.tenant.create({
        data: {
          name,
          planName: planName || "Starter",
          storageLimitBytes: storageLimit,
          users: {
            create: {
              name: resolvedAdminName,
              email,
              passwordHash,
              role: "TENANT_ADMIN"
            }
          }
        }
      });
      res.json(tenant);
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(400).json({ error: "Bu e-posta zaten kullanÃ„Â±mda." });
      }
      res.status(400).json({ error: e?.message || "Firma oluÃ…Å¸turulamadÃ„Â±." });
    }
  });

  // --- PRODUCTS ---
  app.get("/api/products", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return res.json([]);
      if (!req.user?.tenantId) return res.status(400).json({ error: "Tenant bilgisi bulunamadÄ±." });

      const products = await prisma.product.findMany({
        where: { tenantId: req.user.tenantId },
        include: {
          category: true,
          brand: true,
          images: { where: { status: "active" }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] }
        }
      });
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "ÃœrÃ¼nler alÄ±namadÄ±." });
    }
  });

  app.get("/api/products/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return res.json(null);
      if (!req.user?.tenantId) return res.status(400).json({ error: "Tenant bilgisi bulunamadÄ±." });

      const product = await prisma.product.findFirst({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: {
          category: true,
          brand: true,
          images: { where: { status: "active" }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
          orderItems: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  createdAt: true,
                  status: true,
                  customer: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      });
      if (!product) return res.status(404).json({ error: "Not found" });
      const salesHistory = (product.orderItems || [])
        .filter((item: any) => item?.order && item.order.status !== "CANCELLED")
        .map((item: any) => ({
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
          orderDate: item.order.createdAt,
          customerId: item.order.customer?.id || null,
          customerName: item.order.customer?.name || "Bilinmeyen Müşteri",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: Number(item.quantity || 0) * Number(item.unitPrice || 0)
        }))
        .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      res.json({ ...product, salesHistory });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "ÃœrÃ¼n bulunamadÄ±." });
    }
  });

  app.post("/api/products", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const { name, price, costPrice, stock, stockThreshold, categoryId, brandId, barcode, sku, description, piecesPerBox, packagingType } = req.body;
      const cleanName = String(name || "").trim();
      const cleanCategoryId = String(categoryId || "").trim();
      const cleanBrandId = String(brandId || "").trim();
      const parsedPrice = Number(price);
      const parsedCostPrice = costPrice !== undefined && costPrice !== null && String(costPrice).trim() !== "" ? Number(costPrice) : null;
      const parsedStock = 0; // Forced to 0 because stocks must only be added via Purchase Invoices
      const parsedThreshold = stockThreshold !== undefined ? Number(stockThreshold) : 10;
      const parsedPiecesPerBox = piecesPerBox !== undefined && piecesPerBox !== null && String(piecesPerBox) !== ""
        ? Number(piecesPerBox)
        : null;

      if (!cleanName) return res.status(400).json({ error: "ÃƒÅ“rÃƒÂ¼n adÃ„Â± zorunludur." });
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return res.status(400).json({ error: "GeÃƒÂ§erli bir fiyat giriniz." });
      if (!Number.isFinite(parsedStock) || parsedStock < 0) return res.status(400).json({ error: "GeÃƒÂ§erli bir stok giriniz." });
      if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) return res.status(400).json({ error: "GeÃƒÂ§erli bir stok eÃ…Å¸iÃ„Å¸i giriniz." });
      if (parsedPiecesPerBox !== null && (!Number.isFinite(parsedPiecesPerBox) || parsedPiecesPerBox <= 0)) {
        return res.status(400).json({ error: "Koli adedi 1 veya daha bÃƒÂ¼yÃƒÂ¼k olmalÃ„Â±dÃ„Â±r." });
      }
      if (!req.user?.tenantId) return res.status(400).json({ error: "KullanÃ„Â±cÃ„Â± tenant bilgisi eksik. Tekrar giriÃ…Å¸ yapÃ„Â±n." });

      if (cleanCategoryId) {
        const category = await prisma.category.findFirst({
          where: { id: cleanCategoryId, tenantId: req.user.tenantId },
          select: { id: true }
        });
        if (!category) return res.status(400).json({ error: "SeÃƒÂ§ilen kategori bulunamadÃ„Â±." });
      }

      if (cleanBrandId) {
        const brand = await prisma.brand.findFirst({
          where: { id: cleanBrandId, tenantId: req.user.tenantId },
          select: { id: true }
        });
        if (!brand) return res.status(400).json({ error: "SeÃƒÂ§ilen marka bulunamadÃ„Â±." });
      }

      const product = await prisma.product.create({
        data: {
          name: cleanName,
          price: parsedPrice,
          costPrice: parsedCostPrice,
          stock: Math.floor(parsedStock),
          stockThreshold: Math.floor(parsedThreshold),
          barcode: barcode || null,
          sku: sku || null,
          description: description || null,
          piecesPerBox: parsedPiecesPerBox === null ? null : Math.floor(parsedPiecesPerBox),
          packagingType: packagingType || null,
          tenant: { connect: { id: req.user.tenantId } },
          ...(cleanCategoryId ? { category: { connect: { id: cleanCategoryId } } } : {}),
          ...(cleanBrandId ? { brand: { connect: { id: cleanBrandId } } } : {})
        }
      });
      await writeRequestAuditLog(prisma, req, {
        module: "product",
        action: "create",
        entityType: "Product",
        entityId: product.id,
        entityName: product.name,
        status: "success",
        severity: "info",
        description: "Product created.",
        metadata: { product: { id: product.id, name: product.name, price: product.price, stock: product.stock, categoryId: product.categoryId, brandId: product.brandId } }
      });
      res.json(product);
    } catch (e: any) {
      console.error("[ProductCreateError]", e);
      res.status(500).json({
        error: e?.message || "ÃƒÅ“rÃƒÂ¼n oluÃ…Å¸turulamadÃ„Â±.",
        code: e?.code || null
      });
    }
  });

  app.get("/api/tenants/:id", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: { users: true }
      });
      res.json(tenant);
    } catch(e) {
      res.status(500).json({ error: "Hata" });
    }
  });

  app.get("/api/tenants/:id/storage", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.id },
        select: { id: true, planName: true, usedStorageBytes: true, storageLimitBytes: true }
      });
      if (!tenant) return res.status(404).json({ error: "Firma bulunamadÄ±." });

      const computedUsedBytes = await estimateTenantUsageBytes(tenant.id);
      const limitBytes = Number(tenant.storageLimitBytes || 0);
      const usageRatio = limitBytes > 0 ? computedUsedBytes / limitBytes : 0;

      res.json({
        tenantId: tenant.id,
        planName: tenant.planName,
        usedBytes: computedUsedBytes,
        limitBytes,
        usedMb: computedUsedBytes / (1024 * 1024),
        limitGb: limitBytes / (1024 * 1024 * 1024),
        usageRatio,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Kota bilgisi hesaplanamadÄ±." });
    }
  });

  // Keep this before /api/tenants/:id so "settings" is not treated as a tenant id.
  app.put("/api/tenants/settings", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const { orderMode, banks, showInvoiceKdv } = req.body;

      if (!req.user?.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true, tenantId: true, isActive: true }
      });
      if (!dbUser || !dbUser.isActive || dbUser.role !== "TENANT_ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const tenantId = (req.user?.tenantId as string | undefined) || dbUser.tenantId || undefined;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant bilgisi bulunamadÄ±. LÃ¼tfen tekrar giriÅŸ yapÄ±n." });
      }

      const updateData: any = {};
      if (orderMode !== undefined) {
        if (orderMode !== "UNIT" && orderMode !== "BOX") {
          return res.status(400).json({ error: "GeÃ§ersiz sipariÅŸ satÄ±ÅŸ tipi." });
        }
        updateData.orderMode = orderMode;
      }
      if (banks !== undefined) {
        if (!Array.isArray(banks)) {
          return res.status(400).json({ error: "GeÃ§ersiz banka listesi formatÄ±." });
        }
        updateData.banks = JSON.stringify(banks);
      }
      if (showInvoiceKdv !== undefined) {
        updateData.showInvoiceKdv = Boolean(showInvoiceKdv);
      }

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: updateData
      });
      res.json(tenant);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/tenants/:id", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, planName, licenseExpiresAt, modules, isActive, storageLimitBytes } = req.body;
    try {
      const tenant = await prisma.tenant.update({
        where: { id: req.params.id },
        data: {
          name,
          planName,
          licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
          modules: modules ? JSON.stringify(modules) : null,
          isActive,
          storageLimitBytes: storageLimitBytes ? parseFloat(storageLimitBytes) : null
        }
      });
      res.json(tenant);
    } catch(e) {
      res.status(500).json({ error: "Hata oluÃ…Å¸tu." });
    }
  });

  app.post("/api/tenants/:id/users", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, email, password, role } = req.body;
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role || "SALES_USER",
          tenantId: req.params.id
        }
      });
      res.json(user);
    } catch(e: any) {
      if (e.code === 'P2002') return res.status(400).json({ error: "E-posta zaten kullanÃ„Â±mda." });
      res.status(500).json({ error: "KayÃ„Â±t hatasÃ„Â±." });
    }
  });

app.put("/api/products/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    const { name, price, costPrice, stock, stockThreshold, categoryId, brandId, barcode, sku, description, piecesPerBox, packagingType } = req.body;
    
    // Check old product
    const oldProduct = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!oldProduct || oldProduct.tenantId !== req.user.tenantId) {
       await writeRequestAuditLog(prisma, req, {
         module: "product",
         action: "unauthorized_update",
         entityType: "Product",
         entityId: req.params.id,
         status: "blocked",
         severity: "warning",
         description: "Unauthorized product update attempt.",
         metadata: { productId: req.params.id }
       });
       return res.status(403).json({ error: "Yetkisiz iYlem" });
    }

    const newStock = oldProduct.stock; // Locked to existing stock value, no direct edits allowed
    const parsedCostPrice = costPrice !== undefined && costPrice !== null && String(costPrice).trim() !== "" ? parseFloat(costPrice) : null;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        price: parseFloat(price),
        costPrice: parsedCostPrice,
        stock: newStock,
        stockThreshold: stockThreshold !== undefined ? parseInt(stockThreshold) : oldProduct.stockThreshold,
        barcode: barcode || null,
        sku: sku || null,
        description: description || null,
        piecesPerBox: piecesPerBox ? parseInt(piecesPerBox) : null,
        packagingType: packagingType || null,
        categoryId: categoryId || null,
        brandId: brandId || null,
      }
    });

    if (product.stockThreshold !== null && newStock <= product.stockThreshold && oldProduct.stock > oldProduct.stockThreshold!) {
         await prisma.notification.create({
             data: {
                 tenantId: req.user.tenantId,
                 message: `Dikkat: ${product.name} Ã¼rÃ¼nÃ¼nÃ¼n stok seviyesi kritik dÃ¼zeyde (${newStock}).`,
                 type: "LOW_STOCK"
             }
         });
    }

    await writeRequestAuditLog(prisma, req, {
      module: "product",
      action: "update",
      entityType: "Product",
      entityId: product.id,
      entityName: product.name,
      status: "success",
      severity: oldProduct.price !== product.price || oldProduct.stock !== product.stock ? "warning" : "info",
      description: "Product updated.",
      metadata: {
        changes: {
          price: oldProduct.price !== product.price ? { from: oldProduct.price, to: product.price } : undefined,
          stock: oldProduct.stock !== product.stock ? { from: oldProduct.stock, to: product.stock } : undefined,
          stockThreshold: oldProduct.stockThreshold !== product.stockThreshold ? { from: oldProduct.stockThreshold, to: product.stockThreshold } : undefined
        }
      }
    });
    res.json(product);
  });

  // --- IMAGE REORDERING ---
  app.put("/api/products/:id/images/reorder", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { imageIds } = req.body; // array of image ids
    if (!Array.isArray(imageIds)) return res.status(400).json({ error: "Invalid data" });

    try {
      const product = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product || product.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      await prisma.$transaction(
        imageIds.map((id, index) =>
          prisma.productImage.update({
            where: { id },
            data: { sortOrder: index }
          })
        )
      );

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "GÃƒÂ¶rsel sÃ„Â±rasÃ„Â± gÃƒÂ¼ncellenemedi." });
    }
  });

  // --- NOTIFICATIONS ---
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);

    const visibilityWhere: any = { tenantId: req.user.tenantId };
    if (req.user.role === "SALES_USER") {
       visibilityWhere.OR = [
         { userId: req.user.userId },
         { userId: null }
       ];
    }

    const whereClause: any = { ...visibilityWhere };
    const { page, limit, search, type, isRead, dateFrom, dateTo } = req.query;
    const isPaginatedRequest = Boolean(page || limit || search || type || isRead || dateFrom || dateTo);

    if (search && String(search).trim()) {
      whereClause.message = { contains: String(search).trim() };
    }
    if (type && String(type) !== "ALL") {
      whereClause.type = String(type);
    }
    if (isRead === "true" || isRead === "false") {
      whereClause.isRead = isRead === "true";
    }
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) {
        const to = new Date(String(dateTo));
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }

    if (isPaginatedRequest) {
      const pageNumber = Math.max(1, Number(page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(limit || 20)));
      const [total, items] = await Promise.all([
        prisma.notification.count({ where: whereClause }),
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: (pageNumber - 1) * pageSize,
          take: pageSize
        })
      ]);

      return res.json({
        items,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  });

  app.put("/api/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return res.json({ success: true, count: 0 });
      const whereClause: any = { tenantId: req.user.tenantId, isRead: false };
      if (req.user.role === "SALES_USER") {
        whereClause.OR = [
          { userId: req.user.userId },
          { userId: null }
        ];
      }

      const result = await prisma.notification.updateMany({
        where: whereClause,
        data: { isRead: true }
      });
      res.json({ success: true, count: result.count });
    } catch(e) {
      res.status(400).json({ error: "GÃƒÂ¼ncellenemedi." });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return res.json({ success: true });
      const whereClause: any = { id: req.params.id, tenantId: req.user.tenantId };
      if (req.user.role === "SALES_USER") {
        whereClause.OR = [
          { userId: req.user.userId },
          { userId: null }
        ];
      }

      await prisma.notification.updateMany({
        where: whereClause,
        data: { isRead: true }
      });
      res.json({ success: true });
    } catch(e) {
      res.status(400).json({ error: "GÃƒÂ¼ncellenemedi." });
    }
  });

  // --- CATALOGS ---
  app.get("/api/catalogs", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);
    const catalogs = await prisma.catalog.findMany({
      where: { tenantId: req.user.tenantId },
      include: { _count: { select: { items: true } }, customer: true }
    });
    res.json(catalogs);
  });

  app.post("/api/catalogs", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    const { name, slug, description, customerId } = req.body;
    try {
      if (!name || !String(name).trim()) return res.status(400).json({ error: "Katalog adÃ„Â± zorunludur." });
      const finalSlug = slug && String(slug).trim() ? slugify(String(slug)) : await createUniqueCatalogSlug(String(name));
      const catalog = await prisma.catalog.create({
        data: {
          name,
          slug: finalSlug,
          description,
          customerId: customerId || null,
          tenantId: req.user.tenantId
        }
      });
      await writeRequestAuditLog(prisma, req, {
        module: "catalog",
        action: "create",
        entityType: "Catalog",
        entityId: catalog.id,
        entityName: catalog.name,
        status: "success",
        severity: "info",
        description: "Catalog created.",
        metadata: { catalog: { id: catalog.id, name: catalog.name, slug: catalog.slug, customerId: catalog.customerId, isActive: catalog.isActive } }
      });
      res.json(catalog);
    } catch (e: any) {
      res.status(400).json({ error: "Slug kullanÃ„Â±lÃ„Â±yor veya eksik bilgi." });
    }
  });

  app.get("/api/catalogs/:id", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json(null);
    const catalog = await prisma.catalog.findUnique({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: {
        customer: true,
        items: {
          include: {
            product: { include: { images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] }, category: true, brand: true } }
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    if(!catalog) return res.status(404).json({error: "Not found"});
    res.json(catalog);
  });

  app.put("/api/catalogs/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, description, slug, customerId, isActive } = req.body;
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "catalog",
          action: "unauthorized_update",
          entityType: "Catalog",
          entityId: req.params.id,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized catalog update attempt.",
          metadata: { catalogId: req.params.id }
        });
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }
      let finalSlug = catalog.slug;
      if (slug && String(slug).trim()) {
        finalSlug = slugify(String(slug));
      } else if (name && String(name).trim() && String(name).trim() !== catalog.name) {
        finalSlug = await createUniqueCatalogSlug(String(name));
      }
      const updated = await prisma.catalog.update({
        where: { id: req.params.id },
        data: {
          name: name ?? catalog.name,
          description: description ?? catalog.description,
          slug: finalSlug,
          customerId: customerId === undefined ? catalog.customerId : (customerId || null),
          isActive: isActive === undefined ? catalog.isActive : !!isActive
        }
      });
      await writeRequestAuditLog(prisma, req, {
        module: "catalog",
        action: "update",
        entityType: "Catalog",
        entityId: updated.id,
        entityName: updated.name,
        status: "success",
        severity: "info",
        description: "Catalog updated.",
        metadata: { before: { name: catalog.name, slug: catalog.slug, customerId: catalog.customerId, isActive: catalog.isActive }, after: { name: updated.name, slug: updated.slug, customerId: updated.customerId, isActive: updated.isActive } }
      });
      res.json(updated);
    } catch (e: any) {
      if (e.code === "P2002") return res.status(400).json({ error: "Bu slug zaten kullanÃ„Â±lÃ„Â±yor." });
      res.status(400).json({ error: "Katalog gÃƒÂ¼ncellenemedi." });
    }
  });

  app.delete("/api/catalogs/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "catalog",
          action: "unauthorized_delete",
          entityType: "Catalog",
          entityId: req.params.id,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized catalog delete attempt.",
          metadata: { catalogId: req.params.id }
        });
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }
      await prisma.catalog.delete({ where: { id: req.params.id } });
      await writeRequestAuditLog(prisma, req, {
        module: "catalog",
        action: "delete",
        entityType: "Catalog",
        entityId: catalog.id,
        entityName: catalog.name,
        status: "success",
        severity: "warning",
        description: "Catalog deleted.",
        metadata: { catalog: { id: catalog.id, name: catalog.name, slug: catalog.slug, customerId: catalog.customerId } }
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Katalog silinemedi." });
    }
  });

  app.put("/api/catalogs/:id/items/bulk-price", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { items } = req.body; // array of { id, customPrice }
    if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid data" });

    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      await prisma.$transaction(
        items.map(item =>
          prisma.catalogItem.update({
            where: { id: item.id },
            data: { customPrice: item.customPrice !== undefined && item.customPrice !== null && String(item.customPrice).trim() !== "" ? parseFloat(String(item.customPrice)) : null }
          })
        )
      );

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Fiyatlar gÃƒÂ¼ncellenemedi." });
    }
  });

  app.put("/api/catalogs/:id/reorder", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { items } = req.body; // array of { id, order }
    if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid data" });

    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      await prisma.$transaction(
        items.map(item =>
          prisma.catalogItem.update({
            where: { id: item.id },
            data: { order: item.order }
          })
        )
      );

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "SÃ„Â±ralama gÃƒÂ¼ncellenemedi." });
    }
  });

  // --- ORDERS ---
  app.get("/api/orders", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);
    
    // Check user permissions
    let whereClause: any = { tenantId: req.user.tenantId };
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user?.role === "SALES_USER" && user.customerAccess === "OWN") {
      whereClause.customer = { assignedUserId: user.id };
    }
    
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  });

  app.post("/api/orders", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { customerId, items, totalAmount, paymentType, bankName, notes } = req.body;
try {
      if (!req.user?.tenantId) {
        return res.status(400).json({ error: "Tenant bilgisi eksik. Lütfen tekrar giriş yapın." });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Sipariş için en az bir ürün eklenmelidir." });
      }

      const normalizedItems = items.map((i: any) => ({
        productId: String(i?.productId || "").trim(),
        quantity: Math.floor(Number(i?.quantity)),
        unitPrice: Number(i?.unitPrice),
        note: i?.note || null
      }));
      if (normalizedItems.some((i: any) => !i.productId || !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unitPrice) || i.unitPrice < 0)) {
        return res.status(400).json({ error: "Sipariş ürünleri geçersiz. Ürün, adet ve birim fiyat bilgilerini kontrol edin." });
      }

      const productIds = Array.from(new Set(normalizedItems.map((i: any) => i.productId)));
      const existingProducts = await prisma.product.findMany({
        where: { tenantId: req.user.tenantId, id: { in: productIds } },
        select: { id: true }
      });
      if (existingProducts.length !== productIds.length) {
        return res.status(400).json({ error: "Siparişte geçersiz ürün(ler) var." });
      }

      if (customerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: customerId, tenantId: req.user.tenantId },
          select: { id: true }
        });
        if (!customer) {
          return res.status(400).json({ error: "Seçilen müşteri bulunamadı." });
        }
      }

      const parsedTotalAmount = Number(totalAmount);
      const safeTotalAmount = Number.isFinite(parsedTotalAmount)
        ? parsedTotalAmount
        : normalizedItems.reduce((sum: number, i: any) => sum + i.quantity * i.unitPrice, 0);

      const initialStatus = "PENDING";
      const order = await withOrderNumberRetry(req.user.tenantId, async (orderNumber) =>
        prisma.order.create({
          data: {
            orderNumber,
            totalAmount: safeTotalAmount,
            paymentType,
            bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? (bankName || null) : null,
            notes,
            tenantId: req.user.tenantId,
            customerId: customerId || null,
            status: initialStatus,
            items: {
              create: normalizedItems.map((i: any) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                note: i.note || null
              }))
            }
          }
        })
      );
      
      // Stock decrement ... etc ...
      for (const item of normalizedItems) {
         const product = await prisma.product.findUnique({ where: { id: item.productId } });
         if (product) {
             const qty = Number(item.quantity) || 0;
             const newStock = product.stock - qty;
             await prisma.product.update({ 
                 where: { id: product.id }, 
                 data: { stock: newStock } 
             });
             if (product.stockThreshold !== null && newStock <= product.stockThreshold) {
                 await prisma.notification.create({
                     data: {
                         tenantId: req.user.tenantId,
                         message: `Dikkat: ${product.name} Ã¼rÃ¼nÃ¼nÃ¼n stok seviyesi kritik dÃ¼zeyde (${newStock}).`,
                         type: "LOW_STOCK"
                     }
                 });
             }
         }
      }

      const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
      if (customer) {
        await prisma.notification.create({
          data: {
            tenantId: req.user.tenantId,
            message: `Yeni SipariÅŸ: ${customer.name} tarafÄ±ndan ${totalAmount} TL tutarÄ±nda sipariÅŸ verildi. (SipariÅŸ No: ${order.orderNumber})`,
            type: "NEW_ORDER",
            userId: customer.assignedUserId || null
          }
        });
      }
      
      await writeRequestAuditLog(prisma, req, {
        module: "order",
        action: "create",
        entityType: "Order",
        entityId: order.id,
        entityName: order.orderNumber,
        status: "success",
        severity: "info",
        description: "Fast sales order created.",
        metadata: { orderNumber: order.orderNumber, customerId, totalAmount, paymentType, itemCount: Array.isArray(items) ? items.length : 0 }
      });
      res.json(order);
    } catch (e: any) {
      console.error("[OrderCreateError]", {
        code: e?.code || null,
        message: e?.message || null,
        meta: e?.meta || null
      });
      if (isOrderNumberUniqueError(e)) {
        return res.status(409).json({ error: "Sipariş numarası çakıştı. Lütfen tekrar deneyin." });
      }
      res.status(500).json({ error: e?.message || "Sipariş oluşturulamadı." });
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json(null);
    const order = await prisma.order.findUnique({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { 
        customer: true, 
        items: { include: { product: { include: { images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } } } } 
      }
    });
    if(!order) return res.status(404).json({error: "Not found"});
    res.json(order);
  });

  // --- CATEGORIES & BRANDS ---
  app.get("/api/categories", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json({ categories: [], brands: [] });
    
    // Get all categories
    const allCategories = await prisma.category.findMany({ 
      where: { tenantId: req.user.tenantId }
    });
    
    // Build recursive tree structure
    const buildTree = (parentId: string | null): any[] => {
      return allCategories
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    };
    
    const brands = await prisma.brand.findMany({ where: { tenantId: req.user.tenantId } });
    res.json({ categories: buildTree(null), brands });
  });

  app.post("/api/categories", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    const { name, parentId } = req.body;
    const category = await prisma.category.create({
      data: {
        name,
        parentId: parentId || null,
        tenantId: req.user.tenantId
      }
    });
    res.json(category);
  });

  app.put("/api/categories/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, parentId } = req.body;
    try {
      const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      if (parentId && parentId === req.params.id) return res.status(400).json({ error: "Kategori kendisini ebeveyn yapamaz." });
      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: { name: name ?? existing.name, parentId: parentId === undefined ? existing.parentId : (parentId || null) }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: "Kategori gÃƒÂ¼ncellenemedi." });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      await prisma.category.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Kategori silinemedi. Alt kategori veya baÃ„Å¸lÃ„Â± ÃƒÂ¼rÃƒÂ¼n olabilir." });
    }
  });

  app.get("/api/brands", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      if (req.user.role === "SUPER_ADMIN") return res.json([]);
      const brands = await prisma.brand.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { name: "asc" }
      });
      res.json(brands);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Markalar alÄ±namadÄ±." });
    }
  });

  app.post("/api/brands", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    const { name, imageUrl } = req.body;
    const brand = await prisma.brand.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        tenantId: req.user.tenantId
      }
    });
    res.json(brand);
  });

  app.put("/api/brands/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, imageUrl } = req.body;
    try {
      const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      const updated = await prisma.brand.update({
        where: { id: req.params.id },
        data: { name: name ?? existing.name, imageUrl: imageUrl === undefined ? existing.imageUrl : (imageUrl || null) }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: "Marka gÃƒÂ¼ncellenemedi." });
    }
  });

  app.delete("/api/brands/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      await prisma.brand.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Marka silinemedi. BaÃ„Å¸lÃ„Â± ÃƒÂ¼rÃƒÂ¼n olabilir." });
    }
  });

  // --- CUSTOMERS ---
  app.get("/api/customers", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);
    
    // Check user permissions
    let whereClause: any = { tenantId: req.user.tenantId };
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user?.role === "SALES_USER" && user.customerAccess === "OWN") {
      whereClause.assignedUserId = user.id;
    }
    
    const customers = await prisma.customer.findMany({ 
      where: whereClause,
      include: {
        assignedUser: { select: { id: true, name: true } },
        orders: { select: { totalAmount: true } },
        collections: { select: { amount: true } }
      }
    });
    res.json(customers.map((customer: any) => {
      const debit = customer.orders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);
      const credit = customer.collections.reduce((sum: number, col: any) => sum + (Number(col.amount) || 0), 0);
      return {
        ...customer,
        balance: debit - credit
      };
    }));
  });

  app.get("/api/customers/:id", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json(null);
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { 
        assignedUser: { select: { id: true, name: true } },
        tenant: { include: { catalogs: { where: { isActive: true }, take: 1 } } },
        orders: {
          include: { 
            items: { include: { product: { include: { images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } } } } }
          },
          orderBy: { createdAt: 'desc' }
        },
        collections: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!customer) return res.status(404).json({ error: "MÃ¼ÅŸteri bulunamadÄ±" });
    const debit = customer.orders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);
    const credit = customer.collections.reduce((sum: number, col: any) => sum + (Number(col.amount) || 0), 0);
    res.json({
      ...customer,
      balance: debit - credit
    });
  });

  app.post("/api/customers", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, email, phone, address, username, password, discountRate, discount2, discount3, discount4, discount5, categoryDiscounts, assignedUserId } = req.body;
    try {
      const passwordHash = password ? await bcrypt.hash(password, 10) : null;
      const customer = await prisma.customer.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          username: username || null,
          passwordHash,
          discountRate: discountRate ? parseFloat(discountRate) : 0,
          discount2: discount2 ? parseFloat(discount2) : 0,
          discount3: discount3 ? parseFloat(discount3) : 0,
          discount4: discount4 ? parseFloat(discount4) : 0,
          discount5: discount5 ? parseFloat(discount5) : 0,
          categoryDiscounts: categoryDiscounts ? JSON.stringify(categoryDiscounts) : null,
          tenantId: req.user.tenantId,
          assignedUserId: assignedUserId || null
        }
      });
      await writeRequestAuditLog(prisma, req, {
        module: "customer",
        action: "create",
        entityType: "Customer",
        entityId: customer.id,
        entityName: customer.name,
        status: "success",
        severity: "info",
        description: "Customer created.",
        metadata: { customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, username: customer.username, assignedUserId: customer.assignedUserId } }
      });
      res.json(customer);
    } catch(e: any) {
      if (e.code === 'P2002') return res.status(400).json({error: "KullanÃ„Â±cÃ„Â± adÃ„Â± zaten kullanÃ„Â±mda."});
      res.status(500).json({error: "KayÃ„Â±t oluÃ…Å¸turulurken bir hata oluÃ…Å¸tu."});
    }
  });

  app.put("/api/customers/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, email, phone, address, username, password, discountRate, discount2, discount3, discount4, discount5, categoryDiscounts, assignedUserId } = req.body;
    try {
      const customer = await prisma.customer.findUnique({where: {id: req.params.id}});
      if(!customer || customer.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "customer",
          action: "unauthorized_update",
          entityType: "Customer",
          entityId: req.params.id,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized customer update attempt.",
          metadata: { customerId: req.params.id }
        });
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      const dataToUpdate: any = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        username: username || null,
        assignedUserId: assignedUserId === "" ? null : assignedUserId
      };

      if (discountRate !== undefined) dataToUpdate.discountRate = parseFloat(discountRate || "0");
      if (discount2 !== undefined) dataToUpdate.discount2 = parseFloat(discount2 || "0");
      if (discount3 !== undefined) dataToUpdate.discount3 = parseFloat(discount3 || "0");
      if (discount4 !== undefined) dataToUpdate.discount4 = parseFloat(discount4 || "0");
      if (discount5 !== undefined) dataToUpdate.discount5 = parseFloat(discount5 || "0");
      if (categoryDiscounts !== undefined) dataToUpdate.categoryDiscounts = categoryDiscounts ? JSON.stringify(categoryDiscounts) : null;

      if (password && password.trim() !== "") {
        dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
      }

      const updated = await prisma.customer.update({
        where: { id: req.params.id },
        data: dataToUpdate,
        include: { assignedUser: { select: { id: true, name: true } } }
      });

      await writeRequestAuditLog(prisma, req, {
        module: "customer",
        action: "update",
        entityType: "Customer",
        entityId: updated.id,
        entityName: updated.name,
        status: "success",
        severity: password && password.trim() !== "" ? "warning" : "info",
        description: "Customer updated.",
        metadata: { customer: { id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, username: updated.username, assignedUserId: updated.assignedUserId }, passwordChanged: Boolean(password && password.trim() !== "") }
      });
      res.json(updated);
    } catch(e: any) {
      if (e.code === 'P2002') return res.status(400).json({error: "KullanÃ„Â±cÃ„Â± adÃ„Â± zaten kullanÃ„Â±mda."});
      res.status(500).json({error: "GÃƒÂ¼ncelleme sÃ„Â±rasÃ„Â±nda bir hata oluÃ…Å¸tu."});
    }
  });

  // --- USERS ---
  app.get("/api/users", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);
    const users = await prisma.user.findMany({ 
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, email: true, role: true, allowedPages: true, customerAccess: true, fastSalesSettings: true, isActive: true } 
    });
    res.json(users);
  });
  
  app.put("/api/users/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { allowedPages, customerAccess, role, fastSalesSettings } = req.body;
    try {
      const updated = await prisma.user.update({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        data: { allowedPages, customerAccess, role, fastSalesSettings }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: "KullanÃ„Â±cÃ„Â± gÃƒÂ¼ncellenemedi." });
    }
  });
  
  app.put("/api/users/:id/fast-sales-settings", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { fastSalesSettings } = req.body;
    try {
      // Users can update their own settings
      if (req.user.userId !== req.params.id && req.user.role !== "TENANT_ADMIN") {
         return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }
      const updated = await prisma.user.update({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        data: { fastSalesSettings }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: "Ayarlar gÃƒÂ¼ncellenemedi." });
    }
  });

  app.post("/api/catalogs/:id/items", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { productId, customPrice, items } = req.body;
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      if (items && Array.isArray(items)) {
        const existingItems = await prisma.catalogItem.findMany({
          where: { catalogId: catalog.id }
        });
        const existingProductIds = existingItems.map((i: any) => i.productId);
        
        const itemsToCreate = items
          .filter((i: any) => !existingProductIds.includes(i.productId))
          .map((i: any) => ({
            catalogId: catalog.id,
            productId: i.productId,
            order: existingItems.length,
            customPrice: i.customPrice ? parseFloat(i.customPrice) : null
          }));

        if (itemsToCreate.length > 0) {
          await prisma.catalogItem.createMany({
            data: itemsToCreate
          });
        }
        return res.json({ success: true });
      }

      const item = await prisma.catalogItem.create({
        data: {
          catalogId: catalog.id,
          productId,
          customPrice: customPrice ? parseFloat(customPrice) : null
        }
      });
      res.json(item);
    } catch(e: any) {
      res.status(400).json({ error: "ÃƒÅ“rÃƒÂ¼n zaten ekli olabilir veya geÃƒÂ§ersiz bilgi." });
    }
  });

  app.put("/api/catalogs/:id/items/:itemId", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { customPrice } = req.body;
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      const item = await prisma.catalogItem.update({
        where: { id: req.params.itemId },
        data: {
          customPrice: customPrice !== undefined && customPrice !== null && String(customPrice).trim() !== "" ? parseFloat(customPrice) : null
        }
      });
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ error: "ÃƒÅ“rÃƒÂ¼n gÃƒÂ¼ncellenemedi." });
    }
  });

  app.delete("/api/catalogs/:id/items/:itemId", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÃ…Å¸lem" });
      }

      await prisma.catalogItem.delete({
        where: { id: req.params.itemId }
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "ÃƒÅ“rÃƒÂ¼n silinemedi." });
    }
  });

  app.put("/api/orders/:id/pick-complete", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { pickedItems, logisticsCompany, boxCount } = req.body as {
      pickedItems: Array<{ itemId: string; pickedQuantity: number }>;
      logisticsCompany?: string;
      boxCount?: number | string;
    };

    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: true }
      });
      if (!order || order.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "order",
          action: "unauthorized_pick_complete",
          entityType: "Order",
          entityId: req.params.id,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized order picking attempt.",
          metadata: { orderId: req.params.id }
        });
        return res.status(403).json({ error: "Yetkisiz" });
      }
      if (!Array.isArray(pickedItems) || pickedItems.length === 0) {
        return res.status(400).json({ error: "Toplanan ÃƒÂ¼rÃƒÂ¼n bilgisi zorunludur." });
      }

      const pickedMap = new Map(pickedItems.map((p) => [p.itemId, Number(p.pickedQuantity) || 0]));

      let newTotalAmount = 0;
      const updateOps: any[] = [];
      const deleteOps: any[] = [];

      for (const item of order.items) {
        const requestedQty = pickedMap.has(item.id) ? pickedMap.get(item.id)! : item.quantity;
        const clampedQty = Math.max(0, Math.min(item.quantity, requestedQty));
        if (clampedQty === 0) {
          deleteOps.push(prisma.orderItem.delete({ where: { id: item.id } }));
        } else {
          updateOps.push(prisma.orderItem.update({ where: { id: item.id }, data: { quantity: clampedQty } }));
          newTotalAmount += clampedQty * Number(item.unitPrice);
        }
      }

      if (newTotalAmount <= 0) {
        return res.status(400).json({ error: "En az bir ÃƒÂ¼rÃƒÂ¼n iÃƒÂ§in pozitif adet girilmelidir." });
      }

      await prisma.$transaction([
        ...updateOps,
        ...deleteOps,
        prisma.order.update({
          where: { id: order.id },
          data: {
            totalAmount: newTotalAmount,
            status: "SHIPPED",
            logisticsCompany: logisticsCompany !== undefined ? logisticsCompany : order.logisticsCompany,
            boxCount: boxCount !== undefined && boxCount !== null && String(boxCount).trim() !== "" ? parseInt(String(boxCount), 10) : order.boxCount,
          }
        }),
      ]);

      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        include: { customer: true, items: { include: { product: true } } }
      });

      if (updated) {
        await prisma.notification.create({
          data: {
            tenantId: updated.tenantId,
            message: `${updated.orderNumber} sipariÅŸi toplama sonrasÄ± ${updated.boxCount || "-"} koli olarak sevk edildi.`,
            type: "ORDER_SHIPPED"
          }
        });
        await writeRequestAuditLog(prisma, req, {
          module: "order",
          action: "pick_complete",
          entityType: "Order",
          entityId: updated.id,
          entityName: updated.orderNumber,
          status: "success",
          severity: "warning",
          description: "Order picking completed.",
          metadata: { orderNumber: updated.orderNumber, previousStatus: order.status, status: updated.status, itemCount: updated.items.length, logisticsCompany: updated.logisticsCompany, boxCount: updated.boxCount }
        });
      }

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: "SipariÃ…Å¸ toplama iÃ…Å¸lemi tamamlanamadÃ„Â±." });
    }
  });

  app.put("/api/orders/:id/status", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { status, logisticsCompany, boxCount } = req.body;
    try {
      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order || order.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "order",
          action: "unauthorized_status_update",
          entityType: "Order",
          entityId: req.params.id,
          status: "blocked",
          severity: "warning",
          description: "Unauthorized order status update attempt.",
          metadata: { orderId: req.params.id, requestedStatus: status }
        });
        return res.status(403).json({ error: "Yetkisiz" });
      }
      
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: status || order.status,
          logisticsCompany: logisticsCompany !== undefined ? logisticsCompany : order.logisticsCompany,
          boxCount: boxCount !== undefined ? parseInt(boxCount) : order.boxCount,
        }
      });
      
      if (status === "SHIPPED" && order.status !== "SHIPPED") {
        await prisma.notification.create({
          data: {
            tenantId: order.tenantId,
            message: `${updated.orderNumber} numaralÄ± sipariÅŸ ${updated.logisticsCompany} ambarÄ±na (${updated.boxCount} koli) teslim edildi.`,
            type: "ORDER_SHIPPED"
          }
        });
      }

      await writeRequestAuditLog(prisma, req, {
        module: "order",
        action: "status_update",
        entityType: "Order",
        entityId: updated.id,
        entityName: updated.orderNumber,
        status: "success",
        severity: order.status !== updated.status ? "warning" : "info",
        description: "Order status updated.",
        metadata: { orderNumber: updated.orderNumber, previousStatus: order.status, status: updated.status, logisticsCompany: updated.logisticsCompany, boxCount: updated.boxCount }
      });

      res.json(updated);
    } catch(e) {
      res.status(500).json({ error: "SipariÃ…Å¸ gÃƒÂ¼ncellenemedi." });
    }
  });

  // --- PUBLIC / CUSTOMER CATALOGS ---
  app.get("/api/public/catalogs/:slug", async (req: Request, res: Response): Promise<any> => {
    const catalog = await prisma.catalog.findUnique({
      where: { slug: req.params.slug },
      include: {
        tenant: true,
        items: {
          include: {
            product: {
              include: { category: true, brand: true, images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } }
            }
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });

    if (!catalog || !catalog.isActive || catalog.customerId) {
      return res.status(404).json({ error: "Katalog bulunamadÃ„Â±" });
    }

    res.json(catalog);
  });

  app.get("/api/customer/catalogs/:slug", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.user?.customerId || !req.user?.tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const customer = await prisma.customer.findFirst({
        where: { id: req.user.customerId, tenantId: req.user.tenantId },
        select: { id: true, name: true, email: true, phone: true, username: true, discountRate: true, tenantId: true }
      });
      if (!customer) return res.status(401).json({ error: "Unauthorized" });

      const catalog = await prisma.catalog.findUnique({
        where: { slug: req.params.slug },
        include: {
          tenant: true,
          customer: { select: { id: true, name: true, email: true, phone: true, discountRate: true } },
          items: {
            include: {
              product: {
                include: { category: true, brand: true, images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } }
              }
            },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
          }
        }
      });

      if (!catalog || !catalog.isActive) return res.status(404).json({ error: "Katalog bulunamadÃ„Â±" });
      if (catalog.tenantId !== req.user.tenantId) {
        await writeRequestAuditLog(prisma, req, {
          module: "catalog",
          action: "unauthorized_customer_catalog_access",
          entityType: "Catalog",
          entityId: catalog.id,
          entityName: catalog.name,
          status: "blocked",
          severity: "warning",
          description: "Customer attempted to access another tenant catalog.",
          metadata: { slug: req.params.slug, catalogTenantId: catalog.tenantId }
        });
        return res.status(403).json({ error: "Yetkisiz eriÃ…Å¸im" });
      }
      if (catalog.customerId && catalog.customerId !== req.user.customerId) {
        await writeRequestAuditLog(prisma, req, {
          module: "catalog",
          action: "unauthorized_customer_catalog_access",
          entityType: "Catalog",
          entityId: catalog.id,
          entityName: catalog.name,
          status: "blocked",
          severity: "warning",
          description: "Customer attempted to access a catalog assigned to another customer.",
          metadata: { slug: req.params.slug, catalogCustomerId: catalog.customerId, requesterCustomerId: req.user.customerId }
        });
        return res.status(403).json({ error: "Yetkisiz eriÃ…Å¸im" });
      }

      if (!catalog.customerId) {
        (catalog as any).customer = customer;
      }

      res.json(catalog);
    } catch (e: any) {
      res.status(500).json({ error: "Katalog alÃ„Â±namadÃ„Â±." });
    }
  });

  const createOrderFromCatalog = async ({
    catalogId,
    customerInput,
    orderItems,
    notes,
    authenticatedCustomerId,
    authenticatedTenantId
  }: {
    catalogId: string;
    customerInput?: any;
    orderItems: any[];
    notes?: string;
    authenticatedCustomerId?: string;
    authenticatedTenantId?: string;
  }) => {
    if (!catalogId) throw Object.assign(new Error("Katalog bilgisi zorunludur."), { statusCode: 400 });
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      throw Object.assign(new Error("SipariÃ…Å¸ ÃƒÂ¼rÃƒÂ¼nleri zorunludur."), { statusCode: 400 });
    }

    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
      include: { items: { include: { product: true } } }
    });

    if (!catalog || !catalog.isActive) throw Object.assign(new Error("Katalog bulunamadÃ„Â±."), { statusCode: 404 });
    if (authenticatedTenantId && catalog.tenantId !== authenticatedTenantId) {
      throw Object.assign(new Error("Yetkisiz iÃ…Å¸lem."), { statusCode: 403 });
    }
    if (catalog.customerId && catalog.customerId !== authenticatedCustomerId) {
      throw Object.assign(new Error("Bu katalog iÃƒÂ§in mÃƒÂ¼Ã…Å¸teri giriÃ…Å¸i zorunludur."), { statusCode: authenticatedCustomerId ? 403 : 401 });
    }

    let cust = null;
    if (authenticatedCustomerId) {
      cust = await prisma.customer.findFirst({ where: { id: authenticatedCustomerId, tenantId: catalog.tenantId } });
      if (!cust) throw Object.assign(new Error("MÃƒÂ¼Ã…Å¸teri bulunamadÃ„Â±."), { statusCode: 403 });
    } else {
      if (catalog.customerId) {
        throw Object.assign(new Error("Bu katalog iÃƒÂ§in mÃƒÂ¼Ã…Å¸teri giriÃ…Å¸i zorunludur."), { statusCode: 401 });
      }
      if (!customerInput?.name || !customerInput?.email) {
        throw Object.assign(new Error("MÃƒÂ¼Ã…Å¸teri bilgileri zorunludur."), { statusCode: 400 });
      }
      cust = await prisma.customer.findFirst({ where: { email: customerInput.email, tenantId: catalog.tenantId } });
      if (!cust) {
        cust = await prisma.customer.create({
          data: {
            name: customerInput.name,
            email: customerInput.email,
            phone: customerInput.phone,
            tenantId: catalog.tenantId
          }
        });
      }
    }

    const catalogItemsByProductId = new Map(catalog.items.map((item: any) => [item.productId, item]));
    const normalizedItems = orderItems.map((item: any) => {
      const catalogItem: any = catalogItemsByProductId.get(item.productId);
      if (!catalogItem || catalogItem.product.tenantId !== catalog.tenantId) {
        throw Object.assign(new Error("GeÃƒÂ§ersiz ÃƒÂ¼rÃƒÂ¼n."), { statusCode: 400 });
      }
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
      const unitPrice = Number(catalogItem.customPrice ?? catalogItem.product.price);
      return { productId: catalogItem.productId, quantity, unitPrice, note: item.note || null, product: catalogItem.product };
    });

    const tenantId = catalog.tenantId;
    const totalAmount = normalizedItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const createdOrder = await withOrderNumberRetry(tenantId, async (orderNumber) =>
      prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            totalAmount,
            notes,
            tenantId,
            customerId: cust?.id || null,
            items: {
              create: normalizedItems.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                note: item.note || null
              }))
            }
          }
        });

        await tx.notification.create({
          data: {
            tenantId,
            userId: cust?.assignedUserId || null,
            message: `Yeni sipariÅŸ oluÅŸturuldu: ${orderNumber} (${cust?.name || 'Bilinmeyen MÃ¼ÅŸteri'})`,
            type: "NEW_ORDER"
          }
        });

        for (const item of normalizedItems) {
          const newStock = item.product.stock - item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock }
          });

          if (item.product.stockThreshold !== null && newStock <= item.product.stockThreshold) {
            await tx.notification.create({
              data: {
                tenantId,
                message: `Dikkat: ${item.product.name} Ã¼rÃ¼nÃ¼nÃ¼n stok seviyesi kritik dÃ¼zeyde (${newStock}). SipariÅŸ No: ${orderNumber}`,
                type: "LOW_STOCK"
              }
            });
          }
        }
        return order;
      })
    );

    await writeAuditLog(prisma, {
      tenantId,
      userId: null,
      userName: cust?.name || null,
      userRole: authenticatedCustomerId ? "CUSTOMER" : "PUBLIC",
      module: "order",
      action: authenticatedCustomerId ? "customer_catalog_order_create" : "public_catalog_order_create",
      entityType: "Order",
      entityName: createdOrder.orderNumber,
      status: "success",
      severity: "info",
      description: "Catalog order created.",
      metadata: {
        orderNumber: createdOrder.orderNumber,
        catalogId,
        customerId: cust?.id || null,
        totalAmount,
        itemCount: normalizedItems.length,
        authenticated: Boolean(authenticatedCustomerId)
      }
    });

    return { success: true, orderNumber: createdOrder.orderNumber };
  };

  app.post("/api/public/orders", async (req: Request, res: Response): Promise<any> => {
    const { catalogId, customer, items, notes } = req.body;
    try {
      const result = await createOrderFromCatalog({
        catalogId,
        customerInput: customer,
        orderItems: items,
        notes
      });
      res.json(result);
    } catch(e: any) {
      res.status(e?.statusCode || 500).json({ error: e?.message || "SipariÃ…Å¸ oluÃ…Å¸turulamadÃ„Â±." });
    }
  });

  app.post("/api/customer/orders", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { catalogId, items, notes } = req.body;
    try {
      if (!req.user?.customerId || !req.user?.tenantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await createOrderFromCatalog({
        catalogId,
        orderItems: items,
        notes,
        authenticatedCustomerId: req.user.customerId,
        authenticatedTenantId: req.user.tenantId
      });
      res.json(result);
    } catch(e: any) {
      res.status(e?.statusCode || 500).json({ error: e?.message || "SipariÃ…Å¸ oluÃ…Å¸turulamadÃ„Â±." });
    }
  });

  // --- AUDIT LOGS (Super Admin Only) ---
  app.get("/api/admin/audit-logs", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const {
        search,
        tenantId,
        userId,
        module,
        action,
        severity,
        status,
        dateFrom,
        dateTo,
        page,
        limit
      } = req.query;

      const whereClause: any = {};

      // Search filter
      if (search && String(search).trim()) {
        const searchTerm = String(search).trim();
        whereClause.OR = [
          { description: { contains: searchTerm } },
          { entityName: { contains: searchTerm } },
          { userName: { contains: searchTerm } }
        ];
      }

      // Tenant filter
      if (tenantId && String(tenantId) !== "ALL") {
        whereClause.tenantId = String(tenantId);
      }

      // User filter
      if (userId && String(userId) !== "ALL") {
        whereClause.userId = String(userId);
      }

      // Module filter
      if (module && String(module) !== "ALL") {
        whereClause.module = String(module);
      }

      // Action filter
      if (action && String(action) !== "ALL") {
        whereClause.action = String(action);
      }

      // Severity filter
      if (severity && String(severity) !== "ALL") {
        whereClause.severity = String(severity);
      }

      // Status filter
      if (status && String(status) !== "ALL") {
        whereClause.status = String(status);
      }

      // Date range filter
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt.gte = new Date(String(dateFrom));
        if (dateTo) {
          const to = new Date(String(dateTo));
          to.setHours(23, 59, 59, 999);
          whereClause.createdAt.lte = to;
        }
      }

      const pageNumber = Math.max(1, Number(page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(limit || 20)));

      const [total, items, tenants, users] = await Promise.all([
        prisma.auditLog.count({ where: whereClause }),
        prisma.auditLog.findMany({
          where: whereClause,
          include: {
            tenant: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (pageNumber - 1) * pageSize,
          take: pageSize
        }),
        prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { role: { not: "SUPER_ADMIN" } },
          select: { id: true, name: true, email: true, tenantId: true },
          orderBy: { name: 'asc' }
        })
      ]);

      // Get unique modules and actions for filters
      const [uniqueModules, uniqueActions] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          select: { module: true },
          distinct: ['module'],
          orderBy: { module: 'asc' }
        }),
        prisma.auditLog.findMany({
          where: module && String(module) !== "ALL" ? { module: String(module) } : whereClause,
          select: { action: true },
          distinct: ['action'],
          orderBy: { action: 'asc' }
        })
      ]);

      res.json({
        items,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        filters: {
          tenants: tenants.map(t => ({ id: t.id, name: t.name })),
          users: users.map(u => ({ id: u.id, name: u.name, email: u.email, tenantId: u.tenantId })),
          modules: uniqueModules.map(m => m.module).filter(Boolean),
          actions: uniqueActions.map(a => a.action).filter(Boolean)
        }
      });
    } catch (e: any) {
      console.error("[AuditLogsError]", e);
      res.status(500).json({ error: e?.message || "Audit loglar alÄ±namadÄ±." });
    }
  });

  // GET tenants list for filter (Super Admin)
  app.get("/api/admin/tenants", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
      res.json(tenants);
    } catch (e: any) {
      res.status(500).json({ error: "Tenantlar alÄ±namadÄ±." });
    }
  });

  // GET users list for filter (Super Admin)
  app.get("/api/admin/users", requireAuth, requireRole(["SUPER_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        where: { role: { not: "SUPER_ADMIN" } },
        select: { id: true, name: true, email: true, tenantId: true },
        orderBy: { name: 'asc' }
      });
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: "KullanÄ±cÄ±lar alÄ±namadÄ±." });
    }
  });

  // --- COLLECTION RECEIPT NUMBER GENERATOR ---
  const generateReceiptNumber = async (prismaClient: any, tenantId: string) => {
    const collections = await prismaClient.collection.findMany({
      where: {
        tenantId,
        receiptNumber: { startsWith: "TAH-" }
      },
      select: { receiptNumber: true }
    });

    let maxNumber = 0;
    for (const col of collections) {
      const match = col.receiptNumber.match(/^TAH-(\d+)$/);
      if (!match) continue;
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }

    return `TAH-${maxNumber + 1}`;
  };

  // --- COLLECTIONS ---
  app.get("/api/collections", requireAuth, async (req: Request, res: Response) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return res.json([]);
      const { customerId, paymentType, search, page, limit } = req.query;
      
      const whereClause: any = { tenantId: req.user.tenantId };
      if (customerId) {
        whereClause.customerId = String(customerId);
      }
      if (paymentType && paymentType !== "ALL") {
        whereClause.paymentType = String(paymentType);
      }
      if (search && String(search).trim()) {
        whereClause.OR = [
          { receiptNumber: { contains: String(search).trim() } },
          { notes: { contains: String(search).trim() } },
          { customer: { name: { contains: String(search).trim() } } }
        ];
      }

      const pageNumber = Math.max(1, Number(page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(limit || 20)));

      const [total, items] = await Promise.all([
        prisma.collection.count({ where: whereClause }),
        prisma.collection.findMany({
          where: whereClause,
          include: { customer: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          skip: (pageNumber - 1) * pageSize,
          take: pageSize
        })
      ]);

      res.json({
        items,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Tahsilatlar alÄ±namadÄ±." });
    }
  });

  app.post("/api/collections", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      if (req.user.role === "SUPER_ADMIN") {
        return res.status(403).json({ error: "Super admin tahsilat ekleyemez." });
      }
      const { customerId, amount, paymentType, bankName, notes } = req.body;

      if (!customerId) return res.status(400).json({ error: "MÃ¼ÅŸteri seÃ§imi zorunludur." });
      const parsedAmount = parseFloat(String(amount));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "GeÃ§erli bir tutar giriniz." });
      }
      if (!paymentType) return res.status(400).json({ error: "Ã–deme tipi seÃ§imi zorunludur." });

      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId: req.user.tenantId }
      });
      if (!customer) return res.status(400).json({ error: "SeÃ§ilen mÃ¼ÅŸteri bulunamadÄ±." });

      const receiptNumber = await generateReceiptNumber(prisma, req.user.tenantId);

      const collection = await prisma.collection.create({
        data: {
          receiptNumber,
          amount: parsedAmount,
          paymentType,
          bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? (bankName || null) : null,
          notes: notes || null,
          tenantId: req.user.tenantId,
          customerId
        }
      });

      await prisma.notification.create({
        data: {
          tenantId: req.user.tenantId,
          message: `Yeni Tahsilat: ${customer.name} mÃ¼ÅŸterisinden ${parsedAmount} TL tutarÄ±nda Ã¶deme alÄ±ndÄ±. (Makbuz: ${receiptNumber})`,
          type: "NEW_COLLECTION",
          userId: customer.assignedUserId || null
        }
      });

      await writeRequestAuditLog(prisma, req, {
        module: "collection",
        action: "create",
        entityType: "Collection",
        entityId: collection.id,
        entityName: collection.receiptNumber,
        status: "success",
        severity: "info",
        description: "Collection logged successfully.",
        metadata: { receiptNumber, amount: parsedAmount, paymentType, customerId, bankName }
      });

res.json(collection);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Tahsilat kaydedilemedi." });
    }
  });

  app.put("/api/collections/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const collection = await prisma.collection.findUnique({
        where: { id: req.params.id }
      });
      if (!collection || collection.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz işlem veya tahsilat bulunamadı." });
      }

      const { amount, paymentType, bankName, notes } = req.body;
      const parsedAmount = parseFloat(String(amount));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Geçerli bir tutar giriniz." });
      }
      if (!paymentType) return res.status(400).json({ error: "Ödeme tipi seçimi zorunludur." });

      const updated = await prisma.collection.update({
        where: { id: req.params.id },
        data: {
          amount: parsedAmount,
          paymentType,
          bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? (bankName || null) : null,
          notes: notes !== undefined ? notes : collection.notes
        }
      });

      await writeRequestAuditLog(prisma, req, {
        module: "collection",
        action: "update",
        entityType: "Collection",
        entityId: updated.id,
        entityName: updated.receiptNumber,
        status: "success",
        severity: "info",
        description: "Collection updated successfully.",
        metadata: {
          receiptNumber: updated.receiptNumber,
          previousAmount: collection.amount,
          newAmount: updated.amount,
          previousPaymentType: collection.paymentType,
          newPaymentType: paymentType
        }
      });

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Tahsilat güncellenemedi." });
    }
  });

  app.delete("/api/collections/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const collection = await prisma.collection.findUnique({
        where: { id: req.params.id }
      });
      if (!collection || collection.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz işlem veya tahsilat bulunamadı." });
      }

      await prisma.collection.delete({ where: { id: req.params.id } });

      await writeRequestAuditLog(prisma, req, {
        module: "collection",
        action: "delete",
        entityType: "Collection",
        entityId: collection.id,
        entityName: collection.receiptNumber,
        status: "success",
        severity: "warning",
        description: "Collection deleted successfully.",
        metadata: { receiptNumber: collection.receiptNumber, amount: collection.amount }
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Tahsilat silinemedi." });
    }
  });

  // --- UPDATE ORDER & INVOICE STOCK RECONCILIATION ---
  app.put("/api/orders/:id", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const orderId = req.params.id;
    const { customerId, items, paymentType, bankName, notes, status } = req.body;

    try {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!existingOrder || existingOrder.tenantId !== req.user.tenantId) {
        return res.status(404).json({ error: "SipariÅŸ bulunamadÄ± veya yetkiniz yok." });
      }

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "ÃœrÃ¼nler geÃ§ersiz formatta." });
      }

      // Reconcile stock quantities inside a Prisma Transaction
      const result = await prisma.$transaction(async (tx) => {
        const oldItems = existingOrder.items;
        const oldQtyMap = new Map<string, number>();
        for (const item of oldItems) {
          oldQtyMap.set(item.productId, (oldQtyMap.get(item.productId) || 0) + item.quantity);
        }

        const newQtyMap = new Map<string, number>();
        for (const item of items) {
          newQtyMap.set(item.productId, (newQtyMap.get(item.productId) || 0) + item.quantity);
        }

        const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);

        // Reconcile product stock
        for (const pId of allProductIds) {
          const oldQty = oldQtyMap.get(pId) || 0;
          const newQty = newQtyMap.get(pId) || 0;
          const diff = newQty - oldQty;

          if (diff !== 0) {
            const product = await tx.product.findUnique({ where: { id: pId } });
            if (product) {
              const newStock = product.stock - diff;
              if (newStock < 0) {
                throw new Error(`${product.name} iÃ§in yetersiz stok! (Mevcut: ${product.stock}, Talep edilen fark: ${diff})`);
              }
              await tx.product.update({
                where: { id: pId },
                data: { stock: newStock }
              });

              if (product.stockThreshold !== null && newStock <= product.stockThreshold && product.stock > product.stockThreshold) {
                await tx.notification.create({
                  data: {
                    tenantId: req.user.tenantId,
                    message: `Dikkat: ${product.name} Ã¼rÃ¼nÃ¼nÃ¼n stok seviyesi kritik dÃ¼zeyde (${newStock}).`,
                    type: "LOW_STOCK"
                  }
                });
              }
            }
          }
        }

        // Delete old OrderItems
        await tx.orderItem.deleteMany({
          where: { orderId }
        });

        // Calculate total amount
        const totalAmount = items.reduce((sum: number, i: any) => sum + (i.quantity * i.unitPrice), 0);

        // Re-create new OrderItems
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            customerId: customerId || existingOrder.customerId,
            paymentType: paymentType !== undefined ? paymentType : existingOrder.paymentType,
            bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? (bankName || null) : null,
            notes: notes !== undefined ? notes : existingOrder.notes,
            status: status || existingOrder.status,
            totalAmount,
            items: {
              create: items.map((i: any) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                note: i.note || null
              }))
            }
          },
          include: { items: true }
        });

        return updatedOrder;
      });

      await writeRequestAuditLog(prisma, req, {
        module: "order",
        action: "update",
        entityType: "Order",
        entityId: result.id,
        entityName: result.orderNumber,
        status: "success",
        severity: "info",
        description: "Invoice/Order updated and reconciled successfully.",
        metadata: {
          orderNumber: result.orderNumber,
          oldTotalAmount: existingOrder.totalAmount,
          newTotalAmount: result.totalAmount,
          oldItemCount: existingOrder.items.length,
          newItemCount: result.items.length
        }
      });

      res.json(result);
    } catch (e: any) {
      console.error("[OrderUpdateError]", e);
      res.status(400).json({ error: e.message || "SipariÅŸ gÃ¼ncellenemedi." });
    }
  });

  // --- PURCHASE INVOICES ---
  // Helper to determine if new invoice number is greater than the old one
  const isInvoiceNumberGreater = (newNum: string, oldNum: string): boolean => {
    const extractNumber = (str: string) => {
      const match = str.match(/\d+$/);
      return match ? parseInt(match[0], 10) : null;
    };
    const newDigits = extractNumber(newNum);
    const oldDigits = extractNumber(oldNum);
    if (newDigits !== null && oldDigits !== null) {
      const newPrefix = newNum.replace(/\d+$/, "");
      const oldPrefix = oldNum.replace(/\d+$/, "");
      if (newPrefix === oldPrefix) {
        return newDigits > oldDigits;
      }
    }
    return newNum.localeCompare(oldNum, undefined, { numeric: true }) > 0;
  };

  app.get("/api/purchase-invoices", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const invoices = await prisma.purchaseInvoice.findMany({
        where: { tenantId: req.user.tenantId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, barcode: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      res.json(invoices);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "AlÄ±ÅŸ faturalarÄ± getirilemedi." });
    }
  });

  app.get("/api/purchase-invoices/latest", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const latest = await prisma.purchaseInvoice.findFirst({
        where: { tenantId: req.user.tenantId },
        orderBy: { createdAt: "desc" }
      });
      res.json(latest || null);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Son fatura getirilemedi." });
    }
  });

  app.get("/api/purchase-invoices/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const invoice = await prisma.purchaseInvoice.findFirst({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, barcode: true }
              }
            }
          }
        }
      });
      if (!invoice) return res.status(404).json({ error: "Fatura bulunamadÄ±." });
      res.json(invoice);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Fatura getirilemedi." });
    }
  });

  app.post("/api/purchase-invoices", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { invoiceNumber, supplierName, notes, items, invoiceDate } = req.body;
    
    if (!invoiceNumber || !supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Fatura numarasÄ±, tedarikÃ§i ve fatura kalemleri zorunludur." });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Validate sequential invoice number
        const latestInvoice = await tx.purchaseInvoice.findFirst({
          where: { tenantId: req.user.tenantId },
          orderBy: { createdAt: "desc" }
        });

        if (latestInvoice) {
          const newNumClean = String(invoiceNumber).trim();
          const oldNumClean = latestInvoice.invoiceNumber;
          if (!isInvoiceNumberGreater(newNumClean, oldNumClean)) {
            throw new Error(`Yeni fatura numarasÄ± (${newNumClean}), bir Ã¶nceki fatura numarasÄ±ndan (${oldNumClean}) bÃ¼yÃ¼k olmalÄ±dÄ±r.`);
          }
        }

        const existingItems = items.filter((i: any) => i.productId && i.productId !== "new");
        const productIds = existingItems.map((i: any) => String(i.productId));
        const dbProducts = await tx.product.findMany({
          where: {
            id: { in: productIds },
            tenantId: req.user.tenantId
          }
        });

        if (dbProducts.length !== productIds.length) {
          throw new Error("BazÄ± mevcut Ã¼rÃ¼nler sistemde bulunamadÄ± veya yetkiniz yok.");
        }

        const existing = await tx.purchaseInvoice.findUnique({
          where: {
            tenantId_invoiceNumber: {
              tenantId: req.user.tenantId,
              invoiceNumber: String(invoiceNumber).trim()
            }
          }
        });

        if (existing) {
          throw new Error("Bu fatura numarasÄ± ile daha Ã¶nce bir fatura girilmiÅŸ.");
        }

        let totalAmount = 0;
        const itemsToCreate = [];
        const stockUpdates = [];

        for (const item of items) {
          const qty = parseInt(item.quantity);
          const price = parseFloat(item.unitPrice);
          const taxRate = item.taxRate !== undefined && item.taxRate !== null ? parseFloat(item.taxRate) : 20.0;
          
          if (isNaN(qty) || qty <= 0) throw new Error("Miktar 0'dan bÃ¼yÃ¼k tam sayÄ± olmalÄ±dÄ±r.");
          if (isNaN(price) || price < 0) throw new Error("Birim fiyatÄ± 0 veya daha bÃ¼yÃ¼k olmalÄ±dÄ±r.");
          if (isNaN(taxRate) || taxRate < 0) throw new Error("KDV oranÄ± geÃ§erli bir sayÄ± olmalÄ±dÄ±r.");

          let finalProductId = item.productId;

          // If new product, create it dynamically
          if (!finalProductId || finalProductId === "new") {
            if (!item.productName || !item.productName.trim()) {
              throw new Error("Yeni Ã¼rÃ¼n kalemleri iÃ§in Ã¼rÃ¼n adÄ± girilmelidir.");
            }
            
            const newProd = await tx.product.create({
              data: {
                name: item.productName.trim(),
                price: price * 1.3, // default selling price with markup (30%)
                costPrice: price,
                stock: 0, // initially 0, will be incremented below
                tenantId: req.user.tenantId
              }
            });
            finalProductId = newProd.id;
          }

          totalAmount += qty * price * (1 + taxRate / 100);
          itemsToCreate.push({
            productId: finalProductId,
            quantity: qty,
            unitPrice: price,
            taxRate: taxRate
          });

          stockUpdates.push({
            productId: finalProductId,
            qty,
            price
          });
        }

        const invoiceDateObj = invoiceDate ? new Date(invoiceDate) : new Date();

        const invoice = await tx.purchaseInvoice.create({
          data: {
            invoiceNumber: String(invoiceNumber).trim(),
            supplierName: String(supplierName).trim(),
            notes: notes || null,
            totalAmount,
            tenantId: req.user.tenantId,
            createdAt: invoiceDateObj,
            items: {
              create: itemsToCreate
            }
          },
          include: {
            items: true
          }
        });

        for (const update of stockUpdates) {
          await tx.product.update({
            where: { id: update.productId },
            data: {
              stock: {
                increment: update.qty
              },
              costPrice: update.price
            }
          });
        }

        return invoice;
      });

      await writeRequestAuditLog(prisma, req, {
        module: "purchase_invoice",
        action: "create",
        entityType: "PurchaseInvoice",
        entityId: result.id,
        entityName: result.invoiceNumber,
        status: "success",
        severity: "info",
        description: "Purchase invoice created and stock adjusted.",
        metadata: { invoiceNumber: result.invoiceNumber, supplierName: result.supplierName, totalAmount: result.totalAmount }
      });

      res.json(result);
    } catch (e: any) {
      console.error("[PurchaseInvoiceCreateError]", e);
      res.status(400).json({ error: e.message || "Fatura kaydedilemedi." });
    }
  });

  app.delete("/api/purchase-invoices/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const invoice = await tx.purchaseInvoice.findFirst({
          where: { id: req.params.id, tenantId: req.user.tenantId },
          include: { items: true }
        });

        if (!invoice) {
          throw new Error("Fatura bulunamadÄ±.");
        }

        for (const item of invoice.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (prod) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });
          }
        }

        await tx.purchaseInvoice.delete({
          where: { id: req.params.id }
        });

        return invoice;
      });

      await writeRequestAuditLog(prisma, req, {
        module: "purchase_invoice",
        action: "delete",
        entityType: "PurchaseInvoice",
        entityId: result.id,
        entityName: result.invoiceNumber,
        status: "success",
        severity: "warning",
        description: "Purchase invoice deleted and stock reverted.",
        metadata: { invoiceNumber: result.invoiceNumber, supplierName: result.supplierName, totalAmount: result.totalAmount }
      });

      res.json({ success: true, message: "AlÄ±ÅŸ faturasÄ± silindi ve stoklar geri Ã§ekildi." });
    } catch (e: any) {
      console.error("[PurchaseInvoiceDeleteError]", e);
      res.status(400).json({ error: e.message || "Fatura silinemedi." });
    }
  });

}



