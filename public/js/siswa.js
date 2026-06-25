// ============================================================
// SiTabung AI — siswa.js (Data Siswa CRUD)
// ============================================================

let siswaDaftar       = [];
let deleteSiswaTarget = null;

// ── Load & Render ─────────────────────────────────────────────
async function loadSiswaPage() {
  try {
    siswaDaftar = await apiFetch('/api/siswa');
    renderSiswa();
  } catch (e) {
    showToast('Gagal memuat data siswa: ' + e.message, 'error');
    document.getElementById('siswa-tbody').innerHTML =
      `<tr><td colspan="6" class="text-center py-10 text-red-300 text-sm"><i class="ti ti-wifi-off text-3xl block mb-2"></i>${esc(e.message)}</td></tr>`;
  }
}

function renderSiswa() {
  const q    = (document.getElementById('siswa-search')?.value || '').toLowerCase();
  const data = [...siswaDaftar]
    .filter(s => !q || s.nama.toLowerCase().includes(q) || s.nis.includes(q))
    .sort((a,b) => a.no_urut - b.no_urut);

  document.getElementById('siswa-sub').textContent =
    `${siswaDaftar.length} siswa terdaftar`;

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
        <span class="text-xs font-semibold ${Number(s.jumlah_transaksi)>0?'text-forest-700':'text-gray-400'}">
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
  const maxNo = siswaDaftar.reduce((m,s) => Math.max(m, s.no_urut||0), 0);
  document.getElementById('add-siswa-no').value   = maxNo + 1;
  openModal('modal-add-siswa');
  setTimeout(() => document.getElementById('add-siswa-nis').focus(), 100);
}

async function simpanSiswaBaru() {
  const nis  = document.getElementById('add-siswa-nis').value.trim();
  const nama = document.getElementById('add-siswa-nama').value.trim();
  const no   = parseInt(document.getElementById('add-siswa-no').value) || 0;

  if (!nis || !nama)                                   { showToast('NIS dan nama wajib diisi!', 'error'); return; }
  if (no <= 0)                                          { showToast('No. urut harus lebih dari 0!', 'error'); return; }
  if (siswaDaftar.find(s => s.nis === nis))             { showToast('NIS sudah terdaftar!', 'error'); return; }

  try {
    await apiFetch('/api/siswa', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nis, nama, no_urut: no })
    });
    showToast(`${nama} berhasil ditambahkan!`);
    closeModal('modal-add-siswa');
    siswaDaftar = await apiFetch('/api/siswa');
    renderSiswa();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Edit Siswa ────────────────────────────────────────────────
function openEditSiswa(nis) {
  const s = siswaDaftar.find(x => x.nis === nis);
  if (!s) return;
  document.getElementById('edit-siswa-nis-old').value = nis;
  document.getElementById('edit-siswa-nis').value     = s.nis;
  document.getElementById('edit-siswa-nama').value    = s.nama;
  document.getElementById('edit-siswa-no').value      = s.no_urut;
  document.getElementById('modal-edit-siswa-title').textContent = `Edit — ${s.nama}`;
  openModal('modal-edit-siswa');
  setTimeout(() => document.getElementById('edit-siswa-nama').focus(), 100);
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
    siswaDaftar = await apiFetch('/api/siswa');
    renderSiswa();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Hapus Siswa ───────────────────────────────────────────────
function openHapusSiswa(nis) {
  const s = siswaDaftar.find(x => x.nis === nis);
  if (!s) return;
  deleteSiswaTarget = nis;
  document.getElementById('del-siswa-nama').textContent = s.nama;
  document.getElementById('del-siswa-nis').textContent  = 'NIS: ' + s.nis;
  openModal('modal-del-siswa');
}

async function konfirmasiHapusSiswa() {
  if (!deleteSiswaTarget) return;
  const s = siswaDaftar.find(x => x.nis === deleteSiswaTarget);
  try {
    await apiFetch(`/api/siswa/${deleteSiswaTarget}`, { method:'DELETE' });
    showToast(`${s?.nama || deleteSiswaTarget} berhasil dihapus`);
    deleteSiswaTarget = null;
    closeModal('modal-del-siswa');
    siswaDaftar = await apiFetch('/api/siswa');
    renderSiswa();
  } catch(e) { showToast(e.message, 'error'); }
}

// ── Modal overlay close ───────────────────────────────────────
['modal-edit-siswa','modal-add-siswa','modal-del-siswa'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) {
    if (e.target === this) closeModal(id);
  });
});

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  checkConn();
  loadSiswaPage();
});