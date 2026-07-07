# Jadwal

Aplikasi web untuk kelola jadwal shift staff — pengganti spreadsheet jadwal (staff, kode shift, jadwal mingguan, target jam PT, validasi libur).

Dibangun dengan [Next.js](https://nextjs.org) (App Router), [Prisma](https://www.prisma.io), dan PostgreSQL.

## Fitur

- **Jadwal** — grid mingguan per periode gajian (default tanggal 21 s/d 20 bulan berikutnya). Pilih kode shift per staff per hari; total jam, total libur, status *Jam Terpenuhi / Kurang X jam*, dan jumlah yang masuk/libur per hari terhitung otomatis dengan validasi aturan libur.
- **Staff** — tambah/edit/nonaktifkan/hapus staff (tipe FT/PT).
- **Kode Shift** — kelola kode shift beserta jam mulai, jam selesai, durasi, dan kategori (FT/PT/OFF/HOLIDAY/MEETING).
- **Pengaturan** — target jam PT per periode, tanggal mulai/selesai periode, dan aturan libur (min/max per minggu, min/max orang libur per hari).

## Menjalankan secara lokal

Prasyarat: Node.js 20+, PostgreSQL.

```bash
# 1. Install dependency
npm install

# 2. Siapkan environment
cp .env.example .env
# lalu edit DATABASE_URL sesuai database Postgres kamu

# 3. Buat skema database + isi data awal (kode shift & pengaturan dari spreadsheet)
npx prisma migrate dev
npx prisma db seed

# 4. Jalankan
npm run dev
```

Buka http://localhost:3000.

## Deploy ke Vercel

1. **Siapkan database Postgres** (pilih salah satu):
   - Vercel Marketplace → **Neon** (gratis, paling mudah dari dashboard Vercel), atau
   - [Supabase](https://supabase.com) / [Prisma Postgres](https://www.prisma.io/postgres) / provider lain.
   Salin *connection string*-nya.

2. **Import repo ini di Vercel**: [vercel.com/new](https://vercel.com/new) → pilih repo `jadwal`. Framework terdeteksi otomatis sebagai Next.js (build command `npm run build` sudah menjalankan `prisma generate`).

3. **Set environment variable** di project Vercel → Settings → Environment Variables:
   - `DATABASE_URL` = connection string Postgres dari langkah 1.

4. **Deploy**, lalu jalankan migrasi + seed sekali dari mesin lokal (mengarah ke database produksi):

   ```bash
   DATABASE_URL="<connection-string-produksi>" npx prisma migrate deploy
   DATABASE_URL="<connection-string-produksi>" npx prisma db seed
   ```

5. Selesai — aplikasi live di domain `*.vercel.app`. Push berikutnya ke branch produksi akan auto-deploy.

## Struktur data

| Model | Isi |
| --- | --- |
| `Staff` | nama, tipe (FT/PT), aktif |
| `ShiftCode` | kode (mis. `PT8`, `OP1`, `dayoff`), jam mulai/selesai, durasi jam, kategori |
| `Assignment` | satu shift untuk satu staff pada satu tanggal (unik per staff+tanggal) |
| `Config` | target jam PT, tanggal periode, aturan libur |

## Perintah berguna

```bash
npm run dev        # jalankan development server
npm run build      # production build (termasuk prisma generate)
npm run db:seed    # isi ulang data awal (upsert, aman diulang)
npx prisma studio  # GUI untuk lihat/edit isi database
```
