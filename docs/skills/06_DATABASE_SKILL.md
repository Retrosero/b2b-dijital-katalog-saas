# 06 - DATABASE SKILL

## Amaç

Bu skill, database schema, migration, index, veri ilişkileri ve performans planlaması için kullanılır.

---

## Ne Zaman Kullanılır?

- Yeni tablo gerektiğinde
- Yeni kolon gerektiğinde
- Loglama veya bildirim sistemi değiştiğinde
- Tenant/firma ayrımı etkilendiğinde
- Büyük listeler için performans gerektiğinde
- Migration hazırlanırken

---

## Database Kuralları

- Veri kaybı oluşturacak migration yazma.
- Backward-compatible değişiklik tercih et.
- Tenant ilişkili tüm kayıtlarda tenant_id olmalıdır.
- Büyük listeler için index planı yapılmalıdır.
- Log tabloları büyüyeceği için created_at ve tenant_id indexlenmelidir.
- JSON metadata içinde hassas veri tutulmamalıdır.
- Migration için geri alma planı yazılmalıdır.
- Migration önce development ortamında test edilmelidir.
- Eski verilerle uyumluluk korunmalıdır.

---

## Audit Log Önerilen Alanlar

```txt
id
tenant_id
user_id
user_name
user_role
module
action
entity_type
entity_id
entity_name
description
status
severity
ip_address
user_agent
metadata
created_at
```

---

## Önerilen Indexler

Audit log için:

```txt
tenant_id
created_at
module
action
severity
status
user_id
entity_type
entity_id
```

Notification için:

```txt
tenant_id
user_id
is_read
created_at
type
```

---

## Çıktı Formatı

```txt
Mevcut tablo analizi
Yeni tablo/kolon ihtiyacı
Migration planı
Index planı
Veri kaybı riski
Rollback planı
Performans notları
```
