# 09 - AUDIT LOG SKILL

## Amaç

Bu skill, gelişmiş audit log sistemini tasarlamak, uygulamak ve denetlemek için kullanılır.

---

## Ne Zaman Kullanılır?

- Loglama altyapısı eklenirken
- Kritik işlemler takip edilmek istendiğinde
- Super admin log ekranı oluşturulurken
- Auth, kullanıcı, ürün, müşteri, katalog, satış, bildirim ve sistem olayları izleneceğinde

---

## Loglanacak İşlemler

### Auth

- Login
- Logout
- Başarısız login
- Şifre değiştirme
- Yetkisiz erişim
- Token süresi dolması

### Kullanıcı

- Kullanıcı oluşturma
- Kullanıcı düzenleme
- Kullanıcı silme/pasife alma
- Rol/yetki değişikliği

### Müşteri

- Müşteri oluşturma
- Müşteri düzenleme
- Müşteri silme
- Müşteri özel katalog erişimi

### Ürün

- Ürün oluşturma
- Ürün düzenleme
- Ürün silme
- Fiyat değişikliği
- Stok değişikliği
- Görsel ekleme/silme

### Katalog

- Katalog oluşturma
- Katalog düzenleme
- Katalog silme
- Public link oluşturma
- Public katalog görüntüleme
- Yetkisiz katalog erişimi

### Satış

- Sepete ürün ekleme
- Sepetten ürün çıkarma
- Barkod okutma
- Sipariş oluşturma
- Sipariş iptal

### Sistem

- API hatası
- Database hatası
- Storage/R2 hatası
- Entegrasyon hatası

---

## Log Seviyeleri

```txt
info
warning
error
critical
```

---

## Log Durumları

```txt
success
failed
blocked
```

---

## Hassas Veri Kuralı

Log metadata içinde şu bilgiler bulunmamalıdır:

```txt
password
token
secret
apiKey
accessKey
refreshToken
R2 secret
```

---

## Super Admin Log Sayfası

Gereken özellikler:

- Arama
- Tarih filtresi
- Kullanıcı filtresi
- Tenant filtresi
- Modül filtresi
- Action filtresi
- Severity filtresi
- Status filtresi
- Detay drawer/modal
- JSON metadata görünümü
- Pagination
- Mobil kart liste
- Export opsiyonu

---

## Çıktı Formatı

```txt
Log event listesi
Veri modeli
Backend service planı
Middleware bağlantıları
Super admin UI planı
Test senaryoları
Riskler
```
