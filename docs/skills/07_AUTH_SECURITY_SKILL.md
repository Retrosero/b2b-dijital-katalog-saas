# 07 - AUTH SECURITY SKILL

## Amaç

Bu skill, auth, permission, role, public/private route, tenant izolasyonu ve hassas veri güvenliği kontrolleri için kullanılır.

---

## Ne Zaman Kullanılır?

- Login gerektiren sayfalar düzenlenirken
- Public katalog / private katalog ayrımı yapılırken
- Super admin alanları oluşturulurken
- Loglama eklenirken
- Kullanıcı, müşteri, katalog, ürün erişimleri değişirken
- Role/permission sistemi etkilendiğinde

---

## Kontrol Listesi

```txt
[ ] Backend auth kontrolü var mı?
[ ] Permission kontrolü backend’de var mı?
[ ] Frontend route guard var mı?
[ ] Tenant izolasyonu korunuyor mu?
[ ] Kullanıcı URL değiştirerek başkasının verisine erişebiliyor mu?
[ ] Public ve private route ayrımı net mi?
[ ] Super admin alanları korunuyor mu?
[ ] Şifre/token/API key loglanmıyor mu?
[ ] Public link tahmin edilebilir değil mi?
[ ] Hatalar hassas bilgi sızdırmıyor mu?
```

---

## Public / Private Katalog Kuralı

- Herkese açık müşteri formlu katalog public olabilir.
- Müşteri seçili özel katalog public olmamalıdır.
- Private katalog API’leri token olmadan veri dönmemelidir.
- Kullanıcının ilgili müşteriye veya tenant’a erişim yetkisi kontrol edilmelidir.
- Public link tahmin edilebilir olmamalıdır.

---

## Hassas Veri Kuralları

Asla loglanmamalı:

```txt
password
token
refresh_token
api_key
secret_key
R2 secret key
access key
private credentials
```

---

## Çıktı Formatı

```txt
Tespit edilen açıklar
Risk seviyesi
Etkilenen route/API
Önerilen düzeltme
Test senaryoları
```
