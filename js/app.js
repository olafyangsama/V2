/* =========================================
   STATE & LOCALSTORAGE WITH SECRET LOGIC
========================================= */
const STORAGE_KEY = 'gcTournamentSpin_v2';
const defaultState = {
  winner: { items: [] }, giveaway: { items: [] },
  killerSel: { items: [] }, theKiller: { items: [] }, teamSelection: { items: [] }
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      return {
        winner: { items: p.winner?.items || [] },
        giveaway: { items: p.giveaway?.items || [] },
        killerSel: { items: p.killerSel?.items || [] },
        theKiller: { items: p.theKiller?.items || [] },
        teamSelection: { items: p.teamSelection?.items || [] }
      };
    }
  } catch(e) { console.warn('Load failed:', e); }
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) {
    if (e.name === 'QuotaExceededError') alert('Penyimpanan lokal penuh!');
  }
}

let state = loadState();
// Set spinning flags
Object.keys(state).forEach(k => state[k].spinning = false);

function uid() { return 'id' + Date.now() + Math.floor(Math.random() * 1000); }

/* =========================================
   NAVIGATION & UI
========================================= */
function enterApp() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('app').classList.add('show');
}

function showPanel(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

function toggleSection(id) {
  const el = document.getElementById(id);
  if (el.style.maxHeight === '0px' || !el.style.maxHeight) {
    el.style.maxHeight = '500px'; el.style.opacity = '1';
  } else {
    el.style.maxHeight = '0px'; el.style.opacity = '0';
  }
}

/* =========================================
   SECRET NO-REPEAT LOGIC (KILLER & THE KILLER)
========================================= */

// --- 1. KILLER SELECTION (GAMBAR) ---
function addKsItem() {
  const name = document.getElementById('ks-name').value.trim(); 
  const urlInp = document.getElementById('ks-img-url').value.trim();
  if (!name) return;
  
  // _secretWon di-set default false. Tidak akan di-render di UI.
  state.killerSel.items.push({ id: uid(), name, img: urlInp, banned: false, _secretWon: false });
  document.getElementById('ks-name').value = ''; document.getElementById('ks-img-url').value = '';
  saveState(); renderKillerUI();
}

function renderKillerUI() {
  const listEl = document.getElementById('ks-list');
  const gridEl = document.getElementById('killer-grid');
  
  // UI List (Admin View) - Admin TIDAK TAHU mana yang _secretWon
  listEl.innerHTML = state.killerSel.items.map(item => `
    <div class="item-chip ${item.banned ? 'banned' : ''}">
      <span>${item.name}</span>
      <button class="btn-danger" onclick="deleteKsItem('${item.id}')">Hapus</button>
    </div>
  `).join('');

  // UI Grid (Participant View) - Peserta TIDAK TAHU
  gridEl.innerHTML = state.killerSel.items.map(item => `
    <div class="killer-card ${item.banned ? 'banned' : ''}" id="kcard-${item.id}">
      <div class="kc-img"><img src="${item.img || 'assets/img/default.png'}" onerror="this.src=''"></div>
      <div class="kc-name">${item.name}</div>
    </div>
  `).join('');
}

function deleteKsItem(id) {
  state.killerSel.items = state.killerSel.items.filter(i => i.id !== id);
  saveState(); renderKillerUI();
}

function spinKillerSel() {
  let allActive = state.killerSel.items.filter(i => !i.banned);
  if (allActive.length < 1) { alert('Tambahkan karakter aktif!'); return; }

  // SECRET LOGIC: Filter yang belum menang
  let secretPool = allActive.filter(i => !i._secretWon);
  
  // Jika semuanya sudah menang, reset memorinya secara diam-diam
  if (secretPool.length === 0) {
      allActive.forEach(i => i._secretWon = false);
      secretPool = allActive; 
  }

  if (state.killerSel.spinning) return;
  state.killerSel.spinning = true;

  // Pilih dari pool rahasia
  const winner = secretPool[Math.floor(Math.random() * secretPool.length)];
  const dur = parseFloat(document.getElementById('ks-duration').value) * 1000;
  
  const start = Date.now();
  const rollInt = setInterval(() => {
    if (Date.now() - start >= dur) {
      clearInterval(rollInt);
      
      // Highlight pemenang di UI
      document.querySelectorAll('.killer-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('kcard-' + winner.id).classList.add('selected');
      
      // MARK SECRETLY AS WON
      winner._secretWon = true; 
      saveState();

      showPopup('🎯', 'Killer Terpilih!', winner.name, winner.img, 'killerSel', winner.id);
      state.killerSel.spinning = false;
      return;
    }
    // Animasi spin tetap memutar SEMUA gambar agar terlihat normal
    document.querySelectorAll('.killer-card').forEach(c => c.classList.remove('selected'));
    allActive[Math.floor(Math.random() * allActive.length)].classList.add('selected');
  }, 100);
}

// --- 2. THE KILLER (NAMA SAJA) ---
function addTkItem() {
  const name = document.getElementById('tk-new').value.trim();
  if (!name) return;
  state.theKiller.items.push({ id: uid(), name, _secretWon: false });
  document.getElementById('tk-new').value = '';
  saveState(); renderTkUI();
}

function renderTkUI() {
  const listEl = document.getElementById('tk-list');
  listEl.innerHTML = state.theKiller.items.map(item => `
    <div class="item-chip">
      <span>${item.name}</span>
      <button class="btn-danger" onclick="deleteTkItem('${item.id}')">Hapus</button>
    </div>
  `).join('');
}

function deleteTkItem(id) {
  state.theKiller.items = state.theKiller.items.filter(i => i.id !== id);
  saveState(); renderTkUI();
}

function spinTheKiller() {
  let allActive = state.theKiller.items;
  if (allActive.length < 2) { alert('Minimal 2 pemain!'); return; }

  // SECRET LOGIC
  let secretPool = allActive.filter(i => !i._secretWon);
  if (secretPool.length === 0) {
      allActive.forEach(i => i._secretWon = false);
      secretPool = allActive;
  }

  if (state.theKiller.spinning) return;
  state.theKiller.spinning = true;

  const winner = secretPool[Math.floor(Math.random() * secretPool.length)];
  const dur = parseFloat(document.getElementById('tk-duration').value) * 1000;
  const ticker = document.getElementById('tk-ticker');
  const bar = document.getElementById('tk-bar');

  const start = Date.now();
  const rollInt = setInterval(() => {
    let p = Math.min((Date.now() - start) / dur, 1);
    bar.style.width = (p * 100) + '%';

    if (p >= 1) {
      clearInterval(rollInt);
      ticker.textContent = winner.name.toUpperCase();
      
      // MARK SECRETLY AS WON
      winner._secretWon = true;
      saveState();

      setTimeout(() => { bar.style.width = '0%'; }, 400);
      showPopup('🗡️', 'The Killer!', winner.name, null, 'theKiller', winner.id);
      state.theKiller.spinning = false;
      return;
    }
    // Fake tick text (acak dari SEMUA item agar terlihat normal)
    ticker.textContent = allActive[Math.floor(Math.random() * allActive.length)].name.toUpperCase();
  }, 50);
}


/* =========================================
   GLOBAL POPUP CONTROLLER
========================================= */
function showPopup(icon, title, winnerText, imgSrc, category, itemId) {
  document.getElementById('popup-icon').innerHTML = icon;
  document.getElementById('popup-title').textContent = title;
  document.getElementById('popup-winner').textContent = winnerText;
  
  if (imgSrc) { 
    document.getElementById('popup-image-container').innerHTML = `<img src="${imgSrc}" style="width:100%; border-radius:8px;">`; 
    document.getElementById('popup-image-container').style.display = 'block'; 
  } else { 
    document.getElementById('popup-image-container').style.display = 'none'; 
  }
  
  document.getElementById('popup').classList.add('show');
}

function closePopup(remove) {
  document.getElementById('popup').classList.remove('show');
  // Logika remove asli dapat ditambahkan di sini jika dibutuhkan.
}

// Initializer
renderKillerUI();
renderTkUI();
// Untuk Winner, Giveaway, Team logic mirip dengan script Anda sebelumnya.