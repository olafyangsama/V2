/* ═══════════════════════════════════════
   PARTICLE STARFIELD
═══════════════════════════════════════ */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const GOLD = 'rgba(255,215,0,';
  const SILVER = 'rgba(192,192,192,';
  const palettes = [GOLD, SILVER, GOLD, GOLD];

  for (let i = 0; i < 90; i++) {
    const p = palettes[Math.floor(Math.random() * palettes.length)];
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      da: (Math.random() * 0.004 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      pal: p
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      p.a += p.da;
      if (p.a < 0 || p.a > 1) p.da *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.pal + p.a + ')';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ═══════════════════════════════════════
   STATE & LOCALSTORAGE
═══════════════════════════════════════ */
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      winner: { items: state.winner.items },
      giveaway: { items: state.giveaway.items },
      killerSel: { items: state.killerSel.items },
      theKiller: { items: state.theKiller.items },
      teamSelection: { items: state.teamSelection.items }
    }));
  } catch(e) {
    if (e.name === 'QuotaExceededError') alert('Penyimpanan lokal penuh! Hapus beberapa gambar besar.');
    else console.warn('Save failed:', e);
  }
}

function resetAllData() {
  if (!confirm('Hapus semua data? Tindakan ini tidak dapat dibatalkan.')) return;
  state.winner = { items: [] }; state.giveaway = { items: [] };
  state.killerSel = { items: [] }; state.theKiller = { items: [] };
  state.teamSelection = { items: [] };
  saveState(); renderAllUI(); playSound('ban');
  updateLandingStats();
}

let state = loadState();
state.winner.spinning = false; state.giveaway.spinning = false;
state.killerSel.spinning = false; state.theKiller.spinning = false;
state.teamSelection.spinning = false;

let popupCategory = null, popupItemId = null;
let _id = Date.now();
function uid() { return 'id' + (_id++); }

/* ═══════════════════════════════════════
   LANDING
═══════════════════════════════════════ */
function updateLandingStats() {
  document.getElementById('stat-winners').textContent = state.winner.items.length;
  document.getElementById('stat-gifts').textContent = state.giveaway.items.length;
  document.getElementById('stat-killers').textContent = state.theKiller.items.length;
  document.getElementById('stat-teams').textContent = state.teamSelection.items.length;
}

function enterApp() {
  playSound('landingEnter');
  document.getElementById('landing').classList.add('hide');
  setTimeout(() => {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('app').classList.add('show');
    if (bgmAudio.paused) startBgm();
  }, 900);
}
updateLandingStats();

/* ═══════════════════════════════════════
   NAVIGATION & PANELS
═══════════════════════════════════════ */
function showPanel(id, btn) {
  playSound('nav');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

function toggleSection(id) {
  const el = document.getElementById(id);
  const isHidden = el.classList.contains('hidden');
  if (isHidden) { el.classList.remove('hidden'); el.style.maxHeight = '500px'; el.style.opacity = '1'; }
  else { el.classList.add('hidden'); el.style.maxHeight = '0'; el.style.opacity = '0'; }
}

/* ═══════════════════════════════════════
   RENDER HELPERS
═══════════════════════════════════════ */
function renderAllUI() {
  renderList('winner-list', state.winner.items, 'deleteWinnerItem');
  renderList('giveaway-list', state.giveaway.items, 'deleteGiveawayItem');
  renderMysteryBoxes(); renderKsItems(); renderKillerGrid();
  renderList('tk-list', state.theKiller.items, 'deleteTkItem');
  renderTeamList(); updateLandingStats();
}

function renderList(listId, items, onDelete) {
  const el = document.getElementById(listId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:10px 0">Belum ada item. Tambahkan di atas.</div>';
    return;
  }
  el.innerHTML = items.map(item => `
    <div class="item-chip ${item.banned ? 'banned' : ''}" id="chip-${item.id}">
      <span class="item-chip-name">${item.img ? '🖼 ' : ''}${item.name}${item.value ? ` — <span style="color:var(--gold);font-size:11px">${item.value}</span>` : ''}${item.members ? ` <span style="color:var(--silver-mid);font-size:10px">(${item.members.length} anggota)</span>` : ''}</span>
      <div class="item-chip-actions">
        <button class="btn-danger" onclick="${onDelete}('${item.id}')">✕</button>
      </div>
    </div>`).join('');
}

function saveAndRender(cat) {
  saveState(); updateLandingStats();
  if (cat === 'winner') renderList('winner-list', state.winner.items, 'deleteWinnerItem');
  else if (cat === 'giveaway') { renderList('giveaway-list', state.giveaway.items, 'deleteGiveawayItem'); renderMysteryBoxes(); }
  else if (cat === 'killerSel') { renderKsItems(); renderKillerGrid(); }
  else if (cat === 'theKiller') renderList('tk-list', state.theKiller.items, 'deleteTkItem');
  else if (cat === 'team') renderTeamList();
}

/* highlight helpers */
function highlightItemInList(cat, name) {
  const listMap = { winner: 'winner-list', theKiller: 'tk-list', team: 'team-list' };
  const listId = listMap[cat]; if (!listId) return;
  const chips = document.querySelectorAll(`#${listId} .item-chip`);
  chips.forEach(c => c.classList.remove('highlight'));
  const target = name.toLowerCase();
  for (let chip of chips) {
    const ns = chip.querySelector('.item-chip-name');
    if (ns) {
      let t = ns.textContent.replace('🖼 ', '').split(' — ')[0].split(' (')[0].trim().toLowerCase();
      if (t === target) { chip.classList.add('highlight'); chip.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); break; }
    }
  }
}
function clearHighlight(cat) {
  const listMap = { winner: 'winner-list', theKiller: 'tk-list', team: 'team-list' };
  const listId = listMap[cat]; if (!listId) return;
  document.querySelectorAll(`#${listId} .item-chip`).forEach(c => c.classList.remove('highlight'));
}

