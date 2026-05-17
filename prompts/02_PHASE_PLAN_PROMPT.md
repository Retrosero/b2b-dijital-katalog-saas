# FAZ PLANINA ÇEVİRME PROMPTU

Hazırlanan teknik spec'i faz faz uygulanabilir hale getir.

Bu aşamada kod yazma ve dosya değiştirme.

## Girdi

Önceki adımda üretilen teknik spec'i, mevcut proje analizini, riskleri ve varsayımları dikkate al.

## Çıktı Formatı

Her faz için aşağıdaki başlıkları doldur:

```txt
Faz adı:
Amaç:
Kapsam:
Kapsam dışı:
Değiştirilecek dosyalar:
Oluşturulacak dosyalar:
Backend etkisi:
Frontend etkisi:
Database etkisi:
Security etkisi:
Tenant etkisi:
Loglama etkisi:
Mobil etkisi:
Test adımları:
Rollback planı:
Riskler:
Başarı kriteri:
```

## Faz Standartları

```txt
- Fazlar küçük, test edilebilir ve geri alınabilir olmalı.
- Her faz tek başına uygulanabilir olmalı.
- Auth/security/tenant riski olan işler erken fazlara alınmalı.
- Database migration içeren fazlarda veri kaybı riski ve rollback yazılmalı.
- UI fazlarında desktop ve mobil davranış ayrı belirtilmeli.
- QA/security/release kontrolü en son faz olmalı.
```

## Önerilen Sıra

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

## Son Karar

Çıktının sonunda hangi fazdan başlanması gerektiğini net söyle. Normal şartlarda ilk uygulanacak faz `Faz 1 - Sistem analizi ve mevcut yapı haritası` olmalıdır ve bu fazda kod yazılmamalıdır.
