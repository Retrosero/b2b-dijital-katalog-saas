# Faz 6 - Hızlı Satış Mobil Navbar

## Amaç

Hızlı Satış sayfasını mobilde tek elle kullanıma daha uygun hale getirmek ve sayfaya özel navbar aksiyonları oluşturmak.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- /admin/fast-sales sayfasında bildirim ikonunu mobilde gizle.
- Arama kutusunu navbar içine veya ikinci satır action bar'a taşı.
- Barkod, sepet, filtre ve sıralama ikonlarını mobilde görünür yap.
- Sepet ikonunda badge göster.
- Filtre ve sıralamayı bottom sheet/drawer ile aç.
- Desktop hızlı satış deneyimini bozma.
```

## Değiştirilecek Dosyalar

```txt
src/components/layouts/AdminLayout.tsx
src/pages/admin/FastSales.tsx
```

## Oluşturulabilecek Dosyalar

```txt
src/components/fast-sales/FastSalesMobileBar.tsx
src/components/fast-sales/FastSalesFilterSheet.tsx
```

## Test Adımları

```txt
- Mobilde bildirim ikonu gizlenir.
- Arama, barkod, sepet, filtre ve sıralama aksiyonları görünür.
- Sepet badge doğru güncellenir.
- 320px dahil yatay scroll oluşmaz.
- Desktop görünümde mevcut kullanım bozulmaz.
```

## Rollback Planı

FastSalesMobileBar kaldırılıp FastSales sayfasındaki mevcut kontrol düzenine geri dönülebilir.