/* ═══════════════════════════════════════
   WINNER
═══════════════════════════════════════ */
function addWinnerItem() {
  const inp = document.getElementById('winner-new');
  const name = inp.value.trim(); if (!name) return;
  state.winner.items.push({ id: uid(), name });
  inp.value = ''; saveAndRender('winner'); playSound('add');
}
function deleteWinnerItem(id) { state.winner.items = state.winner.items.filter(i => i.id !== id); saveAndRender('winner'); }

function spinWinner() {
  const items = state.winner.items;
  if (items.length < 2) { alert('Tambahkan minimal 2 peserta!'); return; }
  if (state.winner.spinning) return;
  state.winner.spinning = true; playSound('spin');
  const btn = document.getElementById('winner-spin-btn');
  const ticker = document.getElementById('winner-ticker');
  const bar = document.getElementById('winner-bar');
  const dots = document.getElementById('winner-dots');
  btn.disabled = true; dots.style.display = 'flex'; ticker.classList.add('spinning');
  const winner = items[Math.floor(Math.random() * items.length)];
  const dur = Math.max(2000, parseFloat(document.getElementById('winner-duration').value) * 1000 / parseFloat(document.getElementById('winner-speed').value));
  const start = Date.now();
  const barInt = setInterval(() => { const p = Math.min((Date.now()-start)/dur, 1); bar.style.width = p*100+'%'; if(p>=1) clearInterval(barInt); }, 40);
  const tickDelay = Math.max(40, Math.floor(180 / parseFloat(document.getElementById('winner-speed').value)));
  const textInt = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      clearInterval(textInt);
      ticker.classList.remove('spinning'); ticker.textContent = winner.name.toUpperCase();
      ticker.style.textShadow = '0 0 30px var(--gold)';
      dots.style.display = 'none'; state.winner.spinning = false; btn.disabled = false;
      setTimeout(() => { bar.style.width = '0%'; ticker.style.textShadow = '0 0 20px var(--gold-glow)'; }, 400);
      playSound('winnerWin'); clearHighlight('winner');
      showPopup('🏆', 'Winner!', winner.name, null, 'winner', winner.id, true);
      return;
    }
    const rnd = items[Math.floor(Math.random() * items.length)].name;
    ticker.textContent = rnd.toUpperCase(); highlightItemInList('winner', rnd); playSound('spinTick');
  }, tickDelay);
}

/* ═══════════════════════════════════════
   GIVEAWAY BOX
═══════════════════════════════════════ */
function addGiveawayItem() {
  const lbl = document.getElementById('giveaway-label').value.trim();
  const val = document.getElementById('giveaway-value').value.trim();
  if (!lbl || !val) { alert('Isi label dan hadiah!'); return; }
  state.giveaway.items.push({ id: uid(), name: lbl, value: val });
  document.getElementById('giveaway-label').value = '';
  document.getElementById('giveaway-value').value = '';
  saveAndRender('giveaway'); playSound('add');
}
function deleteGiveawayItem(id) { state.giveaway.items = state.giveaway.items.filter(i => i.id !== id); saveAndRender('giveaway'); }

