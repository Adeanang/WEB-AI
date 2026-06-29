// ============================================================
// SiTabung AI — rekap.js (Rekap Kelas)
// ============================================================

let rekapData    = [];
let currentTrxNis = null;

// ── Load & Render ─────────────────────────────────────────────
async function loadRekap() {
  try {
    rekapData = await apiFetch('/api/siswa');
    renderRekap();
  } catch (e) {
    showToast('Gagal memuat rekap: ' + e.message, 'error');
    document.getElementById('rekap-tbody').innerHTML =
      `<tr><td colspan="8" class="text-center py-10 text-red-300 text-sm"><i class="ti ti-wifi-off text-3xl block mb-2"></i>${esc(e.message)}</td></tr>`;
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
    ` ${rekapData.length} siswa ·Saldo total ${rp(totSaldo)}`;

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
      <td class="px-4 py-3 text-xs text-gray-400">
        ${s.update_terakhir ? new Date(s.update_terakhir).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '–'}
      </td>
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

// ── Riwayat transaksi ─────────────────────────────────────────
async function lihatRiwayat(nis) {
  currentTrxNis = nis;
  const s    = rekapData.find(x => x.nis === nis);
  document.getElementById('modal-trx-title').textContent = `Riwayat — ${s?.nama || nis}`;
  const body = document.getElementById('modal-trx-body');
  body.innerHTML = `<div class="text-center py-6">${dotLoader('Memuat riwayat...')}</div>`;
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
    await lihatRiwayat(nis);
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Tambah transaksi manual ───────────────────────────────────
function openAddTrx(nis) {
  currentTrxNis = nis;
  const s = rekapData.find(x => x.nis === nis);
  document.getElementById('add-trx-for').innerHTML = `Untuk: <strong>${esc(s?.nama||nis)}</strong> (${nis})`;
  document.getElementById('tx-tgl').value  = new Date().toISOString().split('T')[0];
  document.getElementById('tx-jml').value  = '';
  document.getElementById('tx-ket').value  = '';
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
  a.href = url; a.download = 'rekap-tabungan-pak-anang.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV berhasil didownload!');
}

// ── Modal overlay close ───────────────────────────────────────
['modal-trx','modal-add-trx'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) {
    if (e.target === this) closeModal(id);
  });
});

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  checkConn();
  loadRekap();
});