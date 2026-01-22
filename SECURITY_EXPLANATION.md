# Penjelasan Detail Implementasi Keamanan (Node.js) - 2026 Update

Dokumen ini memberikan penjelasan mendalam mengenai beberapa mekanisme keamanan utama yang diterapkan pada backend Node.js Cemilan KasirPOS.

## 1. SQL Injection Prevention (via Sequelize)

### Masalah
SQL Injection adalah serangan di mana penyerang menyisipkan kode SQL berbahaya ke dalam input aplikasi untuk memanipulasi database.

### Solusi: Sequelize ORM
Aplikasi ini menggunakan **Sequelize ORM** yang secara default menggunakan *parameterized queries*. Ini berarti input pengguna tidak pernah digabungkan langsung dengan string query SQL.

**Contoh Aman (Sequelize):**
```javascript
// Aman: Sequelize otomatis meng-escape input 'username'
const user = await User.findOne({ where: { username: req.body.username } });
```

**Contoh Tidak Aman (Raw SQL - Dihindari):**
```javascript
// Bahaya: Rentan SQL Injection
const query = "SELECT * FROM users WHERE username = '" + req.body.username + "'";
```

## 2. Security Headers (via Helmet)

### Masalah
Browser modern memiliki fitur keamanan bawaan yang perlu diaktifkan melalui HTTP Headers khusus untuk mencegah serangan seperti XSS, Clickjacking, dan MIME-sniffing.

### Solusi: Helmet Middleware
Kami menggunakan library `helmet` yang secara otomatis mengatur header-header ini.

*   **Strict-Transport-Security (HSTS)**: Memaksa browser menggunakan HTTPS.
*   **X-Frame-Options**: Mencegah situs di-embed dalam iframe (Clickjacking).
*   **X-Content-Type-Options**: Mencegah browser menebak tipe file (MIME-sniffing).
*   **X-XSS-Protection**: Mengaktifkan filter XSS bawaan browser.

## 3. Rate Limiting

### Masalah
Serangan Brute-force (mencoba password berkali-kali) atau DDoS (membanjiri server dengan request).

### Solusi: express-rate-limit
Kami membatasi jumlah request yang bisa dilakukan oleh satu IP dalam periode waktu tertentu.

*   **Global Limit**: Mencegah overload server.
*   **Login Limit**: Batas yang lebih ketat pada endpoint `/api/login` untuk mencegah tebak password.

## 4. Password Hashing (Bcrypt)

### Masalah
Menyimpan password dalam bentuk teks biasa (plain text) sangat berbahaya jika database bocor.

### Solusi: Bcrypt
Semua password di-hash menggunakan algoritma **Bcrypt** dengan *salt* otomatis sebelum disimpan ke database. Verifikasi password dilakukan dengan membandingkan hash, bukan teks asli.

```javascript
// Saat Register/Create User
const hashedPassword = await bcrypt.hash(password, 10);

// Saat Login
const match = await bcrypt.compare(inputPassword, storedHash);
```

## 5. Production Error Handling

### Masalah
Menampilkan stack trace error yang lengkap kepada pengguna dapat membocorkan informasi sensitif tentang struktur file dan kode server.

### Solusi
Middleware error handling kami mengecek `NODE_ENV`.
*   **Development**: Menampilkan stack trace lengkap.
*   **Production**: Hanya menampilkan pesan error umum ("Internal Server Error") tanpa detail teknis.
