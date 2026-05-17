# 08 - SAAS TENANT SKILL

## Amaç

Bu skill, çok firmalı SaaS yapısında tenant/firma veri izolasyonunu korumak için kullanılır.

---

## Ne Zaman Kullanılır?

- Yeni tablo eklenirken
- Yeni endpoint eklenirken
- Bildirim, log, katalog, ürün, müşteri, satış verisi oluşturulurken
- Super admin ve firma admini ayrımı yapılırken
- Public/private katalog erişimi düzenlenirken

---

## Temel Kural

Her veri şu soruya cevap vermelidir:

```txt
Bu kayıt hangi tenant/firma ile ilişkili?
```

---

## Tenant Kontrol Soruları

```txt
A firması B firmasının verisini görebilir mi?
Firma admini sadece kendi firmasını mı görebilir?
Super admin tüm firmaları görebilir mi?
Public katalog tenant ile ilişkilendiriliyor mu?
Log ve bildirimler tenant bazlı ayrılıyor mu?
API querylerinde tenant filtrelemesi backend’de zorunlu mu?
```

---

## Super Admin Kuralı

Super admin:

- Tüm tenantları görebilir.
- Logları tenant filtresiyle inceleyebilir.
- Firma bazlı işlem yapabilir.
- Sistem genelindeki kritik kayıtları görebilir.

Firma admini:

- Sadece kendi tenant verilerini görebilir.
- Başka tenant verisine erişemez.
- Super admin loglarını göremez.

---

## Çıktı Formatı

```txt
Tenant ilişkili tablolar
Tenant filtresi gereken endpointler
Super admin / firma admin ayrımı
Riskli alanlar
Test senaryoları
```
