# Faz 2 - Route/Auth Güvenliği ve Public/Private Katalog Ayrımı

## Amaç

Public müşteri formlu katalog ile müşteri seçili private katalog ayrımını backend ve frontend seviyesinde güvenli hale getirmek.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/05_BACKEND_API_SKILL.md
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/09_AUDIT_LOG_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- Public katalogların login istemeden açılmasını koru.
- Müşteri seçili katalogları private hale getir.
- Backend API'de müşteri özel katalog için token zorunlu yap.
- İlgili müşteri/tenant yetkisi yoksa 403 döndür.
- URL manipülasyonu ile başka müşterinin kataloğuna erişimi engelle.
- Public order create akışında tenantId'yi güvenilir kaynaktan türet.
- Yetkisiz erişim denemelerini audit log kapsamına hazırla veya mevcut log servisi varsa logla.
```

## Kapsam Dışı

```txt
- Bildirim sayfası
- Contextual navbar
- Audit log ekranı
- Genel mobil responsive refactor
```

## Değiştirilecek Dosyalar

```txt
src/App.tsx
src/pages/public/CatalogView.tsx
src/pages/public/CustomerLogin.tsx
src/pages/public/CustomerPortal.tsx
src/store/useCustomerAuthStore.ts
src/api.ts
server.ts
```

## Oluşturulabilecek Dosyalar

```txt
src/components/CustomerProtectedRoute.tsx
src/services/auditLogService.ts (audit log fazı önce geldiyse)
```

## Test Adımları

```txt
- Public katalog login olmadan açılır.
- Müşteri seçili katalog login olmadan veri dönmez.
- Yanlış müşteri tokenı ile private katalog 403 döner.
- Başka tenant katalog slug/id manipülasyonu veri döndürmez.
- Public sipariş oluştururken tenantId body manipülasyonu işe yaramaz.
```

## Rollback Planı

Route/API değişiklikleri tek tek geri alınabilir olmalı. Private katalog endpointleri eklenirse eski public endpoint geçici compatibility için sadece public kataloglarda kullanılabilir kalmalı.
