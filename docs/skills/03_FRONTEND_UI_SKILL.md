# 03 - FRONTEND UI SKILL

## Amaç

Bu skill, frontend sayfa, component, layout, navbar, tablo, form, modal, drawer ve responsive UI geliştirmeleri için kullanılır.

---

## Ne Zaman Kullanılır?

- Yeni sayfa oluştururken
- Mevcut sayfa tasarımını değiştirirken
- Navbar / layout değiştirirken
- Ürün, müşteri, katalog, kullanıcı, bildirim veya log ekranı geliştirirken
- Mobil uyumluluk düzenlerken
- Ortak component standardı kurulurken

---

## Temel Kurallar

- UI dili Türkçe olmalıdır.
- Mobil öncelikli tasarım yapılmalıdır.
- Ortak componentler kullanılmalıdır.
- Aynı kod farklı sayfalarda tekrar edilmemelidir.
- Sayfa aksiyonları mümkünse contextual navbar içinde yönetilmelidir.
- İkon butonlarında aria-label olmalıdır.
- Loading, empty ve error state olmalıdır.
- Tablo sayfaları mobilde kart listeye dönüşebilmelidir.
- Filtre ve sıralama mobilde drawer veya bottom sheet olarak açılmalıdır.
- Minimum dokunma alanı 44px olmalıdır.
- Gereksiz paket eklenmemelidir.
- Mevcut tasarım dili korunmalıdır.

---

## Navbar Standardı

Detay ve düzenleme sayfalarında:

```txt
Sol: Geri butonu
Orta: Sayfa adı
Sağ: Sayfaya özel aksiyon ikonları + bildirim ikonu
```

Sayfa içinde tekrar eden “Geri” ve “Düzenle” butonları kaldırılmalıdır.

---

## Component Mantığı

Önerilen ortak componentler:

```txt
ContextualNavbar
MobileActionBar
ResponsiveTable
MobileCardList
FilterDrawer
SortDropdown
EmptyState
LoadingSkeleton
ErrorState
IconButtonWithTooltip
```

---

## Çıktı Formatı

Frontend görevi sonunda şunları yaz:

```txt
Değişen dosyalar
Oluşturulan componentler
Mobil davranış
Desktop davranış
Test adımları
Riskler
```

---

## Kurallar

- Backend dosyalarına dokunma.
- Database migration yazma.
- Eksik API varsa TODO bırak.
- Tasarım değişikliği yaparken mevcut stil sistemine uy.
- UI değişikliğinden sonra mobil viewport test listesi ver.
