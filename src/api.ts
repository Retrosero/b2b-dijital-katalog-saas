import { Express, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export function addApiRoutes(
  app: Express,
  prisma: PrismaClient,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void
) {
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
        return res.status(400).json({ error: "Bu e-posta zaten kullanÄ±mda." });
      }
      res.status(400).json({ error: e?.message || "Firma oluÅŸturulamadÄ±." });
    }
  });

  // --- PRODUCTS ---
  app.get("/api/products", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);
    const products = await prisma.product.findMany({
      where: { tenantId: req.user.tenantId },
      include: { category: true, brand: true, images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } }
    });
    res.json(products);
  });

  app.get("/api/products/:id", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json(null);
    const product = await prisma.product.findUnique({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { category: true, brand: true, images: { where: { status: "active" }, orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] } }
    });
    if(!product) return res.status(404).json({error: "Not found"});
    res.json(product);
  });

  app.post("/api/products", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    try {
      const { name, price, stock, stockThreshold, categoryId, brandId, barcode, sku, description, piecesPerBox, packagingType } = req.body;
      const cleanName = String(name || "").trim();
      const parsedPrice = Number(price);
      const parsedStock = Number(stock);
      const parsedThreshold = stockThreshold !== undefined ? Number(stockThreshold) : 10;
      const parsedPiecesPerBox = piecesPerBox !== undefined && piecesPerBox !== null && String(piecesPerBox) !== ""
        ? Number(piecesPerBox)
        : null;

      if (!cleanName) return res.status(400).json({ error: "ÃœrÃ¼n adÄ± zorunludur." });
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return res.status(400).json({ error: "GeÃ§erli bir fiyat giriniz." });
      if (!Number.isFinite(parsedStock) || parsedStock < 0) return res.status(400).json({ error: "GeÃ§erli bir stok giriniz." });
      if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) return res.status(400).json({ error: "GeÃ§erli bir stok eÅŸiÄŸi giriniz." });
      if (parsedPiecesPerBox !== null && (!Number.isFinite(parsedPiecesPerBox) || parsedPiecesPerBox <= 0)) {
        return res.status(400).json({ error: "Koli adedi 1 veya daha bÃ¼yÃ¼k olmalÄ±dÄ±r." });
      }
      if (!req.user?.tenantId) return res.status(400).json({ error: "KullanÄ±cÄ± tenant bilgisi eksik. Tekrar giriÅŸ yapÄ±n." });

      const product = await prisma.product.create({
        data: {
          name: cleanName,
          price: parsedPrice,
          stock: Math.floor(parsedStock),
          stockThreshold: Math.floor(parsedThreshold),
          barcode: barcode || null,
          sku: sku || null,
          description: description || null,
          piecesPerBox: parsedPiecesPerBox === null ? null : Math.floor(parsedPiecesPerBox),
          packagingType: packagingType || null,
          categoryId: categoryId || null,
          brandId: brandId || null,
          tenant: { connect: { id: req.user.tenantId } }
        }
      });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "ÃœrÃ¼n oluÅŸturulamadÄ±." });
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
      if (!tenant) return res.status(404).json({ error: "Firma bulunamadı." });

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
      res.status(500).json({ error: e?.message || "Kota bilgisi hesaplanamadı." });
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
      res.status(500).json({ error: "Hata oluÅŸtu." });
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
      if (e.code === 'P2002') return res.status(400).json({ error: "E-posta zaten kullanÄ±mda." });
      res.status(500).json({ error: "KayÄ±t hatasÄ±." });
    }
  });

  // Update tenant settings
  app.put("/api/tenants/settings", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const { orderMode } = req.body;
      const tenant = await prisma.tenant.update({
        where: { id: req.user.tenantId },
        data: { orderMode }
      });
      res.json(tenant);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/products/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response) => {
    const { name, price, stock, stockThreshold, categoryId, brandId, barcode, sku, description, piecesPerBox, packagingType } = req.body;
    
    // Check old product
    const oldProduct = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!oldProduct || oldProduct.tenantId !== req.user.tenantId) {
       return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
    }

    const newStock = parseInt(stock);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        price: parseFloat(price),
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

    res.json(product);
  });

  // --- IMAGE REORDERING ---
  app.put("/api/products/:id/images/reorder", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { imageIds } = req.body; // array of image ids
    if (!Array.isArray(imageIds)) return res.status(400).json({ error: "Invalid data" });

    try {
      const product = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product || product.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
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
      res.status(400).json({ error: "GÃ¶rsel sÄ±rasÄ± gÃ¼ncellenemedi." });
    }
  });

  // --- NOTIFICATIONS ---
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    if (req.user.role === "SUPER_ADMIN") return res.json([]);
    
    let whereClause: any = { tenantId: req.user.tenantId };
    
    if (req.user.role === "SALES_USER") {
       whereClause.OR = [
         { userId: req.user.userId },
         { userId: null }
       ];
    }
    
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const notification = await prisma.notification.updateMany({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        data: { isRead: true }
      });
      res.json({ success: true });
    } catch(e) {
      res.status(400).json({ error: "GÃ¼ncellenemedi." });
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
      if (!name || !String(name).trim()) return res.status(400).json({ error: "Katalog adÄ± zorunludur." });
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
      res.json(catalog);
    } catch (e: any) {
      res.status(400).json({ error: "Slug kullanÄ±lÄ±yor veya eksik bilgi." });
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
      if (!catalog || catalog.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
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
      res.json(updated);
    } catch (e: any) {
      if (e.code === "P2002") return res.status(400).json({ error: "Bu slug zaten kullanÄ±lÄ±yor." });
      res.status(400).json({ error: "Katalog gÃ¼ncellenemedi." });
    }
  });

  app.delete("/api/catalogs/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      await prisma.catalog.delete({ where: { id: req.params.id } });
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
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
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
      res.status(400).json({ error: "Fiyatlar gÃ¼ncellenemedi." });
    }
  });

  app.put("/api/catalogs/:id/reorder", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { items } = req.body; // array of { id, order }
    if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid data" });

    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
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
      res.status(400).json({ error: "SÄ±ralama gÃ¼ncellenemedi." });
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
    const { customerId, items, totalAmount, paymentType, notes } = req.body;
    try {
      const orderNumber = `ORD-${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          orderNumber,
          totalAmount,
          paymentType,
          notes,
          tenantId: req.user.tenantId,
          customerId: customerId || null,
          status: "APPROVED", // Since it's from fast sales, it's directly approved
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice
            }))
          }
        }
      });
      
      // Stock decrement ... etc ...
      for (const item of items) {
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
            message: `Yeni SipariÅŸ: ${customer.name} tarafÄ±ndan ${totalAmount} TL tutarÄ±nda sipariÅŸ verildi. (SipariÅŸ No: ${orderNumber})`,
            type: "NEW_ORDER",
            targetUserId: customer.assignedUserId || null
          }
        });
      }
      
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: "SipariÅŸ oluÅŸturulamadÄ±." });
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
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      if (parentId && parentId === req.params.id) return res.status(400).json({ error: "Kategori kendisini ebeveyn yapamaz." });
      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: { name: name ?? existing.name, parentId: parentId === undefined ? existing.parentId : (parentId || null) }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: "Kategori gÃ¼ncellenemedi." });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      await prisma.category.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Kategori silinemedi. Alt kategori veya baÄŸlÄ± Ã¼rÃ¼n olabilir." });
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
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      const updated = await prisma.brand.update({
        where: { id: req.params.id },
        data: { name: name ?? existing.name, imageUrl: imageUrl === undefined ? existing.imageUrl : (imageUrl || null) }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: "Marka gÃ¼ncellenemedi." });
    }
  });

  app.delete("/api/brands/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      await prisma.brand.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "Marka silinemedi. BaÄŸlÄ± Ã¼rÃ¼n olabilir." });
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
        orders: { select: { totalAmount: true } }
      }
    });
    res.json(customers.map((customer: any) => ({
      ...customer,
      balance: customer.orders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0)
    })));
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
        } 
      }
    });
    if (!customer) return res.status(404).json({ error: "MÃ¼ÅŸteri bulunamadÄ±" });
    res.json(customer);
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
      res.json(customer);
    } catch(e: any) {
      if (e.code === 'P2002') return res.status(400).json({error: "KullanÄ±cÄ± adÄ± zaten kullanÄ±mda."});
      res.status(500).json({error: "KayÄ±t oluÅŸturulurken bir hata oluÅŸtu."});
    }
  });

  app.put("/api/customers/:id", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { name, email, phone, address, username, password, discountRate, discount2, discount3, discount4, discount5, categoryDiscounts, assignedUserId } = req.body;
    try {
      const customer = await prisma.customer.findUnique({where: {id: req.params.id}});
      if(!customer || customer.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
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

      res.json(updated);
    } catch(e: any) {
      if (e.code === 'P2002') return res.status(400).json({error: "KullanÄ±cÄ± adÄ± zaten kullanÄ±mda."});
      res.status(500).json({error: "GÃ¼ncelleme sÄ±rasÄ±nda bir hata oluÅŸtu."});
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
      res.status(500).json({ error: "KullanÄ±cÄ± gÃ¼ncellenemedi." });
    }
  });
  
  app.put("/api/users/:id/fast-sales-settings", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { fastSalesSettings } = req.body;
    try {
      // Users can update their own settings
      if (req.user.userId !== req.params.id && req.user.role !== "TENANT_ADMIN") {
         return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      }
      const updated = await prisma.user.update({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        data: { fastSalesSettings }
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: "Ayarlar gÃ¼ncellenemedi." });
    }
  });

  app.post("/api/catalogs/:id/items", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { productId, customPrice, items } = req.body;
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
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
      res.status(400).json({ error: "ÃœrÃ¼n zaten ekli olabilir veya geÃ§ersiz bilgi." });
    }
  });

  app.put("/api/catalogs/:id/items/:itemId", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    const { customPrice } = req.body;
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      }

      const item = await prisma.catalogItem.update({
        where: { id: req.params.itemId },
        data: {
          customPrice: customPrice !== undefined && customPrice !== null && String(customPrice).trim() !== "" ? parseFloat(customPrice) : null
        }
      });
      res.json(item);
    } catch (e: any) {
      res.status(400).json({ error: "ÃœrÃ¼n gÃ¼ncellenemedi." });
    }
  });

  app.delete("/api/catalogs/:id/items/:itemId", requireAuth, requireRole(["TENANT_ADMIN"]), async (req: Request, res: Response): Promise<any> => {
    try {
      const catalog = await prisma.catalog.findUnique({ where: { id: req.params.id } });
      if (!catalog || catalog.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: "Yetkisiz iÅŸlem" });
      }

      await prisma.catalogItem.delete({
        where: { id: req.params.itemId }
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: "ÃœrÃ¼n silinemedi." });
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
      if (!order || order.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz" });
      if (!Array.isArray(pickedItems) || pickedItems.length === 0) {
        return res.status(400).json({ error: "Toplanan Ã¼rÃ¼n bilgisi zorunludur." });
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
        return res.status(400).json({ error: "En az bir Ã¼rÃ¼n iÃ§in pozitif adet girilmelidir." });
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
      }

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: "SipariÅŸ toplama iÅŸlemi tamamlanamadÄ±." });
    }
  });

  app.put("/api/orders/:id/status", requireAuth, async (req: Request, res: Response): Promise<any> => {
    const { status, logisticsCompany, boxCount } = req.body;
    try {
      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order || order.tenantId !== req.user.tenantId) return res.status(403).json({ error: "Yetkisiz" });
      
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

      res.json(updated);
    } catch(e) {
      res.status(500).json({ error: "SipariÅŸ gÃ¼ncellenemedi." });
    }
  });

  // --- PUBLIC CATALOG (No Auth Required) ---
  app.get("/api/public/catalogs/:slug", async (req: Request, res: Response): Promise<any> => {
    let catalog = await prisma.catalog.findUnique({
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

    if (!catalog || !catalog.isActive) {
      return res.status(404).json({ error: "Katalog bulunamadÄ±" });
    }

    if (!catalog.customer && req.query.customer) {
      const qCustomer = await prisma.customer.findFirst({
        where: { tenantId: catalog.tenantId, username: String(req.query.customer) },
        select: { id: true, name: true, email: true, phone: true, discountRate: true }
      });
      if (qCustomer) {
        catalog.customer = qCustomer as any;
      }
    }

    res.json(catalog);
  });

  app.post("/api/public/orders", async (req: Request, res: Response): Promise<any> => {
    const { tenantId, catalogId, customer, items, totalAmount, notes } = req.body;
    try {
      let cust = null;

      // If catalog is tied to a specific customer, enforce it
      if (catalogId) {
        const cat = await prisma.catalog.findUnique({ where: { id: catalogId }});
        if (cat?.customerId) {
          cust = await prisma.customer.findUnique({ where: { id: cat.customerId }});
        }
      }

      if (!cust && customer && customer.id) {
        cust = await prisma.customer.findUnique({ where: { id: customer.id }});
      }

      if (!cust && customer) {
        cust = await prisma.customer.findFirst({
          where: { email: customer.email, tenantId }
        });
        if (!cust) {
          cust = await prisma.customer.create({
            data: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              tenantId
            }
          });
        }
      }

      const orderNumber = `ORD-${Date.now()}`;
      await prisma.$transaction(async (tx) => {
        // Create order
        await tx.order.create({
          data: {
            orderNumber,
            totalAmount,
            notes,
            tenantId,
            customerId: cust?.id || null,
            items: {
              create: items.map((i: any) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice
              }))
            }
          }
        });

        // Set up notification for NEW order
        await tx.notification.create({
           data: {
               tenantId,
               userId: cust?.assignedUserId || null,
               message: `Yeni sipariÅŸ oluÅŸturuldu: ${orderNumber} (${cust?.name || 'Bilinmeyen MÃ¼ÅŸteri'})`,
               type: "NEW_ORDER"
           }
        });

        // Decrement stock and check notifications
        for (const item of items) {
           const product = await tx.product.findUnique({ where: { id: item.productId } });
           if (product) {
               const qty = Number(item.quantity) || 0;
               const newStock = product.stock - qty;
               await tx.product.update({ 
                   where: { id: product.id }, 
                   data: { stock: newStock } 
               });
               
               if (product.stockThreshold !== null && newStock <= product.stockThreshold) {
                   await tx.notification.create({
                       data: {
                           tenantId,
                           message: `Dikkat: ${product.name} Ã¼rÃ¼nÃ¼nÃ¼n stok seviyesi kritik dÃ¼zeyde (${newStock}). SipariÅŸ No: ${orderNumber}`,
                           type: "LOW_STOCK"
                       }
                   });
               }
           }
        }
      });

      res.json({ success: true, orderNumber });
    } catch(e: any) {
      res.status(500).json({ error: "SipariÅŸ oluÅŸturulamadÄ±." });
    }
  });

}



