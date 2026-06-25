# SiTabung AI  Sistem Tabungan Siswa Berbasis AI

Aplikasi web **full-stack** untuk membantu pencatatan, pengelolaan, dan analisis tabungan siswa secara digital.
SiTabung AI memiliki fitur **OCR berbasis AI** yang dapat membaca foto buku tabungan secara otomatis sehingga transaksi dapat dicatat lebih cepat dan akurat.

 **Demo Aplikasi:**
https://web-ai-three-theta.vercel.app

---

##  Tech Stack

| Layer      | Teknologi                                  |
| ---------- | ------------------------------------------ |
| Frontend   | HTML, Tailwind CSS CDN, Vanilla JavaScript |
| Backend    | Node.js + Express.js                       |
| Database   | PostgreSQL menggunakan Supabase            |
| AI / OCR   | Google Gemini Flash API                    |
| Deployment | Vercel Serverless Functions                |

---

#  Fitur Utama

##  AI OCR Buku Tabungan

Pengguna dapat mengunggah foto buku tabungan, kemudian AI akan membaca informasi transaksi seperti:

* Nama siswa
* Tanggal transaksi
* Jenis transaksi
* Nominal uang masuk/keluar
* Saldo akhir

Hasil pembacaan dapat langsung disimpan ke database.

---

##  Chatbot AI

Tersedia fitur percakapan dengan AI untuk membantu pengguna mendapatkan informasi seperti:

* Total tabungan kelas
* Siswa dengan saldo tertinggi
* Ringkasan kondisi tabungan
* Informasi transaksi tertentu

---

##  Rekap Tabungan Kelas

Menampilkan data seluruh siswa:

* Nama siswa
* NIS
* Total saldo
* Riwayat transaksi

Data diperbarui secara real-time dari database.

---

##  Analisis AI

AI dapat membuat analisis otomatis mengenai kondisi tabungan kelas, contohnya:

* Rata-rata tabungan siswa
* Perbandingan jumlah saldo
* Saran pengelolaan tabungan

---

##  Input Manual Transaksi

Selain menggunakan OCR, pengguna dapat menambahkan transaksi secara manual:

* Setoran
* Penarikan
* Koreksi transaksi

---

##  Manajemen Data

Tersedia fitur:

* Menghapus transaksi
* Memperbaiki data
* Melihat detail transaksi siswa

---

##  Export Data

Rekap tabungan dapat diekspor dalam bentuk CSV untuk:

* Laporan sekolah
* Dokumentasi
* Pengolahan spreadsheet

---

##  Responsive Design

Tampilan aplikasi sudah menyesuaikan berbagai perangkat:

* Desktop
* Tablet
* Smartphone

---

#  Cara Menjalankan Project

## 1. Clone Repository

```bash
git clone https://github.com/username/sitabung-ai.git

cd sitabung-ai

npm install
```

---

# 2. Konfigurasi Database Supabase

Buat project baru di Supabase:

1. Masuk ke dashboard Supabase
2. Buat project baru
3. Buka menu SQL Editor
4. Jalankan file:

```
schema.sql
```

Database akan otomatis membuat tabel yang diperlukan.

---

# 3. Konfigurasi API Supabase

Ambil data:

```
Settings → API
```

Kemudian simpan:

```
SUPABASE_URL

SUPABASE_SERVICE_KEY
```

Gunakan key:

```
service_role
```

---

# 4. Konfigurasi Gemini AI

Buat API Key melalui Google AI Studio.

Simpan:

```
GEMINI_API_KEY
```

API digunakan untuk:

* OCR gambar
* Analisis data
* Chatbot AI

---

# 5. Environment Variable

Buat file:

```
.env
```

Isi:

```env
SUPABASE_URL=https://xxxxx.supabase.co

SUPABASE_SERVICE_KEY=xxxxx

GEMINI_API_KEY=xxxxx

PORT=3000
```

---

# 6. Jalankan Lokal

```bash
npm run dev
```

Akses:

```
http://localhost:3000
```

---

#  Deployment Vercel

Install Vercel CLI:

```bash
npm install -g vercel
```

Login:

```bash
vercel login
```

Deploy:

```bash
vercel
```

Tambahkan environment variable:

```bash
vercel env add SUPABASE_URL

vercel env add SUPABASE_SERVICE_KEY

vercel env add GEMINI_API_KEY
```

Deploy production:

```bash
vercel --prod
```

---

#  Struktur Project

```
sitabung-ai/

├── api/
│   └── server.js

├── public/
│   ├── index.html
│   ├── scan.html
│   ├── rekap.html
│   ├── siswa.html
│   │
│   └── js/
│       ├── shared.js
│       ├── scan.js
│       ├── rekap.js
│       └── siswa.js

├── schema.sql
├── package.json
├── vercel.json
└── .env.example
```

---

#  API Endpoint

| Method | Endpoint              | Fungsi                  |
| ------ | --------------------- | ----------------------- |
| GET    | `/api/siswa`          | Menampilkan semua siswa |
| GET    | `/api/siswa/:nis`     | Detail siswa            |
| GET    | `/api/transaksi/:nis` | Riwayat transaksi       |
| POST   | `/api/transaksi`      | Tambah transaksi        |
| POST   | `/api/transaksi/bulk` | Simpan hasil OCR        |
| DELETE | `/api/transaksi/:id`  | Hapus transaksi         |
| POST   | `/api/ai/ocr`         | Proses OCR AI           |
| POST   | `/api/ai/chat`        | Chatbot AI              |
| POST   | `/api/ai/analisis`    | Analisis tabungan       |

---

#  Data Siswa

Aplikasi sudah menggunakan data siswa yang tersimpan pada database Supabase.

Data dapat disesuaikan melalui:

```
schema.sql
```

---

#  Troubleshooting

| Kendala                   | Solusi                                   |
| ------------------------- | ---------------------------------------- |
| Server tidak terhubung    | Cek environment variable                 |
| OCR gagal                 | Pastikan API Gemini aktif dan foto jelas |
| Data tidak masuk database | Pastikan memakai SUPABASE_SERVICE_KEY    |
| Error deploy Vercel       | Periksa konfigurasi vercel.json          |
| Tampilan mobile rusak     | Update file frontend terbaru             |

---

#  AI Engine

Sistem menggunakan Google Gemini Flash sebagai engine AI untuk:

* Membaca gambar buku tabungan
* Mengekstrak transaksi
* Membuat analisis
* Menjawab pertanyaan pengguna

AI terintegrasi melalui API sehingga proses dapat berjalan langsung dari aplikasi web.

---

##  Tujuan Sistem

SiTabung AI dibuat untuk membantu guru atau pengelola kelas dalam:

* Digitalisasi pencatatan tabungan siswa
* Mengurangi kesalahan pencatatan manual
* Mempermudah monitoring saldo
* Membuat laporan tabungan secara otomatis

---

© 2026 SiTabung AI
