# Faz 8 - Super Admin Log Ekranı

## Amaç

Super admin için audit logları arama, filtreleme ve detay görüntüleme özellikleriyle yönetilebilir hale getirmek.

## Bu Faz İçin Okunacak Skills

```txt
docs/skills/03_FRONTEND_UI_SKILL.md
docs/skills/04_MOBILE_UX_SKILL.md
docs/skills/05_BACKEND_API_SKILL.md
docs/skills/07_AUTH_SECURITY_SKILL.md
docs/skills/08_SAAS_TENANT_SKILL.md
docs/skills/09_AUDIT_LOG_SKILL.md
docs/skills/11_QA_TEST_SKILL.md
```

## Kapsam

```txt
- Super admin'e özel /admin/audit-logs route'u ekle.
- Backend'de audit log liste endpointi ekle.
- Arama, tenant, kullanıcı, modül, action, severity, status ve tarih filtreleri ekle.
- Pagination ekle.
- Detay drawer/modal oluştur.
- JSON metadata görüntüle.
- Mobilde kart liste kullan.
- Normal tenant admin/sales user erişimini backend'de 403 yap.
```

## Değiştirilecek Dosyalar

```txt
src/App.tsx
src/components/layouts/AdminLayout.tsx
src/api.ts
```

## Oluşturulabilecek Dosyalar

```txt
src/pages/admin/AuditLogs.tsx
src/components/audit-logs/AuditLogFilters.tsx
src/components/audit-logs/AuditLogDetailDrawer.tsx
```

## Test Adımları

```txt
- Super admin log ekranına girebilir.
- Tenant admin 403 veya admin ana sayfaya yönlendirme alır.
- Filtreler doğru çalışır.
- Metadata hassas veri içermez.
- Mobilde tablo yerine kart liste kullanılabilir.
```

## Rollback Planı

Yeni route ve nav link kaldırılır. Backend endpoint korunabilir veya kapatılabilir.
