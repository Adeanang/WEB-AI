// ============================================================
// SiTabung AI — shared.js (dipakai semua halaman)
// ============================================================

const API = '';

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

// ── Highlight active nav link ─────────────────────────────────
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'scan.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'scan.html')) {
      a.classList.add('bg-gold-400','text-white','border-gold-400');
      a.classList.remove('text-white/65','border-white/20');
    } else {
      a.classList.remove('bg-gold-400','text-white','border-gold-400');
      a.classList.add('text-white/65','border-white/20');
    }
  });
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

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('hidden');
  m.style.display = 'flex';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById(id).style.display = 'none';
}

// ── Dot blink loader HTML ─────────────────────────────────────
function dotLoader(text='Memuat...') {
  return `<div class="flex items-center gap-2">
    <span class="flex gap-1">
      ${[0,200,400].map(d=>`<span class="w-1.5 h-1.5 rounded-full bg-forest-500 dot-blink" style="animation-delay:${d}ms"></span>`).join('')}
    </span>
    <span class="text-xs text-gray-400">${text}</span>
  </div>`;
}