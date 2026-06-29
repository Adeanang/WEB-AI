// ============================================================
// SiTabung AI — scan.js (Chatbot OCR)
// ============================================================

let selectedNis  = null;
let pendingOcr   = null;
let currentTrxNis = null;
let siswaDaftar  = [];

// ── Sidebar ───────────────────────────────────────────────────
async function loadSidebar() {
  try {
    siswaDaftar = await apiFetch('/api/siswa');
    renderSidebar();
  } catch (e) {
    document.getElementById('santri-list').innerHTML =
      `<div class="text-center p-6 text-xs text-red-400"><i class="ti ti-wifi-off text-2xl block mb-2"></i>${esc(e.message)}</div>`;
  }
}

function renderSidebar() {
  const q    = (document.getElementById('sidebar-search')?.value || '').toLowerCase();
  const list = document.getElementById('santri-list');
  const data = siswaDaftar.filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(q));

  if (!data.length) {
    list.innerHTML = '<div class="text-center p-5 text-xs text-gray-400">Tidak ditemukan</div>';
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-forest-50
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
  const s = siswaDaftar.find(x => x.nis === nis);
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
  const s = siswaDaftar.find(x => x.nis === selectedNis);
  document.getElementById('save-bar').classList.add('hidden');

  const reader = new FileReader();
  reader.onload = ev => {
    appendMsg('user', `<img src="${ev.target.result}" class="block w-48 h-48 object-cover rounded-xl mb-1.5 border-2 border-white/30"><div class="text-xs opacity-75"><i class="ti ti-photo text-xs"></i> Foto buku tabungan <strong>${esc(s.nama)}</strong></div>`);
  };
  reader.readAsDataURL(file);

  const loading = appendMsg('ai', dotLoader('Membaca buku tabungan…'));

  try {
    const form = new FormData();
    form.append('foto', file);
    const res  = await fetch('/api/ai/ocr', { method:'POST', body: form });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const txs = json.data.transactions;

    const bubble = loading.querySelector('div[class*="bg-white"]') || loading.querySelector('div:last-child');

    if (!txs.length) {
      bubble.innerHTML = `<i class="ti ti-photo-off text-red-400"></i> Tidak ada data transaksi terdeteksi. Pastikan foto cukup jelas.`;
      return;
    }

    pendingOcr = txs;

    const rows = txs.map(t => `
      <tr class="border-b border-forest-50">
        <td class="px-2 py-1.5 text-xs text-gray-400">${esc(t.tanggal)}</td>
        <td class="px-2 py-1.5">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${t.jenis==='setor'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">
            ${t.jenis==='setor'?'Setor':'Tarik'}
          </span>
        </td>
        <td class="px-2 py-1.5 text-right text-xs font-bold ${t.jenis==='setor'?'text-green-600':'text-red-500'}">${rp(t.jumlah)}</td>
        <td class="px-2 py-1.5 text-xs text-gray-400">${esc(t.keterangan||'-')}</td>
      </tr>`).join('');

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
    const bubble = loading.querySelector('div[class*="bg-white"]') || loading.querySelector('div:last-child');
    bubble.innerHTML = `<i class="ti ti-alert-triangle text-red-400"></i> <strong>Error:</strong> ${esc(e.message)}`;
    showToast(e.message, 'error');
  }
  document.getElementById('chat-messages').scrollTop = 9999;
}

async function doSave() {
  if (!pendingOcr || !selectedNis) return;
  const s = siswaDaftar.find(x => x.nis === selectedNis);
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
  const loading = appendMsg('ai', dotLoader('Memproses…'));
  try {
    const data = await apiFetch('/api/ai/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pesan: text })
    });
    const bubble = loading.querySelector('div[class*="bg-white"]');
    bubble.innerHTML = esc(data.balasan).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  } catch (e) {
    const bubble = loading.querySelector('div[class*="bg-white"]');
    bubble.innerHTML = `<i class="ti ti-alert-triangle text-red-400"></i> ${esc(e.message)}`;
  }
  document.getElementById('chat-messages').scrollTop = 9999;
}

// ── Tambah transaksi manual ───────────────────────────────────
function openAddTrx(nis) {
  currentTrxNis = nis;
  const s = siswaDaftar.find(x => x.nis === nis);
  document.getElementById('add-trx-for').innerHTML = `Untuk: <strong>${esc(s?.nama||nis)}</strong> (${nis})`;
  document.getElementById('tx-tgl').value  = new Date().toISOString().split('T')[0];
  document.getElementById('tx-jml').value  = '';
  document.getElementById('tx-ket').value  = '';
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
    await loadSidebar();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Modal overlay close ───────────────────────────────────────
document.getElementById('modal-add-trx')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal('modal-add-trx');
});

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  checkConn();
  loadSidebar();
});