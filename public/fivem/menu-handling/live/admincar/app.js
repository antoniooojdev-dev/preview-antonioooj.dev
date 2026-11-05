// Admincar v7 · editor de handling del coche en el que vas
const RES = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'antoniooojdev_admincar';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const KEYNAMES = { PAGEUP: 'RePág', PAGEDOWN: 'AvPág', HOME: 'Inicio', END: 'Fin', INSERT: 'Insert' };
const CLASSES = ['Compacto', 'Sedán', 'SUV', 'Coupé', 'Muscle', 'Deportivo clásico', 'Deportivo', 'Superdeportivo', 'Moto', 'Todoterreno',
    'Industrial', 'Utilitario', 'Furgoneta', 'Bicicleta', 'Barco', 'Helicóptero', 'Avión', 'Servicio', 'Emergencias', 'Militar', 'Comercial', 'Tren', 'Fórmula'];

const S = {
    fields: [], groups: [], byKey: {}, presets: [], veh: null,
    base: {}, cur: {}, edits: {}, saved: {}, speed: 0, ver: 0,
    mode: 'quick', group: 'all', search: '', collapsed: {},
    hist: [], fut: [], gest: null, comparing: false, focused: false, focusName: 'RePág', autoPick: false,
};

async function post(name, data) {
    try {
        const r = await fetch(`https://${RES}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
        return await r.json();
    } catch (e) { return { ok: false, error: 'Sin respuesta del juego' }; }
}

// ===================== Utilidades de valores =====================
const obj = o => (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
const isNum = v => typeof v === 'number' && isFinite(v);
const clone = v => (v && typeof v === 'object') ? { x: v.x, y: v.y, z: v.z } : v;
function same(a, b) {
    if (a == null || b == null) return a == b;
    if (typeof a === 'object') return typeof b === 'object' && Math.abs(a.x - b.x) < 1e-5 && Math.abs(a.y - b.y) < 1e-5 && Math.abs(a.z - b.z) < 1e-5;
    return Math.abs(a - b) < 1e-5;
}
function fmt(v, f) {
    if (v == null) return '—';
    if (typeof v === 'object') return `${fmt(v.x)} · ${fmt(v.y)} · ${fmt(v.z)}`;
    if (f && f.t === 'i') return String(Math.round(v));
    const a = Math.abs(v);
    const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
    return String(+v.toFixed(d));
}
function pct(cur, base) {
    if (!isNum(cur) || !isNum(base) || same(cur, base)) return '';
    if (base === 0) return (cur > 0 ? '+' : '−') + fmt(Math.abs(cur));
    const p = (cur / base - 1) * 100;
    const r = Math.abs(p) >= 10 ? Math.round(p) : +p.toFixed(1);
    return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r) + ' %';
}
// Unidades más legibles para algunos campos (los valores siguen siendo los internos)
const UNITS = {
    fSteeringLock: v => (v * 180 / Math.PI).toFixed(1) + '°',
    fSuspensionRaise: v => (v * 100 >= 0 ? '+' : '') + (v * 100).toFixed(1) + ' cm',
    fMass: v => Math.round(v) + ' kg',
    fPetrolTankVolume: v => Math.round(v) + ' L',
    nInitialDriveGears: v => Math.round(v) + (Math.round(v) === 1 ? ' marcha' : ' marchas'),
};

function kind() {
    const c = S.veh ? S.veh.class : 0;
    return c === 15 || c === 16 ? 'air' : c === 14 ? 'boat' : 'car';
}
function groupAllowed(g) {
    const k = kind();
    if (g === 'vuelo') return k === 'air';
    if (g === 'barco') return k === 'boat';
    return true;
}
const available = f => S.base[f.k] != null && groupAllowed(f.g);
const fieldList = () => S.fields.filter(available);

function computeEdits() {
    const e = {};
    for (const f of S.fields) if (S.base[f.k] != null && !same(S.cur[f.k], S.base[f.k])) e[f.k] = clone(S.cur[f.k]);
    return e;
}
function fromEdits(e) {
    const c = {};
    for (const f of S.fields) if (S.base[f.k] != null) c[f.k] = clone(e[f.k] != null ? e[f.k] : S.base[f.k]);
    return c;
}
// Campos en los que el borrador no coincide con lo guardado para todos
function unsavedKeys() {
    const out = [];
    for (const f of S.fields) {
        if (S.base[f.k] == null) continue;
        const a = S.edits[f.k] != null ? S.edits[f.k] : S.base[f.k];
        const b = S.saved[f.k] != null ? S.saved[f.k] : S.base[f.k];
        if (!same(a, b)) out.push(f.k);
    }
    return out;
}

function range(f) {
    const b = S.base[f.k];
    let lo, hi;
    if (f.min != null) { lo = f.min; hi = f.max; }
    else if (!isNum(b) || b === 0) { lo = 0; hi = 1; }
    else if (b > 0) { lo = 0; hi = b * 3; }
    else { lo = b * 3; hi = -b * 3; }
    const c = S.cur[f.k];
    if (isNum(c)) { lo = Math.min(lo, c); hi = Math.max(hi, c); }
    return [lo, hi];
}
function niceStep(lo, hi) {
    const raw = (hi - lo) / 100;
    if (raw <= 0) return 0.01;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}
const posCss = p => `calc(8px + (100% - 16px) * ${clamp(p, 0, 1)})`;
function paintFill(rng, pFrom, pTo) {
    const fill = $('.fill', rng), tick = $('.tick', rng);
    const a = Math.min(pFrom, pTo), b = Math.max(pFrom, pTo);
    tick.style.left = posCss(pFrom);
    fill.style.left = posCss(a);
    fill.style.width = `calc((100% - 16px) * ${clamp(b, 0, 1) - clamp(a, 0, 1)})`;
}

// ===================== Sincronizar con el juego =====================
let syncTimer = null, inflight = false, again = false;
function sync() { if (!syncTimer) syncTimer = setTimeout(doSync, 60); }
async function doSync() {
    syncTimer = null;
    if (inflight) { again = true; return; }
    inflight = true;
    const sent = S.ver;
    const r = await post('setAll', { data: computeEdits() });
    inflight = false;
    if (r.ok) {
        S.speed = r.data.speed || S.speed;
        if (S.ver === sent && !again) {     // nadie ha tocado nada mientras: se adopta lo que de verdad tiene el coche
            S.cur = Object.assign(S.cur, obj(r.data.cur));
            S.edits = computeEdits();
        }
        updateLive();
    } else toast(r.error, 'error');
    if (again) { again = false; sync(); }
}

function setVal(k, v) {
    const f = S.byKey[k];
    if (!f) return;
    if (f.t === 'v') v = { x: +v.x, y: +v.y, z: +v.z };
    else {
        v = +v;
        if (!isFinite(v)) return;
        if (f.t === 'i') v = Math.round(v);
        if (f.min != null) v = clamp(v, f.min, f.max);
    }
    S.cur[k] = v;
    S.ver++;
    S.edits = computeEdits();
    sync();
}

// Historial: deshacer / rehacer
const snap = () => JSON.stringify(computeEdits());
function begin() { if (S.gest == null) S.gest = snap(); }
function end() {
    if (S.gest != null && S.gest !== snap()) { S.hist.push(S.gest); if (S.hist.length > 100) S.hist.shift(); S.fut = []; }
    S.gest = null;
    updateFoot();
}
function act(fn) { begin(); fn(); end(); updateLive(); }
function restore(s) { S.cur = fromEdits(JSON.parse(s)); S.ver++; S.edits = computeEdits(); sync(); renderBody(); updateLive(); }
function undo() { if (!S.hist.length) return; S.fut.push(snap()); restore(S.hist.pop()); }
function redo() { if (!S.fut.length) return; S.hist.push(snap()); restore(S.fut.pop()); }

// ===================== Ajuste rápido =====================
const MACROS = {
    car: [
        { id: 'power', icon: 'fa-bolt', label: 'Potencia', desc: 'Lo que empuja el motor: aceleración', keys: ['fInitialDriveForce'] },
        { id: 'top', icon: 'fa-gauge-high', label: 'Velocidad punta', desc: 'Hasta dónde llega en llano', keys: ['fInitialDriveMaxFlatVel'] },
        { id: 'brake', icon: 'fa-circle-stop', label: 'Frenos', desc: 'Más = frena en menos metros', keys: ['fBrakeForce'] },
        { id: 'grip', icon: 'fa-road', label: 'Agarre', desc: 'Pegado al suelo en curva y al acelerar', keys: ['fTractionCurveMax', 'fTractionCurveMin'] },
        { id: 'steer', icon: 'fa-arrows-left-right', label: 'Giro del volante', desc: 'Cuánto giran las ruedas delanteras', keys: ['fSteeringLock'] },
        { id: 'stiff', icon: 'fa-arrows-up-down', label: 'Dureza de suspensión', desc: 'Muelles y amortiguadores a la vez', keys: ['fSuspensionForce', 'fSuspensionCompDamp', 'fSuspensionReboundDamp'] },
        { id: 'roll', icon: 'fa-scale-balanced', label: 'Estabilidad en curva', desc: 'Más = se inclina menos al girar', keys: ['fAntiRollBarForce'] },
        { id: 'mass', icon: 'fa-weight-hanging', label: 'Peso', desc: 'Más = gana en choques, acelera peor', keys: ['fMass'] },
        { id: 'dmg', icon: 'fa-car-burst', label: 'Daño por choque', desc: 'Menos = aguanta más golpes sin romperse', keys: ['fCollisionDamageMult', 'fDeformationDamageMult'] },
        { id: 'height', type: 'abs', icon: 'fa-arrow-up-right-dots', label: 'Altura', desc: 'Negativo = más bajo', key: 'fSuspensionRaise', span: 0.15 },
    ],
    air: [
        { id: 'thrust', icon: 'fa-fan', label: 'Empuje', desc: 'Aceleración y subida', keys: ['fThrust'] },
        { id: 'yaw', icon: 'fa-arrows-left-right', label: 'Giro', desc: 'Rapidez al girar a los lados', keys: ['fYawMult'] },
        { id: 'roll', icon: 'fa-rotate', label: 'Alabeo', desc: 'Rapidez al inclinarse de lado', keys: ['fRollMult'] },
        { id: 'pitch', icon: 'fa-arrows-up-down', label: 'Cabeceo', desc: 'Rapidez al subir o bajar el morro', keys: ['fPitchMult'] },
        { id: 'lift', icon: 'fa-wind', label: 'Sustentación', desc: 'Lo que lo sostienen alas o rotor', keys: ['fFormLiftMult'] },
        { id: 'mass', icon: 'fa-weight-hanging', label: 'Peso', desc: 'Más = más pesado e inercia', keys: ['fMass'] },
    ],
    boat: [
        { id: 'power', icon: 'fa-bolt', label: 'Potencia', desc: 'Aceleración en el agua', keys: ['fInitialDriveForce'] },
        { id: 'top', icon: 'fa-gauge-high', label: 'Velocidad punta', desc: 'Hasta dónde llega', keys: ['fInitialDriveMaxFlatVel'] },
        { id: 'rudder', icon: 'fa-anchor', label: 'Timón', desc: 'Rapidez al girar', keys: ['fRudderForce'] },
        { id: 'drag', icon: 'fa-wind', label: 'Resistencia del agua', desc: 'Más = más lento', keys: ['fDragCoefficient'] },
        { id: 'mass', icon: 'fa-weight-hanging', label: 'Peso', desc: 'Más = más estable y lento', keys: ['fMass'] },
    ],
};
// Plantillas: multiplican (m) o suman (a) sobre el de fábrica
const TEMPLATES = [
    { id: 'confort', icon: 'fa-feather', label: 'Confort', desc: 'Blando y tranquilo',
        m: { fSuspensionForce: 0.8, fSuspensionCompDamp: 0.85, fSuspensionReboundDamp: 0.85, fAntiRollBarForce: 0.75, fBrakeForce: 0.95 }, a: { fSuspensionRaise: 0.01 } },
    { id: 'sport', icon: 'fa-flag-checkered', label: 'Deportivo', desc: 'Más motor, más agarre',
        m: { fInitialDriveForce: 1.2, fInitialDriveMaxFlatVel: 1.06, fBrakeForce: 1.2, fTractionCurveMax: 1.1, fTractionCurveMin: 1.1, fSuspensionForce: 1.25, fSuspensionCompDamp: 1.2, fSuspensionReboundDamp: 1.2, fAntiRollBarForce: 1.5 }, a: { fSuspensionRaise: -0.03 } },
    { id: 'drift', icon: 'fa-fire', label: 'Drift', desc: 'Suelta la trasera',
        m: { fInitialDriveForce: 1.25, fTractionCurveMax: 0.8, fTractionCurveMin: 0.72, fTractionCurveLateral: 1.3, fSteeringLock: 1.35, fLowSpeedTractionLossMult: 1.6, fHandBrakeForce: 1.5 } },
    { id: 'rally', icon: 'fa-mountain', label: 'Rally', desc: 'Tierra y saltos',
        m: { fInitialDriveForce: 1.1, fSuspensionForce: 0.8, fSuspensionCompDamp: 0.9, fSuspensionReboundDamp: 0.9, fTractionLossMult: 0.45 }, a: { fSuspensionRaise: 0.04 } },
    { id: 'offroad', icon: 'fa-truck-monster', label: 'Todoterreno', desc: 'No pierde fuera del asfalto',
        m: { fInitialDriveForce: 1.1, fSuspensionForce: 0.75, fSuspensionCompDamp: 0.85, fSuspensionReboundDamp: 0.85, fTractionLossMult: 0.15, fLowSpeedTractionLossMult: 0.7 }, a: { fSuspensionRaise: 0.07 } },
    { id: 'armored', icon: 'fa-shield-halved', label: 'Blindado', desc: 'Pesado y duro',
        m: { fMass: 1.8, fCollisionDamageMult: 0.35, fDeformationDamageMult: 0.35, fWeaponDamageMult: 0.5, fEngineDamageMult: 0.5, fInitialDriveForce: 1.25, fBrakeForce: 1.15 } },
];
const LOG3 = Math.log(3);
const macroKeys = m => (m.keys || []).filter(k => isNum(S.base[k]) && S.base[k] !== 0 && available(S.byKey[k]));
const macroList = () => MACROS[kind()].filter(m => m.type ? (S.base[m.key] != null) : macroKeys(m).length > 0);
function macroRatio(m) { const k = macroKeys(m)[0]; return isNum(S.cur[k]) ? S.cur[k] / S.base[k] : 1; }
function macroChanged(m) { return (m.type ? [m.key] : macroKeys(m)).some(k => !same(S.cur[k], S.base[k])); }

function applyMacro(m, ratio) {
    for (const k of macroKeys(m)) setVal(k, S.base[k] * ratio);
}

function macroHTML(m) {
    const reset = `<button class="m-reset" data-reset="${m.id}" title="Volver a fábrica"><i class="fa-solid fa-rotate-left"></i></button>`;
    const top = `<div class="m-top"><span class="m-ico"><i class="fa-solid ${m.icon}"></i></span><div class="m-txt grow"><b>${esc(m.label)}</b><small>${esc(m.desc)}</small></div><span class="m-val mono"></span>${reset}</div>`;
    if (m.type === 'int') {
        return `<div class="macro" data-m="${m.id}"><div class="m-top"><span class="m-ico"><i class="fa-solid ${m.icon}"></i></span><div class="m-txt grow"><b>${esc(m.label)}</b><small>${esc(m.desc)} · fábrica ${fmt(S.base[m.key], S.byKey[m.key])}</small></div>
            <div class="stepper"><button data-step="-1"><i class="fa-solid fa-minus"></i></button><b class="mono"></b><button data-step="1"><i class="fa-solid fa-plus"></i></button></div>${reset}</div></div>`;
    }
    const scale = m.type === 'abs' ? ['−15 cm', 'fábrica', '+15 cm'] : ['−67 %', 'fábrica', '+200 %'];
    const r = m.type === 'abs' ? `min="${-m.span}" max="${m.span}" step="0.0025"` : 'min="-1" max="1" step="0.005"';
    return `<div class="macro" data-m="${m.id}">${top}<div class="rng"><span class="tick"></span><span class="fill"></span><input type="range" ${r}></div>
        <div class="m-scale"><span>${scale[0]}</span><span>${scale[1]}</span><span>${scale[2]}</span></div></div>`;
}

function updateMacro(el, m) {
    el.classList.toggle('changed', macroChanged(m));
    if (m.type === 'int') { $('.stepper b', el).textContent = Math.round(S.cur[m.key]); return; }
    const input = $('input', el);
    let p, txt;
    if (m.type === 'abs') {
        const d = (S.cur[m.key] || 0) - (S.base[m.key] || 0);
        if (document.activeElement !== input || !S.gest) input.value = clamp(d, -m.span, m.span);
        p = (clamp(d, -m.span, m.span) + m.span) / (2 * m.span);
        txt = Math.abs(d) < 1e-4 ? 'fábrica' : (d > 0 ? '+' : '−') + Math.abs(d * 100).toFixed(1) + ' cm';
    } else {
        const ratio = macroRatio(m);
        const l = clamp(Math.log(ratio) / LOG3, -1, 1);
        if (document.activeElement !== input || !S.gest) input.value = l;
        p = (l + 1) / 2;
        txt = pct(ratio, 1) || 'fábrica';
    }
    const mv = $('.m-val', el);
    if (!mv.classList.contains('editing')) mv.textContent = txt;
    paintFill($('.rng', el), 0.5, p);
}

function renderQuick() {
    const body = $('#body');
    let h = '';
    if (kind() === 'car') {
        h += `<div class="sec-t">Plantillas<span></span></div><p class="hint">Cada una parte del de fábrica y sustituye lo que tengas. Luego afina con los ajustes.</p><div class="tpls">`;
        for (const t of TEMPLATES) h += `<button class="tpl" data-tpl="${t.id}"><span class="tpl-ico"><i class="fa-solid ${t.icon}"></i></span><span class="tpl-txt"><b>${esc(t.label)}</b><small>${esc(t.desc)}</small></span><i class="fa-solid fa-chevron-right tpl-go"></i></button>`;
        h += '</div>';
    }
    h += `<div class="sec-t">Ajustes<span></span></div><p class="hint">El centro de cada barra es el de fábrica. Doble clic en la barra para volver.</p>`;
    for (const m of macroList()) h += macroHTML(m);
    body.innerHTML = h;

    for (const m of macroList()) {
        const el = $(`.macro[data-m="${m.id}"]`, body);
        const reset = () => act(() => (m.type ? [m.key] : macroKeys(m)).forEach(k => setVal(k, S.base[k])));
        $('[data-reset]', el).onclick = reset;
        if (m.type === 'int') {
            $$('[data-step]', el).forEach(b => b.onclick = () => act(() => setVal(m.key, clamp(Math.round(S.cur[m.key]) + +b.dataset.step, 1, 10))));
        } else {
            const input = $('input', el);
            input.addEventListener('input', () => {
                begin();
                if (m.type === 'abs') setVal(m.key, (S.base[m.key] || 0) + +input.value);
                else applyMacro(m, Math.pow(3, +input.value));
                updateLive();
            });
            input.addEventListener('change', end);
            input.addEventListener('dblclick', reset);
        }
        if (m.type !== 'int') {
            const mv = $('.m-val', el);
            mv.classList.add('pct-edit');
            mv.title = m.type === 'abs' ? 'Clic para escribir los centímetros' : 'Clic para escribir el porcentaje';
            mv.onclick = () => {
                if (m.type === 'abs') {
                    const d = ((S.cur[m.key] || 0) - (S.base[m.key] || 0)) * 100;
                    editPct(mv, d, 'cm', v => act(() => setVal(m.key, (S.base[m.key] || 0) + v / 100)));
                } else {
                    editPct(mv, (macroRatio(m) - 1) * 100, '%', v => act(() => applyMacro(m, Math.max(0.01, 1 + v / 100))));
                }
            };
        }
        updateMacro(el, m);
    }
    $$('[data-tpl]', body).forEach(b => b.onclick = () => applyTemplate(TEMPLATES.find(t => t.id === b.dataset.tpl)));
}

function applyTemplate(t) {
    act(() => {
        S.cur = fromEdits({});
        for (const [k, m] of Object.entries(t.m || {})) if (isNum(S.base[k]) && available(S.byKey[k])) S.cur[k] = S.base[k] * m;
        for (const [k, a] of Object.entries(t.a || {})) if (isNum(S.base[k]) && available(S.byKey[k])) S.cur[k] = S.base[k] + a;
        for (const k of Object.keys(S.cur)) { const f = S.byKey[k]; if (f.min != null && isNum(S.cur[k])) S.cur[k] = clamp(S.cur[k], f.min, f.max); }
        S.ver++; S.edits = computeEdits(); sync();
    });
    renderBody();
    toast(`Plantilla «${t.label}» puesta. Pruébala conduciendo y guarda si te convence.`, 'success');
}

// ===================== Avanzado =====================
function rowHTML(f) {
    const b = S.base[f.k];
    const reset = `<button class="r-reset" data-reset="${f.k}" title="Volver a fábrica"><i class="fa-solid fa-rotate-left"></i></button>`;
    if (f.t === 'v') {
        let axes = '';
        for (const a of ['x', 'y', 'z']) {
            axes += `<div class="vec"><span>${a.toUpperCase()}</span><div class="rng"><span class="tick"></span><span class="fill"></span><input type="range" data-axis="${a}"></div><input class="num mono" data-axis="${a}" spellcheck="false"></div>`;
        }
        return `<div class="row" data-k="${f.k}"><div class="r-top"><span class="r-lbl">${esc(f.label)}<i></i></span>${reset}</div>${axes}
            <div class="r-bot" style="margin-top:6px"><span class="r-desc">${esc(f.desc)}</span><span class="r-fac">fábrica <b class="mono">${fmt(b)}</b></span></div></div>`;
    }
    return `<div class="row" data-k="${f.k}"><div class="r-top"><span class="r-lbl">${esc(f.label)}<i></i></span><span class="r-delta mono"></span><input class="num mono" spellcheck="false">${reset}</div>
        <div class="rng"><span class="tick"></span><span class="fill"></span><input type="range"></div>
        <div class="r-bot"><span class="r-desc">${esc(f.desc)}</span><span class="r-fac">fábrica <b class="mono">${UNITS[f.k] ? UNITS[f.k](b) : fmt(b, f)}</b></span></div></div>`;
}

function updateRow(el, f) {
    const c = S.cur[f.k], b = S.base[f.k];
    el.classList.toggle('changed', !same(c, b));
    if (f.t === 'v') {
        const lo = f.min, hi = f.max;
        for (const a of ['x', 'y', 'z']) {
            const rng = $(`input[type=range][data-axis="${a}"]`, el), num = $(`.num[data-axis="${a}"]`, el);
            const l = Math.min(lo, c[a]), h = Math.max(hi, c[a]);
            rng.min = l; rng.max = h; rng.step = f.step || niceStep(l, h);
            if (document.activeElement !== rng) rng.value = c[a];
            if (document.activeElement !== num) num.value = fmt(c[a]);
            paintFill(rng.parentNode, (b[a] - l) / (h - l), (c[a] - l) / (h - l));
        }
        return;
    }
    const [lo, hi] = range(f);
    const rng = $('input[type=range]', el), num = $('.num', el);
    rng.min = lo; rng.max = hi; rng.step = f.step || (f.t === 'i' ? 1 : niceStep(lo, hi) / 4);
    if (document.activeElement !== rng) rng.value = c;
    if (document.activeElement !== num) num.value = fmt(c, f);
    const unit = UNITS[f.k] ? UNITS[f.k](c) : '';
    const d = pct(c, b);
    const rd = $('.r-delta', el);
    if (!rd.classList.contains('editing')) rd.textContent = unit && d ? `${unit} · ${d}` : (unit || d || (isNum(b) && b !== 0 ? '±0 %' : ''));
    rd.classList.toggle('pct-edit', isNum(b) && b !== 0);
    paintFill($('.rng', el), (b - lo) / (hi - lo || 1), (c - lo) / (hi - lo || 1));
}

// Convierte la etiqueta del % en una casilla: Enter o salir = aplicar, Esc = cancelar
function editPct(span, value, unit, apply) {
    if (span.classList.contains('editing')) return;
    span.classList.add('editing');
    const old = span.textContent;
    const r = Math.round(value * 10) / 10;
    span.innerHTML = `<input class="pct-in mono" value="${r > 0 ? '+' : ''}${r}" spellcheck="false"><i>${unit}</i>`;
    const inp = $('input', span);
    inp.focus();
    inp.select();
    let done = false;
    const finish = ok => {
        if (done) return;
        done = true;
        const v = parseNum(inp.value.replace('%', '').replace('cm', '').trim());
        span.classList.remove('editing');
        span.textContent = old;
        if (ok && v != null) { apply(v); updateLive(); }
        else updateLive();
    };
    inp.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') finish(false);
    });
    inp.addEventListener('blur', () => finish(true));
    inp.addEventListener('click', e => e.stopPropagation());
}

function openImage(spawn, label) {
    const lb = $('#lightbox');
    if (!lb || !spawn) return;
    $('#lb-img').src = vehImg(spawn);
    $('#lb-name').textContent = label || spawn;
    $('#lb-spawn').textContent = spawn;
    lb.classList.remove('hidden', 'out');
}
function closeImage() {
    const lb = $('#lightbox');
    if (!lb || lb.classList.contains('hidden')) return;
    lb.classList.add('out');
    setTimeout(() => lb.classList.add('hidden'), 250);
}

function parseNum(s) { const v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : null; }

// Campos de un apartado (o de todos si hay búsqueda / «Todos»)
const changedIn = g => fieldList().filter(f => (g === 'all' || f.g === g) && !same(S.cur[f.k], S.base[f.k])).length;
function advGroups() { return S.groups.filter(g => groupAllowed(g.id) && fieldList().some(f => f.g === g.id)); }
function advFields(g) {
    const q = S.search.trim().toLowerCase();
    return fieldList().filter(f => f.g === g && (!q || (f.label + ' ' + f.desc).toLowerCase().includes(q)));
}

function renderAdv() {
    const groups = advGroups();
    if (S.group !== 'all' && !groups.some(g => g.id === S.group)) S.group = 'all';
    const body = $('#body');
    let h = `<div class="adv-tools"><div class="search"><i class="fa-solid fa-magnifying-glass"></i><input id="adv-q" placeholder="Buscar en todos los valores…" value="${esc(S.search)}"></div><div class="groups" id="adv-groups">`;
    const all = changedIn('all');
    h += `<button data-g="all" class="${S.group === 'all' || S.search ? 'active' : ''}"><i class="fa-solid fa-layer-group"></i>Todos${all ? `<em>${all}</em>` : ''}</button>`;
    for (const g of groups) {
        const n = changedIn(g.id);
        h += `<button data-g="${g.id}" class="${g.id === S.group && !S.search ? 'active' : ''}"><i class="fa-solid ${g.icon}"></i>${esc(g.label.replace(/ \(.+\)$/, ''))}${n ? `<em>${n}</em>` : ''}</button>`;
    }
    h += `</div></div><div id="adv-list"></div>`;
    body.innerHTML = h;
    const q = $('#adv-q');
    const marks = () => $$('#adv-groups button').forEach(b => b.classList.toggle('active', S.search ? b.dataset.g === 'all' : b.dataset.g === S.group));
    q.oninput = () => { S.search = q.value; renderAdvList(); marks(); };
    $$('#adv-groups button').forEach(b => b.onclick = () => { S.group = b.dataset.g; S.search = ''; q.value = ''; marks(); renderAdvList(); $('#body').scrollTop = 0; });
    renderAdvList();
}

// Abrir / cerrar un apartado con animación de altura (sin transiciones de grid: CEF antiguo)
function toggleCat(sec, open) {
    const box = $('.cat-b', sec);
    if (open === undefined) open = sec.classList.contains('closed');
    S.collapsed[sec.dataset.g] = !open;
    sec.classList.toggle('closed', !open);
    box.style.height = box.scrollHeight + 'px';
    if (open) {
        const done = () => { if (!sec.classList.contains('closed')) box.style.height = 'auto'; box.removeEventListener('transitionend', done); };
        box.addEventListener('transitionend', done);
    } else {
        void box.offsetHeight;
        box.style.height = '0px';
    }
}

function renderAdvList() {
    const list = $('#adv-list');
    if (!list) return;
    const searching = !!S.search.trim();
    const sections = (S.group === 'all' || searching) ? advGroups().map(g => [g, advFields(g.id)]).filter(x => x[1].length) : [[null, advFields(S.group)]];
    if (!sections.length || !sections[0][1].length) {
        list.innerHTML = `<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><b>Nada por aquí</b><span>Prueba con otra palabra.</span></div>`;
        return;
    }
    let h = '';
    for (const [g, fs] of sections) {
        const rows = fs.map(rowHTML).join('');
        if (!g) { h += rows; continue; }
        const closed = !searching && S.collapsed[g.id];
        const n = changedIn(g.id);
        h += `<section class="cat ${closed ? 'closed' : ''}" data-g="${g.id}">
            <button class="cat-h"><span class="cat-ico"><i class="fa-solid ${g.icon}"></i></span><b>${esc(g.label)}</b><em class="${n ? '' : 'hidden'}">${n}</em><span class="cat-n">${fs.length} ${fs.length === 1 ? 'valor' : 'valores'}</span><i class="fa-solid fa-chevron-down chev"></i></button>
            <div class="cat-b" style="height:${closed ? '0px' : 'auto'}"><div class="cat-in">${rows}</div></div></section>`;
    }
    list.innerHTML = h;
    $$('.cat-h', list).forEach(b => b.onclick = () => toggleCat(b.parentNode));
    reveal($('#body'));
    $$('.row', list).forEach((el, i) => { el.style.animationDelay = Math.min(i * 18, 200) + 'ms'; bindRow(el, S.byKey[el.dataset.k]); });
}

function bindRow(el, f) {
    const rd = $('.r-delta', el);
    if (rd) {
        rd.title = 'Clic para escribir el porcentaje respecto al de fábrica';
        rd.onclick = () => {
            const b = S.base[f.k];
            if (!isNum(b) || b === 0) return toast('Este valor de fábrica es 0: escríbelo directamente en la casilla', 'info');
            editPct(rd, ((S.cur[f.k] || 0) / b - 1) * 100, '%', v => act(() => setVal(f.k, b * (1 + v / 100))));
        };
    }
    $('[data-reset]', el).onclick = () => act(() => setVal(f.k, clone(S.base[f.k])));
    if (f.t === 'v') {
        $$('input[type=range]', el).forEach(r => {
            r.addEventListener('input', () => { begin(); setVal(f.k, Object.assign(clone(S.cur[f.k]), { [r.dataset.axis]: +r.value })); updateLive(); });
            r.addEventListener('change', end);
        });
        $$('.num', el).forEach(n => n.addEventListener('change', () => {
            const v = parseNum(n.value);
            if (v == null) return updateRow(el, f);
            act(() => setVal(f.k, Object.assign(clone(S.cur[f.k]), { [n.dataset.axis]: v })));
        }));
    } else {
        const r = $('input[type=range]', el), n = $('.num', el);
        r.addEventListener('input', () => { begin(); setVal(f.k, +r.value); updateLive(); });
        r.addEventListener('change', end);
        r.addEventListener('dblclick', () => act(() => setVal(f.k, S.base[f.k])));
        n.addEventListener('change', () => { const v = parseNum(n.value); if (v == null) return updateRow(el, f); act(() => setVal(f.k, v)); });
        n.addEventListener('keydown', e => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const [lo, hi] = range(f);
            const st = (f.t === 'i' ? 1 : (f.step || niceStep(lo, hi))) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
            act(() => setVal(f.k, (S.cur[f.k] || 0) + st));
            n.value = fmt(S.cur[f.k], f);
        });
        n.addEventListener('keyup', e => { if (e.key === 'Enter') n.blur(); });
    }
    updateRow(el, f);
}

function jumpTo(k) {
    const f = S.byKey[k];
    S.search = '';
    if (S.group !== 'all') S.group = f.g;
    S.collapsed[f.g] = false;
    setMode('adv');
    const el = $(`.row[data-k="${k}"]`);
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900); }
}


// ===================== Cambios + presets =====================
let armTimer = null;
function arm(btn, label, fn) {
    if (btn.classList.contains('armed')) { clearTimeout(armTimer); btn.classList.remove('armed'); return fn(); }
    const old = btn.innerHTML;
    btn.classList.add('armed');
    btn.innerHTML = btn.classList.contains('ibtn') ? '<i class="fa-solid fa-triangle-exclamation"></i>' : `<i class="fa-solid fa-triangle-exclamation"></i><span>${label}</span>`;
    if (btn.classList.contains('ibtn')) btn.title = label;
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { btn.classList.remove('armed'); btn.innerHTML = old; }, 3000);
}

function renderChanges() {
    const body = $('#body');
    const unsaved = new Set(unsavedKeys());
    const keys = fieldList().map(f => f.k).filter(k => !same(S.cur[k], S.base[k]) || unsaved.has(k));
    let h = `<div class="sec-t">Diferencias con fábrica<span></span></div>`;
    if (!keys.length) h += `<div class="empty" style="padding:24px 10px"><i class="fa-solid fa-car-side"></i><b>Está de fábrica</b><span>Toca algo en Ajuste rápido o Avanzado y aparecerá aquí.</span></div>`;
    for (const k of keys) {
        const f = S.byKey[k], c = S.cur[k], b = S.base[k];
        const u = UNITS[k];
        const show = v => u ? u(v) : fmt(v, f);
        const back = same(c, b);
        h += `<div class="diff" data-k="${k}"><div><b>${esc(f.label)}</b><small>${esc((S.groups.find(g => g.id === f.g) || {}).label || '')}</small></div>
            <span class="d-vals mono">${back ? `vuelve a <b>${show(b)}</b>` : `${show(b)} → <b>${show(c)}</b>`}</span>
            <span class="d-tag ${unsaved.has(k) ? 'new' : ''}">${unsaved.has(k) ? 'sin guardar' : 'guardado'}</span></div>`;
    }

    h += `<div class="sec-t" style="margin-top:20px">Registro<span></span></div><p class="hint">Las últimas 5 modificaciones guardadas de este vehículo.</p>
        <div id="reg-list"><div class="reg-empty"><i class="fa-solid fa-spinner fa-spin"></i>Cargando…</div></div>`;
    if (Object.keys(S.saved).length) {
        h += `<div class="danger"><div class="grow"><b>Volver a fábrica para todos</b><small>Borra el handling guardado de este modelo. Afecta a todos sus coches.</small></div><button class="btn sm danger-btn" id="btn-factory"><i class="fa-solid fa-rotate-left"></i><span>Restablecer</span></button></div>`;
    }
    body.innerHTML = h;

    $$('.diff', body).forEach(d => d.onclick = () => jumpTo(d.dataset.k));
    loadRegistry();
    const fb = $('#btn-factory');
    if (fb) fb.onclick = () => arm(fb, 'Pulsa otra vez', () => save(true));
}

// Registro: últimas 5 veces que se guardó el handling de este modelo (quién, cuándo, qué)
const two = n => String(n).padStart(2, '0');
function fmtWhen(t) {
    const d = new Date((t || 0) * 1000);
    return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} · ${two(d.getHours())}:${two(d.getMinutes())}`;
}
async function loadRegistry() {
    const want = S.veh && S.veh.hash;
    const r = await post('history');
    const box = $('#reg-list');
    if (!box || !S.veh || S.veh.hash !== want) return;
    if (!r.ok) { box.innerHTML = `<div class="reg-empty">${esc(r.error || 'No se ha podido cargar')}</div>`; return; }
    const list = Array.isArray(r.data) ? r.data : [];
    if (!list.length) { box.innerHTML = '<div class="reg-empty"><i class="fa-solid fa-clock-rotate-left"></i>Todavía no se ha guardado ninguna modificación de este vehículo.</div>'; return; }
    box.innerHTML = list.map((e, i) => {
        const data = obj(e.data);
        const keys = Object.keys(data).filter(k => S.byKey[k]);
        const factory = !keys.length;
        const names = keys.slice(0, 4).map(k => S.byKey[k].label).join(', ') + (keys.length > 4 ? ` y ${keys.length - 4} más` : '');
        return `<div class="reg ${i === 0 ? 'now' : ''}" data-i="${i}">
            <span class="reg-ico"><i class="fa-solid ${factory ? 'fa-rotate-left' : 'fa-floppy-disk'}"></i></span>
            <div class="grow"><b>${factory ? 'Vuelta a fábrica' : keys.length + (keys.length === 1 ? ' cambio' : ' cambios')}${i === 0 ? ' <em>actual</em>' : ''}</b>
            <small>${esc(e.by || '?')} · ${fmtWhen(e.at)}</small>${factory ? '' : `<small class="reg-what">${esc(names)}</small>`}</div>
            ${i === 0 ? '' : `<button class="ibtn" data-restore title="Poner esta versión (sin guardar todavía)"><i class="fa-solid fa-clock-rotate-left"></i></button>`}</div>`;
    }).join('');
    $$('[data-restore]', box).forEach(b => b.onclick = () => {
        const e = list[+b.closest('.reg').dataset.i];
        act(() => {
            const data = {};
            for (const [k, v] of Object.entries(obj(e.data))) if (S.byKey[k] && available(S.byKey[k])) data[k] = v;
            S.cur = fromEdits(data); S.ver++; S.edits = computeEdits(); sync();
        });
        renderChanges();
        toast(`Versión del ${fmtWhen(e.at)} puesta. Pulsa «Guardar cambios» si la quieres.`, 'success');
    });
    reveal($('#body'));
}

// ===================== Cabecera, perfil, pie =====================
const PROFILE = {
    car: [['Aceleración', 'fa-bolt', 'fInitialDriveForce'], ['Punta', 'fa-gauge-high', 'fInitialDriveMaxFlatVel', 'speed'], ['Frenada', 'fa-circle-stop', 'fBrakeForce'],
        ['Agarre', 'fa-road', 'fTractionCurveMax'], ['Suspensión', 'fa-arrows-up-down', 'fSuspensionForce'], ['Peso', 'fa-weight-hanging', 'fMass', 'kg']],
    air: [['Empuje', 'fa-fan', 'fThrust'], ['Giro', 'fa-arrows-left-right', 'fYawMult'], ['Alabeo', 'fa-rotate', 'fRollMult'],
        ['Cabeceo', 'fa-arrows-up-down', 'fPitchMult'], ['Sustentación', 'fa-wind', 'fFormLiftMult'], ['Peso', 'fa-weight-hanging', 'fMass', 'kg']],
    boat: [['Aceleración', 'fa-bolt', 'fInitialDriveForce'], ['Punta', 'fa-gauge-high', 'fInitialDriveMaxFlatVel', 'speed'], ['Timón', 'fa-anchor', 'fRudderForce'],
        ['Hélice', 'fa-fan', 'fImpellerForceMult'], ['Resistencia', 'fa-wind', 'fDragCoefficient'], ['Peso', 'fa-weight-hanging', 'fMass', 'kg']],
};
const profileItems = () => PROFILE[kind()].filter(p => isNum(S.base[p[2]]) && S.base[p[2]] !== 0);

function renderProfile() {
    $('#profile').innerHTML = profileItems().map(p => `<div class="pf" data-p="${p[2]}"><span class="pf-l"><i class="fa-solid ${p[1]}"></i>${p[0]}</span><span class="pf-v mono"></span><span class="pf-bar"><i></i></span></div>`).join('');
}
function updateProfile() {
    for (const p of profileItems()) {
        const el = $(`.pf[data-p="${p[2]}"]`);
        if (!el) continue;
        const r = (S.cur[p[2]] || 0) / S.base[p[2]];
        const l = clamp(Math.log(Math.max(r, 1e-3)) / LOG3, -1, 1);
        const bar = $('.pf-bar i', el);
        bar.style.left = (l < 0 ? 50 + l * 50 : 50) + '%';
        bar.style.width = Math.abs(l * 50) + '%';
        bar.classList.toggle('down', l < 0);
        const v = $('.pf-v', el);
        const d = pct(r, 1);
        v.className = 'pf-v mono' + (d ? (r > 1 ? ' up' : ' down') : '');
        // Punta: km/h de fábrica; si está modificada, el % que se ha subido o bajado
        v.textContent = p[3] === 'speed' && S.speed && !d ? `${Math.round(S.speed)} km/h` : p[3] === 'kg' ? `${Math.round(S.cur[p[2]])} kg` : (d || 'fábrica');
    }
}

function renderHead() {
    const v = S.veh;
    $('#v-name').textContent = v ? v.label : 'Sin vehículo';
    $('#v-sub').textContent = v ? [CLASSES[v.class] || 'Vehículo', v.make, v.remote ? 'sin tenerlo delante' : v.driver ? '' : (v.inside ? 'vas de pasajero' : 'estás a pie')].filter(Boolean).join(' · ') : 'Acércate a un vehículo';
    $('#d-name').textContent = v ? v.label : '—';
    const id = v ? (v.spawn || v.model) : '';
    $('#v-spawn').classList.toggle('hidden', !id);
    $('#v-spawn-txt').textContent = id;
    // Misma imagen que el garaje del móvil (docs.fivem.net); si no existe (addons) queda el icono
    const box = $('#v-img');
    box.onclick = () => { if (box.classList.contains('has')) openImage(id, v && v.label); };
    box.classList.remove('has');
    const old = $('img', box);
    if (old) old.remove();
    if (id) {
        const img = new Image();
        img.onload = () => { box.classList.add('has'); };
        img.onerror = () => img.remove();
        img.src = `https://docs.fivem.net/vehicles/${encodeURIComponent(id)}.webp`;
        box.appendChild(img);
    }
}

function copyText(t) {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
}
$('#v-spawn').onclick = () => {
    const id = $('#v-spawn-txt').textContent;
    if (!id) return;
    const b = $('#v-spawn');
    if (copyText(id)) {
        b.classList.add('copied');
        $('i', b).className = 'fa-solid fa-check';
        setTimeout(() => { b.classList.remove('copied'); $('i', b).className = 'fa-solid fa-copy'; }, 1400);
        toast(`ID copiado: ${id}`, 'success');
    } else toast('No se ha podido copiar', 'error');
};

function updateStatus() {
    const st = $('#status');
    if (!S.veh) { st.className = 'status'; st.innerHTML = '<span class="sdot"></span><span>Acércate a un vehículo y el panel se carga solo</span>'; return; }
    const un = unsavedKeys().length;
    const sv = Object.keys(S.saved).length;
    if (S.comparing) {
        st.className = 'status compare';
        st.innerHTML = `<span class="sdot"></span><span><b>Comparando:</b> ahora llevas el de fábrica. Vuelve a pulsar para tus cambios.</span>`;
    } else if (un) {
        st.className = 'status dirty';
        st.innerHTML = `<span class="sdot"></span><span><b>${un} ${un === 1 ? 'cambio' : 'cambios'} sin guardar</b> · ${S.veh.remote ? 'aún no se aplica a nadie' : 'de momento solo lo notas tú'}</span>`;
    } else if (sv) {
        st.className = 'status saved';
        st.innerHTML = `<span class="sdot"></span><span><b>Guardado para todos los ${esc(S.veh.label)}</b> · ${sv} ${sv === 1 ? 'cambio' : 'cambios'}${S.veh.savedBy ? ' · por ' + esc(S.veh.savedBy) : ''}</span>`;
    } else {
        st.className = 'status hidden';
        st.innerHTML = '';
    }
}

function updateFoot() {
    const has = !!S.veh;
    const un = has ? unsavedKeys().length : 0;
    $('#btn-undo').disabled = !S.hist.length;
    $('#btn-redo').disabled = !S.fut.length;
    $('#btn-save').disabled = !un;
    const remote = !!(S.veh && S.veh.remote);
    $('#btn-drive').innerHTML = `<i class="fa-solid fa-gamepad"></i><span>Conducir</span><kbd id="k-focus">${S.focusName}</kbd>`;
    $('#btn-drive').classList.toggle('hidden', remote);
    $('#btn-drive').title = 'Suelta el ratón y conduce con el panel abierto';
    $('#btn-drive').disabled = !has;
    $('#save-txt').textContent = un ? `Guardar ${un} ${un === 1 ? 'cambio' : 'cambios'}` : Object.keys(S.saved).length ? 'Todo guardado' : 'Sin cambios';
    $('#badge').textContent = Object.keys(S.edits).length;
    const ds = $('#d-state');
    ds.textContent = S.comparing ? 'Fábrica' : Object.keys(S.edits).length ? 'Tus cambios' : 'De fábrica';
    ds.classList.toggle('factory', S.comparing || !Object.keys(S.edits).length);
}

function updateLive() {
    if (!S.veh) return updateFoot();
    updateProfile();
    updateStatus();
    updateFoot();
    if (S.mode === 'quick') for (const m of macroList()) { const el = $(`.macro[data-m="${m.id}"]`); if (el) updateMacro(el, m); }
    if (S.mode === 'adv') {
        for (const el of $$('#adv-list .row')) updateRow(el, S.byKey[el.dataset.k]);
        $$('#adv-groups button').forEach(b => {
            const n = changedIn(b.dataset.g);
            let em = $('em', b);
            if (n && !em) { em = document.createElement('em'); b.appendChild(em); }
            if (em) { if (n) em.textContent = n; else em.remove(); }
        });
        $$('#adv-list .cat').forEach(c => { const n = changedIn(c.dataset.g), em = $('.cat-h em', c); em.textContent = n; em.classList.toggle('hidden', !n); });
    }
}

function setMode(m) {
    S.mode = m;
    $$('#modes button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    moveInk();
    renderBody();
}
function moveInk() {
    const b = $(`#modes button[data-mode="${S.mode}"]`);
    const ink = $('#mode-ink');
    if (!b || !b.offsetWidth) return;
    ink.style.width = b.offsetWidth + 'px';
    ink.style.transform = `translateX(${b.offsetLeft - 4}px)`;
}

// Aparición al hacer scroll (IntersectionObserver por contenedor)
const REVEAL = '.row, .macro, .tpl, .diff, .preset, .cat-h, .pk-row, .pk-near, .danger';
const revealObs = {};
function reveal(root) {
    if (!root || typeof IntersectionObserver !== 'function') return;
    let io = revealObs[root.id];
    if (!io) {
        io = new IntersectionObserver(entries => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                e.target.classList.add('in');
                io.unobserve(e.target);
            }
        }, { root, rootMargin: '0px 0px -12px 0px', threshold: 0.05 });
        revealObs[root.id] = io;
    }
    let i = 0;
    $$(REVEAL, root).forEach(el => {
        if (el.classList.contains('rv')) return;
        el.classList.add('rv');
        // las que ya se ven al abrir entran escalonadas; las de abajo, cuando llegues con el scroll
        el.style.transitionDelay = Math.min(i++ * 25, 250) + 'ms';
        el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
        io.observe(el);
    });
}

function renderBody() {
    const body = $('#body');
    $('#dash').classList.toggle('hidden', !S.veh);
    $('#modes').classList.toggle('hidden', !S.veh);
    if (!S.veh) {
        body.innerHTML = `<div class="empty"><i class="fa-solid fa-car-side"></i><b>No hay ningún vehículo cerca</b><span>Elige cualquier modelo de la lista o súbete a uno.</span><button class="btn primary" id="empty-pick" style="margin-top:8px"><i class="fa-solid fa-list"></i>Elegir vehículo</button></div>`;
        $('#empty-pick').onclick = openPicker;
        return;
    }
    const top = body.scrollTop;
    if (S.mode === 'quick') renderQuick();
    else if (S.mode === 'adv') renderAdv();
    else renderChanges();
    body.scrollTop = top;
    reveal(body);
}

function renderAll() {
    renderHead();
    $('.tele').classList.toggle('hidden', !!(S.veh && S.veh.remote));
    renderProfile();
    renderBody();
    updateLive();
    requestAnimationFrame(moveInk);
}

// ===================== Acciones del pie =====================
async function save(factory) {
    const btn = $('#btn-save');
    btn.classList.add('busy');
    const r = await post('save', { factory: !!factory });
    btn.classList.remove('busy');
    if (!r.ok) return toast(r.error, 'error');
    S.saved = obj(r.data.saved);
    if (S.veh) S.veh.savedBy = Object.keys(S.saved).length ? r.data.by : null;
    adopt(r.data.state);
    toast(r.data.message, 'success');
    if (factory) renderBody();
    else if (S.mode === 'changes') loadRegistry();
}
function adopt(st) {
    if (!st) return;
    S.cur = Object.assign(fromEdits({}), obj(st.cur));
    S.edits = computeEdits();
    S.speed = st.speed || S.speed;
    S.ver++;
    renderBody();
    updateLive();
}

$('#btn-save').onclick = () => save(false);

$('#btn-undo').onclick = undo;
$('#btn-redo').onclick = redo;

$('#btn-drive').onclick = async () => { const r = await post('release'); if (!r.ok) toast(r.error, 'error'); };
$('#btn-close').onclick = () => post('close');
$$('#modes button').forEach(b => b.onclick = () => setMode(b.dataset.mode));

document.addEventListener('keydown', e => {
    // ESC: una sola pulsación cierra el menú entero, estés donde estés (también con la lista abierta)
    if (e.key === 'Escape') {
        if ($('#app').classList.contains('hidden') || $('#app').classList.contains('closing')) return;
        e.preventDefault();
        if (e.repeat) return;
        closePicker();
        closeImage();
        closeConfirm();
        return post('close');
    }
    if (!S.focused) return;
    const typing = e.target.tagName === 'INPUT' && e.target.type !== 'range';
    if (typing) return;
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
});

// ===================== Telemetría =====================
function tele(d) {
    const kmh = Math.round(d.kmh || 0);
    const gear = d.gear === 0 ? 'R' : (kmh < 1 && d.gear <= 1 ? 'N' : d.gear);
    const rpm = clamp(d.rpm || 0, 0, 1);
    for (const p of ['t', 'd']) {
        $(`#${p}-kmh`).textContent = kmh;
        $(`#${p}-gear`).textContent = gear;
        $(`#${p}-max`).textContent = Math.round(d.best || 0);
        const t = $(`#${p}-100`);
        if (d.running != null) { t.textContent = d.running.toFixed(1) + 's'; t.className = 'mono running'; }
        else if (d.t100 != null) { t.textContent = d.t100.toFixed(2) + 's'; t.className = 'mono done'; }
        else { t.textContent = '—'; t.className = 'mono'; }
        const bar = $(`#${p}-rpm`);
        bar.style.width = rpm * 100 + '%';
        bar.classList.toggle('red', rpm > 0.92);
    }
}

// ===================== Avisos =====================
function toast(text, kind) {
    if (!text) return;
    const icons = { success: 'fa-check', error: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'info');
    el.innerHTML = `<i class="fa-solid ${icons[kind] || icons.info}"></i><span>${esc(text)}</span>`;
    $('#toasts').appendChild(el);
    const box = $('#toasts');
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 380); }, 3600);
}

