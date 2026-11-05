// /prueba · modo demostración: el mismo panel con un par de coches de ejemplo y varios estilos para comparar.
// Mientras está activo, todas las llamadas al juego se responden aquí: no se toca ningún coche ni se guarda nada.
let DEMO = null;

const THEMES = [
    { id: '', label: 'Actual', icon: 'fa-circle-half-stroke', desc: 'Gris y blanco con fondo de carbono' },
    { id: 'pista', label: 'Pista', icon: 'fa-flag-checkered', desc: 'Grafito con naranja de carreras' },
    { id: 'neon', label: 'Neón', icon: 'fa-bolt', desc: 'Azul noche con cian brillante' },
    { id: 'claro', label: 'Claro', icon: 'fa-sun', desc: 'Fondo blanco con azul' },
    { id: 'carbono', label: 'Carbono', icon: 'fa-flag', desc: 'Fibra de carbono con rojo, esquinas rectas' },
    { id: 'esmeralda', label: 'Esmeralda', icon: 'fa-leaf', desc: 'Verde muy oscuro con lima' },
    { id: 'oro', label: 'Oro', icon: 'fa-crown', desc: 'Negro de lujo con dorado' },
    { id: 'synth', label: 'Synthwave', icon: 'fa-music', desc: 'Morado y rosa de los 80' },
    { id: 'cristal', label: 'Cristal', icon: 'fa-gem', desc: 'Translúcido: se ve el juego detrás' },
];

function setTheme(id) {
    if (id) document.body.dataset.theme = id;
    else delete document.body.dataset.theme;
    $$('#demo-bar .db-t').forEach(b => b.classList.toggle('on', b.dataset.t === id));
    const t = THEMES.find(x => x.id === id);
    $('#db-desc').textContent = t ? t.desc : '';
    try { localStorage.setItem('admincar-demo-theme', id); } catch (e) { /* sin almacenamiento */ }
}

// Diseños de las tarjetas de plantillas (Confort, Deportivo…)
const CARDS = [
    { id: '', label: 'Marca de agua (puesta)', desc: 'Icono gigante de fondo y el nombre abajo' },
    { id: 'antigua', label: 'Antigua', desc: 'Icono arriba, nombre y descripción debajo' },
    { id: 'fila', label: 'A · Fila', desc: 'Icono en un cuadro a la izquierda y el texto al lado, en dos columnas' },
    { id: 'centro', label: 'B · Centrada', desc: 'Icono grande en un círculo, todo centrado' },
    { id: 'lista', label: 'C · Lista', desc: 'Una por línea, con flecha a la derecha' },
    { id: 'franja', label: 'D · Franja', desc: 'Franja de color a la izquierda, icono y nombre en la misma línea' },
];

function setCard(id) {
    if (id) document.body.dataset.card = id;
    else delete document.body.dataset.card;
    $$('#demo-bar .db-c').forEach(b => b.classList.toggle('on', b.dataset.c === id));
    const c = CARDS.find(x => x.id === id);
    $('#db-cdesc').textContent = c ? c.desc : '';
    try { localStorage.setItem('admincar-demo-card', id); } catch (e) { /* sin almacenamiento */ }
    // para que se vean las tarjetas al cambiar
    if (S.mode !== 'quick') { const b = $('#modes [data-mode="quick"]'); if (b) b.click(); }
}

function buildBar() {
    let bar = $('#demo-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'demo-bar';
        bar.innerHTML = `<div class="db-line"><span class="db-tag"><i class="fa-solid fa-flask"></i>Modo prueba</span>
            <div class="db-themes">${THEMES.map(t => `<button class="db-t" data-t="${t.id}"><i class="fa-solid ${t.icon}"></i>${t.label}</button>`).join('')}</div>
            <span class="db-desc" id="db-desc"></span></div>
            <div class="db-line"><span class="db-tag"><i class="fa-solid fa-table-cells-large"></i>Tarjetas</span>
            <div class="db-themes">${CARDS.map(c => `<button class="db-c" data-c="${c.id}">${c.label}</button>`).join('')}</div>
            <span class="db-desc" id="db-cdesc"></span></div>`;
        document.body.appendChild(bar);
        $$('.db-t', bar).forEach(b => b.onclick = () => setTheme(b.dataset.t));
        $$('.db-c', bar).forEach(b => b.onclick = () => setCard(b.dataset.c));
    }
    bar.classList.remove('hidden');
    document.body.classList.add('demo');
    let saved = '', card = '';
    try { saved = localStorage.getItem('admincar-demo-theme') || ''; card = localStorage.getItem('admincar-demo-card') || ''; } catch (e) { /* nada */ }
    setTheme(THEMES.some(t => t.id === saved) ? saved : '');
    setCard(CARDS.some(c => c.id === card) ? card : '');
}