function renderMysteryBoxes() {
  const container = document.getElementById('mystery-boxes');
  if (!state.giveaway.items.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:24px;text-align:center;border:1px dashed var(--border-silver);border-radius:6px;width:100%">Tambahkan item hadiah terlebih dahulu.</div>';
    return;
  }
  container.innerHTML = state.giveaway.items.map(item => `
    <div class="mystery-box" id="mbox-${item.id}">
      <div class="box-icon">🎁</div>
      <div class="box-label">${item.name}</div>
    </div>`).join('');
}

function spinGiveaway() {
  const items = state.giveaway.items;
  if (!items.length) { alert('Tambahkan minimal 1 item hadiah!'); return; }
  if (state.giveaway.spinning) return;
  state.giveaway.spinning = true; playSound('spin');
  const btn = document.getElementById('giveaway-spin-btn');
  btn.disabled = true;
  const dur = Math.max(2000, parseFloat(document.getElementById('giveaway-duration').value) * 1000 / parseFloat(document.getElementById('giveaway-speed').value));
  const winner = items[Math.floor(Math.random() * items.length)];
  const allBoxes = document.querySelectorAll('.mystery-box:not(.opened)');
  if (!allBoxes.length) { allBoxes.forEach(b => { b.classList.remove('opened','selected'); b.querySelector('.box-icon').style.transform=''; b.querySelector('.box-icon').style.opacity='1'; b.querySelectorAll('.box-reveal').forEach(r=>r.remove()); }); }
  const start = Date.now();
  const tickDelay = Math.max(60, Math.floor(200 / parseFloat(document.getElementById('giveaway-speed').value)));
  const rollInt = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      clearInterval(rollInt);
      document.querySelectorAll('.mystery-box').forEach(b => b.classList.remove('rolling-highlight'));
      const targetBox = document.getElementById('mbox-' + winner.id);
      if (targetBox) {
        targetBox.classList.add('selected', 'opened');
        setTimeout(() => {
          const reveal = document.createElement('div'); reveal.className = 'box-reveal';
          reveal.innerHTML = `<div class="box-reveal-value">${winner.value}</div><div class="box-reveal-desc">${winner.name}</div>`;
          targetBox.appendChild(reveal);
        }, 300);
      }
      state.giveaway.spinning = false; btn.disabled = false;
      playSound('giveawayWin');
      setTimeout(() => showPopup('🎁', 'Giveaway Box!', winner.value, null, 'giveaway', winner.id, true, `Box: ${winner.name}`), 700);
      return;
    }
    document.querySelectorAll('.mystery-box').forEach(b => b.classList.remove('rolling-highlight'));
    const avail = Array.from(document.querySelectorAll('.mystery-box:not(.opened)'));
    if (avail.length) avail[Math.floor(Math.random() * avail.length)].classList.add('rolling-highlight');
    playSound('spinTick');
  }, tickDelay);
}