// ===================== Elegir vehículo (cualquier modelo del servidor) =====================
// Mismas categorías y orden que la tablet anterior; «Modificados» al final
const PK_TYPES = [
    { id: 'all', label: 'Todos', icon: 'fa-layer-group', cls: null },
    { id: 'car', label: 'Coches', icon: 'fa-car-side', cls: [0, 1, 2, 3, 4, 5, 6, 7, 9, 22] },
    { id: 'moto', label: 'Motos', icon: 'fa-motorcycle', cls: [8] },
    { id: 'heli', label: 'Helicópteros', icon: 'fa-helicopter', cls: [15] },
    { id: 'plane', label: 'Aviones', icon: 'fa-plane', cls: [16] },
    { id: 'boat', label: 'Barcos', icon: 'fa-ship', cls: [14] },
    { id: 'bike', label: 'Bicicletas', icon: 'fa-bicycle', cls: [13] },
    { id: 'service', label: 'Emergencias', icon: 'fa-truck-medical', cls: [17, 18, 19] },
    { id: 'work', label: 'Trabajo', icon: 'fa-truck', cls: [10, 11, 12, 20] },
    { id: 'train', label: 'Trenes', icon: 'fa-train', cls: [21] },
];
const pkTest = (t, m) => t.mod ? m.saved > 0 : (!t.cls || t.cls.includes(m.class));
const PK = { list: [], near: null, pinned: null, type: 'all', q: '', loading: false, dir: 0 };
const PK_MAX = 120;
const vehImg = spawn => `https://docs.fivem.net/vehicles/${encodeURIComponent(spawn)}.webp`;

