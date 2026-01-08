# Panduan Menjalankan Aplikasi Secara Lokal (Universal)

Panduan ini dirancang untuk membantu Anda menjalankan aplikasi **Cemilan KasirPOS** di komputer lokal menggunakan **Node.js**.

## 📋 Prasyarat Sistem

Pastikan komputer Anda sudah terinstall:

1.  **Node.js** (Versi 18 atau lebih baru) - [Download Node.js](https://nodejs.org/)
2.  **MySQL / MariaDB** - Anda bisa menggunakan XAMPP, Laragon, atau MySQL Installer standalone.
3.  **Git** (Opsional, untuk clone repository).

---

## 🚀 Langkah 1: Persiapan Database

1.  Buka aplikasi manajemen database Anda (phpMyAdmin, HeidiSQL, DBeaver, dll).
2.  Buat database baru dengan nama: `cemilankasirpos_php`.
3.  (Opsional) Import file SQL `cemilankasirpos_php.sql` jika Anda ingin struktur awal, namun backend Node.js (Sequelize) akan otomatis membuat tabel jika belum ada.

---

## ⚙️ Langkah 2: Setup Backend (Node.js)

Backend aplikasi ini menggunakan Node.js (Express) dan terletak di folder `server`.

### 1. Masuk ke Folder Server
Buka Terminal / Command Prompt dan arahkan ke folder `server`:

```bash
cd server
```

### 2. Install Dependencies
Jalankan perintah berikut untuk menginstall library yang dibutuhkan:

```bash
npm install
```

### 3. Konfigurasi Environment (.env)
Buat file bernama `.env` di dalam folder `server` dan isi dengan konfigurasi berikut:

```env
DB_NAME=cemilankasirpos_php
DB_USER=root
DB_PASS=
DB_HOST=localhost
PORT=3001
JWT_SECRET=rahasia_dapur_cemilan_kasirpos_2025_secure_key
NODE_ENV=development
```
*Sesuaikan `DB_USER` dan `DB_PASS` dengan settingan MySQL lokal Anda.*

### 4. Jalankan Server Backend
Jalankan perintah:

```bash
npm start
```
Jika berhasil, Anda akan melihat pesan:
`Server running on port 3001`
`Database synced`

Backend Anda aktif di: `http://localhost:3001`.

---

## 💻 Langkah 3: Setup Frontend (React)

Frontend dibangun menggunakan React + Vite.

1.  Buka Terminal baru (jangan tutup terminal backend).
2.  Pastikan Anda berada di **root folder** project `cemilan-kasirpos`.
3.  Install dependencies (hanya perlu sekali di awal):
    ```bash
    npm install
    ```

4.  **Konfigurasi URL Backend (.env)**:
    *   Buat file bernama `.env` di root folder (sejajar dengan `package.json`).
    *   Isi file `.env` tersebut:

    ```env
    VITE_API_URL=http://localhost:3001/api
    ```

5.  Jalankan Frontend:
    ```bash
    npm run dev
    ```
6.  Buka browser dan akses alamat yang muncul (biasanya `http://localhost:5173`).

---

## 🛠 Troubleshooting (Masalah Umum)

### 1. Error: "Network Error" atau Data Tidak Muncul
*   **Cek URL API**: Pastikan `VITE_API_URL` di file `.env` root project sudah benar (`http://localhost:3001/api`).
*   **Restart Frontend**: Setiap kali mengubah file `.env`, Anda **wajib** mematikan server frontend (Ctrl+C) dan menjalankannya lagi (`npm run dev`).
*   **Cek Backend**: Pastikan server backend (`npm start` di folder `server`) masih berjalan dan tidak ada error.

### 2. Error: "Database connection failed" (Backend)
*   Pastikan MySQL service sedang berjalan.
*   Cek kembali username, password, dan nama database di `server/.env`.

### 3. Login Gagal / Password Salah
*   Gunakan user default:
    *   **Username**: `superadmin`
    *   **Password**: `password`
*   Sistem akan otomatis meng-hash password saat login pertama jika masih plain-text.

---
**Selamat Menggunakan Cemilan KasirPOS!** 🍬