/* ═══════════════════════════════════════
   KILLER SELECTION
═══════════════════════════════════════ */
let ksImgData = null;
function handleKsImageUpload(inp) {
  const file = inp.files[0]; if (!file) return;
  if (file.size > 512 * 1024) { alert('File terlalu besar (maks 500KB). Gunakan URL saja.'); inp.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => { ksImgData = e.target.result; document.getElementById('ks-img-preview-name').textContent = file.name; };
  reader.readAsDataURL(file);
}

function addKsItem() {
  const name = document.getElementById('ks-name').value.trim(); if (!name) return;
  const urlInp = document.getElementById('ks-img-url').value.trim();
  const img = ksImgData || (urlInp || null);
  state.killerSel.items.push({ id: uid(), name, img, banned: false });
  document.getElementById('ks-name').value = ''; document.getElementById('ks-img-url').value = '';
  document.getElementById('ks-img-preview-name').textContent = '';
  document.getElementById('ks-img-file').value = ''; ksImgData = null;
  saveAndRender('killerSel'); playSound('add');
}
function deleteKsItem(id) { state.killerSel.items = state.killerSel.items.filter(i => i.id !== id); saveAndRender('killerSel'); }

function toggleKsBan(id) {
  const item = state.killerSel.items.find(i => i.id === id);
  if (item) { item.banned = !item.banned; saveAndRender('killerSel'); playSound(item.banned ? 'ban' : 'add'); }
}

function renderKsItems() {
  const el = document.getElementById('ks-list'); if (!el) return;
  if (!state.killerSel.items.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:10px 0">Belum ada karakter.</div>'; return; }
  el.innerHTML = state.killerSel.items.map(item => `
    <div class="item-chip ${item.banned ? 'banned' : ''}" id="chip-${item.id}">
      <span class="item-chip-name">${item.img ? '🖼 ' : ''}${item.name}</span>
      <div class="item-chip-actions">
        <button class="btn-danger" style="font-size:10px;padding:4px 8px;border-color:${item.banned ? 'rgba(68,221,136,0.4)' : 'rgba(255,68,85,0.3)'};color:${item.banned ? 'var(--green)' : 'var(--red)'}" onclick="toggleKsBan('${item.id}')">${item.banned ? '✓ Unban' : '✕ Ban'}</button>
        <button class="btn-danger" onclick="deleteKsItem('${item.id}')">🗑</button>
      </div>
    </div>`).join('');
}

function renderKillerGrid() {
  const grid = document.getElementById('killer-grid'); if (!grid) return;
  if (!state.killerSel.items.length) { grid.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:16px">Tambahkan karakter terlebih dahulu.</div>'; return; }
  grid.innerHTML = state.killerSel.items.map(item => `
    <div class="killer-card ${item.banned ? 'banned' : ''}" id="kcard-${item.id}">
      <div class="kc-img">${item.img ? `<img src="${item.img}" alt="${item.name}" onerror="this.style.display='none'">` : '🧑'}</div>
      <div class="kc-name">${item.name}</div>
      <button class="kc-ban-btn" onclick="toggleKsBan('${item.id}')">${item.banned ? 'UNBAN' : 'BAN'}</button>
    </div>`).join('');
}

function spinKillerSel() {
  const avail = state.killerSel.items.filter(i => !i.banned);
  if (avail.length < 1) { alert('Tidak ada karakter aktif (semua di-banned atau kosong)!'); return; }
  if (state.killerSel.spinning) return;
  state.killerSel.spinning = true; playSound('spin');
  const btn = document.getElementById('ks-spin-btn'); btn.disabled = true;
  const winner = avail[Math.floor(Math.random() * avail.length)];
  const dur = Math.max(2000, parseFloat(document.getElementById('ks-duration').value) * 1000 / parseFloat(document.getElementById('ks-speed').value));
  const start = Date.now();
  const tickDelay = Math.max(60, Math.floor(200 / parseFloat(document.getElementById('ks-speed').value)));
  const rollInt = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      clearInterval(rollInt);
      document.querySelectorAll('.killer-card').forEach(c => c.classList.remove('rolling'));
      const wCard = document.getElementById('kcard-' + winner.id);
      if (wCard) { wCard.classList.add('selected'); wCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      state.killerSel.spinning = false; btn.disabled = false;
      playSound('killerSelWin');
      showPopup('🎯', 'Killer Terpilih!', winner.name, winner.img || null, 'killerSel', winner.id, false);
      return;
    }
    document.querySelectorAll('.killer-card:not(.banned)').forEach(c => c.classList.remove('rolling'));
    const cards = Array.from(document.querySelectorAll('.killer-card:not(.banned)'));
    if (cards.length) cards[Math.floor(Math.random() * cards.length)].classList.add('rolling');
    playSound('spinTick');
  }, tickDelay);
}

/* ═══════════════════════════════════════
   THE KILLER
═══════════════════════════════════════ */
function addTkItem() {
  const inp = document.getElementById('tk-new');
  const name = inp.value.trim(); if (!name) return;
  state.theKiller.items.push({ id: uid(), name });
  inp.value = ''; saveAndRender('theKiller'); playSound('add');
}
function deleteTkItem(id) { state.theKiller.items = state.theKiller.items.filter(i => i.id !== id); saveAndRender('theKiller'); }

function spinTheKiller() {
  const items = state.theKiller.items;
  if (items.length < 2) { alert('Tambahkan minimal 2 nama!'); return; }
  if (state.theKiller.spinning) return;
  state.theKiller.spinning = true; playSound('spin');
  const btn = document.getElementById('tk-spin-btn');
  const ticker = document.getElementById('tk-ticker');
  const bar = document.getElementById('tk-bar');
  const dots = document.getElementById('tk-dots');
  btn.disabled = true; dots.style.display = 'flex'; ticker.classList.add('spinning');
  const winner = items[Math.floor(Math.random() * items.length)];
  const dur = Math.max(2000, parseFloat(document.getElementById('tk-duration').value) * 1000 / parseFloat(document.getElementById('tk-speed').value));
  const start = Date.now();
  const barInt = setInterval(() => { const p=Math.min((Date.now()-start)/dur,1); bar.style.width=p*100+'%'; if(p>=1)clearInterval(barInt); }, 40);
  const tickDelay = Math.max(40, Math.floor(180 / parseFloat(document.getElementById('tk-speed').value)));
  const textInt = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      clearInterval(textInt); ticker.classList.remove('spinning');
      ticker.textContent = winner.name.toUpperCase();
      dots.style.display = 'none'; state.theKiller.spinning = false; btn.disabled = false;
      setTimeout(() => { bar.style.width = '0%'; }, 400);
      playSound('theKillerWin'); clearHighlight('theKiller');
      showPopup('🗡️', 'The Killer!', winner.name, null, 'theKiller', winner.id, true);
      return;
    }
    const rnd = items[Math.floor(Math.random() * items.length)].name;
    ticker.textContent = rnd.toUpperCase(); highlightItemInList('theKiller', rnd); playSound('spinTick');
  }, tickDelay);
}

