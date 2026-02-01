// Subfilters (expertise) only active when "Thuisverpleging" is checked
const tv = document.getElementById('filter-tv');
const sub = document.getElementById('tv-subfilters');

function syncSubfilters(){
  const enabled = !!tv?.checked;
  if (!sub) return;

  sub.setAttribute('aria-disabled', String(!enabled));

  sub.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.disabled = !enabled;
    if (!enabled) cb.checked = false;
  });
}

if (tv) tv.addEventListener('change', syncSubfilters);
syncSubfilters();