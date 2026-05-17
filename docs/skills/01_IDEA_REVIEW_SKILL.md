# 01 - IDEA REVIEW SKILL

## Amaç

Bu skill, projeye eklenmek istenen yeni fikirleri kodlamadan önce değerlendirmek için kullanılır.

Her fikir ürün değeri, UX etkisi, frontend etkisi, backend etkisi, database ihtiyacı, güvenlik riski, SaaS/tenant etkisi, loglama ihtiyacı, performans etkisi ve MVP önceliği açısından incelenmelidir.

---

## Ne Zaman Kullanılır?

- Yeni özellik fikri geldiğinde
- Var olan özelliğe büyük ekleme yapılacağında
- Kullanıcı deneyimini etkileyen değişikliklerde
- Güvenlik veya auth etkisi olan konularda
- Veritabanı veya API değişikliği gerektiren fikirlerde
- Uygulama kapsamını büyütecek her kararda

---

## Değerlendirme Başlıkları

Her fikri şu başlıklarla değerlendir:

```txt
1. Fikir Özeti
2. Hangi kullanıcıya fayda sağlar?
3. İş / satış değeri
4. UX etkisi
5. Mobil kullanım etkisi
6. Frontend etkisi
7. Backend etkisi
8. Database etkisi
9. Güvenlik riski
10. SaaS / tenant etkisi
11. Loglama ihtiyacı
12. Performans etkisi
13. Alternatif çözüm
14. Geliştirme zorluğu
15. MVP önceliği
16. Son karar
```

---

## Öncelik Sistemi

```txt
P0 - Güvenlik / auth / veri sızıntısı / tenant izolasyonu
P1 - Satış ve temel kullanım akışını etkileyen özellik
P2 - Mobil deneyimi ciddi iyileştiren özellik
P3 - Yönetim, raporlama ve takip özelliği
P4 - Görsel iyileştirme veya konfor özelliği
```

P0 konuları ertelenmemelidir.

---

## Son Karar Seçenekleri

```txt
Şimdi yapılacak
Sonraki faza alınacak
Daha sonra değerlendirilecek
Yapılmayacak
```

---

## Kurallar

- Kod yazma.
- Önce fikri değerlendir.
- P0 güvenlik konularını erteleme.
- Sadece görsel faydası olan ama iş değeri düşük fikirleri P4 olarak işaretle.
- SaaS/tenant etkisini mutlaka kontrol et.
- Backend güvenliği gerektiren fikirlerde sadece frontend çözümü önerme.
- Zorluk derecesini açıkça belirt.
- Alternatif çözüm varsa mutlaka yaz.
