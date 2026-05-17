# Faz 1 - Sistem Analizi ve Mevcut Yapı Haritası

Bu fazda kod yazma ve dosya değiştirme.

## Amaç

Projeyi, `docs/skills` kurallarını ve mevcut mimariyi inceleyerek sonraki fazlar için güvenilir sistem haritası çıkarmak.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/00_SYSTEM_ANALYSIS_SKILL.md
docs/skills/01_IDEA_REVIEW_SKILL.md
docs/skills/02_FEATURE_SPEC_SKILL.md
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/05_BACKEND_API_SKILL.md
docs/skills/06_DATABASE_SKILL.md
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/09_AUDIT_LOG_SKILL.md
docs/skills/10_NOTIFICATION_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
docs/skills/12_RELEASE_REVIEW_SKILL.md
docs/skills/13_PROMPT_WORKFLOW_SKILL.md
```

## İncelenecek Alanlar

```txt
- Klasör yapısı
- Routing haritası
- Auth/login/JWT yapısı
- Role/permission yapısı
- Tenant/firma izolasyonu
- Admin layout, sidebar, navbar ve mobil bottom nav
- Public katalog ve müşteri özel katalog akışları
- Bildirim sistemi ve API'leri
- Ürün, müşteri, katalog, sipariş, kullanıcı sayfaları
- Hızlı satış sayfası
- Prisma modelleri ve migration yaklaşımı
- Audit log altyapısı var mı?
- Mobil responsive durum
- Loading/empty/error state kullanımı
- Riskli veya eksik alanlar
```

## Çıktı Formatı

```txt
1. Okunan skill dosyaları
2. Proje genel yapısı
3. Routing haritası
4. Auth ve permission analizi
5. Layout/navbar analizi
6. API katmanı analizi
7. Database/model analizi
8. Tenant/SaaS analizi
9. Bildirim sistemi analizi
10. Loglama sistemi analizi
11. Mobil uyumluluk durumu
12. Riskli alanlar
13. Sonraki fazların etkileyeceği dosyalar
14. Varsayımlar
```

## Kesin Kurallar

```txt
- Kod yazma.
- Dosya değiştirme.
- Varsayım yaparsan açıkça belirt.
- Dosya yollarını gerçek proje yapısına göre yaz.
- Backend güvenliği gereken alanlarda sadece frontend guard önermeyi yeterli sayma.
- Tenant izolasyonu risklerini özellikle işaretle.
```
