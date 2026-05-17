# Faz 5 - Ürün Yönetimi UI Düzenlemeleri

## Amaç

Ürün yönetimi sayfasında arama deneyimini koruyarak filtre ve sıralama aksiyonlarını mobil uyumlu ikon tabanlı hale getirmek.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- Arama kutusunu koru.
- Filtre butonunu ikon-only yap.
- Sıralama butonunu ikon-only yap.
- aria-label ve tooltip ekle.
- Mobilde filtre/sıralama için drawer veya bottom sheet kullan.
- Desktop'ta popover/dropdown davranışı korunabilir.
- Ürün listesinde loading/empty/error durumlarını kontrol et.
```

## Değiştirilecek Dosyalar

```txt
src/pages/admin/Products.tsx
src/components/ui/dialog.tsx (yalnızca mevcut component yeterli değilse)
```

## Oluşturulabilecek Dosyalar

```txt
src/components/products/ProductFilterDrawer.tsx
src/components/products/ProductSortMenu.tsx
```

## Test Adımları

```txt
- Arama eski davranışıyla çalışır.
- Filtre ikonu klavye ve ekran okuyucu için erişilebilir olur.
- Sıralama ikonu klavye ve ekran okuyucu için erişilebilir olur.
- 320/375/390/414/430px viewportlarda taşma olmaz.
- Desktop davranışı bozulmaz.
```

## Rollback Planı

Yeni filtre/sıralama componentleri kaldırılıp Products sayfasındaki eski kontroller geri alınabilir.
