# Faz 10 - QA, Security Review ve Release Kontrolü

## Amaç

Tüm fazlardan sonra auth, permission, tenant izolasyonu, mobil uyumluluk, audit log ve release risklerini doğrulamak.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/09_AUDIT_LOG_SKILL.md
docs/skills/10_NOTIFICATION_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
docs/skills/12_RELEASE_REVIEW_SKILL.md
```

## Kapsam

```txt
- Build ve typecheck çalıştır.
- Auth testlerini yap.
- Permission testlerini yap.
- Tenant izolasyonu testlerini yap.
- Public/private katalog ayrımı testlerini yap.
- Bildirim testlerini yap.
- Audit log testlerini yap.
- Mobil viewport testlerini yap.
- Hassas veri loglanmadığını kontrol et.
- Console/API hata kontrolü yap.
- Release notları ve rollback planını çıkar.
```

## Test Başlıkları

```txt
Desktop görünüm testi
Mobil görünüm testi
Auth testi
Permission testi
Tenant izolasyonu testi
API response testi
Empty/loading/error state testi
Log oluşma testi
Yetkisiz erişim testi
Regression testi
Build testi
```

## Çıktı Formatı

```txt
1. Release özeti
2. Test edilen alanlar
3. Başarılı testler
4. Başarısız testler
5. Güvenlik bulguları
6. Tenant izolasyonu bulguları
7. Mobil bulgular
8. Riskler
9. Rollback planı
10. Production deploy notları
```

## Rollback Planı

Her fazın rollback notu birleştirilmeli. Migration içeren işler için database rollback ve uygulama rollback sırası ayrı belirtilmelidir.
