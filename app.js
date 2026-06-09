/* =============================================
   DonghuaVerse — app.js  v3
   Mapping field API sesuai response asli
============================================= */

const API = 'https://www.sankavollerei.com/anime/donghua';

const state = {
  currentPage : 'home',
  previousPage: 'home',
  prevDetailSlug: null,
  initialized : {},
  searchKw    : '',
  genreSlug   : '',
  genreName   : '',
};

const $ = id => document.getElementById(id);

/* ============================================================
   NAVIGATION
============================================================ */
function showPage(id) {
  // Kalau keluar dari halaman episode, matiin suara iframe
  if (state.currentPage === 'episode' && id !== 'episode') {
    const f = document.getElementById('playerFrame');
    if (f) { f.src = 'about:blank'; }
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link,.mobile-link,.bn-item').forEach(l => l.classList.remove('active'));
  const page = $(`page-${id}`);
  if (!page) return;
  page.classList.add('active');
  document.querySelectorAll(`[data-page="${id}"]`).forEach(l => l.classList.add('active'));
  // Update bottom nav
  document.querySelectorAll('.bn-item').forEach(l => {
    l.classList.toggle('active', l.dataset.page === id);
  });
  state.currentPage = id;
  if (!state.initialized[id]) {
    state.initialized[id] = true;
    switch (id) {
      case 'home':      loadHome(1);      break;
      case 'ongoing':   loadOngoing(1);   break;
      case 'completed': loadCompleted(1); break;
      case 'latest':    loadLatest(1);    break;
      case 'schedule':  loadSchedule();   break;
      case 'genres':    loadGenres();     break;
      case 'seasons':   initSeasons();    break;
    }
  }
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-page]').forEach(l =>
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); })
);

const hamburger = $('hamburger');
const mobileMenu = $('mobileMenu');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    if (mobileMenu) mobileMenu.classList.toggle('open');
  });
}
function closeMobileMenu() {
  if (hamburger) hamburger.classList.remove('open');
  if (mobileMenu) mobileMenu.classList.remove('open');
}
window.addEventListener('scroll', () =>
  $('navbar').classList.toggle('scrolled', window.scrollY > 20)
);

$('searchBtn').addEventListener('click', doSearch);
$('searchInput').addEventListener('keydown', e => e.key === 'Enter' && doSearch());
function doSearch() {
  const kw = $('searchInput').value.trim();
  if (!kw) return;
  state.searchKw = kw;
  $('searchQueryLabel').textContent = `Keyword: "${kw}"`;
  state.initialized['search'] = true;
  showPage('search');
  loadSearch(kw, 1);
}

/* ============================================================
   FETCH
============================================================ */
async function fetchAPI(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}



/* ============================================================
   PARTICLES
============================================================ */
(function() {
  const c = $('bgParticles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.setProperty('--dur',   (6 + Math.random() * 8) + 's');
    p.style.setProperty('--delay', (Math.random() * 8)     + 's');
    c.appendChild(p);
  }
})();

/* ============================================================
   AZ FILTER
============================================================ */
// AZ filter dihapus dari home

/* ============================================================
   SLUG HELPERS
   /home latest_release  → href = /donghua/episode/SLUG  → episode
   /home completed_donghua → href = /donghua/detail/SLUG → detail
   /latest latest_donghua  → href = /donghua/detail/SLUG → detail
   /ongoing ongoing_donghua → slug = detail slug
   /completed completed_donghua → slug = detail slug
============================================================ */