/* ═══════════════════════════════════════
   TEAM SELECTION
═══════════════════════════════════════ */
function addTeamItem() {
  const name = document.getElementById('team-name').value.trim(); if (!name) return;
  const rawMembers = document.getElementById('team-members').value.trim();
  const members = rawMembers ? rawMembers.split(/[\n,]+/).map(m => m.trim()).filter(Boolean) : [];
  state.teamSelection.items.push({ id: uid(), name, members });
  document.getElementById('team-name').value = '';
  document.getElementById('team-members').value = '';
  saveAndRender('team'); playSound('add');
}
function deleteTeamItem(id) { state.teamSelection.items = state.teamSelection.items.filter(i => i.id !== id); saveAndRender('team'); }

function renderTeamList() {
  const el = document.getElementById('team-list'); if (!el) return;
  const items = state.teamSelection.items;
  if (!items.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:10px 0">Belum ada tim.</div>'; return; }
  el.innerHTML = items.map(item => `
    <div class="item-chip" id="chip-${item.id}">
      <span class="item-chip-name">👥 ${item.name} ${item.members?.length ? `<span style="color:var(--silver-mid);font-size:10px">(${item.members.length} anggota)</span>` : ''}</span>
      <div class="item-chip-actions">
        <button class="btn-danger" onclick="deleteTeamItem('${item.id}')">✕</button>
      </div>
    </div>`).join('');
}

function spinTeam() {
  const items = state.teamSelection.items;
  if (items.length < 2) { alert('Tambahkan minimal 2 tim!'); return; }
  if (state.teamSelection.spinning) return;
  state.teamSelection.spinning = true; playSound('spin');
  const btn = document.getElementById('team-spin-btn');
  const ticker = document.getElementById('team-ticker');
  const bar = document.getElementById('team-bar');
  const dots = document.getElementById('team-dots');
  btn.disabled = true; dots.style.display = 'flex'; ticker.classList.add('spinning');
  const winner = items[Math.floor(Math.random() * items.length)];
  const dur = Math.max(2000, parseFloat(document.getElementById('team-duration').value) * 1000 / parseFloat(document.getElementById('team-speed').value));
  const start = Date.now();
  const barInt = setInterval(() => { const p=Math.min((Date.now()-start)/dur,1); bar.style.width=p*100+'%'; if(p>=1)clearInterval(barInt); }, 40);
  const tickDelay = Math.max(40, Math.floor(180 / parseFloat(document.getElementById('team-speed').value)));
  const textInt = setInterval(() => {
    const elapsed = Date.now() - start;
    if (elapsed >= dur) {
      clearInterval(textInt); ticker.classList.remove('spinning');
      ticker.textContent = winner.name.toUpperCase();
      dots.style.display = 'none'; state.teamSelection.spinning = false; btn.disabled = false;
      setTimeout(() => { bar.style.width = '0%'; }, 400);
      playSound('winnerWin'); clearHighlight('team');
      let detailsHtml = '';
      if (winner.members && winner.members.length) {
        detailsHtml = `<div style="font-size:11px;color:var(--gold-mid);margin-bottom:6px;font-family:'Cinzel',serif;letter-spacing:2px">ANGGOTA TIM</div><ul class="members-list">${winner.members.map(m=>`<li>${m}</li>`).join('')}</ul>`;
      }
      showPopup('👥', 'Team Terpilih!', winner.name, null, 'team', winner.id, true, detailsHtml);
      return;
    }
    const rnd = items[Math.floor(Math.random() * items.length)].name;
    ticker.textContent = rnd.toUpperCase(); highlightItemInList('team', rnd); playSound('spinTick');
  }, tickDelay);
}

/* ═══════════════════════════════════════
   POPUP
═══════════════════════════════════════ */
const confCanvas = document.getElementById('confetti-canvas');
const confCtx = confCanvas.getContext('2d');
let confParticles = [], confAnimId = null;

function showPopup(icon, title, winnerText, imgSrc, category, itemId, canRemove, detailsHtml) {
  launchConfetti();
  document.getElementById('popup-icon').innerHTML = icon;
  document.getElementById('popup-title').textContent = title;
  document.getElementById('popup-winner').textContent = winnerText;
  const imgContainer = document.getElementById('popup-image-container');
  if (imgSrc) { imgContainer.innerHTML = `<img src="${imgSrc}" alt="Winner image" onerror="this.style.display='none'">`; imgContainer.style.display = 'block'; }
  else { imgContainer.style.display = 'none'; imgContainer.innerHTML = ''; }
  const detailsDiv = document.getElementById('popup-details');
  if (detailsHtml) { detailsDiv.innerHTML = detailsHtml; detailsDiv.style.display = 'block'; }
  else { detailsDiv.style.display = 'none'; detailsDiv.innerHTML = ''; }
  document.getElementById('popup-remove-btn').style.display = canRemove ? '' : 'none';
  popupCategory = category; popupItemId = itemId;
  document.getElementById('popup').classList.add('show');
}

function closePopup(remove) {
  playSound('click');
  document.getElementById('popup').classList.remove('show');
  stopConfetti();
  if (remove === true && popupCategory && popupItemId) {
    if (popupCategory === 'winner') { state.winner.items = state.winner.items.filter(i => i.id !== popupItemId); saveAndRender('winner'); }
    else if (popupCategory === 'giveaway') { state.giveaway.items = state.giveaway.items.filter(i => i.id !== popupItemId); saveAndRender('giveaway'); }
    else if (popupCategory === 'theKiller') { state.theKiller.items = state.theKiller.items.filter(i => i.id !== popupItemId); saveAndRender('theKiller'); }
    else if (popupCategory === 'team') { state.teamSelection.items = state.teamSelection.items.filter(i => i.id !== popupItemId); saveAndRender('team'); }
  }
  popupCategory = null; popupItemId = null;
}

/* ═══════════════════════════════════════
   CONFETTI (Gold & Silver theme)
═══════════════════════════════════════ */
function launchConfetti() {
  confCanvas.width = window.innerWidth; confCanvas.height = window.innerHeight;
  confParticles = [];
  const colors = ['#FFD700','#FFE566','#C8A800','#C0C0C0','#E8E8E8','#909090','#FFFFFF','#F5F0E8'];
  for (let i = 0; i < 180; i++) confParticles.push({
    x: Math.random() * confCanvas.width, y: -20,
    vx: (Math.random() - 0.5) * 7, vy: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 9 + 3, rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 12,
    shape: Math.random() > 0.4 ? 'rect' : (Math.random() > 0.5 ? 'circle' : 'diamond')
  });
  if (confAnimId) cancelAnimationFrame(confAnimId);
  function draw() {
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    confParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.06;
      confCtx.save(); confCtx.translate(p.x, p.y); confCtx.rotate(p.rot * Math.PI / 180);
      confCtx.fillStyle = p.color; confCtx.globalAlpha = Math.max(0, 1 - p.y / confCanvas.height);
      if (p.shape === 'rect') confCtx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      else if (p.shape === 'circle') { confCtx.beginPath(); confCtx.arc(0, 0, p.size/2, 0, Math.PI*2); confCtx.fill(); }
      else { confCtx.beginPath(); confCtx.moveTo(0,-p.size/2); confCtx.lineTo(p.size/2,0); confCtx.lineTo(0,p.size/2); confCtx.lineTo(-p.size/2,0); confCtx.closePath(); confCtx.fill(); }
      confCtx.restore();
    });
    confParticles = confParticles.filter(p => p.y < confCanvas.height + 30);
    if (confParticles.length > 0) confAnimId = requestAnimationFrame(draw);
    else confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  }
  draw();
}
function stopConfetti() { if (confAnimId) cancelAnimationFrame(confAnimId); confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height); confParticles = []; }

