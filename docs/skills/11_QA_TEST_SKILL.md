# 11 - QA TEST SKILL

## Amaç

Bu skill, yapılan geliştirmelerin test edilmesi, hata bulunması ve regression kontrolü için kullanılır.

---

## Ne Zaman Kullanılır?

- Her faz sonunda
- Yeni özellik eklendikten sonra
- Auth/security değişikliklerinden sonra
- Mobil UI değişikliklerinden sonra
- Release öncesi
- Büyük refactor sonrası

---

## Test Başlıkları

```txt
Desktop görünüm testi
Mobil görünüm testi
Auth testi
Permission testi
Tenant izolasyonu testi
API response testi
Empty state testi
Loading state testi
Error state testi
Log oluşma testi
Yetkisiz erişim testi
Regression testi
```

---

## Mobil Test Viewportları

```txt
320px
375px
390px
414px
430px
768px
1024px
```

---

## Auth Testleri

```txt
Login olmadan private route açılmamalı
Public katalog açılmalı
Private müşteri kataloğu login istemeli
Yetkisiz kullanıcı 403 görmeli
Super admin ekranına normal kullanıcı girememeli
```

---

## Log Testleri

```txt
Login logu oluşuyor mu?
Başarısız login logu oluşuyor mu?
Yetkisiz erişim logu oluşuyor mu?
Ürün fiyat değişikliği loglanıyor mu?
Katalog silme loglanıyor mu?
Hassas veri loglanmıyor mu?
```

---

## Çıktı Formatı

```txt
Test edilen alanlar
Başarılı testler
Başarısız testler
Bulunan hatalar
Riskler
Düzeltme önerileri
```
