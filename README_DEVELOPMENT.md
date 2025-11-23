# Panduan Pengembangan (Development Guide)

Dokumen ini berisi panduan untuk setup lingkungan pengembangan (development environment) untuk aplikasi Cemilan KasirPOS.

## Prasyarat (Prerequisites)

Pastikan Anda telah menginstal perangkat lunak berikut di komputer Anda:

1. **Node.js** (versi 18 atau lebih baru) - [Download](https://nodejs.org/)
2. **MySQL** (versi 5.7 atau 8.0) - [Download](https://dev.mysql.com/downloads/mysql/)
3. **Git** - [Download](https://git-scm.com/)

> **Rekomendasi:** Pengguna Windows disarankan menggunakan **Laragon** atau **XAMPP** untuk manajemen database MySQL.

## Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/dotslashgabut/cemilan-kasirpos-test.git
cd cemilan-kasirpos-test
```

### 2. Setup Backend (Node.js & MySQL)

Backend terletak di folder `server`.

1. **Database**:
   * Buat database baru di MySQL bernama `cemilankasirpos`.
   * (Opsional) Import file `cemilankasirpos.sql` jika ingin data awal, namun server akan otomatis membuat tabel jika belum ada (Auto-Sync).

2. **Instalasi Dependensi Backend**:
   
   ```bash
   cd server
   npm install
   ```

3. **Konfigurasi Environment**:
   
   * Buat file `.env` di dalam folder `server`.
   * Isi dengan konfigurasi berikut:

   ```env
   DB_NAME=cemilankasirpos
   DB_USER=root
   DB_PASS=
   DB_HOST=localhost
   PORT=3001
   JWT_SECRET=rahasia_development_123
   ```
   * Sesuaikan `DB_USER` dan `DB_PASS` dengan konfigurasi MySQL Anda (kosongkan password jika default XAMPP/Laragon).

4. **Jalankan Server**:
   
   ```bash
   npm start
   ```
   Server akan berjalan di `http://localhost:3001`.

### 3. Setup Frontend (React)

Buka terminal baru (biarkan terminal backend berjalan).

1. **Instalasi Dependensi Frontend**:
   
   ```bash
   # Pastikan berada di root project (keluar dari folder server jika masih di sana)
   cd .. 
   # atau jika dari terminal baru: cd cemilan-kasirpos-test
   
   npm install
   ```

2. **Konfigurasi Environment**:
   
   * Pastikan file `.env` di root project memiliki konfigurasi URL API yang benar:
   
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

3. **Jalankan Development Server**:
   
   ```bash
   npm run dev
   ```
   
   Aplikasi akan berjalan di `http://localhost:5173`.

## Struktur Project

* `src/` - Kode sumber Frontend (React + TypeScript).
  * `pages/` - Halaman aplikasi.
  * `components/` - Komponen UI reusable.
  * `services/` - Logika komunikasi dengan API.
* `server/` - Kode sumber Backend (Node.js + Express).
  * `config/` - Konfigurasi database.
  * `models/` - Definisi model Sequelize.
  * `index.js` - Entry point server.
* `public/` - Aset statis.

## Workflow Pengembangan

1. **Backend**: Lakukan perubahan pada logika di folder `server`. Server perlu di-restart manual jika ada perubahan (kecuali menggunakan nodemon).
2. **Frontend**: Lakukan perubahan pada kode di folder `src`. Vite mendukung HMR (Hot Module Replacement) sehingga perubahan langsung terlihat di browser.
3. **Testing**: Pastikan fitur berjalan lancar dengan menguji interaksi antara frontend dan backend.

## Troubleshooting

* **Database Connection Error**: Cek kredensial di `server/.env` dan pastikan layanan MySQL berjalan.
* **Port Already in Use**: Jika port 3001 (backend) atau 5173 (frontend) terpakai, matikan proses yang menggunakannya atau ubah port di konfigurasi.
* **CORS Error**: Backend sudah dikonfigurasi menggunakan `cors`. Jika masih bermasalah, cek konfigurasi CORS di `server/index.js`.