/* ═══════════════════════════════════════
   AUDIO ENGINE
═══════════════════════════════════════ */
const AudioCtx = window.AudioContext || window.webkitAudioContext; let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new AudioCtx(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
const bgmAudio = new Audio('Music background.mp3'); bgmAudio.loop = true; bgmAudio.volume = 0.4;
const sfxCache = {};
function loadSfx(src) { if (!sfxCache[src]) sfxCache[src] = new Audio(src); return sfxCache[src]; }
const audio = { bgmMuted: false, sfxMuted: false, bgmVolume: 0.4, sfxVolume: 0.7, panelOpen: false };

function startBgm() { bgmAudio.play().catch(e => {}); updateVisualizer(true); document.getElementById('now-playing-text').textContent = 'BGM Playing'; }
function setBgmVolume(v) { audio.bgmVolume = v/100; if (!audio.bgmMuted) bgmAudio.volume = audio.bgmVolume; document.getElementById('bgm-vol-pct').textContent = v+'%'; }
function setSfxVolume(v) { audio.sfxVolume = v/100; document.getElementById('sfx-vol-pct').textContent = v+'%'; }
function toggleBgmMute() { audio.bgmMuted = !audio.bgmMuted; bgmAudio.volume = audio.bgmMuted ? 0 : audio.bgmVolume; const b=document.getElementById('bgm-mute-btn'); b.textContent=audio.bgmMuted?'🔇':'🔊'; b.classList.toggle('active',!audio.bgmMuted); updateVisualizer(!audio.bgmMuted && !bgmAudio.paused); }
function toggleSfxMute() { audio.sfxMuted = !audio.sfxMuted; const b=document.getElementById('sfx-mute-btn'); b.textContent=audio.sfxMuted?'🔇':'🔊'; b.classList.toggle('active',!audio.sfxMuted); }
function toggleAudioPanel() { audio.panelOpen = !audio.panelOpen; document.getElementById('audio-panel').classList.toggle('open', audio.panelOpen); playSound('click'); if (bgmAudio.paused) startBgm(); }
function updateVisualizer(playing) { const v=document.getElementById('header-visualizer'); if(v)v.classList.toggle('paused',!playing); const d=document.getElementById('npDot'); if(d)d.classList.toggle('paused',!playing); }

function playSound(type) {
  if (audio.sfxMuted) return;
  if (type === 'theKillerWin') { const s=loadSfx('sfx 1.mp3'); s.volume=audio.sfxVolume; s.currentTime=0; s.play().catch(e=>{}); return; }
  if (type === 'killerSelWin') { const s=loadSfx('Sfx 2.mp3'); s.volume=audio.sfxVolume; s.currentTime=0; s.play().catch(e=>{}); return; }
  if (type === 'winnerWin') { const s=loadSfx('Winner.mp3'); s.volume=audio.sfxVolume; s.currentTime=0; s.play().catch(e=>{}); return; }
  if (type === 'giveawayWin') { const s=loadSfx('Giveaway.mp3'); s.volume=audio.sfxVolume; s.currentTime=0; s.play().catch(e=>{}); return; }
  const ctx=getAudioCtx(); const gain=ctx.createGain(); gain.gain.value=audio.sfxVolume; gain.connect(ctx.destination); const t=ctx.currentTime;
  const C4=261.63,E4=329.63,G4=392.00,A4=440.00,C5=523.25,E5=659.25,G3=196.00,C3=130.81;
  switch(type) {
    case 'click': { const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(600,t+0.04); const g=ctx.createGain(); g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05); o.connect(g); g.connect(gain); o.start(t); o.stop(t+0.06); break; }
    case 'spin': { const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(900,t+0.5); const g=ctx.createGain(); g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.55); o.connect(g); g.connect(gain); o.start(t); o.stop(t+0.6); break; }
    case 'spinTick': { const o=ctx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(800+Math.random()*400,t); const g=ctx.createGain(); g.gain.setValueAtTime(0.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.025); o.connect(g); g.connect(gain); o.start(t); o.stop(t+0.03); break; }
    case 'winner': { [C4,E4,G4,C5,E5].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(f,t+i*0.12); const g=ctx.createGain(); g.gain.setValueAtTime(0,t+i*0.12); g.gain.linearRampToValueAtTime(0.4,t+i*0.12+0.05); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.12+0.4); o.connect(g); g.connect(gain); o.start(t+i*0.12); o.stop(t+i*0.12+0.5); }); break; }
    case 'add': { const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(660,t); o.frequency.exponentialRampToValueAtTime(1320,t+0.08); const g=ctx.createGain(); g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1); o.connect(g); g.connect(gain); o.start(t); o.stop(t+0.12); break; }
    case 'open': { [440,554,659,880,1109].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f,t+i*0.08); const g=ctx.createGain(); g.gain.setValueAtTime(0.3,t+i*0.08); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.08+0.5); o.connect(g); g.connect(gain); o.start(t+i*0.08); o.stop(t+i*0.08+0.6); }); break; }
    case 'ban': { const o1=ctx.createOscillator(); o1.type='sawtooth'; o1.frequency.setValueAtTime(400,t); o1.frequency.exponentialRampToValueAtTime(80,t+0.5); const g=ctx.createGain(); g.gain.setValueAtTime(0.35,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.6); o1.connect(g); g.connect(gain); o1.start(t); o1.stop(t+0.65); break; }
    case 'killer': { [C3,G3,C4].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(f,t+i*0.06); const g=ctx.createGain(); g.gain.setValueAtTime(0.4,t+i*0.06); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.06+0.6); o.connect(g); g.connect(gain); o.start(t+i*0.06); o.stop(t+i*0.06+0.65); }); break; }
    case 'hover': { const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(800,t); const g=ctx.createGain(); g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04); o.connect(g); g.connect(gain); o.start(t); o.stop(t+0.05); break; }
    case 'nav': { [G4,C5].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f,t+i*0.07); const g=ctx.createGain(); g.gain.setValueAtTime(0.2,t+i*0.07); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.07+0.15); o.connect(g); g.connect(gain); o.start(t+i*0.07); o.stop(t+i*0.07+0.18); }); break; }
    case 'landingEnter': { [C3,C4,G4,C5].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(f,t+i*0.15); const g=ctx.createGain(); g.gain.setValueAtTime(0.45,t+i*0.15); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.15+0.9); o.connect(g); g.connect(gain); o.start(t+i*0.15); o.stop(t+i*0.15+1.0); }); break; }
  }
}

