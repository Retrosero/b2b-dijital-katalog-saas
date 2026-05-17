# 12 - RELEASE REVIEW SKILL

## Amaç

Bu skill, geliştirme tamamlandıktan sonra release öncesi son kontrol için kullanılır.

---

## Ne Zaman Kullanılır?

- Production deploy öncesi
- Büyük özellik tamamlandıktan sonra
- Migration içeren değişikliklerden önce
- Auth/security değişikliklerinden sonra
- Mobil UI revizyonlarından sonra
- Loglama veya tenant yapısı değiştiğinde

---

## Release Kontrol Listesi

```txt
[ ] Değişen dosyalar listelendi
[ ] Migration varsa test edildi
[ ] Rollback planı var
[ ] Auth testleri yapıldı
[ ] Permission testleri yapıldı
[ ] Tenant izolasyonu test edildi
[ ] Mobil testler yapıldı
[ ] Loglama test edildi
[ ] Hassas veri loglanmıyor
[ ] API hataları kontrol edildi
[ ] Console error yok
[ ] Build başarılı
[ ] Dokümantasyon güncellendi
```

---

## Çıktı Formatı

```txt
Release özeti
Değişen alanlar
Test sonuçları
Riskler
Rollback planı
Production deploy notları
```