async function openPicker() {
    clearTimeout(pkCloseT);
    $('#picker').classList.remove('pk-leaving');
    $('#picker').classList.remove('hidden');
    $('#pk-q').focus();
    PK.loading = true;
    PK.dir = 0;
    renderPicker();
    const r = await post('models');
    PK.loading = false;
    if (!r.ok) { toast(r.error, 'error'); return; }
    PK.list = r.data.list || [];
    PK.near = r.data.near || null;
    PK.pinned = r.data.pinned || null;
    renderPicker();
}
let pkCloseT = null;
function closePicker(instant) {
    const p = $('#picker');
    if (p.classList.contains('hidden')) return;
    if (instant === true || $('#app').classList.contains('hidden')) { p.classList.add('hidden'); return; }
    p.classList.add('pk-leaving');
    clearTimeout(pkCloseT);
    pkCloseT = setTimeout(() => { p.classList.add('hidden'); p.classList.remove('pk-leaving'); }, 260);
}

function renderTypes() {
    $('#pk-types').innerHTML = PK_TYPES.map(t => {
        const n = PK.list.filter(m => pkTest(t, m)).length;
        if (t.id !== 'all' && !n && !PK.loading) return '';
        return `<button data-t="${t.id}" class="${PK.type === t.id ? 'active' : ''} ${t.mod ? 'mod' : ''}"><i class="fa-solid ${t.icon}"></i>${t.label}<em>${PK.loading ? '…' : n}</em></button>`;
    }).join('');
    $$('#pk-types button').forEach(b => b.onclick = () => {
        if (b.dataset.t === PK.type) return;
        const ids = PK_TYPES.map(t => t.id);
        PK.dir = ids.indexOf(b.dataset.t) > ids.indexOf(PK.type) ? 1 : -1;
        PK.type = b.dataset.t;
        switchList();
    });
}

