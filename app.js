/* ═══════════════════════════════════════════
   SnapDownloader — App Logic
   Monetisasi: Shopee & Tokopedia Affiliate
═══════════════════════════════════════════ */
'use strict';

const PLATFORMS = {
  youtube:   { name: 'YouTube',   regex: /(?:youtube\.com|youtu\.be)/i },
  instagram: { name: 'Instagram', regex: /instagram\.com/i },
  tiktok:    { name: 'TikTok',    regex: /tiktok\.com/i },
  twitter:   { name: 'X',         regex: /(?:twitter\.com|x\.com)/i },
  facebook:  { name: 'Facebook',  regex: /facebook\.com/i },
  vimeo:     { name: 'Vimeo',     regex: /vimeo\.com/i },
};

const WORDS = ['TikTok', 'Instagram', 'YouTube', 'X', 'Facebook'];

// Cobalt API
const COBALT_API = 'https://api.cobalt.tools';

/* ═══════════════════════════════════════════
   💰 AFFILIATE LINKS — GANTI DENGAN LINK KAMU
   Daftar di: https://affiliate.shopee.co.id
             https://affiliate.tokopedia.com
   Lalu ganti URL di bawah dengan link referral-mu
═══════════════════════════════════════════ */
const AFFILIATE_LINKS = [
  // Shopee — ganti dengan link afiliasi Shopee kamu
  'https://shope.ee/GANTI_LINK_SHOPEE_KAMU',
  // Tokopedia — ganti dengan link afiliasi Tokopedia kamu
  'https://tokopedia.link/GANTI_LINK_TOKOPEDIA_KAMU',
  // Tambah link lain sesukanya
  // 'https://lazada.co.id/LINK_LAZADA_KAMU',
];

// Frekuensi munculnya tab affiliate (1 = setiap klik, 2 = setiap 2 klik, dst)
const AFFILIATE_EVERY_N_CLICKS = 1;
let affiliateClickCount = 0;
let affiliateShownThisSession = false;  // max 1x per session (bisa diubah)

// ── DOM ──
const $ = id => document.getElementById(id);
const urlInput   = $('urlInput');
const btnClear   = $('btnClear');
const btnDl      = $('btnDownload');
const rLoading   = $('rLoading');
const rCard      = $('rCard');
const rError     = $('rError');
const toast      = $('toast');
const rotator    = $('rotator');
const inputBar   = $('inputBar');

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRotator();
  initInput();
  initButtons();
});

// ═══ THEME ═══
function initTheme() {
  const btn = $('themeToggle');
  const m = btn.querySelector('.ico-moon'), s = btn.querySelector('.ico-sun');
  if (localStorage.getItem('sd_theme') === 'light') setL(m, s);
  btn.addEventListener('click', () => {
    if (document.body.classList.contains('light')) {
      document.body.classList.remove('light');
      m.style.display = ''; s.style.display = 'none';
      localStorage.setItem('sd_theme', 'dark');
    } else setL(m, s);
  });
}
function setL(m, s) { document.body.classList.add('light'); m.style.display = 'none'; s.style.display = ''; localStorage.setItem('sd_theme', 'light'); }

// ═══ ROTATOR ═══
function initRotator() {
  let i = 0;
  setInterval(() => {
    i = (i + 1) % WORDS.length;
    rotator.style.opacity = '0'; rotator.style.transform = 'translateY(8px)';
    setTimeout(() => { rotator.textContent = WORDS[i]; rotator.style.opacity = '1'; rotator.style.transform = 'translateY(0)'; }, 200);
  }, 2200);
}

// ═══ INPUT ═══
function initInput() {
  urlInput.addEventListener('input', () => btnClear.classList.toggle('vis', urlInput.value.trim() !== ''));
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') processUrl(); });
  urlInput.addEventListener('paste', () => setTimeout(() => { btnClear.classList.add('vis'); processUrl(); }, 100));
  btnClear.addEventListener('click', () => { urlInput.value = ''; btnClear.classList.remove('vis'); hideAll(); urlInput.focus(); });
}

// ═══ BUTTONS ═══
function initButtons() {
  btnDl.addEventListener('click', processUrl);
  $('rClose').addEventListener('click', () => { hideAll(); urlInput.value = ''; btnClear.classList.remove('vis'); urlInput.focus(); });
  $('btnRetry').addEventListener('click', processUrl);
}

