let ALL = [];

const els = {
  list: document.getElementById('provider-list'),
  count: document.getElementById('results-count'),
  empty: document.getElementById('empty-state'),

  qLocation: document.getElementById('q-location'),
  qLanguage: document.getElementById('q-language'),
  btnSearch: document.getElementById('btn-search'),
  btnReset: document.getElementById('btn-reset'),

  fTv: document.getElementById('f-tv'),
  tvSub: document.getElementById('tv-subfilters'),
  tvExp: () => Array.from(document.querySelectorAll('.f-tv-exp')),

  fAvailable: document.getElementById('f-available'),
  fVerified: document.getElementById('f-verified'),
};

init();

async function init(){
  // 1) Load providers
  ALL = await loadProviders();

  // 2) Bind UX
  bindUX();

  // 3) Initial render
  applyAndRender();
}

function bindUX(){
  // Subfilters enabled only when TV checked
  els.fTv.addEventListener('change', syncTvSubfilters);
  syncTvSubfilters();

  // Search button
  els.btnSearch.addEventListener('click', applyAndRender);

  // Enter in inputs triggers search
  [els.qLocation, els.qLanguage].forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyAndRender();
    });
  });

  // Any filter change triggers update
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', applyAndRender);
  });

  // Reset
  els.btnReset.addEventListener('click', () => {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    els.qLocation.value = '';
    els.qLanguage.value = '';
    syncTvSubfilters();
    applyAndRender();
  });
}

function syncTvSubfilters(){
  const enabled = els.fTv.checked;
  els.tvSub.setAttribute('aria-disabled', String(!enabled));
  els.tvExp().forEach(cb => {
    cb.disabled = !enabled;
    if (!enabled) cb.checked = false;
  });
}

async function loadProviders(){
  // GitHub Pages relative path
  const res = await fetch('data/providers.json', { cache: 'no-store' });
  if (!res.ok) {
    console.error('providers.json not found:', res.status);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function applyAndRender(){
  const filtered = applyFilters(ALL);
  renderList(filtered);
}

function applyFilters(items){
  const loc = (els.qLocation.value || '').trim().toLowerCase();
  const langQ = (els.qLanguage.value || '').trim().toLowerCase();

  // Selected types
  const types = new Set(
    Array.from(document.querySelectorAll('.filter-group input[type="checkbox"]'))
      .filter(cb => cb.checked && cb.value)
      .map(cb => cb.value)
  );

  // TV expertises
  const tvExpertises = new Set(
    els.tvExp().filter(cb => cb.checked).map(cb => cb.value)
  );

  const onlyAvailable = els.fAvailable.checked;
  const onlyVerified = els.fVerified.checked;

  return items.filter(p => {
    // location search: postcode in coverage OR municipality contains query
    if (loc) {
      const inPostcodes = (p.coverage?.postcodes || p.postcodes || []).some(pc => String(pc).toLowerCase().includes(loc));
      const inCity = String(p.coverage?.city || p.city || '').toLowerCase().includes(loc);
      if (!inPostcodes && !inCity) return false;
    }

    // language search
    if (langQ) {
      const langs = (p.languages || []).map(x => String(x).toLowerCase());
      const ok = langs.some(x => x.includes(langQ));
      if (!ok) return false;
    }

    // type filters
    if (types.size > 0) {
      const pTypes = Array.isArray(p.types) ? p.types : (p.type ? [p.type] : []);
      const matchType = pTypes.some(t => types.has(String(t).toLowerCase()));
      if (!matchType) return false;
    }

    // verified
    if (onlyVerified && !p.verified) return false;

    // availability (accept either coverage.capacity or coverage.start)
    if (onlyAvailable) {
      const cap = String(p.coverage?.capacity || '').toLowerCase();
      const start = String(p.coverage?.start || '').toLowerCase();
      const ok = cap === 'available' || start === 'immediately';
      if (!ok) return false;
    }

    // tv expertises only if provider is thuisverpleging
    if (tvExpertises.size > 0) {
      const pTypes = Array.isArray(p.types) ? p.types : (p.type ? [p.type] : []);
      const isTv = pTypes.map(x => String(x).toLowerCase()).includes('thuisverpleging');
      if (!isTv) return false;

      const exps = (p.specialties?.thuisverpleging?.expertises || p.expertises || [])
        .map(x => String(x).toLowerCase());

      const matchExp = Array.from(tvExpertises).every(e => exps.includes(String(e).toLowerCase()));
      if (!matchExp) return false;
    }

    return true;
  });
}

function renderList(items){
  els.list.innerHTML = '';

  els.count.textContent = `${items.length} resultaat${items.length === 1 ? '' : 'en'}`;

  if (items.length === 0) {
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;

  items.forEach(p => {
    els.list.insertAdjacentHTML('beforeend', cardHTML(p));
  });
}

function cardHTML(p){
  const name = escapeHtml(p.display_name || p.name || 'Onbekend');
  const rating = p.rating ? `⭐ ${escapeHtml(String(p.rating))}` : '';
  const reviews = p.reviews ? `(${escapeHtml(String(p.reviews))})` : '';
  const role = escapeHtml(p.role || p.type_label || '');

  const photo = escapeAttr(p.media?.photo || p.photo || fallbackPhoto(p));
  const logo = p.media?.logo || p.logo;

  const verified = p.verified ? `<span class="badge">✓ Geverifieerd</span>` : '';
  const badgeRight = p.card?.badge_right || p.badge || '';
  const badgeRightHtml = badgeRight ? `<span class="badge-right">${escapeHtml(badgeRight)}</span>` : '';

  const chips = (p.card?.chips || p.chips || []).slice(0, 5);
  const chipsHtml = chips.length
    ? `<div class="chips" aria-label="Expertises">${chips.map(c => `<span class="chip">${escapeHtml(String(c))}</span>`).join('')}</div>`
    : '';

  const langs = (p.languages || []).slice(0, 4);
  const tagsHtml = langs.length
    ? `<div class="tags">${langs.map(l => `<span>${escapeHtml(String(l))}</span>`).join('')}</div>`
    : '';

  const price = escapeHtml(p.pricing || p.price_label || '');

  return `
    <article class="card">
      <div class="card-img">
        <img src="${photo}" alt="${name}" loading="lazy" referrerpolicy="no-referrer" />
        ${verified}
        ${badgeRightHtml}
        ${chipsHtml}
        ${logo ? `<img class="group-logo" src="${escapeAttr(logo)}" alt="" onerror="this.style.display='none'">` : ``}
      </div>

      <div class="card-content">
        <h3>${name}</h3>
        <div class="meta">${rating} ${reviews} ${role ? `• ${role}` : ''}</div>
        ${p.card?.short_pitch ? `<div class="meta">${escapeHtml(p.card.short_pitch)}</div>` : ``}
        ${tagsHtml}
      </div>

      <div class="card-footer">
        <span class="price">${price}</span>
        <button class="btn btn-cta" type="button">Contact</button>
      </div>
    </article>
  `;
}

function fallbackPhoto(p){
  const t = (Array.isArray(p.types) ? p.types[0] : p.type || '').toLowerCase();
  if (t.includes('kine')) return 'https://images.unsplash.com/photo-1599058917212-d750089bc07a?auto=format&fit=crop&w=1400&q=80';
  if (t.includes('warme')) return 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1400&q=80';
  return 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1400&q=80';
}

function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

function escapeAttr(str){
  return escapeHtml(str).replaceAll('`','&#96;');
}