// Cambio de categoría: la lista sale hacia un lado y la nueva entra desde el otro
let pkSwitchT = null;
function switchList() {
    const box = $('#pk-list');
    $$('#pk-types button').forEach(b => b.classList.toggle('active', b.dataset.t === PK.type));
    box.classList.remove('pk-in-l', 'pk-in-r');
    box.classList.add(PK.dir > 0 ? 'pk-out-l' : 'pk-out-r');
    clearTimeout(pkSwitchT);
    pkSwitchT = setTimeout(() => {
        box.classList.remove('pk-out-l', 'pk-out-r');
        renderList();
        box.scrollTop = 0;
        void box.offsetWidth;
        box.classList.add(PK.dir > 0 ? 'pk-in-r' : 'pk-in-l');
    }, 140);
}

function renderPicker() { renderTypes(); renderList(); }

function renderList() {
    const box = $('#pk-list');
    if (PK.loading) { box.innerHTML = '<div class="empty"><i class="fa-solid fa-spinner fa-spin"></i><b>Cargando vehículos…</b><span>Coches, motos, helicópteros, aviones, barcos y addons.</span></div>'; return; }
    const q = PK.q.trim().toLowerCase();
    const type = PK_TYPES.find(t => t.id === PK.type) || PK_TYPES[0];
    const all = PK.list.filter(m => pkTest(type, m) && (!q || m.label.toLowerCase().includes(q) || m.spawn.includes(q) || (m.make || '').toLowerCase().includes(q)));
    const shown = all.slice(0, PK_MAX);
    let h = '';
    if (!q) {
        // Volver a lo que estabas editando (sustituye a la antigua flecha de volver)
        if (S.veh) {
            const un = unsavedKeys().length;
            h += `<div class="pk-near ghost pk-cont"><button class="pk-cont-go" data-back><span class="pk-ni"><i class="fa-solid fa-arrow-rotate-left"></i></span>
                <span class="grow"><b>Seguir con ${esc(S.veh.label)}</b></span>
                <span class="pk-mini ${un ? 'pending' : ''}" data-quicksave role="button" title="${un ? 'Guardar ' + un + (un === 1 ? ' cambio' : ' cambios') : 'No hay nada sin guardar'}"><i class="fa-solid fa-house"></i></span>
                <i class="fa-solid fa-arrow-right"></i></button></div>`;
        }
        if (PK.near && !(S.veh && !S.veh.remote)) {
            h += `<button class="pk-near" data-live><span class="pk-ni"><i class="fa-solid ${PK.near.inside ? 'fa-car-side' : 'fa-location-crosshairs'}"></i></span>
                <span class="grow"><b>${PK.near.inside ? 'El coche en el que vas' : 'El coche de tu lado'}</b><small>${esc(PK.near.label)}${PK.near.spawn ? ' · ' + esc(PK.near.spawn) : ''} · en directo, lo notas al momento</small></span><i class="fa-solid fa-arrow-right"></i></button>`;
        }
    }
    if (!shown.length) h += `<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><b>No hay ningún vehículo así</b><span>Prueba con el nombre o con el ID de spawneo.</span></div>`;
    h += '<div class="pk-grid">';
    shown.forEach((m, i) => {
        h += `<button class="pk-row ${PK.pinned === m.spawn ? 'on' : ''}" data-spawn="${esc(m.spawn)}" style="animation-delay:${Math.min(i * 22, 330)}ms">
            <span class="pk-img"><i class="fa-solid fa-car-side"></i><img loading="lazy" src="${vehImg(m.spawn)}" onload="this.parentNode.classList.add('has')" onerror="this.remove()"></span>
            <span class="grow"><b>${esc(m.label)}</b><small><span class="mono">${esc(m.spawn)}</span> · ${esc([CLASSES[m.class] || 'Vehículo', m.make].filter(Boolean).join(' · '))}</small></span>
            ${m.saved ? `<em class="pk-saved">${m.saved} ${m.saved === 1 ? 'cambio' : 'cambios'}</em>` : ''}</button>`;
    });
    h += '</div>';
    if (all.length > PK_MAX) h += `<p class="hint" style="text-align:center;margin:10px 0 4px">Se ven ${PK_MAX} de ${all.length}. Escribe para encontrar el resto.</p>`;
    box.innerHTML = h;
    reveal(box);
    const back = $('[data-back]', box);
    if (back) back.onclick = () => { closePicker(); enterAnim(); };
    const qs = $('[data-quicksave]', box);
    if (qs) qs.onclick = async e => {
        e.stopPropagation();
        if (!unsavedKeys().length) return toast('Este vehículo no tiene cambios sin guardar', 'info');
        qs.classList.add('busy');
        await save(false);
        qs.classList.remove('busy');
        renderList();
    };
    $$('.pk-img', box).forEach(im => im.onclick = e => {
        if (!im.classList.contains('has')) return;
        e.stopPropagation();
        const row = im.closest('.pk-row');
        openImage(row.dataset.spawn, $('b', row).textContent);
    });
    const live = $('[data-live]', box);
    if (live) live.onclick = async () => { S.enterAnim = true; const r = await post('live'); if (!r.ok) return toast(r.error, 'error'); closePicker(); };
    $$('.pk-row', box).forEach(b => b.onclick = async () => {
        b.classList.add('busy');
        S.enterAnim = true;
        const r = await post('pick', { spawn: b.dataset.spawn });
        if (!r.ok) S.enterAnim = false;
        b.classList.remove('busy');
        if (!r.ok) return toast(r.error, 'error');
        closePicker();
    });
}

