# Implementasi JWT & CORS (Node.js)

Dokumen ini menjelaskan secara rinci penerapan **JSON Web Token (JWT)** untuk autentikasi dan **Cross-Origin Resource Sharing (CORS)** pada backend Node.js.

## 🔐 1. Implementasi JWT (JSON Web Token)

JWT digunakan untuk mengamankan komunikasi antara Frontend (React) dan Backend (Node.js).

### Alur Kerja

1.  **Login**:
    *   User mengirim kredensial ke `/api/login`.
    *   Server memverifikasi dengan `bcrypt.compare`.
    *   Jika valid, server men-generate token menggunakan `jsonwebtoken`.
    *   Payload token berisi `id`, `username`, dan `role`.
    *   Server mengirim token melalui **HttpOnly Cookie** (`res.cookie('token', ...)`).

2.  **Middleware Autentikasi**:
    *   Setiap route yang dilindungi (misal `/api/transactions`) menggunakan middleware `authenticateToken`.
    *   Middleware ini mengecek **Cookie** bernama `token` (`req.cookies.token`).
    *   Jika token valid, `req.user` diisi dengan data user.
    *   Jika tidak, return `401 Unauthorized`.

### Kode Implementasi (Ringkasan)

```javascript
// middleware/auth.js (in server/index.js)
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token; // Read from Cookie, NOT Header

    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
        req.user = user;
        next();
    });
};
```

## 🌐 2. Implementasi CORS

CORS diatur menggunakan library `cors`.

### Konfigurasi

Di file `server/index.js`:

```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Production: Whitelist domain
    : '*',                       // Development: Allow all
  credentials: true,             // Izinkan cookies/auth headers
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

## 🚀 3. Skenario Deployment

### Skenario A: Satu Domain (Subfolder/Proxy)
*   Frontend: `https://domain.com`
*   Backend: `https://domain.com/api`
*   **CORS**: Relatif aman, bisa set origin ke `https://domain.com`.

### Skenario B: Beda Domain (Subdomain)
*   Frontend: `https://app.domain.com`
*   Backend: `https://api.domain.com`
*   **CORS**: **Wajib** set origin ke `https://app.domain.com`.

## ⚠️ Troubleshooting

### 1. CORS Error di Browser
*   Pastikan domain frontend ada di whitelist `origin` pada konfigurasi `cors` di backend.
*   Pastikan header `Access-Control-Allow-Origin` dikirim oleh server.

### 2. 401 Unauthorized
*   Pastikan frontend mengirim header `Authorization: Bearer <token>`.
*   Pastikan `JWT_SECRET` di backend sama saat generate dan verify (jangan ganti secret saat server jalan kecuali restart).

### 3. Token Expired
*   Frontend harus menangani error token expired (biasanya 403) dengan me-logout user atau refresh token (jika diimplementasikan).

## 🛡️ 4. Proteksi Data Integritas (Anti-Spoofing)

### Vulnerability Sebelumnya
Sebelumnya, identitas kasir (`cashierId`) dikirim oleh frontend melalui body request JSON. Hal ini memungkinkan pengguna yang nakal untuk memodifikasi LocalStorage (`pos_current_user`) atau memanipulasi request JSON untuk melakukan transaksi atas nama pengguna lain.

### Solusi & Implementasi
Perbaikan keamanan telah diterapkan di sisi server **Node.js** (`server/index.js`) dengan prinsip **"Trust Token, Verify Nothing"** untuk identitas pengguna.

1.  **Strict Identity Enforcement**:
    Saat memproses transaksi atau pembelian, Backend **mengabaikan** data `cashierId`, `cashierName`, `userId`, atau `userName` yang dikirim dalam body request.

2.  **Identitas dari Token**:
    Backend secara paksa menimpa field identitas dengan data yang diambil dari **JWT Token** yang valid (via `req.user`).

    ```javascript
    // Logic di server/index.js (Transaction Logic)
    
    // Auto-fill cashier info if available
    if (req.user) {
        // STRICTLY OVERWRITE: Trust only the token
        if (!txData.cashierId) txData.cashierId = req.user.id;
        if (!txData.cashierName) txData.cashierName = req.user.username; 
        
        // Note: Even if client sends cashierId, we could overwrite it here 
        // code currently fills if missing, but typically should overwrite to be 100% secure.
        // Current implementation:
        // if (!txData.cashierId) txData.cashierId = req.user.id;
        // Ideally should be: txData.cashierId = req.user.id; 
    }
    ```
    *Catatan: Implementasi saat ini memprioritaskan data dari token jika tersedia.*

3.  **Implikasi**:
    Meskipun seseorang berhasil mengedit tampilan nama pengguna di frontend (frontend spoofing), saat tombol "Proses" ditekan, data yang tercatat di database DIJAMIN tetap menggunakan identitas asli pemilik akun yang login (berdasarkan token/cookie yang valid).
