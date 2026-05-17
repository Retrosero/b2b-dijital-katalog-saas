# 13 - PROMPT WORKFLOW SKILL

## Amaç

Bu skill, Codex veya başka AI kodlama araçlarına iş verirken kullanılacak prompt sırasını ve güvenli çalışma yöntemini tanımlar.

---

## Temel Akış

Yeni bir özellik için aşağıdaki sıra izlenmelidir:

```txt
1. Sistem analizi
2. Fikir değerlendirme
3. Teknik spec
4. Faz planı
5. Sadece tek faz uygulama
6. Test
7. Security review
8. Dokümantasyon
```

---

## İlk Prompt: Sistem Analizi

```md
Önce projeyi incele.

Aşağıdaki dosyaları oku:
- docs/skills/00_SYSTEM_ANALYSIS_SKILL.md
- docs/skills/01_IDEA_REVIEW_SKILL.md
- docs/skills/02_FEATURE_SPEC_SKILL.md

Kod yazma.

Mevcut routing, auth, permission, layout, navbar, API, database, tenant, bildirim ve loglama yapısını çıkar.
Varsayım yaparsan açıkça belirt.
Gerçek dosya yollarını kullan.
```

---

## İkinci Prompt: Fikir Değerlendirme

```md
Aşağıdaki fikri kodlamadan önce docs/skills/01_IDEA_REVIEW_SKILL.md dosyasına göre değerlendir.

Fikir:
[Buraya fikir yaz]

Kod yazma.
Ürün değeri, UX, frontend, backend, database, security, SaaS/tenant, loglama, performans ve MVP önceliğini değerlendir.
Sonunda net karar ver.
```

---

## Üçüncü Prompt: Teknik Spec

```md
Onaylanan fikri docs/skills/02_FEATURE_SPEC_SKILL.md dosyasına göre teknik spec’e çevir.

Kod yazma.
Etkilenen dosyaları, oluşturulacak dosyaları, API ihtiyaçlarını, database etkilerini, auth/permission kurallarını, loglama gereksinimlerini ve test senaryolarını yaz.
```

---

## Dördüncü Prompt: Faz Uygulama

```md
Hazırladığın spec içindeki sadece Faz 1’i uygula.

Kurallar:
- Belirtilen kapsam dışına çıkma.
- Gereksiz refactor yapma.
- Değiştirdiğin dosyaları listele.
- Test adımlarını yaz.
- Eksik veya riskli alanları belirt.
```

---

## Beşinci Prompt: Test ve Review

```md
Yapılan değişiklikleri docs/skills/11_QA_TEST_SKILL.md ve docs/skills/07_AUTH_SECURITY_SKILL.md dosyalarına göre test et.

Kod yazma.
Başarılı testleri, başarısız testleri, güvenlik risklerini ve düzeltme önerilerini raporla.
```
