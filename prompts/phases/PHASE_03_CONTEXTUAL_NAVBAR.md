# Faz 3 - Contextual Navbar Mimarisi

## Amaç

Detay ve düzenleme sayfalarında geri, başlık ve aksiyon ikonlarını ortak navbar davranışına taşımak.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- AdminLayout içinde sayfa bazlı navbar aksiyonlarını destekle.
- Geri butonunu navbar soluna taşı.
- Sayfa başlığını navbar içinde göster.
- Düzenle/kaydet/sil gibi aksiyon ikonlarını navbar sağında göster.
- Bildirim ikonu ile sayfa aksiyonları çakışmasın.
- Detay/düzenleme sayfalarında içerik içindeki tekrar eden geri/düzenle butonlarını kaldır.
```

## Uygulanacak Sayfalar

```txt
src/pages/admin/ProductDetail.tsx
src/pages/admin/ProductForm.tsx
src/pages/admin/CustomerDetail.tsx
src/pages/admin/CustomerForm.tsx
src/pages/admin/Users.tsx
src/pages/admin/CatalogDetail.tsx
src/pages/admin/OrderDetail.tsx
```

## Kapsam Dışı

```txt
- Backend değişikliği
- Database değişikliği
- Bildirimler sayfası
- Genel responsive refactor
```

## Oluşturulabilecek Dosyalar

```txt
src/components/layouts/ContextualNavbar.tsx
src/store/usePageActionsStore.ts
```

## Test Adımları

```txt
- Her detay sayfasında geri butonu çalışır.
- Düzenle ikonu doğru sayfaya gider.
- Mobilde navbar taşmaz.
- Bildirim ikonu ile aksiyon ikonları üst üste binmez.
- Sayfa içi eski geri/düzenle butonları tekrar etmez.
```

## Rollback Planı

Ortak navbar store/component devre dışı bırakılarak AdminLayout eski başlık davranışına döndürülebilir.