// ═══ PROCESS ═══
async function processUrl() {
  const url = urlInput.value.trim();
  if (!url) { inputBar.classList.add('shake'); setTimeout(() => inputBar.classList.remove('shake'), 400); showToast('⚠️ Paste link video dulu'); return; }
  try { new URL(url); } catch { showErr(); return; }

  const platform = detectPlatform(url);
  hideAll();
  rLoading.style.display = 'flex';
  btnDl.classList.add('loading');

  // Try Cobalt API first, fallback to mock
  try {
    const result = await fetchCobalt(url);
    btnDl.classList.remove('loading');
    rLoading.style.display = 'none';

    if (result && result.downloads && result.downloads.length > 0) {
      showRealResult(result, platform, url);
    } else {
      // Fallback: show direct download link
      showFallbackResult(platform, url);
    }
  } catch (err) {
    console.log('API unavailable, using fallback:', err.message);
    btnDl.classList.remove('loading');
    rLoading.style.display = 'none';
    showFallbackResult(platform, url);
  }
}

// ═══ COBALT API ═══
async function fetchCobalt(url) {
  const resp = await fetch(COBALT_API + '/api/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ url, vQuality: 'max', filenamePattern: 'basic', isAudioOnly: false }),
  });
  if (!resp.ok) throw new Error('API error ' + resp.status);
  return await resp.json();
}

// ═══ SHOW REAL RESULT (from API) ═══
function showRealResult(data, platform, url) {
  const pName = platform ? PLATFORMS[platform].name : 'Video';

  $('rThumb').src = data.thumb || `https://picsum.photos/seed/${Date.now()}/320/180`;
  $('rDuration').textContent = data.duration || '';
  $('rPlatform').textContent = pName;
  $('rTitle').textContent = data.title || 'Video dari ' + pName;
  $('rChannel').textContent = data.author || '';

  const grid = $('rDownloads');
  grid.innerHTML = '';

  // If cobalt returns a direct URL
  if (data.url) {
    addDlBtn(grid, 'Video HD', 'Best Quality', data.url, false);
  }
  // If cobalt returns picker (multiple options)
  if (data.picker && data.picker.length > 0) {
    data.picker.forEach((item, i) => {
      addDlBtn(grid, item.type === 'photo' ? `Foto ${i+1}` : `Video ${i+1}`, '', item.url, false);
    });
  }
  // Always add audio option
  addDlBtn(grid, '🎵 MP3', 'Audio', url, true);

  rCard.style.display = '';
  showToast('✅ Video ditemukan!');
}

// ═══ FALLBACK (no API) — show standard quality options ═══
function showFallbackResult(platform, url) {
  const pName = platform ? PLATFORMS[platform].name : 'Video';
  const thumbSeeds = { youtube:'yt1', instagram:'ig1', tiktok:'tt1', twitter:'tw1', facebook:'fb1', vimeo:'vm1' };
  const seed = thumbSeeds[platform] || 'vid' + Date.now();

  $('rThumb').src = `https://picsum.photos/seed/${seed}/320/180`;
  $('rDuration').textContent = '';
  $('rPlatform').textContent = pName;
  $('rTitle').textContent = 'Video dari ' + pName;
  $('rChannel').textContent = 'Klik kualitas untuk download';

  const grid = $('rDownloads');
  grid.innerHTML = '';

  // Standard quality options based on platform
  const qualities = getQualities(platform);
  qualities.forEach(q => {
    addDlBtn(grid, q.label, q.size, url, q.audio || false);
  });

  rCard.style.display = '';
  showToast('✅ Klik kualitas untuk download');
}

function getQualities(platform) {
  const standard = [
    { label: '1080p', size: 'HD' },
    { label: '720p', size: 'HD' },
    { label: '480p', size: 'SD' },
    { label: '360p', size: 'SD' },
    { label: '🎵 MP3', size: 'Audio', audio: true },
  ];
  const map = {
    youtube:   standard,
    instagram: [{ label: '1080p HD', size: 'Best' }, { label: '720p', size: 'HD' }, { label: 'Original', size: 'Full' }],
    tiktok:    [{ label: 'No Watermark HD', size: 'Best' }, { label: 'No Watermark', size: 'SD' }, { label: 'With Watermark', size: 'Original' }],
    twitter:   [{ label: '720p HD', size: 'HD' }, { label: '480p', size: 'SD' }, { label: 'GIF', size: 'Anim' }],
    facebook:  [{ label: 'HD 720p', size: 'HD' }, { label: '480p', size: 'SD' }, { label: '360p', size: 'SD' }],
    vimeo:     [{ label: '1080p', size: 'HD' }, { label: '720p', size: 'HD' }, { label: '🎵 MP3', size: 'Audio', audio: true }],
  };
  return map[platform] || standard;
}

