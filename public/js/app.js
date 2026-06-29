// ============================================================
// SiTabung AI — Frontend App (app.js)
// ============================================================

const API = ''; // kosong = same origin

// ── State ────────────────────────────────────────────────────
let selectedNis       = null;
let pendingOcr        = null;
let currentTrxNis     = null;
let rekapData         = [];
let deleteSiswaTarget = null; // NIS siswa yang mau dihapus

// ── Helpers ──────────────────────────────────────────────────
const rp  = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function inisial(nama) {
  const p = nama.trim().split(' ');
  return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : p[0].slice(0,2).toUpperCase();
}

const AVA_COLORS = [
  'bg-forest-100 text-forest-700',
  'bg-blue-100 text-blue-700',
  'bg-yellow-100 text-yellow-700',
  'bg-pink-100 text-pink-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
];
function avaColor(nis) { return AVA_COLORS[parseInt(nis) % AVA_COLORS.length]; }

function showToast(msg, type='success') {
  const toast = document.getElementById('toast');
  const icon  = document.getElementById('toast-icon');
  document.getElementById('toast-msg').textContent = msg;
  icon.className = type === 'error'
    ? 'ti ti-alert-triangle text-red-400 text-base'
    : 'ti ti-check text-green-400 text-base';
  toast.style.display = 'flex';
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function apiFetch(path, opts={}) {
  const res  = await fetch(API + path, opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API Error');
  return json.data;
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.add('hidden');
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active-tab', 'bg-gold-400', 'text-white', 'border-gold-400');
    b.classList.add('text-white/65', 'border-white/20');
  });
  const screen = document.getElementById('screen-' + name);
  const tab    = document.getElementById('tab-' + name);

  if (name === 'guru') {
    screen.style.display = 'grid';
  } else {
    screen.style.display = 'block';
  }
  screen.classList.remove('hidden');
  tab.classList.add('bg-gold-400', 'text-white', 'border-gold-400');
  tab.classList.remove('text-white/65', 'border-white/20');

  if (name === 'rekap') loadRekap();
  if (name === 'siswa') loadSiswaPage();
}

// ── Connection check ──────────────────────────────────────────
async function checkConn() {
  const dot = document.getElementById('conn-dot');
  try {
    await apiFetch('/api/siswa');
    dot.className = 'w-2 h-2 rounded-full bg-green-400 ml-1';
    dot.title = 'Terhubung ke server';
  } catch {
    dot.className = 'w-2 h-2 rounded-full bg-red-400 ml-1';
    dot.title = 'Gagal terhubung ke server';
  }
}

// ── Sidebar ───────────────────────────────────────────────────
async function loadSidebar() {
  try {
    rekapData = await apiFetch('/api/siswa');
    renderSidebar();
  } catch (e) {
    document.getElementById('santri-list').innerHTML =
      `<div class="text-center p-6 text-xs text-red-400"><i class="ti ti-wifi-off text-2xl block mb-2"></i>${esc(e.message)}</div>`;
  }
}

