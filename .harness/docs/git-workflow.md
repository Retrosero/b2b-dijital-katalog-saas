# Git Workflow Standards

## Branch Yapısı

```
main (production)
  └── develop (development)
        └── feature/* (features)
        └── fix/* (bug fixes)
        └── hotfix/* (urgent fixes)
```

## Branch Naming

```
feature/katalog-yenilik
feature/musteri-ozel-fiyat
fix/siparis-stok-bug
hotfix/guvenlik-acigi
```

## Commit Mesajları

Format: `<type>(<scope>): <description>`

Types:
- `feat` - Yeni özellik
- `fix` - Bug fix
- `docs` - Dokümantasyon
- `style` - Formatting
- `refactor` - Code restructure
- `test` - Test ekleme
- `chore` - Maintenance

Örnekler:
```
feat(catalog): musteriye ozel katalog fiyati eklendi
fix(order): stok dustugunde negatif deger engellendi
docs(readme): deployment bilgisi guncellendi
```

## Worktree Kullanımı

Tüm code değişiklikleri `.worktrees/` altında branch ile yapılır:

```bash
# Feature branch oluştur
git worktree add .worktrees/feature-katalog-v2 feature/katalog-yenilik

# Değişiklikleri commitle
cd .worktrees/feature-katalog-v2
git add .
git commit -m "feat(catalog): ..."

# Ana branch'e merge
git checkout main
git merge .worktrees/feature-katalog-v2
```

## PR Oluşturma

1. Branch'i push et
2. PR aç ve description ekle
3. Reviewer assign et
4. CI geçmesini bekle
5. Review onayı sonrası merge

## Review Süreci

1. Code review - code-reviewer
2. Security check - code-reviewer
3. Test coverage check - tester
4. Manual testing (gerekirse)
5. Merge approval