// The menu editor: the menu is held in memory, edited in place, and sent whole to api/menu.php on Save.
(function () {
    const csrf = document.querySelector('meta[name="csrf"]').content;
    const $ = (s, r = document) => r.querySelector(s);
    let menu = null, current = null, dirty = false;
    const status = $('#status');
    const setStatus = (text, cls) => { status.textContent = text; status.className = 'status ' + (cls || ''); };
    const touch = () => { if (!dirty) { dirty = true; setStatus('Cambios sin guardar', 'dirty'); } };
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const t = (o) => (o && (o.es || o.en)) || '';
    const blankText = () => ({ es: '', en: '' });
    const newItem = () => ({ id: 0, available: true, name: blankText(), description: blankText(), price: null, formats: [], allergens: [], image: '' });
    const newCat = () => ({ id: 0, name: blankText(), description: blankText(), image: '', items: [], categories: [] });

    async function api(url, opts = {}) {
        const r = await fetch(url, { ...opts, headers: { 'X-CSRF-Token': csrf, ...(opts.headers || {}) } });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data.ok === false) throw new Error(data.error || ('HTTP ' + r.status));
        return data;
    }

    // ---- the category list at the left
    function renderCats() {
        const ol = $('#catList'); ol.innerHTML = '';
        menu.categories.forEach((c, i) => {
            ol.appendChild(catRow(c, i, menu.categories, false));
            (c.categories || []).forEach((s, j) => ol.appendChild(catRow(s, j, c.categories, true)));
        });
    }
    function catRow(c, i, list, sub) {
        const li = document.createElement('li');
        li.className = (sub ? 'sub ' : '') + (c === current ? 'on' : '');
        li.innerHTML = `<span>${esc(t(c.name)) || '<em>sin nombre</em>'}</span><small>${(c.items || []).length}</small>`;
        li.addEventListener('click', () => { current = c; renderCats(); renderWork(); });
        return li;
    }

    // ---- the category being edited
    function renderWork() {
        const w = $('#work');
        if (!current) { w.innerHTML = '<p class="hint">Elige una categoría a la izquierda.</p>'; return; }
        const parent = menu.categories.includes(current) ? menu.categories : menu.categories.find(c => (c.categories || []).includes(current)).categories;
        const idx = parent.indexOf(current);
        w.innerHTML = `<div class="cat-head">
            <label>Categoría (ES) <input id="catEs" value="${esc(current.name.es)}"></label>
            <label>Category (EN) <input id="catEn" value="${esc(current.name.en)}"></label>
            <label>Descripción (ES) <input id="catDescEs" value="${esc(current.description?.es)}"></label>
            <label>Description (EN) <input id="catDescEn" value="${esc(current.description?.en)}"></label>
            <div class="full">
                <button class="btn ghost small" id="catUp" ${idx === 0 ? 'disabled' : ''}><i class="fa fa-arrow-up"></i> Subir</button>
                <button class="btn ghost small" id="catDown" ${idx === parent.length - 1 ? 'disabled' : ''}><i class="fa fa-arrow-down"></i> Bajar</button>
                ${parent === menu.categories ? '<button class="btn ghost small" id="catSub"><i class="fa fa-folder-plus"></i> Subcategoría</button>' : ''}
                <button class="btn ghost small" id="catDel" style="margin-left:auto;color:#ff8a8e"><i class="fa fa-trash"></i> Eliminar categoría</button>
            </div>
        </div>
        <div id="items"></div>
        <div class="add-row"><button class="btn primary small" id="addItem"><i class="fa fa-plus"></i> Nuevo plato</button></div>`;
        const bind = (id, obj, key) => $('#' + id).addEventListener('input', (e) => { obj[key] = e.target.value; touch(); if (key === 'es') renderCats(); });
        bind('catEs', current.name, 'es'); bind('catEn', current.name, 'en');
        current.description = current.description || blankText();
        bind('catDescEs', current.description, 'es'); bind('catDescEn', current.description, 'en');
        $('#catUp').addEventListener('click', () => { parent.splice(idx - 1, 0, parent.splice(idx, 1)[0]); touch(); renderCats(); renderWork(); });
        $('#catDown').addEventListener('click', () => { parent.splice(idx + 1, 0, parent.splice(idx, 1)[0]); touch(); renderCats(); renderWork(); });
        $('#catSub')?.addEventListener('click', () => { current.categories = current.categories || []; const s = newCat(); s.name.es = 'Nueva subcategoría'; current.categories.push(s); current = s; touch(); renderCats(); renderWork(); });
        $('#catDel').addEventListener('click', () => {
            const n = (current.items || []).length + (current.categories || []).reduce((a, s) => a + s.items.length, 0);
            if (!confirm(`¿Eliminar "${t(current.name)}"${n ? ` y sus ${n} platos` : ''}?`)) return;
            parent.splice(idx, 1); current = null; touch(); renderCats(); renderWork();
        });
        $('#addItem').addEventListener('click', () => { current.items.push(newItem()); touch(); renderItems(); $('#items').lastElementChild.scrollIntoView({ behavior: 'smooth' }); $('#items').lastElementChild.querySelector('input').focus(); });
        renderItems();
    }

    function renderItems() {
        const box = $('#items'); box.innerHTML = '';
        current.items.forEach((it, i) => box.appendChild(itemNode(it, i)));
    }
    function itemNode(it, i) {
        const node = $('#tplItem').content.firstElementChild.cloneNode(true);
        node.classList.toggle('off', it.available === false);
        const img = $('img', node);
        const showPhoto = () => { img.src = it.image ? '../' + it.image : ''; $('.no-photo', node).style.display = it.image ? '' : 'none'; };
        showPhoto();
        const get = (path) => path.split('.').reduce((o, k) => o?.[k], it);
        const set = (path, v) => { const ks = path.split('.'); let o = it; for (const k of ks.slice(0, -1)) o = o[k] = o[k] || {}; o[ks.at(-1)] = v; };
        node.querySelectorAll('[data-f]').forEach(el => {
            const f = el.dataset.f;
            if (el.type === 'checkbox') { el.checked = get(f) !== false; el.addEventListener('change', () => { set(f, el.checked); node.classList.toggle('off', !el.checked); touch(); }); }
            else { el.value = get(f) ?? ''; el.addEventListener('input', () => { set(f, el.type === 'number' ? (el.value === '' ? null : parseFloat(el.value)) : el.value); touch(); }); }
        });
        $('.upload input', node).addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return;
            setStatus('Subiendo foto...', 'dirty');
            try {
                const fd = new FormData(); fd.append('photo', file);
                const r = await api('../api/upload.php', { method: 'POST', body: fd });
                it.image = r.path; showPhoto(); touch();
            } catch (err) { setStatus('No se pudo subir la foto: ' + err.message, 'err'); }
        });
        $('.no-photo', node).addEventListener('click', () => { it.image = ''; showPhoto(); touch(); });
        node.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
            const act = b.dataset.act, list = current.items;
            if (act === 'up' && i > 0) { list.splice(i - 1, 0, list.splice(i, 1)[0]); touch(); renderItems(); }
            if (act === 'down' && i < list.length - 1) { list.splice(i + 1, 0, list.splice(i, 1)[0]); touch(); renderItems(); }
            if (act === 'del' && confirm(`¿Eliminar "${t(it.name)}"?`)) { list.splice(i, 1); touch(); renderItems(); renderCats(); }
            if (act === 'addFormat') { it.formats.push({ name: blankText(), price: null }); touch(); renderFormats(); }
        }));
        const renderFormats = () => {
            const ol = $('.format-list', node); ol.innerHTML = '';
            if (it.formats.length) node.querySelector('.formats').open = true;
            it.formats.forEach((f, j) => {
                const li = document.createElement('li');
                li.innerHTML = `<input placeholder="Formato (ES)" value="${esc(f.name.es)}"><input placeholder="Format (EN)" value="${esc(f.name.en)}"><input type="number" step="0.05" min="0" placeholder="€" value="${f.price ?? ''}"><button class="icon danger" type="button"><i class="fa fa-trash"></i></button>`;
                const [es, en, price, del] = li.children;
                es.addEventListener('input', () => { f.name.es = es.value; touch(); }); en.addEventListener('input', () => { f.name.en = en.value; touch(); });
                price.addEventListener('input', () => { f.price = price.value === '' ? null : parseFloat(price.value); touch(); });
                del.addEventListener('click', () => { it.formats.splice(j, 1); touch(); renderFormats(); });
                ol.appendChild(li);
            });
        };
        renderFormats();
        const al = $('.allergens', node);
        menu.allergens.forEach(a => {
            const on = it.allergens.includes(a.id);
            const l = document.createElement('label'); l.className = on ? 'on' : '';
            l.innerHTML = `<input type="checkbox" ${on ? 'checked' : ''}><img src="../${esc(a.icon)}" alt="">${esc(t(a.name))}`;
            l.querySelector('input').addEventListener('change', (e) => { it.allergens = e.target.checked ? [...it.allergens, a.id] : it.allergens.filter(x => x !== a.id); l.classList.toggle('on', e.target.checked); touch(); });
            al.appendChild(l);
        });
        return node;
    }

    // ---- save, notes, new category
    $('#save').addEventListener('click', async () => {
        $('#save').disabled = true; setStatus('Guardando...', 'dirty');
        try {
            menu.notes = { es: $('#notesEs').value, en: $('#notesEn').value };
            const r = await api('../api/menu.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(menu) });
            dirty = false; setStatus(`Guardado (versión ${r.version}, ${r.updated})`, 'ok');
            await load(true);
        } catch (err) { setStatus('No se pudo guardar: ' + (err.message === 'not_signed_in' ? 'la sesión caducó, vuelve a entrar' : err.message), 'err'); }
        $('#save').disabled = false;
    });
    $('#addCat').addEventListener('click', () => { const c = newCat(); c.name.es = 'Nueva categoría'; menu.categories.push(c); current = c; touch(); renderCats(); renderWork(); });
    $('#notesEs').addEventListener('input', touch); $('#notesEn').addEventListener('input', touch);
    window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

    async function load(keepCurrent) {
        const r = await fetch('../api/menu.php?v=' + Date.now(), { cache: 'no-store' });
        menu = await r.json();
        $('#notesEs').value = menu.notes?.es || ''; $('#notesEn').value = menu.notes?.en || '';
        if (keepCurrent && current) {
            const all = menu.categories.flatMap(c => [c, ...(c.categories || [])]);
            current = all.find(c => c.id === current.id) || null;
        } else current = menu.categories[0] || null;
        renderCats(); renderWork();
        if (!dirty) setStatus(`Carta versión ${menu.version}, actualizada el ${menu.updated}`, '');
    }
    load().catch(err => setStatus('No se pudo cargar la carta: ' + err.message, 'err'));
})();