// Ambil slug episode dari href /donghua/episode/SLUG
function epSlugFromHref(href) {
  if (!href) return '';
  const m = href.match(/\/episode\/([^?#]+)/);
  return m ? m[1].replace(/\/+$/, '') : '';
}

// Ambil slug detail dari href /donghua/detail/SLUG atau dari item.slug
function detailSlugFrom(item) {
  // Cek semua kemungkinan field yang mengandung URL detail
  const hrefFields = [item.href, item.url, item.link, item.endpoint, item.detail_url];
  for (const h of hrefFields) {
    if (!h) continue;
    const m = String(h).match(/\/detail\/([^?#]+)/);
    if (m) return m[1].replace(/\/+$/, '');
    // Kalau ada /donghua/SLUG format
    const m2 = String(h).match(/\/donghua\/([^?#\/]+)\/?$/);
    if (m2) return m2[1].replace(/\/+$/, '');
  }
  // Cek field slug langsung
  const slugFields = [item.slug, item.donghua_slug, item.detail_slug, item.id_slug];
  for (const s of slugFields) {
    if (s) return String(s).replace(/\/+$/, '');
  }
  return '';
}

/* ============================================================
   HOME — ambil dari ongoing + completed
   ongoing_donghua & completed_donghua punya slug bersih (detail slug)
============================================================ */
async function loadHome(page = 1) {
  const grid = $('homeGrid');
  grid.innerHTML = loadingHTML();
  try {
    const [latestData, completedData] = await Promise.all([
      fetchAPI(`/latest/${page}`),
      fetchAPI(`/completed/1`),
    ]);
    const latestItems = (latestData.latest_donghua || []).map(i => ({
      ...i, _mode: 'detail', _slug: (i.slug||'').replace(/\/+$/,'')
    }));
    const completedItems = (completedData.completed_donghua || []).map(i => ({
      ...i, _mode: 'detail', _slug: (i.slug||'').replace(/\/+$/,'')
    }));

    let html = '';

    // Update Terbaru Donghua
    if (latestItems.length) {
      html += `
        <div class="home-section-title">
          <span class="hs-dot latest"></span>Donghua Terbaru
          <span class="hs-count">${latestItems.length}</span>
        </div>
        <div class="grid-container">
          ${latestItems.map((item, idx) => cardHTML(item, idx)).join('')}
        </div>`;
    }

    // Sudah Tamat Donghua
    if (completedItems.length) {
      html += `
        <div class="home-section-title" style="margin-top:32px">
          <span class="hs-dot completed"></span>Donghua Tamat
          <span class="hs-count">${completedItems.length}</span>
        </div>
        <div class="grid-container">
          ${completedItems.map((item, idx) => cardHTML(item, idx)).join('')}
        </div>`;
    }

    if (!html) { grid.innerHTML = emptyHTML('Tidak ada data'); return; }
    grid.innerHTML = html;

    grid.querySelectorAll('.anime-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.dataset.slug) loadDetail(card.dataset.slug);
      });
    });

    renderPagination('homePagination', page, latestData.totalPage || 1,
      p => { state.initialized['home'] = true; loadHome(p); });
  } catch (err) {
    grid.innerHTML = errorHTML(() => loadHome(page));
  }
}


async function loadAZList(letter, page = 1) {
  const grid = $('homeGrid');
  grid.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI(`/az-list/${letter}/${page}`);
    const items = (data.data || data.donghua_list || data.anime_list || []);
    renderDetailCards(grid, items);
    renderPagination('homePagination', page, data.totalPage || data.last_page || 1,
      p => loadAZList(letter, p));
  } catch (err) { grid.innerHTML = errorHTML(() => loadAZList(letter, page)); }
}

/* ============================================================
   ONGOING  → { ongoing_donghua: [{title,slug,poster,status,...}] }
   slug = detail slug
============================================================ */
async function loadOngoing(page = 1) {
  const grid = $('ongoingGrid');
  grid.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI(`/ongoing/${page}`);
    renderDetailCards(grid, data.ongoing_donghua || []);
    renderPagination('ongoingPagination', page, data.totalPage || 1,
      p => { state.initialized['ongoing'] = true; loadOngoing(p); });
  } catch (err) { grid.innerHTML = errorHTML(() => loadOngoing(page)); }
}

/* ============================================================
   COMPLETED → { completed_donghua: [{title,slug,poster,...}] }
   slug = detail slug
============================================================ */
async function loadCompleted(page = 1) {
  const grid = $('completedGrid');
  grid.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI(`/completed/${page}`);
    renderDetailCards(grid, data.completed_donghua || []);
    renderPagination('completedPagination', page, data.totalPage || 1,
      p => { state.initialized['completed'] = true; loadCompleted(p); });
  } catch (err) { grid.innerHTML = errorHTML(() => loadCompleted(page)); }
}

/* ============================================================
   LATEST → { latest_donghua: [{title,slug,poster,href→/detail/,...}] }
   slug = detail slug, klik → detail
============================================================ */
async function loadLatest(page = 1) {
  const grid = $('latestGrid');
  grid.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI(`/latest/${page}`);
    renderLatestCards(grid, data.latest_donghua || []);
    renderPagination('latestPagination', page, data.totalPage || 1,
      p => { state.initialized['latest'] = true; loadLatest(p); });
  } catch (err) { grid.innerHTML = errorHTML(() => loadLatest(page)); }
}

/* ============================================================
   SCHEDULE → { schedule: [{day, donghua_list:[{title,slug,poster,episode,release_time,href}]}] }
============================================================ */
async function loadSchedule() {
  const c = $('scheduleContainer');
  c.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI('/schedule');
    const schedule = data.schedule || [];
    if (!schedule.length) {
      c.innerHTML = emptyHTML('Tidak ada data jadwal'); return;
    }
    c.innerHTML = schedule.map(day => {
      const list = day.donghua_list || [];
      const items = list.map(a => {
        const slug = detailSlugFrom(a);
        return `
          <div class="schedule-item" data-slug="${esc(slug)}">
            <div class="schedule-item-title">${esc(a.title || '')}</div>
            <div class="schedule-item-ep">
              ${a.episode ? `Ep ${esc(a.episode)}` : ''}
              ${a.release_time ? ` · ${esc(a.release_time)}` : ''}
            </div>
          </div>`;
      }).join('');
      return `
        <div class="schedule-day">
          <div class="schedule-day-header">
            <span class="day-name">${esc(day.day || '')}</span>
            <span class="day-badge">${list.length} donghua</span>
          </div>
          <div class="schedule-list">${items || '<p style="color:var(--text-dim);font-size:13px;padding:8px">Tidak ada tayang</p>'}</div>
        </div>`;
    }).join('');

    c.querySelectorAll('.schedule-item').forEach(item =>
      item.addEventListener('click', () => {
        if (item.dataset.slug) loadDetail(item.dataset.slug);
      })
    );
  } catch (err) {
    c.innerHTML = `<div class="error-state"><span class="err-code">!</span><p>Gagal memuat jadwal</p>
      <button class="retry-btn" onclick="loadSchedule()">Coba Lagi</button></div>`;
  }
}

/* ============================================================
   GENRES → { data:[{name,slug}] }
============================================================ */
async function loadGenres() {
  const c = $('genreListContainer');
  c.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI('/genres');
    const genres = data.data || data.genres || [];
    if (!genres.length) { c.innerHTML = emptyHTML('Tidak ada genre'); return; }
    c.innerHTML = genres.map(g =>
      `<div class="genre-chip" data-slug="${esc(g.slug)}" data-name="${esc(g.name)}">${esc(g.name)}</div>`
    ).join('');
    c.querySelectorAll('.genre-chip').forEach(chip =>
      chip.addEventListener('click', () =>
        showGenreDetail(chip.dataset.slug, chip.dataset.name, 1))
    );
  } catch (err) {
    c.innerHTML = `<div class="error-state"><span class="err-code">!</span><p>Gagal memuat genre</p>
      <button class="retry-btn" onclick="loadGenres()">Coba Lagi</button></div>`;
  }
}

