# Faz 4 - Bildirim Dropdown ve Bildirimler Sayfası

## Amaç

Bildirim Türkçe karakter sorununu çözmek, dropdown'a "Tümünü Gör" alanı eklemek ve filtrelenebilir Bildirimler sayfası oluşturmak.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/05_BACKEND_API_SKILL.md
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/10_NOTIFICATION_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- Türkçe karakter bozulmasının kaynağını analiz et ve düzelt.
- Notification API response header/encoding davranışını kontrol et.
- Dropdown/modal altında "Tümünü Gör" aksiyonu ekle.
- /admin/notifications route'u ve sayfası oluştur.
- Arama, okundu/okunmadı, tip ve tarih filtreleri ekle.
- Liste endpointine pagination ve filtre desteği ekle.
- Tümünü okundu yap endpointi ekle.
- Mobilde kart liste veya rahat tıklanabilir liste kullan.
```

## Değiştirilecek Dosyalar

```txt
src/App.tsx
src/components/layouts/AdminLayout.tsx
src/api.ts
prisma/schema.prisma (yalnızca index gerekiyorsa)
```

## Oluşturulabilecek Dosyalar

```txt
src/pages/admin/Notifications.tsx
src/components/notifications/NotificationFilters.tsx
src/components/notifications/NotificationList.tsx
```

## Test Adımları

```txt
- Türkçe karakterler doğru görünür.
- Okunmamış badge doğru sayılır.
- Tekil okundu işaretleme çalışır.
- Tümünü okundu yap çalışır.
- Filtreler tenant dışına veri döndürmez.
- Mobil viewportlarda yatay scroll oluşmaz.
```

## Rollback Planı

Yeni Bildirimler route'u kaldırılıp AdminLayout eski modal davranışına döndürülebilir. API filtreleri backward-compatible tutulmalıdır.
