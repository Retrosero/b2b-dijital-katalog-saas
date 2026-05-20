# Proje Genel Bakış - B2B Dijital Katalog SaaS

## Nedir?

Çok kiracılı (multi-tenant) B2B dijital katalog ve sipariş yönetimi platformu. Firmaların ürün katalogları oluşturup müşterilerine özel fiyatlar ve kataloglar sunmasını sağlar.

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 19, Vite 6, TailwindCSS 4, shadcn/ui, @base-ui/react |
| Backend | Express.js, Prisma ORM |
| Database | MySQL |
| Auth | JWT + bcryptjs |
| Storage | Cloudflare R2 (S3 uyumlu) |
| Image Processing | Sharp.js |

## Kullanıcı Rolleri

| Rol | Açıklama |
|-----|----------|
| SUPER_ADMIN | Sistem yöneticisi |
| TENANT_ADMIN | Şirket yöneticisi |
| SALES_USER | Satış temsilcisi |
| CUSTOMER | Dış müşteri (portal kullanıcısı) |

## Ana Modüller

1. **Ürün Yönetimi** - CRUD, çoklu görsel, barkod/SKU
2. **Katalog Sistemi** - Public ve customer-specific kataloglar
3. **Sipariş Yönetimi** - Full order workflow
4. **Müşteri Yönetimi** - İskonto oranları, atama
5. **Depo/Ambar** - Toplama ve sevk
6. **Hızlı Satış** - Fast sales arayüzü
7. **Bildirimler** - LOW_STOCK, NEW_ORDER, ORDER_SHIPPED
8. **Audit Log** - Tüm işlemlerin loglanması

## Veritabanı Modelleri

```
Tenant (firma)
  ├── User (kullanıcılar)
  ├── Product (ürünler)
  │   └── ProductImage (görseller)
  ├── Category (kategoriler - recursive)
  ├── Brand (markalar)
  ├── Catalog (kataloglar)
  │   └── CatalogItem (ürün-fiyat eşleşmesi)
  ├── Customer (müşteriler)
  ├── Order (siparişler)
  │   └── OrderItem
  ├── Notification (bildirimler)
  └── AuditLog (loglar)
```

## Önemli URL Yapıları

- `/admin/*` - Admin panel
- `/c/:slug` - Public katalog görüntüleme
- `/musteri-girisi` - Müşteri girişi
- `/musteri/portal` - Müşteri portalı

## Çalıştırma

```bash
npm run dev        # Port 3003
npm run build      # Production
npm start           # Production server
npm run migrate     # DB sync
```

## Demo Hesapları

- Admin: `admin@example.com` / `admin`
- Demo Tenant: `demo@example.com` / `demo`