$('#pk-q').addEventListener('input', e => { PK.q = e.target.value; renderList(); });
$('#btn-pick').onclick = openPicker;

// «Ampliar»: el editor pasa a ocupar casi toda la pantalla (se recuerda para la próxima vez)
let bigT = null;
function setBig(on, instant) {
    S.big = on;
    const panel = $('#panel');
    // Al abrir/cerrar, el contenido se atenúa mientras el panel cambia de ancho (animación de 0,45 s)
    if (!instant) {
        panel.classList.add('resizing');
        clearTimeout(bigT);
        bigT = setTimeout(() => panel.classList.remove('resizing'), 460);
    }
    $('#app').classList.toggle('big', on);
    $$('[data-expand]').forEach(b => {
        b.innerHTML = on ? '<i class="fa-solid fa-compress"></i><span>Reducir</span>' : '<i class="fa-solid fa-expand"></i><span>Ampliar</span>';
        b.title = on ? 'Volver al tamaño normal' : 'Ver el editor en grande';
    });
    try { localStorage.setItem('admincar_big', on ? '1' : '0'); } catch (e) { }
    setTimeout(moveInk, 30);
    setTimeout(moveInk, 420);
}
$$('[data-expand]').forEach(b => b.onclick = () => setBig(!S.big));
try { if (localStorage.getItem('admincar_big') === '1') setBig(true, true); } catch (e) { }

