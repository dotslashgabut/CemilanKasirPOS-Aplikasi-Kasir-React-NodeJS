# Panduan Pengembangan (Development Guide)

Dokumen ini berisi panduan untuk setup lingkungan pengembangan (development environment) untuk aplikasi Cemilan KasirPOS. Aplikasi ini menggunakan backend **Node.js**.

## 📋 Prasyarat (Prerequisites)

Pastikan Anda telah menginstal perangkat lunak berikut di komputer Anda:

1. **Node.js** (versi 18 atau lebih baru) - [Download](https://nodejs.org/)
2. **MySQL** (versi 5.7 atau 8.0) - [Download](https://dev.mysql.com/downloads/mysql/)
3. **Git** - [Download](https://git-scm.com/)
4. **Code Editor** - Disarankan [VS Code](https://code.visualstudio.com/)

> **Rekomendasi:** Pengguna Windows disarankan menggunakan **Laragon** atau **XAMPP** untuk manajemen database MySQL yang lebih mudah.

## 🚀 Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/dotslashgabut/cemilan-kasirpos.git
cd cemilan-kasirpos
```

### 2. Setup Backend (Node.js)

Backend terletak di folder `server`.

1.  **Masuk ke folder server**:
    ```bash
    cd server
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Database**:
    *   Buat database baru di MySQL bernama `cemilankasirpos_php_v02`.
    *   (Opsional) Import file `cemilankasirpos_php_v02.sql` jika ingin data awal, tapi Sequelize akan membuat tabel otomatis.

4.  **Konfigurasi Environment**:
    *   Buat file `.env` di dalam folder `server`.
    *   Isi dengan konfigurasi berikut:
        ```env
        DB_NAME=cemilankasirpos_php_v02
        DB_USER=root
        DB_PASS=
        DB_HOST=localhost
        PORT=3001
        JWT_SECRET=development_secret_key
        NODE_ENV=development
        ```

5.  **Jalankan Server**:
    ```bash
    npm start
    ```
    *   Backend akan berjalan di `http://localhost:3001`.

### 3. Setup Frontend (React + Vite)

Buka terminal baru (biarkan terminal backend tetap berjalan).

#### A. Instalasi Dependensi Frontend

```bash
# Kembali ke root project
cd ..
# atau jika dari terminal baru: cd cemilan-kasirpos

npm install
```

Frontend menggunakan:
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts & graphs

#### B. Konfigurasi Environment

Buat atau edit file `.env` di root project:

```env
VITE_API_URL=http://localhost:3001/api
```

#### C. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`.

**Verifikasi Frontend**:
- Buka browser dan akses `http://localhost:5173`
- Halaman login seharusnya muncul
- Coba login dengan kredensial default: `superadmin` / `password`

## 📁 Struktur Project

```
cemilan-kasirpos/
├── components/               # Komponen UI reusable
├── pages/                    # Halaman aplikasi
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── POS.tsx
│   ├── Inventory.tsx
│   └── ...
├── services/                 # API services & business logic
│   └── api.ts               # Axios instance & API calls
├── hooks/                    # Custom React hooks
├── utils/                    # Utility functions
├── server/                   # Backend Node.js/Express API files
│   ├── config/              # Database config
│   ├── controllers/         # Request handlers
│   ├── models/              # Sequelize models
│   ├── routes/              # API routes
│   └── index.js             # Entry point
│
├── public/                   # Static assets
├── App.tsx                  # Main app component
├── index.tsx                # Entry point
├── types.ts                 # TypeScript type definitions
├── .env                     # Frontend environment variables
├── package.json             # Frontend dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## 🔧 Workflow Pengembangan

### Backend Development

1. **Membuat Endpoint Baru**:
   - Definisikan route di `server/routes/`
   - Buat controller di `server/controllers/`
   - Test dengan Postman/Curl

2. **Database Changes**:
   - Edit model di `server/models/`
   - Sequelize `sync({ alter: true })` akan otomatis update skema saat server restart (di mode development).

### Frontend Development

1. **Membuat Halaman Baru**:
   - Buat file di `pages/`
   - Tambahkan routing di `App.tsx`
   - Vite HMR akan langsung update browser

2. **Membuat Komponen**:
   - Buat file di `components/`
   - Import dan gunakan di halaman

3. **API Integration**:
   - Tambahkan fungsi API di `services/api.ts`
   - Gunakan `async/await` untuk API calls
   - Handle error dengan try-catch

### Database Management

1. **Melihat Data**:
   - Gunakan phpMyAdmin, DBeaver, atau MySQL Workbench.
   - Connect ke database `cemilankasirpos`.

## 🐛 Troubleshooting

### Backend Issues

**❌ Database Connection Error**
```
SequelizeConnectionError: Access denied for user 'root'@'localhost'
```
**Solusi**:
- Cek kredensial di `server/.env`
- Pastikan MySQL service berjalan

**❌ Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solusi**:
- Kill proses yang menggunakan port 3001 atau ubah `PORT` di `.env`.

### Frontend Issues

**❌ API URL Not Configured**
```
Error: Network Error
```
**Solusi**:
- Pastikan `VITE_API_URL` ada di `.env` dan mengarah ke `http://localhost:3001/api`.
- Restart dev server setelah edit `.env`.

## 📚 Resources & Documentation

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## 🔐 Default Credentials (Development)

- **Username**: `superadmin`
- **Password**: `password`

> **Penting**: Ganti semua password default sebelum deployment ke production!

## 🛡️ Catatan Keamanan (Security Note)

Aplikasi ini memiliki fitur keamanan yang bergantung pada environment variable `NODE_ENV`.

*   **Development (`NODE_ENV=development`)**: Error akan ditampilkan secara detail (stack trace) untuk memudahkan debugging.
*   **Production (`NODE_ENV=production`)**: Error detail akan disembunyikan dan diganti dengan pesan generik untuk keamanan.

> Pastikan Anda membaca **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** untuk memahami audit keamanan dan praktik terbaik sebelum melakukan deployment.