async function showGenreDetail(slug, name) {
  state.genreSlug = slug; state.genreName = name;
  $('genreListContainer').style.display = 'none';
  $('genreDetailSection').style.display = 'block';
  $('genreDetailTitle').textContent = `Genre: ${name}`;
  const grid = $('genreGrid');
  const oldBtn = $('genreLoadMore');
  if (oldBtn) oldBtn.remove();

  const getItems = d => d.data || d.donghua_list || d.results ||
                        d.anime_list || d.donghua || d.animes ||
                        d.genre_list || d.items || d.list ||
                        Object.values(d).find(v => Array.isArray(v)) || [];

  let allItems = [];
  let page = 1;

  // Fetch halaman 1 dulu, tampilkan sambil loading sisanya
  grid.innerHTML = `<div class="loading-state"><div class="loader"></div><p>Memuat donghua genre ${name}...</p></div>`;

  const appendCards = (items) => {
    items.forEach((item, idx) => {
      const s = item.slug || detailSlugFrom(item);
      const div = document.createElement('div');
      div.innerHTML = cardHTML({ ...item, _mode: 'detail', _slug: s }, idx);
      const card = div.firstElementChild;
      card.addEventListener('click', () => {
        if (card.dataset.slug) loadDetail(card.dataset.slug);
        else showToast('Link tidak tersedia', 'error');
      });
      grid.appendChild(card);
    });
  };

  try {
    // Fetch halaman 1 — langsung tampil
    const first = await fetchAPI(`/genres/${slug}/1`);
    const firstItems = getItems(first);
    if (!firstItems.length) { grid.innerHTML = emptyHTML(`Tidak ada donghua di genre ${name}`); return; }

    grid.innerHTML = ''; // hapus loading
    appendCards(firstItems);

    // Fetch sisa halaman satu per satu, append langsung tiap dapat data
    if (firstItems.length >= 10) {
      let p = 2;
      while (p <= 50) {
        try {
          const data = await fetchAPI(`/genres/${slug}/${p}`);
          const items = getItems(data);
          if (!items.length) break;
          appendCards(items);
          if (items.length < 10) break;
          p++;
        } catch(e) { break; }
      }
    }

  } catch (err) {
    grid.innerHTML = errorHTML(() => showGenreDetail(slug, name));
  }
}

$('backFromGenre').addEventListener('click', () => {
  $('genreDetailSection').style.display = 'none';
  $('genreListContainer').style.display = 'grid';
});

