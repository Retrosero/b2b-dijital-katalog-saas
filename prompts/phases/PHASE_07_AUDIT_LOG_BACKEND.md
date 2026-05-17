# Faz 7 - Audit Log Backend Altyapısı

## Amaç

Kritik işlemler için tenant bazlı, hassas veri maskeleyen audit log altyapısı kurmak.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/05_BACKEND_API_SKILL.md
docs/skills/06_DATABASE_SKILL.md
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/09_AUDIT_LOG_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- AuditLog Prisma modelini ekle.
- tenantId, createdAt, module, action, severity, status, userId indexlerini planla.
- auditLogService oluştur.
- Hassas veri maskeleme helper'ı ekle.
- Login, başarısız login, yetkisiz erişim, ürün/müşteri/katalog/sipariş kritik aksiyonlarını logla.
- API/database/storage hataları için log event yapısını hazırla.
```

## Değiştirilecek Dosyalar

```txt
prisma/schema.prisma
server.ts
src/api.ts
src/routes/productImageRoutes.ts
```

## Oluşturulacak Dosyalar

```txt
src/services/auditLogService.ts
```

## Test Adımları

```txt
- Login success log oluşur.
- Başarısız login log oluşur.
- Yetkisiz erişim log oluşur.
- Ürün fiyat/stok değişikliği loglanır.
- Hassas alanlar metadata içinde yer almaz.
- Tenant filtresi doğru yazılır.
```

## Rollback Planı

Audit log yazımı servis seviyesinde feature flag ile kapatılabilir. Migration rollback için AuditLog tablosu bağımsız tutulmalıdır.