// ---------- Coches de ejemplo ----------
const dv = () => DEMO.vehs[DEMO.i];
const merged = v => Object.assign({}, v.base, v.draft);
function demoSpeed(v) {
    const b = v.base.fInitialDriveMaxFlatVel, c = merged(v).fInitialDriveMaxFlatVel;
    return v.speedBase * (b && c ? c / b : 1);
}
function demoState(v) { return { cur: merged(v), edits: Object.assign({}, v.draft), speed: demoSpeed(v) }; }
function demoInfo(v) {
    return Object.assign({ exists: true, driver: true, inside: true, plate: 'PRUEBA' }, {
        model: v.model, spawn: v.spawn, label: v.label, make: v.make, hash: v.hash, class: v.class,
        base: v.base, cur: merged(v), edits: Object.assign({}, v.draft), saved: Object.assign({}, v.saved),
        savedBy: Object.keys(v.saved).length ? 'Tú (prueba)' : null, speed: demoSpeed(v), speedBase: v.speedBase,
    });
}
function clean(v, data) {
    const out = {};
    for (const [k, val] of Object.entries(obj(data))) if (v.base[k] != null && !same(val, v.base[k])) out[k] = clone(val);
    return out;
}

const ok = data => ({ ok: true, data });
const DEMO_API = {
    close() { stopTele(); DEMO = null; const bar = $('#demo-bar'); if (bar) bar.classList.add('hidden'); document.body.classList.remove('demo'); fetch(`https://${RES}/demoClose`, { method: 'POST', body: '{}' }).catch(() => {}); return ok(); },
    release: () => ({ ok: false, error: 'En el modo prueba no se conduce: es solo para ver el estilo' }),
    compare: () => ok({ on: false }),
    refresh() { loadVeh(demoInfo(dv())); return ok(); },
    setAll(d) { const v = dv(); v.draft = clean(v, d.data); return ok(demoState(v)); },
    save(d) {
        const v = dv();
        if (d.factory) v.draft = {};
        v.saved = Object.assign({}, v.draft);
        v.hist.unshift({ data: Object.assign({}, v.saved), by: 'Tú (prueba)', at: Date.now() / 1000 });
        v.hist = v.hist.slice(0, 5);
        return ok({ saved: Object.assign({}, v.saved), by: 'Tú (prueba)', message: 'Guardado de mentira: en el modo prueba no se aplica a nadie', state: demoState(v) });
    },
    history: () => ok(dv().hist),
    savePreset: () => ({ ok: false, error: 'En el modo prueba no se guardan presets' }),
    deletePreset: () => ok(),
    models: () => ok({
        list: DEMO.vehs.map(v => ({ spawn: v.spawn, label: v.label, make: v.make, class: v.class, saved: Object.keys(v.saved).length })),
        near: { label: dv().label, spawn: dv().spawn, inside: true }, pinned: null,
    }),
    pick(d) {
        const i = DEMO.vehs.findIndex(v => v.spawn === d.spawn);
        if (i < 0) return { ok: false, error: 'Ese coche no está en la prueba' };
        DEMO.i = i;
        setTimeout(() => loadVeh(demoInfo(dv())), 0);
        return ok();
    },
    live() { setTimeout(() => loadVeh(demoInfo(dv())), 0); return ok(); },
    test: () => ({ ok: false, error: 'En el modo prueba no se saca ningún coche' }),
    sync: () => ok({ vehicles: DEMO.vehs.length, modified: DEMO.vehs.filter(v => Object.keys(v.saved).length).length, added: 0 }),
};

const realPost = post;
post = async function (name, data) {
    if (!DEMO) return realPost(name, data);
    const fn = DEMO_API[name];
    return fn ? fn(data || {}) : ok();
};

// ---------- Telemetría de mentira (para ver el marcador y la barra de vueltas) ----------
let teleT = null;
function startTele() {
    stopTele();
    let t = 0, best = 0;
    teleT = setInterval(() => {
        t += 0.1;
        const top = S.speed || 200;
        const kmh = Math.max(0, (Math.sin(t / 3 - 1.4) * 0.5 + 0.5) * top);
        best = Math.max(best, kmh);
        const gear = Math.min(6, 1 + Math.floor(kmh / (top / 6)));
        const rpm = 0.25 + ((kmh % (top / 6)) / (top / 6)) * 0.72;
        tele({ kmh, rpm, gear, best, t100: best >= 100 ? 3.42 : null });
    }, 100);
}
function stopTele() { clearInterval(teleT); teleT = null; }

window.addEventListener('message', e => {
    const d = e.data || {};
    if (d.action !== 'open') return;
    if (!d.demo) {
        DEMO = null;
        stopTele();
        const bar = $('#demo-bar');
        if (bar) bar.classList.add('hidden');
        document.body.classList.remove('demo');
        delete document.body.dataset.theme;
        delete document.body.dataset.card;
        return;
    }
    DEMO = { i: 0, vehs: (d.demoVehs || []).map(v => Object.assign({}, v, { base: obj(v.base), draft: {}, saved: {}, hist: [] })) };
    S.focused = true;
    buildBar();
    loadVeh(demoInfo(dv()));
    startTele();
});