/* ============================================================
   SEASONS
============================================================ */
function initSeasons() {
  const sel = $('yearSelector');
  const now = new Date().getFullYear();
  for (let y = now; y >= 2015; y--) {
    const b = document.createElement('button');
    b.className = 'year-btn' + (y === now ? ' active' : '');
    b.dataset.year = y; b.textContent = y;
    sel.appendChild(b);
  }
  sel.addEventListener('click', e => {
    const b = e.target.closest('.year-btn');
    if (!b) return;
    sel.querySelectorAll('.year-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    loadSeasons(b.dataset.year);
  });
  loadSeasons(now);
}

async function loadSeasons(year) {
  const grid = $('seasonsGrid');
  grid.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI(`/seasons/${year}`);
    const raw = data.data || data.donghua_list || data.results || [];
    renderDetailCards(grid, raw);
  } catch (err) { grid.innerHTML = errorHTML(() => loadSeasons(year)); }
}

/* ============================================================
   SEARCH
============================================================ */
async function loadSearch(kw, page = 1) {
  const grid = $('searchGrid');
  grid.innerHTML = loadingHTML();
  try {
    const data = await fetchAPI(`/search/${encodeURIComponent(kw)}/${page}`);
    const raw = data.data || data.results || data.search_result || [];
    if (!raw.length) {
      grid.innerHTML = emptyHTML(`Tidak ada hasil untuk "${kw}"`); return;
    }
    renderDetailCards(grid, raw);
    renderPagination('searchPagination', page, data.totalPage || data.last_page || 1,
      p => loadSearch(kw, p));
  } catch (err) { grid.innerHTML = errorHTML(() => loadSearch(kw, page)); }
}

