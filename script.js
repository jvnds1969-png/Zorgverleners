fetch('data/providers.json')
  .then(r => r.json())
  .then(renderProviders)
  .catch(err => {
    console.error(err);
    document.getElementById('provider-list').innerHTML =
      '<p>Kon providers.json niet laden. Controleer paden en GitHub Pages.</p>';
  });

function renderProviders(providers){
  const list = document.getElementById('provider-list');
  list.innerHTML = '';

  providers.forEach(p => {
    list.insertAdjacentHTML('beforeend', cardHTML(p));
  });
}

function cardHTML(p){
  const langs = (p.languages || []).map(l => `<span class="tag">${l}</span>`).join('');
  return `
    <article class="card">
      <div class="card-img">
        <img src="${p.photo}" alt="${p.display_name}">
        <span class="badge">${p.badge || ''}</span>
      </div>
      <div class="card-content">
        <h3>${p.display_name}</h3>
        <p>${p.type} • ${p.pricing}</p>
        <div class="tags">${langs}</div>
      </div>
    </article>
  `;
}