# KATALOG SATIŞ SAAS - ANA SPEC PROMPTU

## Rolün

Sen bu projede senior full-stack developer, SaaS architect, UI/UX designer, security reviewer ve QA lead gibi çalışacaksın.

Bu aşamada kesinlikle kod yazmayacaksın.

Amacın:

- `docs/skills` klasöründeki skill dosyalarını okumak
- Mevcut sistemi analiz etmek
- İstenen geliştirmeleri mevcut mimariye göre değerlendirmek
- Güvenlik, tenant izolasyonu, mobil UX ve test risklerini çıkarmak
- Uygulanabilir teknik spec hazırlamak
- Sonrasında işin faz faz uygulanabilir hale gelmesi için net faz önerisi vermek

## 1. Önce Okunacak Skill Dosyaları

Kod yazmadan önce aşağıdaki dosyaları oku:

```txt
docs/skills/00_SYSTEM_ANALYSIS_SKILL.md
docs/skills/01_IDEA_REVIEW_SKILL.md
docs/skills/02_FEATURE_SPEC_SKILL.md
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/05_BACKEND_API_SKILL.md
docs/skills/06_DATABASE_SKILL.md
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/09_AUDIT_LOG_SKILL.md
docs/skills/10_NOTIFICATION_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
docs/skills/12_RELEASE_REVIEW_SKILL.md
docs/skills/13_PROMPT_WORKFLOW_SKILL.md
```

## 2. Mutlaka İncelenecek Proje Alanları

```txt
- Proje klasör yapısı
- Frontend framework, routing ve route guard yapısı
- Backend framework, API route yapısı ve middleware akışı
- Auth/login sistemi
- Role/permission yapısı
- Tenant/firma ayrımı
- Navbar/layout/sidebar yapısı
- Ortak componentler
- Ürün yönetimi ve ürün detay/düzenleme sayfaları
- Müşteri yönetimi ve müşteri detay/düzenleme sayfaları
- Kullanıcı yönetimi/düzenleme sayfaları
- Katalog yönetimi ve katalog detay/düzenleme sayfaları
- Hızlı katalog oluşturma alanı
- Public katalog route/API yapısı
- Müşteri seçili private katalog route/API yapısı
- Hızlı satış sayfası
- Bildirim dropdown/component/API yapısı
- Database modelleri ve migration yaklaşımı
- Loglama/audit altyapısı
- Mobil responsive yapı
- API service/hook/state management yapısı
- Error/loading/empty state kullanımı
```

Varsayım yaparsan açıkça belirt. Dosya yolu verirken gerçek proje yollarını kullan.

## 3. Geliştirilecek Özellikler

Kod yazma. Aşağıdaki özellikleri mevcut sisteme göre analiz et ve teknik spec hazırla.

### 3.1 Bildirim Türkçe Karakter Sorunu

Kontrol et:

```txt
- API response encoding
- Database charset/collation
- Frontend rendering
- JSON serialize/deserialize
- Content-Type header
- Yanlış encode/decode işlemleri
```

Beklenen davranış:

```txt
ş, ğ, ü, ö, ç, ı, İ gibi karakterler tüm bildirimlerde doğru görünmeli.
```

### 3.2 Bildirim Dropdown Altına "Tümünü Gör" Alanı

Beklenen davranış:

```txt
- Dropdown son bildirimleri gösterir.
- En altta "Tümünü Gör" alanı olur.
- Tıklanınca Bildirimler sayfasına gider.
- Mobilde rahat tıklanabilir olur.
- Okunmamış bildirim sayısı korunur.
```

### 3.3 Bildirimler Sayfası

Sayfa özellikleri:

```txt
- Sayfa adı: Bildirimler
- Arama kutusu
- Okundu/okunmadı filtresi
- Bildirim tipi filtresi
- Tarih aralığı filtresi
- Gelişmiş tablo
- Mobilde kart liste görünümü
- Loading state
- Empty state
- Error state
- Okundu olarak işaretle
- Tümünü okundu yap
- Backend permission ve tenant kontrolü
```