// «Reiniciar ajustes»: confirmar → el vehículo vuelve al handling de fábrica para todos
function askReset() {
    if (!S.veh) return toast('No hay ningún vehículo abierto', 'info');
    const has = Object.keys(S.saved).length || Object.keys(S.edits).length;
    if (!has) return toast(`${S.veh.label} ya está de fábrica`, 'info');
    $('#cf-title').textContent = `¿Reiniciar los ajustes del ${S.veh.label}?`;
    $('#cf-text').textContent = `Vuelve al handling de fábrica para todos los ${S.veh.label} del servidor y se borran también los cambios sin guardar. No se puede deshacer.`;
    const c = $('#confirm');
    c.classList.remove('hidden', 'out');
}
function closeConfirm() {
    const c = $('#confirm');
    if (c.classList.contains('hidden')) return;
    c.classList.add('out');
    setTimeout(() => c.classList.add('hidden'), 220);
}
$$('[data-reset-all]').forEach(b => b.onclick = askReset);
$('#cf-no').onclick = closeConfirm;
$('#confirm').onclick = e => { if (e.target.id === 'confirm') closeConfirm(); };
$('#cf-yes').onclick = async () => {
    const b = $('#cf-yes');
    b.classList.add('busy');
    await save(true);
    b.classList.remove('busy');
    closeConfirm();
};

