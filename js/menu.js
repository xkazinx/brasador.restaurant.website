// The public menu: reads data/menu.json (what the admin edits) and renders it in the visitor's language,
// with search, a sticky category bar, allergen icons and a photo lightbox.
(function () {
    const T = {
        es: { 'nav.home': 'Inicio', 'nav.menu': 'Carta', 'nav.book': 'Reservar', 'nav.contact': 'Contacto', 'hero.kicker': "Brasad'Or", 'hero.title': 'Nuestra Carta',
              'hero.subtitle': 'Cocina tradicional armenia a la brasa.', search: 'Buscar un plato, una bebida, un ingrediente...', 'footer.back': 'Volver al inicio',
              allergens: 'Alérgenos', empty: 'No hay nada que coincida con la búsqueda.', updated: 'Carta actualizada el', unavailable: 'no disponible' },
        en: { 'nav.home': 'Home', 'nav.menu': 'Menu', 'nav.book': 'Book', 'nav.contact': 'Contact', 'hero.kicker': "Brasad'Or", 'hero.title': 'Our Menu',
              'hero.subtitle': 'Traditional Armenian charcoal cooking.', search: 'Search a dish, a drink, an ingredient...', 'footer.back': 'Back to home',
              allergens: 'Allergens', empty: 'Nothing matches your search.', updated: 'Menu updated on', unavailable: 'not available' },
    };
    let lang = 'es';
    try { lang = localStorage.getItem('brasador-lang') || ((navigator.language || '').startsWith('en') ? 'en' : 'es'); } catch (e) {}
    const wanted = new URLSearchParams(location.search).get('lang');   // ?lang=es|en picks and remembers
    if (wanted === 'es' || wanted === 'en') lang = wanted;
    let menu = null, allergens = {};
    const $ = (s) => document.querySelector(s);
    const txt = (o) => (o && (o[lang] || o.es || o.en)) || '';
    const price = (n) => n == null ? '' : n.toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (menu.restaurant.currency || '€');
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function applyLang() {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-t]').forEach(e => { const k = e.dataset.t; if (T[lang][k]) e.textContent = T[lang][k]; });
        document.querySelectorAll('[data-t-placeholder]').forEach(e => { e.placeholder = T[lang][e.dataset.tPlaceholder] || e.placeholder; });
        document.querySelectorAll('.menu-lang-btn').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
        try { localStorage.setItem('brasador-lang', lang); } catch (e) {}
    }

    function matches(item, q) {
        if (!q) return true;
        const hay = [txt(item.name), txt(item.description), ...(item.formats || []).map(f => txt(f.name))].join(' ').toLowerCase();
        return q.split(/\s+/).every(w => hay.includes(w));
    }

    function itemHtml(it) {
        const photo = it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" data-zoom="${esc(it.image)}" data-caption="${esc(txt(it.name))}">` : '';
        const formats = (it.formats || []).length ? `<ul class="menu-item-formats">${it.formats.map(f => `<li><span>${esc(txt(f.name))}</span><span>${price(f.price)}</span></li>`).join('')}</ul>` : '';
        const al = (it.allergens || []).map(id => allergens[id]).filter(Boolean).map(a => `<img src="${esc(a.icon)}" alt="${esc(txt(a.name))}" title="${esc(txt(a.name))}">`).join('');
        return `<article class="menu-item${it.image ? ' has-photo' : ''}${it.available === false ? ' off' : ''}">
            ${photo}
            <div>
                <div class="menu-item-head"><span class="menu-item-name">${esc(txt(it.name))}</span>${it.price != null ? `<span class="menu-item-price">${price(it.price)}</span>` : ''}</div>
                ${txt(it.description) ? `<p class="menu-item-desc">${esc(txt(it.description))}</p>` : ''}
                ${formats}
                ${al ? `<div class="menu-item-allergens">${al}</div>` : ''}
            </div>
        </article>`;
    }

    function render() {
        const q = ($('#menuSearch').value || '').trim().toLowerCase();
        const main = $('#menuMain'), cats = $('#menuCats');
        let html = '', bar = '', shown = 0;
        for (const c of menu.categories) {
            const own = (c.items || []).filter(i => matches(i, q));
            const subs = (c.categories || []).map(s => ({ s, items: (s.items || []).filter(i => matches(i, q)) })).filter(x => x.items.length);
            if (!own.length && !subs.length) continue;
            shown += own.length + subs.reduce((n, x) => n + x.items.length, 0);
            bar += `<a class="menu-cat-link" href="#cat-${c.id}">${esc(txt(c.name))}</a>`;
            html += `<section class="menu-section" id="cat-${c.id}"><h2>${esc(txt(c.name))}</h2>${txt(c.description) ? `<p>${esc(txt(c.description))}</p>` : ''}`;
            if (own.length) html += `<div class="menu-grid">${own.map(itemHtml).join('')}</div>`;
            for (const { s, items } of subs) html += `<div class="menu-sub" id="cat-${s.id}"><h3>${esc(txt(s.name))}</h3><div class="menu-grid">${items.map(itemHtml).join('')}</div></div>`;
            html += '</section>';
        }
        cats.innerHTML = bar;
        main.innerHTML = shown ? html : `<p class="menu-empty">${T[lang].empty}</p>`;
        $('#menuAllergens').innerHTML = `<h4>${T[lang].allergens}</h4><ul>${menu.allergens.map(a => `<li><img src="${esc(a.icon)}" alt="">${esc(txt(a.name))}</li>`).join('')}</ul>`;
        $('#menuNotes').textContent = txt(menu.notes);
        $('#menuUpdated').textContent = menu.updated ? `${T[lang].updated} ${menu.updated}` : '';
    }

    function watchSections() {
        const links = [...document.querySelectorAll('.menu-cat-link')];
        const onScroll = () => {
            let current = null;
            for (const sec of document.querySelectorAll('.menu-section')) if (sec.getBoundingClientRect().top <= 150) current = sec.id;
            links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + current));
            $('#menuTop').style.display = window.scrollY > 600 ? 'flex' : 'none';
        };
        window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }

    function lightbox() {
        const box = document.createElement('figure'); box.className = 'menu-lightbox'; box.innerHTML = '<img alt=""><figcaption></figcaption>';
        document.body.appendChild(box);
        document.addEventListener('click', (e) => {
            const z = e.target.closest('[data-zoom]');
            if (z) { box.querySelector('img').src = z.dataset.zoom; box.querySelector('figcaption').textContent = z.dataset.caption; box.classList.add('show'); }
            else if (e.target.closest('.menu-lightbox')) box.classList.remove('show');
        });
    }

    async function load() {
        const r = await fetch('data/menu.json?v=' + Date.now(), { cache: 'no-store' });
        menu = await r.json();
        allergens = Object.fromEntries(menu.allergens.map(a => [a.id, a]));
        applyLang(); render(); watchSections();
    }

    document.querySelectorAll('.menu-lang-btn').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; applyLang(); if (menu) render(); }));
    $('#menuSearch').addEventListener('input', () => { if (menu) render(); });
    $('#menuTop').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    lightbox();
    load().catch(() => { $('#menuMain').innerHTML = '<p class="menu-empty">La carta no está disponible ahora mismo.</p>'; });
})();
