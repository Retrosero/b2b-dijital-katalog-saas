# 00 - SYSTEM ANALYSIS SKILL

## Amaç

Bu skill, yeni özellik geliştirmeden önce mevcut projeyi analiz etmek için kullanılır.

Kod yazmadan önce proje yapısı, routing, auth, componentler, API servisleri, database yapısı, tenant ayrımı, mobil yapı ve loglama sistemi incelenmelidir.

---

## Ne Zaman Kullanılır?

- Yeni özellik eklemeden önce
- Büyük refactor öncesi
- Yeni sayfa oluşturmadan önce
- Auth, loglama, bildirim, katalog, müşteri, ürün veya hızlı satış gibi ana modüller değişmeden önce
- Proje hakkında teknik spec hazırlanırken
- AI aracı projeyi ilk defa inceleyeceği zaman

---

## İncelenecek Alanlar

Aşağıdaki alanları kontrol et:

- Klasör yapısı
- Routing yapısı
- Layout yapısı
- Navbar / sidebar yapısı
- Auth sistemi
- Role / permission sistemi
- API servisleri
- Database modelleri
- Migration yapısı
- Tenant / firma ayrımı
- Bildirim sistemi
- Loglama sistemi
- Mobil responsive yapı
- Hata yönetimi
- Ortak componentler
- State management
- Form yapısı
- Tablo/list componentleri

---

## Çıktı Formatı

Analiz sonucunu şu başlıklarla ver:

```txt
1. Proje Genel Yapısı
2. Routing Haritası
3. Auth ve Permission Yapısı
4. Layout/Navbar Yapısı
5. API Katmanı
6. Database / Model Yapısı
7. Tenant / SaaS Yapısı
8. Mobil Uyumluluk Durumu
9. Bildirim Sistemi
10. Loglama Sistemi
11. Riskli Alanlar
12. Yeni Özelliğin Etkileyeceği Dosyalar
```

---

## Kurallar

- Kod yazma.
- Önce mevcut yapıyı anlamaya çalış.
- Varsayım yaparsan açıkça belirt.
- Dosya yollarını mümkün olduğunca gerçek proje yapısına göre yaz.
- Mevcut mimariyi bozmadan ilerleme öner.
- Büyük refactor önermeden önce gerekçesini yaz.
- Eksik bilgi varsa varsayımı ayrı bir başlıkta belirt.