/* ============================================================
   DETAIL
   Response: { title, alter_title, poster, status, type,
               episodes_count, studio, network, released,
               duration, season, country, genres:[{name,slug}],
               synopsis, episode_list:[{title,slug,episode}] }
   CATATAN: "status" di root = status donghua (Ongoing/Completed)
            BUKAN status HTTP
============================================================ */
async function loadDetail(slug) {
  if (!slug) { showToast('Slug tidak valid', 'error'); return; }
  if (state.currentPage !== 'episode' && state.currentPage !== 'detail') {
    state.previousPage = state.currentPage;
  }
  showPage('detail');
  state.initialized['detail'] = true;
  const c = $('detailContainer');
  c.innerHTML = loadingHTML();
  try {
    // Bersihkan slug: hapus prefix /detail/, /donghua/, trailing slash
    let cleanSlug = slug
      .replace(/^\/+/, '')
      .replace(/^detail\//, '')
      .replace(/^donghua\//, '')
      .replace(/\/+$/, '');
    // Coba /detail/slug dulu, kalau gagal coba slug langsung
    let data = null;
    const res1 = await fetch(`${API}/detail/${cleanSlug}`);
    if (res1.ok) {
      const json = await res1.json();
      if (json.title) data = json;
    }
    if (!data) {
      const res2 = await fetch(`${API}/${cleanSlug}`);
      if (res2.ok) {
        const json = await res2.json();
        if (json.title) data = json;
      }
    }
    if (!data) throw new Error('No valid response');
    // data.title harus ada — kalau tidak berarti response error
    if (!data.title) throw new Error('No title in response');
    renderDetail(c, data, cleanSlug);
  } catch (err) {
    console.error('loadDetail error:', err, 'slug:', slug);
    c.innerHTML = `<div class="error-state"><span class="err-code">!</span>
      <p>Gagal memuat detail<br><small style="color:var(--text-dim)">${esc(slug)}</small></p>
      <button class="retry-btn" onclick="loadDetail('${esc(slug)}')">Coba Lagi</button></div>`;
  }
}

function renderDetail(c, d, slug) {
  const title    = d.title || 'Unknown';
  const altTitle = d.alter_title || '';
  const poster   = d.poster || '';
  const synopsis = d.synopsis || d.description || 'Tidak ada sinopsis.';
  const genres   = d.genres || [];
  const epList   = d.episodes_list || d.episode_list || d.episodes || [];

  // Badge chips: status, type, eps, durasi, tahun, dll
  const badges = [
    d.status, d.type, d.episodes_count, d.duration, d.season,
    d.network, d.country
  ].filter(Boolean);

  const badgeHTML = badges.map(b =>
    `<span class="detail-badge">${esc(b)}</span>`
  ).join('');

  const genreHTML = genres.map(g =>
    `<span class="genre-tag" data-slug="${esc(g.slug)}" data-name="${esc(g.name)}">${esc(g.name)}</span>`
  ).join('');

  // Episode list — horizontal scroll, nomor saja
  const epHTML = epList.map((ep, i) => {
    const epSlug  = (ep.slug || '').replace(/\/+$/, '');
    const rawEp   = ep.episode || ep.title || ep.name || ep.ep || '';
    const numMatch = rawEp.match(/Episode\s+(\S+)/i);
    const epLabel  = numMatch ? numMatch[1] : (rawEp || String(epList.length - i));
    return `<div class="ep-chip" data-slug="${esc(epSlug)}">${esc(epLabel)}</div>`;
  }).join('');

  // Sinopsis singkat (3 baris), expandable
  c.innerHTML = `
    <div class="dh-hero" style="background-image:url('${esc(poster)}')">
      <div class="dh-hero-overlay"></div>
      <div class="dh-hero-content">
        <div class="dh-poster-wrap">
          ${poster
            ? `<img src="${esc(poster)}" alt="${esc(title)}" class="dh-poster-img"
                    onerror="this.parentNode.innerHTML='<div class=\\'card-thumb-placeholder\\'>動</div>'">`
            : `<div class="card-thumb-placeholder">動</div>`}
        </div>
        <div class="dh-hero-info">
          ${altTitle ? `<p class="dh-alt-title">${esc(altTitle)}</p>` : ''}
          <h1 class="dh-title">${esc(title)}</h1>
          <div class="dh-badges">${badgeHTML}</div>
        </div>
      </div>
    </div>

    <div class="dh-body">
      ${genreHTML ? `<div class="dh-genres">${genreHTML}</div>` : ''}

      <div class="dh-synopsis-wrap">
        <h3 class="dh-section-label">Sinopsis</h3>
        <p class="dh-synopsis collapsed" id="dhSynopsis">${esc(synopsis)}</p>
        <button class="dh-expand-btn" id="dhExpandBtn">Selengkapnya ▾</button>
      </div>

      ${epList.length ? `
        <div class="dh-eps-wrap">
          <div class="dh-eps-header">
            <h3 class="dh-section-label">Episode List</h3>
            <span class="dh-eps-count">${epList.length} eps</span>
          </div>
          <div class="dh-ep-scroll">${epHTML}</div>
        </div>` : ''}

      <div class="dh-meta-table">
        ${[
          ['Studio',  d.studio],
          ['Network', d.network],
          ['Rilis',   d.released || d.released_on],
          ['Update',  d.updated_on],
          ['Negara',  d.country],
          ['Rating',  d.rating],
        ].filter(r=>r[1]).map(([l,v])=>`
          <div class="dh-meta-row">
            <span class="dh-meta-label">${l}</span>
            <span class="dh-meta-val">${esc(String(v))}</span>
          </div>`).join('')}
      </div>
    </div>`;

  // Expand sinopsis
  const syn = document.getElementById('dhSynopsis');
  const btn = document.getElementById('dhExpandBtn');
  if (syn && btn) {
    btn.addEventListener('click', () => {
      syn.classList.toggle('collapsed');
      btn.textContent = syn.classList.contains('collapsed') ? 'Selengkapnya ▾' : 'Sembunyikan ▴';
    });
  }

  // Episode klik
  c.querySelectorAll('.ep-chip').forEach(chip =>
    chip.addEventListener('click', () => {
      const s = chip.dataset.slug;
      if (s) { state.prevDetailSlug = slug; loadEpisode(s); }
    })
  );

  // Genre klik
  c.querySelectorAll('.genre-tag').forEach(tag =>
    tag.addEventListener('click', () => {
      showPage('genres');
      if (!state.initialized['genres']) {
        state.initialized['genres'] = true;
        loadGenres().then(() => showGenreDetail(tag.dataset.slug, tag.dataset.name, 1));
      } else {
        showGenreDetail(tag.dataset.slug, tag.dataset.name, 1);
      }
    })
  );
}
$('backFromDetail').addEventListener('click', () => {
  showPage(state.previousPage || 'home');
});

/* ============================================================
   EPISODE
   Response: { episode, streaming:{servers:[{name,url}]},
               download_url:{download_url_360p:{Mirror:url,...},...},
               donghua_details:{title,slug,poster} }
============================================================ */
async function loadEpisode(slug) {
  if (!slug) return;
  // Simpan halaman sebelumnya, jangan timpa kalau dari detail
  if (state.currentPage !== 'episode') {
    state.prevEpisodePage = state.currentPage;
  }
  showPage('episode');
  state.initialized['episode'] = true;
  const c = $('episodeContainer');
  c.innerHTML = loadingHTML();
  try {
    const cleanSlug = slug.replace(/\/+$/, '');
    // Coba donghub dulu, fallback ke donghua
    let data = null;
    try {
      const res = await fetch(`https://www.sankavollerei.com/anime/donghub/episode/${cleanSlug}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.streams) { data = json; data._source = 'donghub'; }
      }
    } catch(e) {}
    if (!data) {
      data = await fetchAPI(`/episode/${cleanSlug}`);
      data._source = 'donghua';
    }
    renderEpisode(c, data, cleanSlug);
  } catch (err) {
    c.innerHTML = `<div class="error-state"><span class="err-code">!</span>
      <p>Gagal memuat episode</p>
      <button class="retry-btn" onclick="loadEpisode('${esc(slug)}')">Coba Lagi</button></div>`;
  }
}

function renderEpisode(c, d, slug) {
  // Support 2 format: donghub (d.data.streams) dan donghua (d.streaming.servers)
  const isDonghub = d._source === 'donghub' && d.data;
  const dd = isDonghub ? d.data : d;

  const epTitle = isDonghub ? (dd.title || 'Episode') : (d.episode || d.title || 'Episode');
  const info    = isDonghub ? (dd.anime_info || {}) : (d.donghua_details || {});
  const infoTitle  = info.title || '';
  const infoPoster = info.thumbnail || info.poster || '';
  const infoSlug   = isDonghub ? (dd.navigation?.all_slug || '') : (info.slug || '');

  // Servers
  let servers = [];
  if (isDonghub) {
    servers = (dd.streams || []).map(s => ({ name: s.server, url: s.url }));
  } else {
    const streaming = d.streaming || {};
    servers = (streaming.servers || []).filter(s => !s.name?.includes('[Ads]'));
    if (!servers.length) servers = streaming.servers || [];
  }

  // Default server: Premium (index 0)
  const defaultIdx = 0;
  const firstUrl = servers[defaultIdx]?.url || '';

  const serverBtns = servers.map((s, i) =>
    `<button class="sv-btn ${i===defaultIdx?'active':''}" data-url="${esc(s.url||'')}">${esc(s.name||'Server '+(i+1))}</button>`
  ).join('');

  // Downloads
  let dlHTML = '';
  const qualityInfo = {
    '360': { label: '360p (Hemat)', badge: 'Low', badgeColor: '#a855f7' },
    '480': { label: '480p (Standar)', badge: 'SD', badgeColor: '#3b82f6' },
    '720': { label: '720p (Bagus)', badge: 'HD', badgeColor: '#f59e0b' },
    '1080': { label: '1080p (Full HD)', badge: 'FHD', badgeColor: '#22c55e' },
  };

  if (isDonghub) {
    const dls = dd.downloads || [];
    if (dls.length) {
      dlHTML = dls.map(dl => {
        const q = (dl.quality||'').replace('p','');
        const info = qualityInfo[q] || { label: dl.quality||'HD', badge: 'HD', badgeColor: '#f59e0b' };
        return `
          <a class="dl-card" href="${esc(dl.url||'#')}" target="_blank" rel="noopener">
            <div class="dl-card-left">
              <div class="dl-card-title">${info.label}</div>
            </div>
            <span class="dl-card-badge" style="background:${info.badgeColor}">${info.badge}</span>
          </a>`;
      }).join('');
    }
  } else {
    const dlObj = d.download_url || {};
    dlHTML = Object.entries(dlObj).map(([qKey, links]) => {
      const q = qKey.replace('download_url_','').replace('p','');
      const info = qualityInfo[q] || { label: q+'p', badge: 'HD', badgeColor: '#f59e0b' };
      const provBtns = Object.entries(links).map(([prov, url]) =>
        `<a class="dl-prov-btn" href="${esc(url)}" target="_blank" rel="noopener">${esc(prov)}</a>`
      ).join('');
      return `
        <div class="dl-card">
          <div class="dl-card-left">
            <div class="dl-card-title">${info.label}</div>
            <div class="dl-prov-list">${provBtns}</div>
          </div>
          <span class="dl-card-badge" style="background:${info.badgeColor}">${info.badge}</span>
        </div>`;
    }).join('');
  }

  // Prev/Next nav (donghub only)
  const nav = isDonghub ? (dd.navigation || {}) : {};
  const prevSlug = nav.prev_slug || '';
  const nextSlug = nav.next_slug || '';

  c.innerHTML = `
    ${infoTitle ? `
      <div class="ep-info-bar" id="epBackInfo" data-slug="${esc(infoSlug)}">
        ${infoPoster ? `<img src="${esc(infoPoster)}" class="ep-info-poster" alt="">` : ''}
        <div class="ep-info-text">
          <div class="ep-info-now">SEDANG MENONTON</div>
          <div class="ep-info-title">${esc(infoTitle)}</div>
          <div class="ep-info-ep">${esc(epTitle.match(/Episode\s+\S+/i)?.[0] || epTitle)}</div>
        </div>
        <span class="ep-info-arrow">›</span>
      </div>` : ''}

    <div class="ep-player-wrap" id="epPlayerWrap">
      ${firstUrl
        ? `<div class="ep-player-frame" id="epPlayerFrame">
             <iframe id="playerFrame" src="${esc(firstUrl)}" allowfullscreen
               allow="autoplay; fullscreen; picture-in-picture"></iframe>
             <!-- Prev/Next overlay -->
             ${prevSlug ? `<button class="ep-overlay-btn ep-prev-btn" id="epPrevBtn">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="white" stroke-width="2"/></svg>
             </button>` : ''}
             ${nextSlug ? `<button class="ep-overlay-btn ep-next-btn" id="epNextBtn">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="white" stroke-width="2"/></svg>
             </button>` : ''}
             <!-- Fullscreen button -->
             <button class="ep-fullscreen-btn" id="epFullscreenBtn">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                 <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                 <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
               </svg>
             </button>
           </div>`
        : `<div class="ep-player-frame ep-no-stream">
             <span class="empty-icon">映</span><p>Tidak ada server streaming</p>
           </div>`}
    </div>

    <!-- Server disembunyikan, pakai main server otomatis -->

    ${dlHTML ? `
      <button class="dl-trigger-btn" id="dlTriggerBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>

      <!-- Download Modal -->
      <div class="dl-modal-overlay" id="dlModalOverlay">
        <div class="dl-modal">
          <div class="dl-modal-header">
            <span class="dl-modal-title">Pilih Kualitas</span>
            <button class="dl-modal-close" id="dlModalClose">✕</button>
          </div>
          <div class="dl-modal-body">${dlHTML}</div>
        </div>
      </div>` : ''}
  `;

  c.querySelectorAll('.sv-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      c.querySelectorAll('.sv-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = $('playerFrame');
      if (f) f.src = btn.dataset.url;
    })
  );

  const bar = document.getElementById('epBackInfo');
  if (bar && infoSlug) bar.addEventListener('click', () => loadDetail(infoSlug));

  // Prev/Next buttons
  const prevBtn = document.getElementById('epPrevBtn');
  const nextBtn = document.getElementById('epNextBtn');
  if (prevBtn) prevBtn.addEventListener('click', () => loadEpisode(prevSlug));
  if (nextBtn) nextBtn.addEventListener('click', () => loadEpisode(nextSlug));

  // Fullscreen button
  const fsBtn = document.getElementById('epFullscreenBtn');
  const playerFrame = document.getElementById('epPlayerFrame');
  if (fsBtn && playerFrame) {
    fsBtn.addEventListener('click', () => {
      const isFs = playerFrame.classList.toggle('ep-fullscreen');
      fsBtn.innerHTML = isFs
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
           </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
           </svg>`;
      // Sembunyikan/tampilkan elemen lain saat fullscreen
      const container = $('episodeContainer');
      container.querySelectorAll('.ep-info-bar, .ep-nav, .ep-servers, .ep-download, .dl-trigger-btn, #backFromEpisode-wrap').forEach(el => {
        el.style.display = isFs ? 'none' : '';
      });
      document.body.classList.toggle('player-fullscreen', isFs);
    });
  }

  // Download modal
  const dlBtn = document.getElementById('dlTriggerBtn');
  const dlOverlay = document.getElementById('dlModalOverlay');
  const dlClose = document.getElementById('dlModalClose');
  if (dlBtn && dlOverlay) {
    dlBtn.addEventListener('click', () => dlOverlay.classList.add('show'));
    dlClose.addEventListener('click', () => dlOverlay.classList.remove('show'));
    dlOverlay.addEventListener('click', e => {
      if (e.target === dlOverlay) dlOverlay.classList.remove('show');
    });
  }
}

$('backFromEpisode').addEventListener('click', () => {
  // Dari episode → balik ke detail (kalau ada)
  if (state.prevDetailSlug) {
    loadDetail(state.prevDetailSlug);
  } else {
    showPage(state.previousPage || 'home');
  }
});

/* ============================================================
   RENDER HELPERS
============================================================ */

// Cards yang klik → buka detail (slug = detail slug)
function renderDetailCards(grid, items) {
  if (!items || !items.length) { grid.innerHTML = emptyHTML('Tidak ada data tersedia'); return; }
  const cards = items.map((item, idx) => {
    const slug = detailSlugFrom(item);
    // Debug: log item yang slugnya kosong supaya ketahuan field apa yang ada
    if (!slug) console.warn('Slug kosong untuk item:', JSON.stringify(item).slice(0, 200));
    return cardHTML({ ...item, _mode: 'detail', _slug: slug }, idx);
  });
  grid.innerHTML = cards.join('');
  grid.querySelectorAll('.anime-card').forEach(card =>
    card.addEventListener('click', () => {
      const slug = card.dataset.slug;
      if (slug) {
        loadDetail(slug);
      } else {
        showToast('Link tidak tersedia untuk donghua ini', 'error');
      }
    })
  );
}

// Template HTML untuk 1 card
function cardHTML(item, idx) {
  const slug   = item._slug || '';
  const mode   = item._mode || 'detail';
  const title  = item.title || 'Unknown';
  const poster = item.poster || '';
  const status = (item.status || '').toLowerCase();
  const ep     = item.current_episode || item.latest_episode || item.episode || '';

  const badgeClass = status.includes('ongoing')  ? 'badge-ongoing' :
                     status.includes('complet')  ? 'badge-completed' : '';
  const badgeLabel = status.includes('ongoing')  ? 'Ongoing' :
                     status.includes('complet')  ? 'Tamat' : '';

  return `
    <div class="anime-card" data-slug="${esc(slug)}" data-mode="${mode}" style="animation-delay:${idx*0.04}s">
      <div class="card-thumb">
        ${poster
          ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"
                  onerror="this.parentNode.innerHTML='<div class=\\'card-thumb-placeholder\\'>動</div>'">`
          : `<div class="card-thumb-placeholder">動</div>`}
        ${badgeLabel ? `<span class="card-badge ${badgeClass}">${badgeLabel}</span>` : ''}
        ${ep ? `<span class="card-ep">${esc(ep)}</span>` : ''}
        <div class="card-overlay"><span class="card-overlay-btn">Lihat Detail</span></div>
      </div>
      <div class="card-info">
        <div class="card-title" title="${esc(title)}">${esc(title)}</div>
      </div>
    </div>`;
}

// Latest cards (klik → detail)
function renderLatestCards(grid, items) {
  if (!items || !items.length) { grid.innerHTML = emptyHTML('Tidak ada update terbaru'); return; }
  grid.innerHTML = items.map((item, idx) => {
    const slug  = detailSlugFrom(item);
    const title = item.title || 'Unknown';
    const poster = item.poster || '';
    return `
      <div class="latest-card" data-slug="${esc(slug)}" style="animation-delay:${idx*0.05}s">
        <div class="latest-thumb">
          ${poster
            ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"
                    onerror="this.parentNode.innerHTML='<div class=\\'card-thumb-placeholder\\' style=\\'font-size:28px\\'>動</div>'">`
            : `<div class="card-thumb-placeholder" style="font-size:28px">動</div>`}
        </div>
        <div class="latest-info">
          <div class="latest-title">${esc(title)}</div>
          <div class="latest-ep">${esc(item.type || 'Donghua')} · ${esc(item.sub || 'Sub')}</div>
          <div class="latest-date">${esc(item.status || '')}</div>
        </div>
      </div>`;
  }).join('');
  grid.querySelectorAll('.latest-card').forEach(card =>
    card.addEventListener('click', () => { if (card.dataset.slug) loadDetail(card.dataset.slug); })
  );
}

