# Katalog SaaS Prompt Paketi

Bu paket, projeyi önce analiz ettirip teknik spec çıkarmak, ardından geliştirmeyi küçük ve test edilebilir fazlarla ilerletmek için hazırlanmıştır.

## Kullanım Sırası

1. `01_MAIN_SPEC_PROMPT.md`
   - İlk olarak bunu kullan.
   - Bu aşamada kod yazdırma.
   - Sistemi incelet, riskleri çıkarttır ve teknik spec hazırlat.

2. `02_PHASE_PLAN_PROMPT.md`
   - Teknik spec onaylandıktan sonra kullan.
   - Spec'i uygulanabilir fazlara böldür.

3. `phases/PHASE_01_SYSTEM_ANALYSIS.md`
   - İlk faz olarak sadece sistem analizi yaptır.
   - Kod yazdırma.

4. `phases/PHASE_02_...` ile devam et
   - Her seferinde sadece tek faz uygulat.
   - Faz bitince test, güvenlik notları ve rollback planı iste.

5. `03_APPLY_SINGLE_PHASE_TEMPLATE.md`
   - Yeni veya özel bir faz açman gerektiğinde bu şablonu kullan.

## Kesin Akış

```txt
Ana spec çıkar
Faz planı çıkar
Faz 1 sistem analizi yap
Faz 2 uygula
Test et
Faz 3 uygula
Test et
...
Faz 10 QA/security/release review yap
```

## Kritik Kural

İlk promptta ve Faz 1'de kod yazdırma. Önce sistem haritası, riskler, dosya listesi ve teknik spec netleşmelidir.
