# SiTabung AI — Sistem Tabungan Siswa Berbasis AI

Aplikasi web full-stack untuk pencatatan tabungan siswa dengan fitur OCR foto buku tabungan menggunakan **Gemini 3.5 Flash** (model terbaru Google AI).

---

## 🏗️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | HTML + Tailwind CSS (CDN) + Vanilla JS |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL via **Supabase** |
| **AI / OCR** | Google Gemini **3.5 Flash** |
| **Deploy** | **Vercel** (backend sebagai Serverless Functions) |

---

## ✨ Fitur Utama

- 📸 **OCR Foto** — Upload foto buku tabungan, AI baca otomatis semua transaksi
- 💬 **Chatbot AI** — Tanya langsung ke AI seputar data tabungan kelas
- 📊 **Rekap Kelas** — Tabel rekap semua 21 siswa dengan saldo real-time
- 🤖 **Analisis AI** — Gemini buat ringkasan kondisi tabungan kelas
- ➕ **Input Manual** — Tambah transaksi tanpa scan foto
- 🗑️ **Hapus Transaksi** — Edit dan koreksi data
- 📥 **Export CSV** — Download rekap ke spreadsheet
- 🟢 **Status Koneksi** — Indikator real-time koneksi ke server

---

## 🚀 Cara Setup (Langkah demi Langkah)

### 1. Clone & Install

```bash
git clone https://github.com/username/sitabung-ai.git
cd sitabung-ai
npm install
```

### 2. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Isi nama project: `sitabung-ai`, pilih region terdekat (Singapore)
3. Tunggu project selesai dibuat (~2 menit)
4. Buka **SQL Editor** → **New Query**
5. Copy-paste isi file `schema.sql` → klik **Run**
6. Pastikan muncul pesan "Success. No rows returned"

### 3. Ambil Credentials Supabase

Di dashboard Supabase: **Settings → API**

- **Project URL** → copy ke `SUPABASE_URL`
- **service_role** key (bukan anon!) → copy ke `SUPABASE_SERVICE_KEY`

### 4. Buat API Key Gemini

1. Buka [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Klik **Create API Key**
3. Copy key → simpan ke `GEMINI_API_KEY`

> ✅ Gemini 3.5 Flash tersedia **gratis** dengan rate limit yang cukup untuk penggunaan kelas.

### 5. Setup Environment Variables

```bash
cp .env.example .env
```

Edit file `.env`:

```env
SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
GEMINI_API_KEY=AIzaSy...
PORT=3000
```

### 6. Jalankan Lokal

```bash
npm run dev
```

Buka browser → [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploy ke Vercel

### Persiapan

```bash
npm install -g vercel
vercel login
```

### Deploy

```bash
vercel
```

Ikuti prompt:
- **Set up and deploy?** → Y
- **Which scope?** → pilih akun kamu
- **Link to existing project?** → N
- **Project name** → `sitabung-ai`
- **Directory** → `./` (root)

### Set Environment Variables di Vercel

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add GEMINI_API_KEY
```

Atau lewat dashboard: **Vercel → Project → Settings → Environment Variables**

### Deploy ulang dengan env vars

```bash
vercel --prod
```

---

## 📁 Struktur Project

```
sitabung-ai/
├── api/
│   └── server.js          # Backend Express (Vercel Serverless)
├── public/
│   ├── index.html         # Frontend utama (Tailwind CSS)
│   └── js/
│       └── app.js         # JavaScript frontend
├── schema.sql             # Schema + seed data Supabase
├── vercel.json            # Konfigurasi routing Vercel
├── package.json
├── .env.example
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/siswa` | Semua siswa + saldo rekap |
| `GET` | `/api/siswa/:nis` | Detail satu siswa |
| `GET` | `/api/transaksi/:nis` | Riwayat transaksi siswa |
| `POST` | `/api/transaksi` | Tambah transaksi manual |
| `POST` | `/api/transaksi/bulk` | Simpan banyak transaksi (hasil OCR) |
| `DELETE` | `/api/transaksi/:id` | Hapus transaksi |
| `POST` | `/api/ai/ocr` | OCR foto buku tabungan (multipart) |
| `POST` | `/api/ai/chat` | Tanya AI tentang rekap kelas |
| `POST` | `/api/ai/analisis` | Generate analisis kelas otomatis |

---

## 🧑‍🎓 Data Kelas

Aplikasi sudah terisi data **21 siswa Kelas Pak Anang** (NIS 25001–25021). Data dimasukkan otomatis lewat `schema.sql` saat setup Supabase.

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Dot koneksi merah | Cek `.env` sudah benar, server berjalan |
| OCR error | Pastikan GEMINI_API_KEY valid dan foto cukup jelas |
| Data tidak tersimpan | Cek SUPABASE_SERVICE_KEY (harus `service_role`, bukan `anon`) |
| 404 di Vercel | Pastikan `vercel.json` ada dan benar |

---

## 📝 Model AI

Model: **`gemini-3.5-flash`** (Google DeepMind, 2026)

> Pengganti resmi dari `gemini-2.0-flash` yang sudah ditutup permanen pada 1 Juni 2026.
> Gemini 3.5 Flash lebih cepat, lebih akurat, dan tetap tersedia gratis via Google AI Studio.
