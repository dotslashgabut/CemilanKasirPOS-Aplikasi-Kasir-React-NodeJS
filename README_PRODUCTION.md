# Panduan Produksi & Deployment (Production Guide)

Dokumen ini menjelaskan langkah-langkah persiapan sebelum build (build preparation) dan konfigurasi untuk deployment aplikasi ke server produksi (live server). Aplikasi ini menggunakan backend **Node.js**.

## 1. Konfigurasi CORS (Cross-Origin Resource Sharing)

CORS adalah fitur keamanan browser yang membatasi bagaimana web page di satu domain bisa meminta resource dari domain lain.

### Kapan Anda Perlu Mengatur CORS?

*   **Skenario A: Satu Domain (Same Origin)**
    *   Contoh: Frontend di `https://toko-saya.com` dan Backend di `https://toko-saya.com/api` (via Nginx reverse proxy).
    *   **Tindakan:** CORS biasanya tidak masalah, tapi tetap disarankan untuk membatasi origin.

*   **Skenario B: Beda Domain (Cross Origin)**
    *   Contoh: Frontend di Vercel (`https://toko-saya.vercel.app`) dan Backend di VPS (`https://api.toko-saya.com`).
    *   **Tindakan:** Anda **WAJIB** mengatur CORS di backend agar frontend diizinkan mengakses.

### Cara Mengatur CORS (Node.js)

Buka file `server/index.js` (atau file konfigurasi CORS Anda) dan edit konfigurasi `cors`.

```javascript
// server/index.js

const cors = require('cors');

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://toko-saya.com', 'https://admin.toko-saya.com'] 
        : '*', // Allow all in development
    credentials: true
}));
```

---

## 2. Persiapan Sebelum Build (Pre-build Steps)

Sebelum menjalankan perintah build, pastikan konfigurasi aplikasi sudah benar.

### A. Konfigurasi Environment Variables

1. **Backend (Node.js)**:
    *   Pastikan server produksi memiliki file `.env` atau environment variables yang diset:
        ```env
        NODE_ENV=production
        DB_HOST=localhost
        DB_USER=prod_user
        DB_PASS=prod_password
        DB_NAME=cemilankasirpos_php_v02
        JWT_SECRET=VERY_SECURE_RANDOM_STRING
        PORT=3001
        ```

2. **Frontend (React)**:
   
   Buat atau edit file `.env.production` di root project:
   ```env
   VITE_API_URL=https://api.toko-saya.com/api
   ```
   
   *   **Jika Backend di Subdomain:** Gunakan URL lengkap.
   *   **Jika Backend di Path yang Sama (Reverse Proxy):** Gunakan path relatif seperti `/api` atau URL lengkap domain utama.

### B. Jalankan Build Frontend

Jalankan perintah berikut di terminal untuk mengubah kode React menjadi file statis (HTML/CSS/JS) yang siap di-hosting:

```bash
npm run build
```

Setelah selesai, akan muncul folder baru bernama **`dist`**. Folder inilah yang akan di-upload ke hosting.

---

## 3. Langkah Deployment

### Opsi A: Deployment ke VPS (Ubuntu/Debian) - REKOMENDASI

1.  **Setup Node.js & MySQL**:
    *   Install Node.js 18+ dan MySQL Server di VPS.
2.  **Upload Backend**:
    *   Upload folder `server` ke VPS (misal `/var/www/cemilan-backend`).
    *   Jalankan `npm install --production`.
3.  **Setup Process Manager (PM2)**:
    *   Install PM2: `npm install -g pm2`.
    *   Jalankan app: `pm2 start index.js --name "cemilan-api"`.
4.  **Setup Nginx (Reverse Proxy)**:
    *   Konfigurasi Nginx untuk serve frontend (`dist` folder) dan proxy `/api` ke `localhost:3001`.

### Opsi B: Deployment ke cPanel (Node.js App)

Lihat panduan lengkap di **[README_CPANEL_HOSTING.md](README_CPANEL_HOSTING.md)**.

### Opsi C: Deployment dengan Docker

Lihat panduan lengkap di **[README_DOCKER.md](README_DOCKER.md)**.

---

## 4. Setup Database Produksi

1.  Buat database MySQL baru di server produksi.
2.  Pastikan kredensial database di `server/.env` sudah benar.
3.  Saat backend Node.js dijalankan pertama kali, Sequelize akan otomatis membuat tabel (jika dikonfigurasi `sync`).
4.  Alternatifnya, import file SQL manual jika diperlukan.

---

## 5. Checklist Keamanan Produksi

Sebelum launching, pastikan:

### Backend (Node.js)
- [ ] `NODE_ENV` diset ke `production`.
- [ ] `JWT_SECRET` menggunakan string random yang kuat.
- [ ] CORS hanya mengizinkan domain produksi Anda.
- [ ] Menggunakan `helmet` untuk security headers.
- [ ] Rate limiting aktif (`express-rate-limit`).
- [ ] Database user hanya memiliki privilege yang dibutuhkan.

### Frontend
- [ ] `VITE_API_URL` mengarah ke URL backend produksi yang benar.
- [ ] Tidak ada console.log atau debug code yang tersisa.
- [ ] Build production sudah dijalankan (`npm run build`).

### Server & Database
- [ ] Gunakan **HTTPS** (SSL/TLS) untuk semua koneksi (Frontend & API).
- [ ] Firewall dikonfigurasi dengan benar (hanya port 80/443 yang terbuka, port 3001 ditutup dari luar jika pakai Nginx).
- [ ] Database backup otomatis sudah disetup.

---

## 6. Troubleshooting Produksi

### Backend Tidak Bisa Diakses
- Cek status PM2: `pm2 status`.
- Cek log error: `pm2 logs cemilan-api`.
- Verifikasi port 3001 berjalan: `netstat -plnt`.

### CORS Error
- Pastikan domain frontend sudah ditambahkan di whitelist CORS backend.
- Cek apakah HTTPS/HTTP konsisten.

### Database Connection Error
- Verifikasi kredensial di `server/.env`.
- Cek apakah MySQL service berjalan.

---

## 7. Maintenance & Updates

### Update Backend
```bash
# Di server
cd /path/to/server
git pull origin main
npm install --production # Jika ada dependency baru
pm2 restart cemilan-api
```

### Update Frontend
```bash
# Di local
npm run build

# Upload isi folder dist ke server
# (Overwrite file lama)
```

---

## 8. Referensi Keamanan

Untuk detail lebih lanjut mengenai audit keamanan dan perbaikan yang telah diterapkan, silakan baca dokumen:

**[SECURITY_AUDIT.md](SECURITY_AUDIT.md)**
