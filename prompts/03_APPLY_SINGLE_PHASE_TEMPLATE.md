# TEK FAZ UYGULAMA PROMPTU

Aşağıdaki fazı uygula.

## Uygulanacak Faz

`[Faz adını buraya yaz]`

## Ön Koşul

Daha önce oluşturulan ana teknik spec ve faz planını dikkate al. Çelişki varsa önce çelişkiyi belirt, sonra en güvenli kapsamla devam et.

## Kurallar

```txt
- Sadece bu fazın kapsamını uygula.
- Kapsam dışına çıkma.
- Gereksiz refactor yapma.
- Daha önce oluşturulan spec ve faz planına uy.
- docs/skills içindeki ilgili skill dosyalarını tekrar oku.
- Değiştireceğin dosyaları işlemden önce listele.
- Faz 1 ise kod yazma ve dosya değiştirme.
- Veritabanı değişikliği varsa migration güvenli olmalı.
- Backend güvenliği gereken yerde sadece frontend çözüm yapma.
- Tenant izolasyonunu bozma.
- Hassas verileri loglama.
- Mobil uyumu kontrol et.
- İş bitince test adımlarını yaz.
- İş bitince değişen dosyaları listele.
```

## Çıktı Formatı

```txt
1. Uygulanan faz
2. Yapılan değişiklikler
3. Değiştirilen dosyalar
4. Oluşturulan dosyalar
5. Test adımları
6. Riskler
7. Eksik kalan veya sonraki faza bırakılan işler
8. Rollback notu
```
