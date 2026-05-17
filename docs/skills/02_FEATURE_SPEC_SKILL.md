# 02 - FEATURE SPEC SKILL

## Amaç

Bu skill, onaylanan bir fikri uygulanabilir teknik spec dokümanına çevirmek için kullanılır.

Spec, geliştiricinin veya AI aracının doğrudan uygulayabileceği kadar net olmalıdır.

---

## Ne Zaman Kullanılır?

- Fikir değerlendirmesi onaylandıktan sonra
- Kod yazmadan önce
- Büyük özellikler fazlara bölünmeden önce
- Birden fazla dosyayı etkileyecek değişikliklerde
- Backend, frontend, database ve security etkisi olan konularda

---

## Spec Formatı

Teknik spec aşağıdaki başlıklarla hazırlanmalıdır:

```txt
1. Özellik Özeti
2. Mevcut Durum
3. Problem
4. Hedeflenen Davranış
5. Kullanıcı Akışı
6. Frontend Gereksinimleri
7. Backend Gereksinimleri
8. Database Gereksinimleri
9. Auth / Permission Kuralları
10. SaaS / Tenant Kuralları
11. Loglama Gereksinimleri
12. Mobil Responsive Davranış
13. API Endpointleri
14. Etkilenecek Dosyalar
15. Oluşturulacak Dosyalar
16. Uygulama Fazları
17. Test Senaryoları
18. Riskler
19. Geri Alma Planı
```

---

## Fazlara Bölme Kuralı

Büyük özellikler küçük fazlara ayrılmalıdır.

Örnek:

```txt
Faz 1 - Route/Auth güvenliği
Faz 2 - Backend API
Faz 3 - Frontend UI
Faz 4 - Mobil responsive
Faz 5 - Loglama
Faz 6 - Test ve security review
```

---

## Kurallar

- Kod yazma.
- Gerçek proje dosya yollarını kullan.
- Büyük refactor önermeden önce gerekçesini yaz.
- Migration varsa veri kaybı riskini belirt.
- Backend güvenliği ve tenant izolasyonunu mutlaka ekle.
- Test senaryolarını yazmadan spec tamamlanmış sayılmaz.
- Belirsiz noktaları “Varsayımlar” başlığı altında belirt.
