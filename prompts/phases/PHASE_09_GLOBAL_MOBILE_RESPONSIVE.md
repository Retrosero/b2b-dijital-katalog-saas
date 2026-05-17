# Faz 9 - Mobil Responsive Genel Düzenleme

## Amaç

Tüm ana sayfalarda mobil taşma, okunabilirlik, touch target ve tablo/kart davranışlarını sistematik olarak düzeltmek.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- Dashboard, ürün, müşteri, kullanıcı, katalog, sipariş, ayarlar, bildirimler ve log ekranlarını kontrol et.
- Public katalog ve müşteri portalını kontrol et.
- 320/375/390/414/430/768/1024px viewportlarda test et.
- Yatay scroll, taşan navbar, küçük buton, okunmayan metin ve tablo problemlerini düzelt.
- Tablo sayfaları için mobil kart liste alternatifi değerlendir.
- Form alanlarında mobil doldurma ergonomisini düzelt.
```

## Değiştirilecek Dosyalar

```txt
src/index.css
src/components/layouts/AdminLayout.tsx
src/pages/admin/*.tsx
src/pages/public/*.tsx
```

## Oluşturulabilecek Dosyalar

```txt
src/components/ui/empty-state.tsx
src/components/ui/loading-state.tsx
src/components/ui/responsive-table.tsx
```

## Test Adımları

```txt
- 320px viewportta yatay scroll yok.
- 375/390/414/430px viewportlarda navbar taşmaz.
- 768/1024px tablet görünüm kullanılabilir.
- Kritik aksiyonlar minimum 44px touch target sağlar.
- Liste/tablo sayfalarında mobil okuma ve aksiyon alma mümkün olur.
```

## Rollback Planı

Sayfa bazlı değişiklikler ayrı commit/faz çıktısı olarak tutulmalı; sorunlu sayfa değişikliği tek başına geri alınabilmeli.
