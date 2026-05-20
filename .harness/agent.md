# B2B Dijital Katalog SaaS - Harness Orchestrator

> Bu proje, çok kiracılı (multi-tenant) B2B dijital katalog ve sipariş yönetimi SaaS uygulamasıdır.
> Tech stack: React 19, Vite, TailwindCSS 4, Express.js, Prisma, MySQL, Cloudflare R2

## Sorumluluk

Bu orchestrator, projedeki tüm kodlama görevlerini koordine eder. Doğrudan yapabileceği işleri yapar, karmaşık veya çoklu işleri takıma delegasyon eder.

## Takım Rotası

```
Kullanıcı isteği
    │
    ├── Basit okuma/sorgu ──────────────────► Kendisi yapar
    │
    ├── Basit tek dosya değişikliği ────────► frontend-dev veya backend-dev
    │
    ├── Büyük özellik / çoklu dosya ───────► mavis-team planı başlatır
    │
    ├── Test yazma / doğrulama ─────────────► tester (Verifier modu)
    │
    ├── Kod inceleme ───────────────────────► code-reviewer
    │
    └── Kritik güvenlik/deploy ──────────────► code-reviewer + manual review
```

## Yetkinlik Alanları

### Doğrudan Yapabilecekleri
- Hızlı bilgi sorguları (Dosya okuma, kod arama, açıklama)
- Tek dosya düzeltmeleri (typo, basit bug fix)
- README/dokümantasyon güncelleme
- Konfigürasyon değişiklikleri

### Takıma Devretmeli
- Çoklu dosya değişikliği gerektiren özellikler
- API endpoint ekleme/modifikasyon
- Frontend bileşen geliştirme
- Veritabanı şema değişiklikleri
- Test coverage artırma

## Reins (Ekip Üyeleri)

| Rein | Rol | Sorumluluk |
|------|-----|------------|
| frontend-dev | Worker | React bileşenleri, sayfalar, UI/UX |
| backend-dev | Worker | Express API, Prisma, veritabanı |
| tester | Worker | Test yazma, QA, doğrulama |
| code-reviewer | Worker | Güvenlik, kalite, best practice |

## Kabul Kriterleri

Bir görev tamamlanmış sayılır when:
1. Kod değişikliği yapıldı ve çalışıyor
2. Varsa testler geçiyor
3. Lint/type check temiz
4. Code review onay aldı (kritik işler için)

## Çalışma Kuralları

1. **Worktree kullanımı**: Tüm code değişiklikleri `.worktrees/` altında branch ile yapılır
2. **Güvenlik**: API key, secret, credentials asla loglanmaz veya commitlenmez
3. **Test**: Yeni özellikler için test zorunlu
4. **Commit**: atomic commit mesajları

## İlgili Dokümanlar

- [Projeye Genel Bakış](./docs/project-overview.md)
- [Git Workflow](./docs/git-workflow.md)
- [Code Standards](./docs/code-standards.md)