/* ============================================================
   PAGINATION
============================================================ */
function renderPagination(containerId, current, total, cb) {
  const c = $(containerId);
  if (!c || total <= 1) { if (c) c.innerHTML = ''; return; }
  let pages = total <= 7
    ? Array.from({ length: total }, (_, i) => i + 1)
    : [1, ...(current > 3 ? ['...'] : []),
       ...Array.from({ length: 3 }, (_, i) => current - 1 + i).filter(p => p > 1 && p < total),
       ...(current < total - 2 ? ['...'] : []), total];
  c.innerHTML = `
    <button class="page-btn" ${current<=1?'disabled':''} data-p="${current-1}">‹ Prev</button>
    ${pages.map(p => p === '...'
      ? `<span style="color:var(--text-dim);padding:0 4px">…</span>`
      : `<button class="page-btn ${p===current?'active':''}" data-p="${p}">${p}</button>`
    ).join('')}
    <button class="page-btn" ${current>=total?'disabled':''} data-p="${current+1}">Next ›</button>`;
  c.querySelectorAll('.page-btn:not([disabled])').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.p);
      if (p && p !== current) { cb(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    })
  );
}

/* ============================================================
   UTILS
============================================================ */
function loadingHTML() {
  return `<div class="loading-state"><div class="loader"></div><p>Memuat data...</p></div>`;
}
function emptyHTML(msg) {
  return `<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">空</span><p>${msg}</p></div>`;
}
function errorHTML(retryFn) {
  const id = 'r' + Math.random().toString(36).slice(2);
  setTimeout(() => { const b = document.getElementById(id); if (b) b.addEventListener('click', retryFn); }, 50);
  return `<div class="error-state" style="grid-column:1/-1">
    <span class="err-code">!</span><p>Gagal memuat data</p>
    <button class="retry-btn" id="${id}">Coba Lagi</button></div>`;
}
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// alias
const escHtml = esc;

function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast${type?' '+type:''} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ============================================================
   INIT
============================================================ */
showPage('home');

// Bottom nav search button → fokus search input
const bnSearch = document.getElementById('bnSearch');
if (bnSearch) {
  bnSearch.addEventListener('click', e => {
    e.preventDefault();
    const input = $('searchInput');
    if (input) {
      input.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}