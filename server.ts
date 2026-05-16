import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { addApiRoutes } from "./src/api";
import { addProductImageRoutes } from "./src/routes/productImageRoutes";

process.env.DATABASE_URL ??= "mysql://b2b_user:b2b_pass@127.0.0.1:3308/b2b_catalog";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "b2b_mvp_secret_key";

// Allow modifying express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};

async function seedSuperAdmin() {
  const adminEmails = ["admin@example.com", "serhankalay1989@gmail.com"];
  const defaultPassword = "admin";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: "SUPER_ADMIN" },
      create: {
        email,
        name: email.split("@")[0],
        passwordHash,
        role: "SUPER_ADMIN",
      }
    });
  }
  console.log("Super Admins ensured: " + adminEmails.join(", ") + " / admin");

  const tenantCount = await prisma.tenant.count({ where: { name: "Demo Firma" } });
  if (tenantCount === 0) {
    const defaultPassword = "demo";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    const tenant = await prisma.tenant.create({
      data: {
        name: "Demo Firma"
      }
    });
    
    const existingUser = await prisma.user.findUnique({ where: { email: "demo@example.com" } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: "demo@example.com",
          name: "Demo Admin",
          passwordHash,
          role: "TENANT_ADMIN",
          tenantId: tenant.id
        }
      });
    }
    console.log("Demo Tenant generated: demo@example.com / demo");
  }
}

async function seedDemoData() {
  const tenant = await prisma.tenant.findFirst({ where: { name: "Demo Firma" } });
  if (!tenant) return;

  // Seeding Categories
  const catCount = await prisma.category.count({ where: { tenantId: tenant.id } });
  for (let i = catCount; i < 5; i++) {
    await prisma.category.create({ data: { name: `Örnek Kategori ${i + 1}`, tenantId: tenant.id } });
  }

  // Seeding Brands
  const brandCount = await prisma.brand.count({ where: { tenantId: tenant.id } });
  for (let i = brandCount; i < 5; i++) {
    await prisma.brand.create({ data: { name: `Örnek Marka ${i + 1}`, tenantId: tenant.id } });
  }

  // Seeding Products
  const prodCount = await prisma.product.count({ where: { tenantId: tenant.id } });
  const categories = await prisma.category.findMany({ where: { tenantId: tenant.id }, take: 5 });
  const brands = await prisma.brand.findMany({ where: { tenantId: tenant.id }, take: 5 });
  for (let i = prodCount; i < 5; i++) {
    await prisma.product.create({
      data: {
        name: `Örnek Ürün ${i + 1}`,
        price: (i + 1) * 100,
        stock: 50,
        tenantId: tenant.id,
        categoryId: categories[i % categories.length]?.id,
        brandId: brands[i % brands.length]?.id
      }
    });
  }

  // Seeding Customers
  const custCount = await prisma.customer.count({ where: { tenantId: tenant.id } });
  for (let i = custCount; i < 5; i++) {
    await prisma.customer.create({
      data: {
        name: `Müşteri ${i + 1}`,
        email: `musteri${i + 1}@example.com`,
        tenantId: tenant.id
      }
    });
  }
  console.log("Demo data generated.");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3003);

  app.use(express.json({ limit: "15mb" }));

  await seedSuperAdmin();
  await seedDemoData();

  // === API ROUTES ===
  app.get("/api/health", (req, res) => {
    const r2ok =
      !!process.env.R2_ACCOUNT_ID &&
      !!process.env.R2_ACCESS_KEY_ID &&
      !!process.env.R2_SECRET_ACCESS_KEY &&
      !!process.env.R2_BUCKET_NAME &&
      !!process.env.R2_PUBLIC_URL;

    res.json({
      status: "ok",
      r2: {
        configured: r2ok,
        accountId:  process.env.R2_ACCOUNT_ID  ? "✓ set" : "✗ MISSING",
        accessKey:  process.env.R2_ACCESS_KEY_ID ? "✓ set" : "✗ MISSING",
        secretKey:  process.env.R2_SECRET_ACCESS_KEY ? "✓ set" : "✗ MISSING",
        bucket:     process.env.R2_BUCKET_NAME  || "✗ MISSING",
        publicUrl:  process.env.R2_PUBLIC_URL   || "✗ MISSING",
      },
    });
  });

  app.post("/api/auth/customer/login", async (req: Request, res: Response): Promise<any> => {
    const { username, password, tenantId } = req.body;
    try {
      const whereClause: any = { username };
      if (tenantId) whereClause.tenantId = tenantId;
      
      const customer = await prisma.customer.findFirst({ where: whereClause });
      if (!customer || !customer.passwordHash) {
        return res.status(401).json({ error: "Geçersiz kullanıcı adı veya şifre" });
      }
      
      const isValid = await bcrypt.compare(password, customer.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Geçersiz kullanıcı adı veya şifre" });
      }

      const token = jwt.sign(
        { customerId: customer.id, tenantId: customer.tenantId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, username: customer.username, tenantId: customer.tenantId } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/customer/me", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.user || !req.user.customerId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const customer = await prisma.customer.findUnique({ 
        where: { id: req.user.customerId }
      });
      if (!customer) return res.status(404).json({ error: "Müşteri bulunamadı" });
      
      res.json({ 
        customer: { 
          id: customer.id, 
          name: customer.name, 
          email: customer.email, 
          phone: customer.phone, 
          username: customer.username,
          tenantId: customer.tenantId
        } 
      });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/customer/catalogs", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      if (!req.user || !req.user.customerId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const assignedCatalogs = await prisma.catalog.findMany({
        where: { customerId: req.user.customerId, isActive: true },
        select: { id: true, name: true, slug: true, description: true }
      });

      const publicCatalogs = await prisma.catalog.findMany({
        where: { tenantId: req.user.tenantId, customerId: null, isActive: true },
        select: { id: true, name: true, slug: true, description: true }
      });

      res.json({ catalogs: [...assignedCatalogs, ...publicCatalogs] });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  addApiRoutes(app, prisma, requireAuth, requireRole);
  addProductImageRoutes(app, prisma, requireAuth);


  app.post("/api/auth/login", async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
      if (!user) {
        return res.status(401).json({ error: "Geçersiz e-posta veya şifre" });
      }
      
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Geçersiz e-posta veya şifre" });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role, tenantId: user.tenantId },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          tenantId: user.tenantId,
          fastSalesSettings: user.fastSalesSettings,
          customerAccess: user.customerAccess,
          allowedPages: user.allowedPages,
          tenant: user.tenant ? { 
            name: user.tenant.name, 
            orderMode: user.tenant.orderMode,
            usedStorageBytes: user.tenant.usedStorageBytes,
            storageLimitBytes: user.tenant.storageLimitBytes,
            planName: user.tenant.planName,
            imageCount: user.tenant.imageCount
          } : undefined
        } 
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Giriş başarısız" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response): Promise<any> => {
    try {
      const user = await prisma.user.findUnique({ 
        where: { id: req.user.userId },
        include: { tenant: true }
      });
      if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          tenantId: user.tenantId,
          fastSalesSettings: user.fastSalesSettings,
          customerAccess: user.customerAccess,
          allowedPages: user.allowedPages,
          tenant: user.tenant ? { 
            name: user.tenant.name, 
            orderMode: user.tenant.orderMode,
            usedStorageBytes: user.tenant.usedStorageBytes,
            storageLimitBytes: user.tenant.storageLimitBytes,
            planName: user.tenant.planName,
            imageCount: user.tenant.imageCount
          } : undefined
        } 
      });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST OF VITE MIDDLEWARE...
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