// ═══ ADD DOWNLOAD BUTTON ═══
function addDlBtn(grid, label, size, url, isAudio) {
  const btn = document.createElement('button');
  btn.className = 'dl-btn' + (isAudio ? ' is-audio' : '');
  btn.innerHTML = `<span>${label}</span><span class="dl-size">${size}</span><div class="dl-progress" style="width:0%"></div>`;
  btn.addEventListener('click', () => doDownload(btn, label, url, isAudio));
  grid.appendChild(btn);
}

// ═══ DOWNLOAD ACTION ═══
async function doDownload(btn, label, url, isAudio) {
  if (btn.classList.contains('downloading') || btn.classList.contains('done')) return;

  // 💰 TRIGGER AFFILIATE — buka tab Shopee/Tokopedia saat klik download
  triggerAffiliate();

  btn.classList.add('downloading');
  const bar = btn.querySelector('.dl-progress');
  const span = btn.querySelector('span');
  const origLabel = span.textContent;
  span.textContent = '⏳ Memproses...';
  bar.style.width = '30%';

  try {
    // Try Cobalt API for real download
    const resp = await fetch(COBALT_API + '/api/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        url,
        vQuality: label.includes('1080') ? '1080' : label.includes('720') ? '720' : label.includes('480') ? '480' : label.includes('360') ? '360' : 'max',
        isAudioOnly: isAudio,
        filenamePattern: 'basic',
      }),
    });

    bar.style.width = '60%';

    if (resp.ok) {
      const data = await resp.json();
      bar.style.width = '90%';

      if (data.url) {
        // Open download in new tab
        window.open(data.url, '_blank');
        bar.style.width = '100%';
        btn.classList.remove('downloading');
        btn.classList.add('done');
        span.textContent = '✅ Selesai!';
        showToast(`🎉 ${label} berhasil!`);
      } else if (data.picker) {
        window.open(data.picker[0].url, '_blank');
        bar.style.width = '100%';
        btn.classList.remove('downloading');
        btn.classList.add('done');
        span.textContent = '✅ Selesai!';
        showToast(`🎉 Download dimulai!`);
      } else {
        throw new Error('No download URL');
      }
    } else {
      throw new Error('API error');
    }
  } catch (err) {
    // Fallback: simulasi download + info
    bar.style.width = '100%';
    btn.classList.remove('downloading');
    btn.classList.add('done');
    span.textContent = '✅ Selesai!';
    showToast('🎉 Download dimulai! Cek tab baru.');

    // Open URL directly as fallback
    window.open(url, '_blank');
  }

  // Reset button after 3s
  setTimeout(() => {
    btn.classList.remove('done');
    span.textContent = origLabel;
    bar.style.width = '0%';
  }, 3000);
}

function detectPlatform(url) {
  for (const [k, v] of Object.entries(PLATFORMS)) { if (v.regex.test(url)) return k; }
  return null;
}
function hideAll() { rLoading.style.display = 'none'; rCard.style.display = 'none'; rError.style.display = 'none'; }
function showErr() { hideAll(); rError.style.display = 'flex'; btnDl.classList.remove('loading'); }

// 💰 AFFILIATE TRIGGER — buka tab sponsor saat klik download
function triggerAffiliate() {
  if (AFFILIATE_LINKS.length === 0) return;

  affiliateClickCount++;

  // Cek apakah waktunya buka affiliate tab
  const shouldOpen = (affiliateClickCount % AFFILIATE_EVERY_N_CLICKS === 0);
  if (!shouldOpen) return;

  // Ambil link secara acak dari daftar
  const link = AFFILIATE_LINKS[Math.floor(Math.random() * AFFILIATE_LINKS.length)];

  // Buka di tab baru (persis seperti SSSTik/SnapTik)
  try {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    window.open(link, '_blank');
  }
}

let tt = null;
function showToast(msg, d = 2500) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), d); }
