// ============================================================
// SiTabung AI — Backend Server (Express + Supabase + Gemini)
// ============================================================
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const path       = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ── Clients ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

// ── Helpers ──────────────────────────────────────────────────
const ok  = (res, data)          => res.json({ success: true, data });
const err = (res, msg, code=500) => res.status(code).json({ success: false, error: msg });

function isRetryableError(e) {
  const status = e?.status || e?.response?.status;
  if (status === 503 || status === 429) return true;
  const msg = (e?.message || '').toLowerCase();
  return msg.includes('503') || msg.includes('overloaded') ||
         msg.includes('unavailable') || msg.includes('rate limit') ||
         msg.includes('econnreset') || msg.includes('etimedout');
}

async function withRetry(fn, { retries = 3, baseDelayMs = 1000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isLastAttempt = attempt === retries;
      if (!isRetryableError(e) || isLastAttempt) throw e;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
      console.warn(`⚠️  Gemini call gagal (attempt ${attempt + 1}/${retries + 1}), retry dalam ${delay}ms — ${e.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ============================================================
// ROUTES — SISWA
// ============================================================

app.get('/api/siswa', async (req, res) => {
  const { data, error } = await supabase
    .from('rekap_siswa')
    .select('*')
    .order('no_urut');
  if (error) return err(res, error.message);
  ok(res, data);
});

app.get('/api/siswa/:nis', async (req, res) => {
  const { data, error } = await supabase
    .from('rekap_siswa')
    .select('*')
    .eq('nis', req.params.nis)
    .single();
  if (error) return err(res, error.message, 404);
  ok(res, data);
});

app.post('/api/siswa', async (req, res) => {
  const { nis, nama, no_urut } = req.body;
  if (!nis || !nama) return err(res, 'Field nis dan nama wajib diisi', 400);
  const parsedNo = parseInt(no_urut) || 0;
  if (parsedNo <= 0) return err(res, 'No. urut harus lebih dari 0', 400);

  const { data, error } = await supabase
    .from('siswa')
    .insert([{ nis, nama, no_urut: parsedNo }])
    .select()
    .single();
  if (error) {
    console.error('❌ Supabase error (tambah siswa):', error);
    if (error.code === '23505') return err(res, 'NIS sudah terdaftar', 400);
    return err(res, error.message);
  }
  ok(res, data);
});

app.put('/api/siswa/:nis', async (req, res) => {
  const nisLama = req.params.nis;
  const { nis: nisBaru, nama, no_urut } = req.body;
  if (!nisBaru || !nama) return err(res, 'Field nis dan nama wajib diisi', 400);
  const parsedNo = parseInt(no_urut) || 0;
  if (parsedNo <= 0) return err(res, 'No. urut harus lebih dari 0', 400);

  const { data, error } = await supabase
    .from('siswa')
    .update({ nis: nisBaru, nama, no_urut: parsedNo })
    .eq('nis', nisLama)
    .select()
    .single();
  if (error) {
    console.error('❌ Supabase error (update siswa):', error);
    if (error.code === '23505') return err(res, 'NIS sudah digunakan siswa lain', 400);
    return err(res, error.message);
  }
  ok(res, data);
});

app.delete('/api/siswa/:nis', async (req, res) => {
  const { error } = await supabase
    .from('siswa')
    .delete()
    .eq('nis', req.params.nis);
  if (error) {
    console.error('❌ Supabase error (hapus siswa):', error);
    return err(res, error.message);
  }
  ok(res, { deleted: true });
});

// ============================================================
// ROUTES — TRANSAKSI
// ============================================================

app.get('/api/transaksi/:nis', async (req, res) => {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*')
    .eq('nis', req.params.nis)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return err(res, error.message);
  ok(res, data);
});

app.post('/api/transaksi', async (req, res) => {
  const { nis, tanggal, jenis, jumlah, keterangan } = req.body;
  if (!nis || !tanggal || !jenis || !jumlah)
    return err(res, 'Field nis, tanggal, jenis, jumlah wajib diisi', 400);
  if (!['setor', 'tarik'].includes(jenis))
    return err(res, 'Jenis harus setor atau tarik', 400);
  const parsedJumlah = parseInt(jumlah);
  if (isNaN(parsedJumlah) || parsedJumlah <= 0)
    return err(res, 'Jumlah harus berupa angka dan lebih dari 0', 400);

  const { data, error } = await supabase
    .from('transaksi')
    .insert([{ nis, tanggal, jenis, jumlah: parsedJumlah, keterangan: keterangan || 'Manual' }])
    .select()
    .single();
  if (error) {
    console.error('❌ Supabase error (transaksi manual):', error);
    return err(res, error.message);
  }
  ok(res, data);
});

app.post('/api/transaksi/bulk', async (req, res) => {
  const { nis, transaksi: list } = req.body;
  if (!nis || !Array.isArray(list) || !list.length)
    return err(res, 'nis dan array transaksi wajib diisi', 400);

  const rows = list.map(t => ({
    nis,
    tanggal:    t.tanggal,
    jenis:      t.jenis,
    jumlah:     parseInt(t.jumlah),
    keterangan: t.keterangan || 'Hasil OCR'
  }));

  const { data, error } = await supabase
    .from('transaksi')
    .insert(rows)
    .select();
  if (error) {
    console.error('❌ Supabase error (bulk):', error);
    return err(res, error.message);
  }
  ok(res, data);
});

app.delete('/api/transaksi/:id', async (req, res) => {
  const { error } = await supabase
    .from('transaksi')
    .delete()
    .eq('id', req.params.id);
  if (error) return err(res, error.message);
  ok(res, { deleted: true });
});

// ============================================================
// ROUTES — AI
// ============================================================

app.post('/api/ai/ocr', upload.single('foto'), async (req, res) => {
  if (!req.file) return err(res, 'File foto tidak ditemukan', 400);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" }
  });

  const imagePart = {
    inlineData: {
      data:     req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype,
    },
  };

  const prompt = `Kamu adalah sistem OCR buku tabungan siswa sekolah Indonesia.
Baca foto buku tabungan ini dan ekstrak SEMUA data transaksi yang terlihat.

Balas dengan JSON array, format:
[{"tanggal":"YYYY-MM-DD","jenis":"setor","jumlah":50000,"keterangan":"Tabungan mingguan"}]

Aturan:
- tanggal format YYYY-MM-DD (ISO)
- jenis hanya "setor" atau "tarik"
- jumlah adalah angka integer, tanpa titik/koma
- keterangan singkat sesuai tulisan di buku, atau "Setoran tabungan" jika kosong

Jika tidak ada transaksi terlihat, balas: []`;

  try {
    const result = await withRetry(() => model.generateContent([prompt, imagePart]));
    const text = result.response.text().trim();
    let transactions = [];
    try { transactions = JSON.parse(text); } catch { transactions = []; }
    ok(res, { transactions, raw: text });
  } catch (e) {
    const msg = isRetryableError(e)
      ? 'Server Gemini sedang sibuk. Sudah dicoba beberapa kali, silakan coba lagi sebentar lagi.'
      : 'Gemini OCR error: ' + e.message;
    err(res, msg);
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const { pesan } = req.body;
  if (!pesan) return err(res, 'Pesan kosong', 400);

  const { data: rekap, error: dbError } = await supabase.from('rekap_siswa').select('*');
  if (dbError) return err(res, 'Gagal mengambil data rekap: ' + dbError.message);

  const totalSaldo = (rekap||[]).reduce((s,x) => s + Number(x.saldo), 0);
  const sudahAda   = (rekap||[]).filter(x => Number(x.saldo) > 0).length;
  const rekapText  = (rekap||[]).map(s =>
    `- ${s.nama} (${s.nis}): saldo Rp ${Number(s.saldo).toLocaleString('id-ID')}, setor Rp ${Number(s.total_setor).toLocaleString('id-ID')}, tarik Rp ${Number(s.total_tarik).toLocaleString('id-ID')}`
  ).join('\n');

  const systemPrompt = `Kamu adalah asisten AI untuk aplikasi SiTabung, sistem tabungan siswa kelas Pak Anang (${rekap.length} siswa).

Data rekap tabungan kelas saat ini (${sudahAda} siswa sudah memiliki data):
${rekapText}
Total saldo kelas: Rp ${totalSaldo.toLocaleString('id-ID')}

Jawab pertanyaan guru dengan singkat, informatif, dan dalam bahasa Indonesia yang ramah. Gunakan emoji secukupnya.`;

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  try {
    const result = await withRetry(() => model.generateContent([
      { text: systemPrompt },
      { text: 'Pertanyaan guru: ' + pesan }
    ]));
    ok(res, { balasan: result.response.text() });
  } catch (e) {
    const msg = isRetryableError(e)
      ? 'Server Gemini sedang sibuk. Silakan coba lagi sebentar lagi.'
      : 'Gemini chat error: ' + e.message;
    err(res, msg);
  }
});

app.post('/api/ai/analisis', async (req, res) => {
  const { data: rekap, error: dbError } = await supabase.from('rekap_siswa').select('*');
  if (dbError) return err(res, 'Gagal ambil data rekap: ' + dbError.message);

  const totalSaldo = rekap.reduce((s,x) => s + Number(x.saldo), 0);
  const totalSetor = rekap.reduce((s,x) => s + Number(x.total_setor), 0);
  const sudahAda   = rekap.filter(x => Number(x.saldo) > 0).length;
  const summary    = rekap.map(s =>
    `- ${s.nama}: setor Rp ${Number(s.total_setor).toLocaleString('id-ID')}, tarik Rp ${Number(s.total_tarik).toLocaleString('id-ID')}, saldo Rp ${Number(s.saldo).toLocaleString('id-ID')}`
  ).join('\n');

  const prompt = `Berikut data tabungan siswa kelas Pak Anang (${rekap.length} siswa total, ${sudahAda} sudah ada data):
${summary}

Total saldo kelas: Rp ${totalSaldo.toLocaleString('id-ID')}
Total setor: Rp ${totalSetor.toLocaleString('id-ID')}

Buat analisis singkat dalam 4 poin dengan emoji:
1. Kondisi umum tabungan kelas
2. Siswa dengan tabungan terbaik (jika ada data)
3. Siswa yang belum ada data atau perlu perhatian
4. Saran/motivasi untuk guru Pak Anang

Gunakan bahasa Indonesia yang ramah dan mudah dibaca.`;

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  try {
    const result = await withRetry(() => model.generateContent(prompt));
    ok(res, { analisis: result.response.text() });
  } catch (e) {
    const msg = isRetryableError(e)
      ? 'Server Gemini sedang sibuk. Silakan coba lagi sebentar lagi.'
      : 'Gemini analisis error: ' + e.message;
    err(res, msg);
  }
});

// ============================================================
// Fallback → scan.html (MPA: tidak perlu wildcard SPA redirect)
// ============================================================
app.get('/', (req, res) => {
  res.redirect('/scan.html');
});

// ============================================================
// Start
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SiTabung AI server running → http://localhost:${PORT}`);
});

module.exports = app;