// «Sincronizar»: vuelve a leer los vehículos del servidor (addons nuevos) y el handling guardado
$$('[data-sync]').forEach(b => b.onclick = async () => {
    if (b.classList.contains('spinning')) return;
    $$('[data-sync]').forEach(x => x.classList.add('spinning'));
    const r = await post('sync');
    $$('[data-sync]').forEach(x => x.classList.remove('spinning'));
    if (!r.ok) return toast(r.error, 'error');
    if (Array.isArray(r.data.presets)) S.presets = r.data.presets;
    toast(`Sincronizado: ${r.data.vehicles} vehículos en el servidor, ${r.data.modified} con handling propio${r.data.added ? ` (${r.data.added} nuevos)` : ''}`, 'success');
    if (!$('#picker').classList.contains('hidden')) openPicker();
});



// ===================== Mensajes del juego =====================
function loadVeh(v) {
    const auto = S.autoPick; S.autoPick = false;
    if (!v || !v.exists) {
        if (auto) setTimeout(openPicker, 50); S.veh = null; S.base = {}; S.cur = {}; S.edits = {}; S.saved = {}; S.hist = []; S.fut = []; renderAll(); return; }
    const changed = !S.veh || S.veh.hash !== v.hash;
    S.veh = v;
    S.base = obj(v.base);
    S.saved = obj(v.saved);
    S.cur = Object.assign(fromEdits({}), obj(v.cur));
    S.edits = computeEdits();
    S.speed = v.speed || 0;
    S.ver++;
    if (changed) { S.hist = []; S.fut = []; S.search = ''; S.group = 'all'; }
    renderAll();
    if (changed || S.enterAnim) enterAnim();
    S.enterAnim = false;
}

