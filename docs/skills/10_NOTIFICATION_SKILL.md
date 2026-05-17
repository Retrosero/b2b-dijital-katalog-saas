# 10 - NOTIFICATION SKILL

## Amaç

Bu skill, bildirim sistemi, bildirim dropdown, bildirimler sayfası ve Türkçe karakter sorunlarını yönetmek için kullanılır.

---

## Ne Zaman Kullanılır?

- Bildirim dropdown düzenlenirken
- Bildirimler sayfası oluşturulurken
- Okundu/okunmadı sistemi yapılırken
- Türkçe karakter sorunu incelenirken
- Bildirim API’leri düzenlenirken

---

## Bildirim Dropdown Kuralları

- Son bildirimler gösterilmelidir.
- Okunmamış sayısı badge olarak görünmelidir.
- En altta “Tümünü Gör” alanı olmalıdır.
- “Tümünü Gör” bildirimler sayfasına götürmelidir.
- Mobilde rahat tıklanabilir olmalıdır.
- Türkçe karakterler doğru görünmelidir.

---

## Bildirimler Sayfası Kuralları

Sayfada şunlar olmalıdır:

- Arama kutusu
- Okundu/okunmadı filtresi
- Bildirim tipi filtresi
- Tarih aralığı filtresi
- Gelişmiş tablo
- Mobilde kart liste
- Loading state
- Empty state
- Error state
- Okundu olarak işaretleme
- Tümünü okundu yapma

---

## Türkçe Karakter Kontrolü

Kontrol edilecekler:

- API response encoding
- Database charset/collation
- Frontend rendering
- Yanlış encode/decode işlemleri
- Header Content-Type
- JSON serialize/deserialize

---

## Çıktı Formatı

```txt
Mevcut bildirim sistemi analizi
Türkçe karakter sorunu kaynağı
Dropdown değişiklikleri
Bildirimler sayfası planı
API ihtiyaçları
Test senaryoları
```