function renderSidebar() {
  const q    = (document.getElementById('sidebar-search')?.value || '').toLowerCase();
  const list = document.getElementById('santri-list');
  const data = rekapData.filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(q));

  if (!data.length) {
    list.innerHTML = '<div class="text-center p-5 text-xs text-gray-400">Tidak ditemukan</div>';
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="santri-item flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-forest-50
      ${selectedNis === s.nis ? 'bg-forest-100' : ''}" onclick="selectSiswa('${s.nis}')">
      <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avaColor(s.nis)}">
        ${inisial(s.nama)}
      </div>
      <div class="min-w-0">
        <p class="text-xs font-semibold text-gray-800 truncate">${esc(s.nama)}</p>
        <p class="text-xs text-gray-400">${s.nis} · ${Number(s.saldo) > 0
          ? `<span class="text-green-600 font-semibold">${rp(s.saldo)}</span>`
          : '<span class="text-gray-300">Belum ada data</span>'}</p>
      </div>
    </div>`).join('');
}

function selectSiswa(nis) {
  selectedNis = nis;
  const s = rekapData.find(x => x.nis === nis);
  if (!s) return;
  renderSidebar();
  const info = document.getElementById('selected-info');
  info.style.display = 'flex';
  info.classList.remove('hidden');
  document.getElementById('sel-name').textContent = s.nama;
  document.getElementById('sel-nis').textContent  = 'NIS: ' + s.nis;
}

function clearSelected() {
  selectedNis = null;
  document.getElementById('selected-info').classList.add('hidden');
  document.getElementById('selected-info').style.display = 'none';
  renderSidebar();
}

// ── Chat helpers ──────────────────────────────────────────────
function appendMsg(role, html) {
  const box    = document.getElementById('chat-messages');
  const isUser = role === 'user';
  const wrap   = document.createElement('div');
  wrap.className = `flex gap-3 items-end fade-up ${isUser ? 'flex-row-reverse' : ''}`;
  wrap.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center flex-shrink-0">
      <i class="ti ${isUser ? 'ti-user' : 'ti-robot'} text-sm"></i>
    </div>
    <div class="max-w-[80%]">
      <p class="text-xs text-gray-400 mb-1 font-semibold ${isUser ? 'text-right' : ''}">${isUser ? 'Guru' : 'SiTabung AI'}</p>
      <div class="${isUser
        ? 'bg-forest-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-sm'
        : 'bg-white border border-forest-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-card'}">${html}</div>
    </div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
  return wrap;
}

// ── OCR ───────────────────────────────────────────────────────
function handleFoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!selectedNis) {
    showToast('Pilih siswa terlebih dahulu!', 'error');
    e.target.value = '';
    return;
  }
  doOcr(file);
  e.target.value = '';
}

async function doOcr(file) {
  const s = rekapData.find(x => x.nis === selectedNis);
  document.getElementById('save-bar').classList.add('hidden');

  const reader = new FileReader();
  reader.onload = ev => {
    appendMsg('user', `<img src="${ev.target.result}" class="block w-48 h-48 object-cover rounded-xl mb-1.5 border-2 border-white/30"><div class="text-xs opacity-75"><i class="ti ti-photo text-xs"></i> Foto buku tabungan <strong>${esc(s.nama)}</strong></div>`);
  };
  reader.readAsDataURL(file);

  const loading = appendMsg('ai', `<div class="flex items-center gap-2"><span class="flex gap-1">${[0,200,400].map(d=>`<span class="w-1.5 h-1.5 rounded-full bg-forest-500 dot-blink" style="animation-delay:${d}ms"></span>`).join('')}</span><span class="text-xs text-gray-400">Membaca buku tabungan…</span></div>`);

  try {
    const form = new FormData();
    form.append('foto', file);
    const res  = await fetch(API + '/api/ai/ocr', { method:'POST', body: form });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const txs = json.data.transactions;

    if (!txs.length) {
      loading.querySelector('div.bg-white,div.bg-forest-600').innerHTML =
        `<i class="ti ti-photo-off text-red-400"></i> Tidak ada data transaksi terdeteksi. Pastikan foto cukup jelas.`;
      return;
    }

    pendingOcr = txs;

    const rows = txs.map(t => `
      <tr class="border-b border-forest-50">
        <td class="px-2 py-1.5 text-xs text-gray-400">${esc(t.tanggal)}</td>
        <td class="px-2 py-1.5">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${t.jenis==='setor' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            ${t.jenis === 'setor' ? 'Setor' : 'Tarik'}
          </span>
        </td>
        <td class="px-2 py-1.5 text-right text-xs font-bold ${t.jenis==='setor' ? 'text-green-600' : 'text-red-500'}">${rp(t.jumlah)}</td>
        <td class="px-2 py-1.5 text-xs text-gray-400">${esc(t.keterangan||'-')}</td>
      </tr>`).join('');

    const bubble = loading.querySelector('div[class*="bg-white"]') || loading.querySelector('div:last-child');
    bubble.innerHTML = `
      <p class="font-semibold mb-2 text-sm">Berhasil membaca buku tabungan <strong>${esc(s.nama)}</strong> — <strong>${txs.length} transaksi</strong></p>
      <div class="overflow-x-auto rounded-xl border border-forest-100">
        <table class="w-full min-w-[320px]">
          <thead class="bg-forest-50">
            <tr>
              <th class="px-2 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal</th>
              <th class="px-2 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Jenis</th>
              <th class="px-2 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Jumlah</th>
              <th class="px-2 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ket</th>
            </tr>
          </thead>
          <tbody class="bg-white">${rows}</tbody>
        </table>
      </div>
      <p class="text-xs text-gray-400 mt-2"><i class="ti ti-info-circle text-xs"></i> Periksa data, lalu klik <strong>Simpan ke Database</strong>.</p>`;

    const saveBar = document.getElementById('save-bar');
    saveBar.classList.remove('hidden');
    saveBar.style.display = 'flex';
  } catch (e) {
    loading.querySelector('div[class*="bg-white"]').innerHTML =
      `<i class="ti ti-alert-triangle text-red-400"></i> <strong>Error:</strong> ${esc(e.message)}`;
    showToast(e.message, 'error');
  }
  document.getElementById('chat-messages').scrollTop = 9999;
}

async function doSave() {
  if (!pendingOcr || !selectedNis) return;
  const s = rekapData.find(x => x.nis === selectedNis);
  try {
    await apiFetch('/api/transaksi/bulk', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nis: selectedNis, transaksi: pendingOcr })
    });
    const jml = pendingOcr.length;
    pendingOcr = null;
    document.getElementById('save-bar').classList.add('hidden');
    appendMsg('ai', `<i class="ti ti-circle-check text-green-500"></i> <strong>${jml} transaksi ${esc(s.nama)}</strong> berhasil disimpan ke database!`);
    showToast(`${jml} transaksi disimpan!`);
    clearSelected();
    await loadSidebar();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function resetScan() {
  pendingOcr = null;
  document.getElementById('save-bar').classList.add('hidden');
}

// ── Text chat ─────────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  appendMsg('user', esc(text).replace(/\n/g,'<br>'));
  const loading = appendMsg('ai', `<div class="flex items-center gap-2"><span class="flex gap-1">${[0,200,400].map(d=>`<span class="w-1.5 h-1.5 rounded-full bg-forest-500 dot-blink" style="animation-delay:${d}ms"></span>`).join('')}</span><span class="text-xs text-gray-400">Memproses…</span></div>`);
  try {
    const data = await apiFetch('/api/ai/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pesan: text })
    });
    loading.querySelector('div[class*="bg-white"]').innerHTML =
      esc(data.balasan).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  } catch (e) {
    loading.querySelector('div[class*="bg-white"]').innerHTML =
      `<i class="ti ti-alert-triangle text-red-400"></i> ${esc(e.message)}`;
  }
  document.getElementById('chat-messages').scrollTop = 9999;
}

// ── Rekap ─────────────────────────────────────────────────────
async function loadRekap() {
  try {
    rekapData = await apiFetch('/api/siswa');
    renderRekap();
  } catch (e) {
    showToast('Gagal memuat rekap: ' + e.message, 'error');
  }
}

function renderRekap() {
  const q    = (document.getElementById('rekap-search')?.value || '').toLowerCase();
  const sort = document.getElementById('rekap-sort')?.value || 'no';
  let data   = rekapData.filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(q));

  data = [...data].sort((a,b) => {
    if (sort === 'saldo-desc') return Number(b.saldo) - Number(a.saldo);
    if (sort === 'saldo-asc')  return Number(a.saldo) - Number(b.saldo);
    if (sort === 'setor-desc') return Number(b.total_setor) - Number(a.total_setor);
    if (sort === 'nama')       return a.nama.localeCompare(b.nama,'id');
    return a.no_urut - b.no_urut;
  });

  const totSaldo = rekapData.reduce((s,x)=>s+Number(x.saldo),0);
  const totSetor = rekapData.reduce((s,x)=>s+Number(x.total_setor),0);
  const totTarik = rekapData.reduce((s,x)=>s+Number(x.total_tarik),0);

  document.getElementById('st-siswa').textContent = rekapData.length;
  document.getElementById('st-saldo').textContent = rp(totSaldo);
  document.getElementById('st-setor').textContent = rp(totSetor);
  document.getElementById('st-tarik').textContent = rp(totTarik);
  document.getElementById('rekap-sub').textContent =
    ` · ${rekapData.length} siswa · Saldo total ${rp(totSaldo)}`;

  const tbody = document.getElementById('rekap-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-300 text-sm"><i class="ti ti-search text-3xl block mb-2"></i>Tidak ada data</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr class="hover:bg-forest-50 transition-colors">
      <td class="px-4 py-3 text-xs text-gray-300 font-medium">${s.no_urut}</td>
      <td class="px-4 py-3 text-xs text-gray-400 font-mono font-medium">${s.nis}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avaColor(s.nis)}">
            ${inisial(s.nama)}
          </div>
          <span class="text-sm font-semibold text-gray-800">${esc(s.nama)}</span>
        </div>
      </td>
      <td class="px-4 py-3 text-right text-sm font-medium ${Number(s.total_setor)>0?'text-green-600':'text-gray-300'}">
        ${Number(s.total_setor)>0?rp(s.total_setor):'–'}
      </td>
      <td class="px-4 py-3 text-right text-sm font-medium ${Number(s.total_tarik)>0?'text-red-500':'text-gray-300'}">
        ${Number(s.total_tarik)>0?rp(s.total_tarik):'–'}
      </td>
      <td class="px-4 py-3 text-right">
        <span class="text-sm font-bold ${Number(s.saldo)>0?'text-forest-600':'text-gray-300'}">
          ${Number(s.saldo)>0?rp(s.saldo):'Rp 0'}
        </span>
      </td>
      <td class="px-4 py-3 text-xs text-gray-400">${s.update_terakhir ? new Date(s.update_terakhir).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '–'}</td>
      <td class="px-4 py-3">
        <div class="flex gap-1.5">
          <button onclick="lihatRiwayat('${s.nis}')" title="Lihat riwayat"
            class="p-1.5 rounded-lg border border-forest-200 hover:bg-forest-50 text-gray-500 hover:text-forest-600 transition-colors">
            <i class="ti ti-eye text-sm"></i>
          </button>
          <button onclick="openAddTrx('${s.nis}')" title="Tambah transaksi"
            class="p-1.5 rounded-lg border border-forest-200 hover:bg-forest-50 text-gray-500 hover:text-forest-600 transition-colors">
            <i class="ti ti-plus text-sm"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// ── AI Analisis ───────────────────────────────────────────────
async function aiAnalyze() {
  const box  = document.getElementById('ai-box');
  const txt  = document.getElementById('ai-text');
  box.classList.remove('hidden');
  txt.innerHTML = `<div class="flex items-center gap-2"><span class="flex gap-1">${[0,200,400].map(d=>`<span class="w-1.5 h-1.5 rounded-full bg-forest-500 dot-blink" style="animation-delay:${d}ms"></span>`).join('')}</span><span class="text-xs text-gray-400">Menganalisis data kelas…</span></div>`;
  try {
    const data = await apiFetch('/api/ai/analisis', { method:'POST' });
    txt.innerHTML = esc(data.analisis)
      .replace(/\n/g,'<br>')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  } catch (e) {
    txt.innerHTML = `<i class="ti ti-alert-triangle text-red-400"></i> ${esc(e.message)}`;
    showToast(e.message, 'error');
  }
}

// ── Riwayat transaksi ─────────────────────────────────────────
async function lihatRiwayat(nis) {
  currentTrxNis = nis;
  const s     = rekapData.find(x => x.nis === nis);
  const title = document.getElementById('modal-trx-title');
  const body  = document.getElementById('modal-trx-body');
  title.textContent = `Riwayat — ${s?.nama || nis}`;
  body.innerHTML    = `<div class="text-center py-6 text-gray-300 text-xs"><span class="flex gap-1 justify-center mb-2">${[0,200,400].map(d=>`<span class="w-1.5 h-1.5 rounded-full bg-forest-400 dot-blink" style="animation-delay:${d}ms"></span>`).join('')}</span>Memuat riwayat...</div>`;
  openModal('modal-trx');

  try {
    const txs = await apiFetch(`/api/transaksi/${nis}`);
    if (!txs.length) {
      body.innerHTML = `<div class="text-center py-8 text-gray-300 text-sm"><i class="ti ti-history text-3xl block mb-2"></i>Belum ada transaksi</div>`;
      return;
    }

    const saldo = rekapData.find(x=>x.nis===nis)?.saldo || 0;
    body.innerHTML = `
      <div class="flex items-center justify-between bg-forest-50 rounded-xl px-4 py-3 mb-4">
        <span class="text-xs font-semibold text-gray-500">Saldo saat ini</span>
        <span class="font-bold text-forest-700 text-base">${rp(saldo)}</span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-forest-100">
        <table class="w-full">
          <thead class="bg-forest-50">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Jenis</th>
              <th class="px-3 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Jumlah</th>
              <th class="px-3 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Keterangan</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-forest-50">
            ${txs.map(t => `
              <tr>
                <td class="px-3 py-2.5 text-xs text-gray-400">${new Date(t.tanggal).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
                <td class="px-3 py-2.5">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${t.jenis==='setor'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">
                    ${t.jenis==='setor'?'Setor':'Tarik'}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold ${t.jenis==='setor'?'text-green-600':'text-red-500'}">${rp(t.jumlah)}</td>
                <td class="px-3 py-2.5 text-xs text-gray-400 max-w-[120px] truncate">${esc(t.keterangan||'–')}</td>
                <td class="px-3 py-2.5">
                  <button onclick="hapusTrx(${t.id},'${nis}')"
                    class="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <i class="ti ti-trash text-sm"></i>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    body.innerHTML = `<div class="text-center py-6 text-red-400 text-sm">${esc(e.message)}</div>`;
  }
}

async function hapusTrx(id, nis) {
  if (!confirm('Hapus transaksi ini?')) return;
  try {
    await apiFetch(`/api/transaksi/${id}`, { method:'DELETE' });
    showToast('Transaksi dihapus');
    rekapData = await apiFetch('/api/siswa');
    renderRekap();
    renderSidebar();
    await lihatRiwayat(nis);
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Tambah transaksi manual ───────────────────────────────────
function openAddTrx(nis) {
  currentTrxNis = nis;
  const s = rekapData.find(x => x.nis === nis);
  document.getElementById('add-trx-for').innerHTML = `Untuk: <strong>${esc(s?.nama||nis)}</strong> (${nis})`;
  const today = new Date();
  document.getElementById('tx-tgl').value = today.toISOString().split('T')[0];
  document.getElementById('tx-jml').value = '';
  document.getElementById('tx-ket').value = '';
  closeModal('modal-trx');
  openModal('modal-add-trx');
}

async function simpanTrxManual() {
  const tgl  = document.getElementById('tx-tgl').value;
  const jenis= document.getElementById('tx-jenis').value;
  const jml  = parseInt(document.getElementById('tx-jml').value) || 0;
  const ket  = document.getElementById('tx-ket').value.trim() || 'Manual';
  if (!tgl || jml <= 0) { showToast('Isi tanggal dan jumlah!', 'error'); return; }
  try {
    await apiFetch('/api/transaksi', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nis: currentTrxNis, tanggal: tgl, jenis, jumlah: jml, keterangan: ket })
    });
    showToast('Transaksi berhasil disimpan!');
    closeModal('modal-add-trx');
    rekapData = await apiFetch('/api/siswa');
    renderRekap();
    renderSidebar();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Export CSV ────────────────────────────────────────────────
function exportCSV() {
  let csv = 'No,NIS,Nama Siswa,Total Setor,Total Tarik,Saldo,Jumlah Transaksi,Update Terakhir\n';
  rekapData.forEach(s => {
    csv += `${s.no_urut},"${s.nis}","${s.nama}",${s.total_setor},${s.total_tarik},${s.saldo},${s.jumlah_transaksi},"${s.update_terakhir||'-'}"\n`;
  });
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'rekap-tabungan.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV berhasil didownload!');
}

// ════════════════════════════════════════════════════════════
// DATA SISWA — CRUD
// ════════════════════════════════════════════════════════════

async function loadSiswaPage() {
  try {
    rekapData = await apiFetch('/api/siswa');
    renderSiswa();
  } catch (e) {
    showToast('Gagal memuat data siswa: ' + e.message, 'error');
  }
}

function renderSiswa() {
  const q    = (document.getElementById('siswa-search')?.value || '').toLowerCase();
  const data = [...rekapData]
    .filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(q))
    .sort((a,b) => a.no_urut - b.no_urut);

  document.getElementById('siswa-sub').textContent =
    `Kelola daftar nama dan NIS siswa · ${rekapData.length} siswa terdaftar`;

  const tbody = document.getElementById('siswa-tbody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-300 text-sm"><i class="ti ti-search text-3xl block mb-2"></i>Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(s => `
    <tr class="hover:bg-forest-50 transition-colors">
      <td class="px-4 py-3 text-xs text-gray-300 font-medium">${s.no_urut}</td>
      <td class="px-4 py-3 text-xs text-gray-400 font-mono font-medium">${s.nis}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avaColor(s.nis)}">
            ${inisial(s.nama)}
          </div>
          <span class="text-sm font-semibold text-gray-800">${esc(s.nama)}</span>
        </div>
      </td>
      <td class="px-4 py-3 text-right">
        <span class="text-sm font-bold ${Number(s.saldo)>0?'text-forest-600':'text-gray-300'}">
          ${Number(s.saldo)>0?rp(s.saldo):'Rp 0'}
        </span>
      </td>
      <td class="px-4 py-3 text-center">
        <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${Number(s.jumlah_transaksi)>0?'bg-forest-100 text-forest-700':'bg-gray-100 text-gray-400'}">
          ${s.jumlah_transaksi || 0} transaksi
        </span>
      </td>
      <td class="px-4 py-3">
        <div class="flex gap-1.5">
          <button onclick="openEditSiswa('${s.nis}')" title="Edit data siswa"
            class="p-1.5 rounded-lg border border-forest-200 hover:bg-forest-50 text-gray-500 hover:text-forest-600 transition-colors">
            <i class="ti ti-pencil text-sm"></i>
          </button>
          <button onclick="openHapusSiswa('${s.nis}')" title="Hapus siswa"
            class="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
            <i class="ti ti-trash text-sm"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Tambah Siswa Baru ─────────────────────────────────────────
function openAddSiswa() {
  document.getElementById('add-siswa-nis').value  = '';
  document.getElementById('add-siswa-nama').value = '';
  // Auto-suggest no urut berikutnya
  const maxNo = rekapData.reduce((m,s) => Math.max(m, s.no_urut||0), 0);
  document.getElementById('add-siswa-no').value = maxNo + 1;
  openModal('modal-add-siswa');
}

async function simpanSiswaBaru() {
  const nis  = document.getElementById('add-siswa-nis').value.trim();
  const nama = document.getElementById('add-siswa-nama').value.trim();
  const no   = parseInt(document.getElementById('add-siswa-no').value) || 0;

  if (!nis || !nama)     { showToast('NIS dan nama wajib diisi!', 'error'); return; }
  if (no <= 0)           { showToast('No. urut harus lebih dari 0!', 'error'); return; }
  if (rekapData.find(s => s.nis === nis)) { showToast('NIS sudah terdaftar!', 'error'); return; }

  try {
    await apiFetch('/api/siswa', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nis, nama, no_urut: no })
    });
    showToast(`${nama} berhasil ditambahkan!`);
    closeModal('modal-add-siswa');
    rekapData = await apiFetch('/api/siswa');
    renderSiswa();
    renderSidebar();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Edit Siswa ────────────────────────────────────────────────
function openEditSiswa(nis) {
  const s = rekapData.find(x => x.nis === nis);
  if (!s) return;
  document.getElementById('edit-siswa-nis-old').value = nis;
  document.getElementById('edit-siswa-nis').value     = s.nis;
  document.getElementById('edit-siswa-nama').value    = s.nama;
  document.getElementById('edit-siswa-no').value      = s.no_urut;
  document.getElementById('modal-edit-siswa-title').textContent = `Edit — ${s.nama}`;
  openModal('modal-edit-siswa');
}

async function simpanEditSiswa() {
  const nisLama = document.getElementById('edit-siswa-nis-old').value;
  const nisBaru = document.getElementById('edit-siswa-nis').value.trim();
  const nama    = document.getElementById('edit-siswa-nama').value.trim();
  const no      = parseInt(document.getElementById('edit-siswa-no').value) || 0;

  if (!nisBaru || !nama) { showToast('NIS dan nama wajib diisi!', 'error'); return; }
  if (no <= 0)           { showToast('No. urut harus lebih dari 0!', 'error'); return; }

  try {
    await apiFetch(`/api/siswa/${nisLama}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nis: nisBaru, nama, no_urut: no })
    });
    showToast(`Data ${nama} berhasil diupdate!`);
    closeModal('modal-edit-siswa');
    rekapData = await apiFetch('/api/siswa');
    renderSiswa();
    renderSidebar();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Hapus Siswa ───────────────────────────────────────────────
function openHapusSiswa(nis) {
  const s = rekapData.find(x => x.nis === nis);
  if (!s) return;
  deleteSiswaTarget = nis;
  document.getElementById('del-siswa-nama').textContent = s.nama;
  document.getElementById('del-siswa-nis').textContent  = 'NIS: ' + s.nis;
  openModal('modal-del-siswa');
}

async function konfirmasiHapusSiswa() {
  if (!deleteSiswaTarget) return;
  const s = rekapData.find(x => x.nis === deleteSiswaTarget);
  try {
    await apiFetch(`/api/siswa/${deleteSiswaTarget}`, { method:'DELETE' });
    showToast(`${s?.nama || deleteSiswaTarget} berhasil dihapus`);
    deleteSiswaTarget = null;
    closeModal('modal-del-siswa');
    rekapData = await apiFetch('/api/siswa');
    renderSiswa();
    renderSidebar();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Modal helpers
function openModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('hidden');
  m.style.display = 'flex';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById(id).style.display = 'none';
}

// Close modal on overlay click
['modal-trx','modal-add-trx','modal-edit-siswa','modal-add-siswa','modal-del-siswa'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) {
    if (e.target === this) closeModal(id);
  });
});

// ── Tab button style helpers ──────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(b => {
  b.classList.add('text-white/65', 'border-white/20');
});
document.getElementById('tab-guru').classList.add('bg-gold-400','text-white','border-gold-400');
document.getElementById('tab-guru').classList.remove('text-white/65','border-white/20');

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  checkConn();
  loadSidebar();
});