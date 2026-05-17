# Katalog SaaS Skills Paketi

Bu paket, katalog / satış / SaaS projen için AI araçlarına verilecek uzmanlık dosyalarını içerir.

## Klasör Yapısı

```txt
docs/
  skills/
    00_SYSTEM_ANALYSIS_SKILL.md
    01_IDEA_REVIEW_SKILL.md
    02_FEATURE_SPEC_SKILL.md
    03_FRONTEND_UI_SKILL.md
    04_MOBILE_UX_SKILL.md
    05_BACKEND_API_SKILL.md
    06_DATABASE_SKILL.md
    07_AUTH_SECURITY_SKILL.md
    08_SAAS_TENANT_SKILL.md
    09_AUDIT_LOG_SKILL.md
    10_NOTIFICATION_SKILL.md
    11_QA_TEST_SKILL.md
    12_RELEASE_REVIEW_SKILL.md
    13_PROMPT_WORKFLOW_SKILL.md
```

## Nasıl Kullanılır?

Bu `docs` klasörünü projenin kök dizinine kopyala.

Codex veya başka bir AI kodlama aracına yeni özellik vermeden önce şu promptu kullan:

```md
Önce docs/skills klasöründeki ilgili skill dosyalarını oku.
Kod yazma.
Mevcut sistemi analiz et.
Sonra fikri değerlendir ve teknik spec hazırla.
```

## Önerilen Çalışma Sırası

```txt
1. 00_SYSTEM_ANALYSIS_SKILL.md
2. 01_IDEA_REVIEW_SKILL.md
3. 02_FEATURE_SPEC_SKILL.md
4. İlgili uzmanlık skill dosyası
5. 11_QA_TEST_SKILL.md
6. 12_RELEASE_REVIEW_SKILL.md
```

Örnek: Bildirimler için:

```txt
00_SYSTEM_ANALYSIS_SKILL.md
01_IDEA_REVIEW_SKILL.md
02_FEATURE_SPEC_SKILL.md
10_NOTIFICATION_SKILL.md
03_FRONTEND_UI_SKILL.md
05_BACKEND_API_SKILL.md
11_QA_TEST_SKILL.md
```

Örnek: Loglama için:

```txt
00_SYSTEM_ANALYSIS_SKILL.md
01_IDEA_REVIEW_SKILL.md
02_FEATURE_SPEC_SKILL.md
09_AUDIT_LOG_SKILL.md
06_DATABASE_SKILL.md
07_AUTH_SECURITY_SKILL.md
08_SAAS_TENANT_SKILL.md
11_QA_TEST_SKILL.md
```
