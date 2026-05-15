# B2B Dijital Katalog SaaS

Bu proje Docker uzerinde MySQL ile birlikte calisacak sekilde yapilandirildi.

## Docker ile Calistirma

### 1) Servisleri baslat
```bash
docker compose up --build -d
```

### 2) Loglari izle
```bash
docker compose logs -f app
```

### 3) Uygulamayi ac
- App: http://localhost:3000
- MySQL host portu: localhost:3308
- Container ici MySQL: mysql:3306

Compose icinde uygulama baslangicinda `prisma db push` otomatik calisir.

## Lokal Gelistirme

Docker MySQL calisirken lokal gelistirme sunucusunu baslatabilirsiniz:
```bash
npm run dev
```

Lokal `.env` dosyasi `127.0.0.1:3308` uzerinden Docker MySQL'e baglanir.

## Durdurma
```bash
docker compose down
```

Veritabani verisini de silmek icin:
```bash
docker compose down -v
```

## Environment
Ornek env degerleri icin `.env.example` dosyasini inceleyin.