### 3.4 Müşteri Seçili Kataloğa Login Zorunluluğu

Beklenen güvenlik davranışı:

```txt
- Müşteri seçili katalog private route olmalı.
- Login olmadan açılmamalı.
- Backend API token olmadan müşteri özel katalog verisi dönmemeli.
- Kullanıcı ilgili müşteriye yetkili değilse 403 dönmeli.
- URL manipülasyonu ile başka müşterinin kataloğuna erişilememeli.
```

### 3.5 Herkese Açık Müşteri Formlu Katalog Public Kalsın

Beklenen davranış:

```txt
- Public katalog login istemeden açılabilir.
- Müşteri formu doldurulabilir.
- Public katalog ile private müşteri kataloğu route/API olarak ayrılmalıdır.
- Public link tahmin edilebilir olmamalıdır.
```

### 3.6 Hızlı Katalog Oluştur Alanına Public Link ve Kopyalama İkonu

Beklenen davranış:

```txt
- Public müşteri formlu katalog linki gösterilir.
- Yanında kopyalama ikonu olur.
- Tıklayınca tam URL panoya kopyalanır.
- Toast/snackbar ile "Link kopyalandı" mesajı gösterilir.
- Mobilde link taşmaz.
- Public link yoksa oluşturma davranışı belirlenir.
```

### 3.7 Ürün Yönetimi Sayfası Filtre/Sıralama İkonları

Beklenen davranış:

```txt
- Arama kutusu korunur.
- Filtre butonu sadece ikon olur.
- Sıralama butonu sadece ikon olur.
- Tooltip veya aria-label olur.
- Mobilde drawer/bottom sheet açılır.
- Desktop'ta popover/dropdown olabilir.
```

### 3.8 Detay ve Düzenleme Sayfalarında Contextual Navbar

Yeni kural:

```txt
- Geri butonu navbar solunda olur.
- Sayfa adı navbar içinde görünür.
- Düzenle ikonu navbar sağında olur.
- Düzenle ikonu bildirim ikonunun sol tarafında olur.
- Sayfa içeriğinde tekrar geri/düzenle butonu olmaz.
```

Uygulanacak sayfalar:

```txt
- Ürün detay
- Ürün düzenle
- Müşteri detay
- Müşteri düzenle
- Kullanıcı düzenle
- Katalog detay
- Katalog düzenle
- Sipariş detay
- Tahsilat detay varsa
- Log detay varsa
- Bildirim detay varsa
```

### 3.9 Hızlı Satış Sayfası Özel Mobil Navbar

Beklenen davranış:

```txt
- Bu sayfada bildirim ikonu gizlenir.
- Arama kutusu navbar içine veya ikinci satır mobil action bar'a taşınır.
- Barkod ikonu görünür.
- Sepet ikonu görünür.
- Sepet ikonunda badge olur.
- Filtre ikonu görünür.
- Sıralama ikonu görünür.
- Mobilde tek elle kullanım kolay olmalı.
- Filtre ve sıralama bottom sheet olarak açılabilir.
```

### 3.10 Tüm Sayfaları Mobil Uyumlu Hale Getirme

Kontrol edilecek sayfalar:

```txt
Dashboard
Ürün yönetimi
Ürün detay
Müşteri yönetimi
Müşteri detay
Kullanıcı yönetimi
Kullanıcı düzenle
Katalog yönetimi
Katalog detay
Hızlı katalog oluştur
Public katalog
Müşteri özel katalog
Hızlı satış
Sepet
Bildirimler
Super admin sayfaları
Log sayfası
Ayarlar
```

Test edilecek viewportlar:

```txt
320px
375px
390px
414px
430px
768px
1024px
```

### 3.11 Gelişmiş Audit Loglama Sistemi

Loglanacak örnek işlemler:

```txt
Login
Başarısız login
Logout
Yetkisiz erişim
Kullanıcı oluşturma/düzenleme/silme
Rol/yetki değişikliği
Müşteri oluşturma/düzenleme/silme
Ürün oluşturma/düzenleme/silme
Fiyat değişikliği
Stok değişikliği
Katalog oluşturma/düzenleme/silme
Public katalog link oluşturma
Müşteri özel katalog erişimi
Sipariş oluşturma/iptal
Barkod okutma
API hatası
Database hatası
Storage/R2 hatası
```

Önerilen log modeli:

```txt
id
tenant_id
user_id
user_name
user_role
module
action
entity_type
entity_id
entity_name
description
status
severity
ip_address
user_agent
metadata
created_at
```

Hassas veriler loglanmamalı:

```txt
password
token
refresh_token
api_key
secret_key
R2 secret key
access key
```

## 4. Çıktı Formatı

Spec'i aşağıdaki başlıklarla hazırla:

```txt
A. Okunan Skill Dosyaları
B. Mevcut Sistem Analizi
C. Problem Listesi
D. Fikir Değerlendirme Tablosu
E. Teknik Spec
F. API Endpoint Önerileri
G. Database / Migration Planı
H. UI/UX Spec
I. Security Spec
J. Audit Log Spec
K. Fazlara Bölünmüş Uygulama Planı
L. Test Planı
M. Riskler ve Karar Önerisi
N. Varsayımlar
```

## 5. Fikir Değerlendirme Tablosu Kolonları

```txt
Özellik
Kullanıcı faydası
Frontend etkisi
Backend etkisi
Database etkisi
Security riski
SaaS/Tenant etkisi
Loglama ihtiyacı
Mobil etkisi
Zorluk
Öncelik
Karar
```

Öncelik standardı:

```txt
P0 - Güvenlik/auth/veri sızıntısı/tenant izolasyonu
P1 - Temel kullanım/satış akışı
P2 - Mobil deneyim
P3 - Yönetim/raporlama/loglama
P4 - Görsel konfor
```

## 6. Teknik Spec Alt Başlıkları

Her özellik için ayrı ayrı yaz:

```txt
1. Mevcut durum
2. Hedeflenen davranış
3. Frontend değişiklikleri
4. Backend değişiklikleri
5. Database değişiklikleri
6. Auth/permission kuralları
7. Tenant kuralları
8. Loglama kuralları
9. Mobil davranış
10. Etkilenecek dosyalar
11. Oluşturulacak dosyalar
12. Test senaryoları
13. Riskler
```

## 7. Fazlara Böl

Büyük değişiklikleri şu fazlara böl:

```txt
Faz 1 - Sistem analizi ve mevcut yapı haritası
Faz 2 - Route/Auth güvenliği ve public/private katalog ayrımı
Faz 3 - Contextual navbar mimarisi
Faz 4 - Bildirim dropdown ve bildirimler sayfası
Faz 5 - Ürün yönetimi UI düzenlemeleri
Faz 6 - Hızlı satış mobil navbar
Faz 7 - Audit log backend altyapısı
Faz 8 - Super admin log ekranı
Faz 9 - Mobil responsive genel düzenleme
Faz 10 - QA, security review ve release kontrolü
```

Her faz için:

```txt
- Amaç
- Yapılacaklar
- Değiştirilecek dosyalar
- Oluşturulacak dosyalar
- Test adımları
- Riskler
- Geri alma planı
```

## 8. Kesin Kurallar

```txt
- Kod yazma.
- Dosya değiştirme.
- Önce skill dosyalarını oku.
- Önce sistemi analiz et.
- Varsayım yaparsan açıkça belirt.
- Gerçek dosya yollarını kullan.
- Backend güvenliği olmadan sadece frontend guard önerme.
- Tenant izolasyonunu mutlaka kontrol et.
- Mobil öncelikli düşün.
- Hassas verileri loglama.
- Büyük refactor önermeden önce gerekçesini yaz.
- Uygulamayı fazlara böl.
- Her faz için test ve rollback planı yaz.
```

Şimdi bu kurallara göre projeyi incele ve uygulanabilir teknik spec hazırla.
