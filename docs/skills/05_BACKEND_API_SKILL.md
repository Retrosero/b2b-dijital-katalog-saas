# 05 - BACKEND API SKILL

## Amaç

Bu skill, backend API, service, controller, middleware, validation ve business logic geliştirmeleri için kullanılır.

---

## Ne Zaman Kullanılır?

- Yeni endpoint ekleneceğinde
- Auth veya permission kontrolü gerektiğinde
- Public/private route ayrımı yapılacağında
- Bildirim, katalog, ürün, müşteri, kullanıcı, log ve satış API’leri düzenleneceğinde
- Server-side arama, filtreleme, sıralama veya pagination gerektiğinde

---

## Backend Kuralları

- Sadece frontend guard yeterli değildir.
- Kritik route’larda backend auth zorunludur.
- Permission kontrolü backend’de yapılmalıdır.
- Tenant/firma izolasyonu backend’de garanti edilmelidir.
- Request validation yapılmalıdır.
- Hatalar merkezi error handler ile yönetilmelidir.
- Hassas bilgiler response içine yazılmamalıdır.
- API endpointleri tutarlı isimlendirilmelidir.
- Büyük listeler server-side pagination, search ve filter desteklemelidir.
- Yetkisiz erişimler audit log’a yazılmalıdır.

---

## API Tasarım Kuralları

Liste endpointlerinde mümkünse şu parametreler desteklenmelidir:

```txt
page
limit
search
sortBy
sortOrder
filters
dateFrom
dateTo
```

---

## Public / Private Route Kuralı

- Public katalog route’u login istemeden çalışabilir.
- Müşteri seçili katalog route’u login ve permission istemelidir.
- Super admin route’ları sadece super admin erişimine açık olmalıdır.
- Tenant verileri backend’de filtrelenmelidir.
- URL üzerinden başka tenant/customer verisi çekilememelidir.

---

## Çıktı Formatı

```txt
Eklenen/değişen endpointler
Middleware değişiklikleri
Service değişiklikleri
Validation kuralları
Permission kuralları
Test adımları
Riskler
```