// Entrar a editar un vehículo: cabecera, telemetría, pestañas y contenido entran por partes
let enterT = null;
function enterAnim() {
    const p = $('#panel');
    p.classList.remove('veh-enter');
    void p.offsetWidth;
    p.classList.add('veh-enter');
    clearTimeout(enterT);
    enterT = setTimeout(() => p.classList.remove('veh-enter'), 900);
}

window.addEventListener('message', e => {
    const d = e.data || {};
    switch (d.action) {
        case 'open':
            S.fields = d.fields || [];
            S.groups = d.groups || [];
            S.byKey = {};
            for (const f of S.fields) S.byKey[f.k] = f;
            S.presets = Array.isArray(d.presets) ? d.presets : [];
            S.comparing = false;
            S.focusName = $('#k-focus2').textContent = KEYNAMES[d.focusKey] || d.focusKey || 'RePág';
            S.autoPick = true;
            $('#k-compare').textContent = KEYNAMES[d.compareKey] || d.compareKey || 'AvPág';
            clearTimeout(S.closeT);
            $('#app').classList.remove('closing', 'hidden');
            $('#panel').classList.remove('away');
            $('#drive').classList.add('hidden');
            break;
        case 'veh': loadVeh(d.veh); break;
        case 'tele': tele(d); break;
        case 'focus':
            S.focused = !!d.on;
            $('#panel').classList.toggle('away', !d.on);
            $('#drive').classList.toggle('hidden', !!d.on);
            if (d.on) requestAnimationFrame(moveInk);
            break;
        case 'compare': S.comparing = !!d.on; updateLive(); break;
        case 'remoteSaved': {
            const saved = obj(d.saved);
            const differs = JSON.stringify(saved) !== JSON.stringify(S.saved);
            S.saved = saved;
            if (S.veh) S.veh.savedBy = d.by || null;
            if (!Object.keys(S.edits).length) post('refresh');
            else updateLive();
            if (differs && unsavedKeys().length) toast(`${d.by || 'Otro admin'} ha guardado el handling de este modelo. Tu borrador sigue puesto.`, 'info');
            break;
        }
        case 'toast': toast(d.text, d.kind); break;
        case 'close': {
            S.focused = false;
            closeImage();
            const app = $('#app');
            app.classList.add('closing');
            clearTimeout(S.closeT);
            S.closeT = setTimeout(() => {
                app.classList.add('hidden');
                app.classList.remove('closing');
                closePicker();
            }, 320);
            break;
        }
    }
});

// Filas de chips (apartados del Avanzado): la rueda del ratón las desplaza en horizontal
document.addEventListener('wheel', e => {
    const row = e.target.closest && e.target.closest('.groups');
    if (!row || row.scrollWidth <= row.clientWidth) return;
    e.preventDefault();
    row.scrollLeft += (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX);
}, { passive: false });

$('#lightbox').onclick = closeImage;
