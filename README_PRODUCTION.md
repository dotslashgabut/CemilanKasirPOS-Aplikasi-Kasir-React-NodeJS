# Panduan Produksi & Deployment (Production Guide)

Dokumen ini menjelaskan langkah-langkah persiapan sebelum build (build preparation) dan konfigurasi CORS untuk deployment aplikasi ke server produksi (live server).

## 1. Konfigurasi CORS (Cross-Origin Resource Sharing)

CORS adalah fitur keamanan browser yang membatasi bagaimana web page di satu domain bisa meminta resource dari domain lain.

### Kapan Anda Perlu Mengatur CORS?

*   **Skenario A: Satu Domain (Same Origin) - REKOMENDASI**
    *   Contoh: Frontend di `https://toko-saya.com` dan Backend di `https://toko-saya.com/php_server`.
    *   **Tindakan:** Anda **TIDAK PERLU** pusing soal CORS. Browser mengizinkan request ke domain yang sama secara otomatis. Anda bisa membiarkan konfigurasi default.

*   **Skenario B: Beda Domain (Cross Origin)**
    *   Contoh: Frontend di Vercel (`https://toko-saya.vercel.app`) dan Backend di Hosting cPanel (`https://api.toko-saya.com`).
    *   **Tindakan:** Anda **WAJIB** mengatur CORS agar frontend diizinkan mengakses backend.

### Cara Mengatur CORS

Buka file `php_server/config.php` dan edit bagian `$allowed_origins`.
Secara default, aplikasi dikonfigurasi untuk hanya menerima request dari `http://localhost:5173`.

```php
// php_server/config.php

$allowed_origins = [
    'http://localhost:5173',      // Default (Development)
    // 'https://toko-saya.com',   // <-- TAMBAHKAN DOMAIN PRODUKSI ANDA DI SINI
];
```

> **Penting:** Jangan gunakan wildcard `*` di produksi karena kurang aman. Spesifikasikan domain Anda.

---

## 2. Persiapan Sebelum Build (Pre-build Steps)

Sebelum menjalankan perintah build, pastikan konfigurasi aplikasi sudah benar.

### A. Cek URL API (`services/api.ts`)

Secara default, aplikasi dikonfigurasi untuk mencari backend di folder relatif `/php_server/index.php/api` saat mode produksi.

Buka `services/api.ts`:
```typescript
const isProd = import.meta.env.PROD;
const API_URL = isProd
    ? '/php_server/index.php/api' // <-- Pastikan ini sesuai struktur folder server Anda
    : (import.meta.env.VITE_API_URL || '...');
```

*   **Jika Satu Server (Skenario A):** Biarkan default (`/php_server/index.php/api`). Pastikan Anda mengupload folder `php_server` ke root folder hosting Anda (sejajar dengan file `index.html` hasil build).
*   **Jika Beda Server (Skenario B):** Ubah baris tersebut menjadi URL lengkap backend Anda, misalnya: `'https://api.toko-saya.com/index.php/api'`.

### B. Jalankan Build

Jalankan perintah berikut di terminal untuk mengubah kode React menjadi file statis (HTML/CSS/JS) yang siap di-hosting:

```bash
npm run build
```

Setelah selesai, akan muncul folder baru bernama **`dist`**.
Folder `dist` inilah yang berisi aplikasi frontend Anda yang sudah jadi.

---

## 3. Langkah Deployment (Contoh: cPanel / Shared Hosting)

Ini adalah metode paling umum dan mudah (Skenario A).

1.  **Siapkan File:**
    *   Folder `dist` (hasil build frontend).
    *   Folder `php_server` (backend).

2.  **Upload ke File Manager (public_html):**
    *   Upload **isi** dari folder `dist` (file `index.html`, folder `assets`, dll) langsung ke dalam `public_html`.
    *   Upload folder `php_server` ke dalam `public_html`, sehingga strukturnya menjadi `public_html/php_server`.

    **Struktur Akhir di Server:**
    ```
    public_html/
    ├── assets/          <-- dari dist
    ├── index.html       <-- dari dist
    ├── favicon.ico      <-- dari dist
    └── php_server/      <-- folder backend
        ├── index.php
        ├── config.php
        └── ...
    ```

3.  **Setup Database:**
    *   Buat database MySQL di cPanel.
    *   Import file `cemilankasirpos.sql`.
    *   Edit `public_html/php_server/config.php` dan masukkan detail database (DB_NAME, DB_USER, DB_PASS) dari hosting Anda.

4.  **Selesai!**
    *   Buka domain Anda (misal `https://toko-saya.com`). Aplikasi seharusnya berjalan normal.

---

## 4. Checklist Keamanan Produksi

Sebelum launching, pastikan:
1.  [ ] `config.php`: `DB_PASS` sudah diisi password database yang kuat.
2.  [ ] `config.php`: `$allowed_origins` hanya berisi domain Anda sendiri.
3.  [ ] `config.php`: `display_errors` dimatikan (jika ada settingan ini di php.ini hosting) atau pastikan error tidak tampil ke pengguna.
4.  [ ] Gunakan **HTTPS** (SSL) untuk domain Anda agar password dan token aman.