/* double-click global mute */
let audioAllMuted = false;
document.getElementById('audio-toggle-btn').addEventListener('dblclick', () => {
  audioAllMuted = !audioAllMuted;
  const btn = document.getElementById('audio-toggle-btn');
  if (audioAllMuted) { bgmAudio.volume=0; btn.textContent='🔇'; btn.classList.add('muted'); updateVisualizer(false); }
  else { bgmAudio.volume = audio.bgmMuted ? 0 : audio.bgmVolume; btn.textContent='🎵'; btn.classList.remove('muted'); updateVisualizer(!bgmAudio.paused && !audio.bgmMuted); }
});

/* hover sounds on spin buttons */
document.querySelectorAll('.btn-spin, .landing-btn, .nav-btn').forEach(b => b.addEventListener('mouseenter', () => { if (!audio.sfxMuted) playSound('hover'); }));

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
renderAllUI();

/* expose globals */
window.closePopup = closePopup; window.toggleKsBan = toggleKsBan;
window.deleteWinnerItem = deleteWinnerItem; window.deleteGiveawayItem = deleteGiveawayItem;
window.deleteKsItem = deleteKsItem; window.deleteTkItem = deleteTkItem; window.deleteTeamItem = deleteTeamItem;
window.addWinnerItem = addWinnerItem; window.addGiveawayItem = addGiveawayItem;
window.addKsItem = addKsItem; window.addTkItem = addTkItem; window.addTeamItem = addTeamItem;
window.spinWinner = spinWinner; window.spinGiveaway = spinGiveaway;
window.spinKillerSel = spinKillerSel; window.spinTheKiller = spinTheKiller; window.spinTeam = spinTeam;
window.toggleSection = toggleSection; window.showPanel = showPanel; window.enterApp = enterApp;
window.toggleBgmMute = toggleBgmMute; window.toggleSfxMute = toggleSfxMute;
window.setBgmVolume = setBgmVolume; window.setSfxVolume = setSfxVolume;
window.toggleAudioPanel = toggleAudioPanel; window.playSound = playSound;
window.handleKsImageUpload = handleKsImageUpload; window.resetAllData = resetAllData;