const resource = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'my_dealership';

const post = (name, data = {}) =>
    fetch(`https://${resource}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    })
        .then((r) => r.json())
        .catch(() => null);

const $ = (id) => document.getElementById(id);
const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => '$' + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Clases que no tienen sentido en los consejos "de coche" (industriales, utilitarios, bicis, servicio, comerciales)
const WORK_CLASSES = new Set([10, 11, 13, 17, 20]);

const state = {
    mode: null, // 'chat' | 'catalog'
    shop: '',
    npc: { name: 'Marcos', role: '' },
    player: { cash: 0, bank: 0, firstname: '' },
    colors: [],
    catalog: [],
    byModel: {},
    category: 'all',
    view: 'cats', // panel izquierdo: 'cats' | 'list'
    search: '',
    sort: 'price-asc',
    selected: null,
    color: null,
    buying: false,
    doc: null, // { list, i, shownBy }
};

// ---------------------------------------------------------------------
// Aviso y notificaciones
// ---------------------------------------------------------------------

const promptEl = $('prompt');
let promptTimer = null;

function showPrompt(label) {
    clearTimeout(promptTimer);
    $('prompt-label').textContent = label;
    promptEl.classList.remove('out', 'hidden');
}

function hidePrompt() {
    if (promptEl.classList.contains('hidden')) return;
    promptEl.classList.add('out');
    promptTimer = setTimeout(() => promptEl.classList.add('hidden'), 220);
}

function notify(text, kind = 'info') {
    const el = document.createElement('div');
    el.className = `notif ${kind}`;
    el.innerHTML = `<i class="fa-solid ${kind === 'error' ? 'fa-xmark' : 'fa-info'}"></i><span>${esc(text)}</span>`;
    $('notifs').appendChild(el);
    while ($('notifs').children.length > 3) $('notifs').firstElementChild.remove();
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

function purchasedToast(d) {
    const wrap = $('toast-wrap');
    wrap.innerHTML = `
        <div class="toast">
            <div class="toast-badge"><i class="fa-solid fa-key"></i></div>
            <small>Vehículo comprado</small>
            <h3>${esc([d.make, d.name].filter(Boolean).join(' '))}</h3>
            <p>${d.inGarage ? 'Ya está a tu nombre. Lo tienes disponible en tu garaje.' : '¡Disfrútalo! Las llaves ya son tuyas.'}</p>
            ${d.contract ? '<p class="toast-doc"><i class="fa-solid fa-file-signature"></i> Tienes el contrato de compraventa en el inventario.</p>' : ''}
            <div class="toast-row">
                <span class="plate">${esc(d.plate)}</span>
                <span>${d.account === 'bank' ? 'Banco' : 'Efectivo'} · <b>${money(d.price)}</b></span>
            </div>
        </div>`;
    const el = wrap.firstElementChild;
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 400);
    }, 6500);
}

// ---------------------------------------------------------------------
// Estadísticas normalizadas
// ---------------------------------------------------------------------

const STATS = ['speed', 'accel', 'braking', 'handling'];
const range = {};

function prepareCatalog(list) {
    state.catalog = list;
    state.byModel = {};
    for (const s of STATS) {
        const vals = list.filter((v) => !WORK_CLASSES.has(v.class) || s !== 'speed').map((v) => v[s]);
        range[s] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    for (const v of list) {
        v.n = {};
        for (const s of STATS) {
            const { min, max } = range[s];
            v.n[s] = Math.max(0, Math.min(1, (v[s] - min) / (max - min || 1)));
        }
        v.score = v.n.speed * 0.35 + v.n.accel * 0.3 + v.n.handling * 0.2 + v.n.braking * 0.15;
        state.byModel[v.model] = v;
    }
    // Percentiles para los comentarios del vendedor
    for (const key of [...STATS, 'score', 'price']) {
        const sorted = [...list].sort((a, b) => (key === 'score' || key === 'price' ? a[key] - b[key] : a.n[key] - b.n[key]));
        sorted.forEach((v, i) => {
            v.p = v.p || {};
            v.p[key] = i / Math.max(1, sorted.length - 1);
        });
    }
    buildCategories();
}

const out10 = (x) => (Math.round(x * 100) / 10).toFixed(1);

function statLabel(v, topic) {
    switch (topic) {
        case 'speed': return [`${v.speed} km/h`, 'velocidad'];
        case 'handling': return [out10(v.n.handling), 'manejo'];
        case 'accel': return [out10(v.n.accel), 'aceleración'];
        case 'braking': return [out10(v.n.braking), 'frenada'];
        case 'seats': return [`${v.seats} plazas`, v.category];
        default: return [out10(v.score), 'valoración'];
    }
}

// Comentario del vendedor sobre un coche concreto
function vehicleTip(v) {
    const lines = [];
    if (v.class === 13) return 'Sin gasolina, sin seguro y sin multas de aparcamiento. Solo tus piernas y la carretera.';
    if (v.p.speed >= 0.92) lines.push('Está entre lo más rápido que tengo en el concesionario.');
    else if (v.p.accel >= 0.9) lines.push('Acelera como un cohete: en cada semáforo vas a ser el primero.');
    if (v.p.handling >= 0.9) lines.push('En curva se agarra al asfalto como pocos.');
    if (v.p.braking >= 0.92 && lines.length < 2) lines.push('Y frena de maravilla, eso da mucha confianza.');
    if (v.class === 9) lines.push('Fuera del asfalto se defiende de lujo.');
    if (v.seats >= 6) lines.push(`Con ${v.seats} plazas, ideal para mover a mucha gente.`);
    if ([10, 11, 17, 20].includes(v.class)) lines.push('Es una herramienta de trabajo: robusto, fiable y hecho para durar.');
    if (v.p.score >= 0.6 && v.p.price <= 0.35) lines.push('Por lo que cuesta, es una auténtica ganga.');
    if (!lines.length) {
        lines.push(v.p.score < 0.3
            ? 'Sencillo y fiable. Perfecto para el día a día sin complicaciones.'
            : 'Un vehículo muy equilibrado: cumple en todo sin destacar en nada.');
    }
    return lines.slice(0, 2).join(' ');
}

// ---------------------------------------------------------------------
// Conversación
// ---------------------------------------------------------------------

let typeTimer = null;
let typeDone = null;

function say(text, then) {
    const el = $('npc-text');
    clearInterval(typeTimer);
    el.textContent = '';
    el.classList.add('typing');
    currentOptions = [];
    $('options').innerHTML = '';
    $('advice').innerHTML = '';
    let i = 0;
    typeDone = () => {
        clearInterval(typeTimer);
        typeDone = null;
        el.textContent = text;
        el.classList.remove('typing');
        then && then();
    };
    typeTimer = setInterval(() => {
        i += 1;
        el.textContent = text.slice(0, i);
        if (i >= text.length) typeDone && typeDone();
    }, 16);
}

$('npc-text').addEventListener('click', () => typeDone && typeDone());

let currentOptions = [];

function options(list) {
    currentOptions = list;
    $('options').innerHTML = list
        .map(
            (o, i) => `
        <button class="opt${o.wide ? ' wide' : ''}" data-i="${i}" style="animation-delay:${i * 40}ms">
            <i class="fa-solid ${o.icon}"></i>${esc(o.label)}<kbd>${i + 1}</kbd>
        </button>`
        )
        .join('');
}

$('options').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (b) currentOptions[+b.dataset.i]?.run();
});

function greet() {
    const name = state.player.firstname ? `, ${state.player.firstname}` : '';
    const hour = new Date().getHours();
    const hello = hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
    say(`${hello}${name}. Bienvenido a ${state.shop}, soy ${state.npc.name}. ¿Buscas algo en particular o prefieres echar un vistazo?`, mainOptions);
}

function mainOptions() {
    options([
        { icon: 'fa-car-side', label: 'Quiero ver el catálogo', run: () => openCatalog() },
        { icon: 'fa-lightbulb', label: 'Necesito un consejo', run: adviceMenu },
        { icon: 'fa-wallet', label: '¿Qué me puedo permitir?', run: () => advise('budget', 'afford') },
        { icon: 'fa-door-open', label: 'Nada, solo miraba', run: goodbye },
    ]);
}

function backToTalk() {
    say(pick([
        '¿Te ayudo con algo más?',
        'Dime, ¿qué más necesitas?',
        '¿Le damos otra vuelta? Pregúntame lo que quieras.',
    ]), mainOptions);
}

function goodbye() {
    say(pick([
        'Sin problema. Aquí estaré cuando te decidas, ¡que tengas buen día!',
        'Tómate tu tiempo. Cuando quieras, aquí me tienes.',
        'Perfecto. Si cambias de idea, ya sabes dónde encontrarme.',
    ]), () => setTimeout(close, 1400));
}

const TOPICS = {
    speed: { icon: 'fa-gauge-high', label: 'Velocidad punta' },
    handling: { icon: 'fa-route', label: 'Que gire bien' },
    accel: { icon: 'fa-bolt', label: 'Que acelere fuerte' },
    braking: { icon: 'fa-hand', label: 'Buena frenada' },
    offroad: { icon: 'fa-mountain', label: 'Para el campo' },
    bikes: { icon: 'fa-motorcycle', label: 'Una moto' },
    seats: { icon: 'fa-users', label: 'Muchas plazas' },
};

function adviceMenu() {
    say(pick([
        'Claro, para eso estoy. ¿Qué es lo que más te importa en un vehículo?',
        'Por supuesto. Cuéntame, ¿qué buscas exactamente?',
    ]), () =>
        options([
            ...Object.entries(TOPICS).map(([k, t]) => ({ icon: t.icon, label: t.label, run: () => askBudget(k) })),
            { icon: 'fa-arrow-left', label: 'Volver', run: backToTalk },
        ])
    );
}

function askBudget(topic) {
    say(pick([
        'Buena elección. ¿Y de presupuesto cómo vamos?',
        'Entendido. ¿Cuánto te quieres gastar?',
        'Vale. ¿Tienes algún límite de dinero en mente?',
    ]), () =>
        options([
            { icon: 'fa-infinity', label: 'Sin límite', run: () => advise(topic, 'none') },
            { icon: 'fa-wallet', label: 'Lo que me pueda permitir', run: () => advise(topic, 'afford') },
            { icon: 'fa-piggy-bank', label: 'Algo económico', run: () => advise(topic, 'cheap') },
            { icon: 'fa-arrow-left', label: 'Volver', run: adviceMenu },
        ])
    );
}

const CHEAP = 30000;
const maxMoney = () => Math.max(state.player.cash, state.player.bank);

function rank(topic, budget) {
    let list = state.catalog.filter((v) => !WORK_CLASSES.has(v.class));
    if (topic === 'offroad') list = list.filter((v) => v.class === 9);
    if (topic === 'bikes') list = list.filter((v) => v.class === 8);
    if (topic === 'seats') list = list.filter((v) => v.class !== 8 && v.class !== 22);
    if (budget === 'afford') list = list.filter((v) => v.price <= maxMoney());
    if (budget === 'cheap') list = list.filter((v) => v.price <= CHEAP);

    const key = {
        speed: (v) => v.speed,
        handling: (v) => v.n.handling,
        accel: (v) => v.n.accel,
        braking: (v) => v.n.braking,
        offroad: (v) => v.score,
        bikes: (v) => v.n.speed * 0.5 + v.n.accel * 0.3 + v.n.handling * 0.2,
        seats: (v) => v.seats * 10 + v.score,
        budget: (v) => v.score,
    }[topic];
    return list.sort((a, b) => key(b) - key(a) || a.price - b.price).slice(0, 5);
}

function adviceText(topic, top, budget) {
    const [a, b, c] = top.map((v) => v.name);
    const rest = b && c ? ` Justo detrás tienes el ${b} y el ${c}.` : b ? ` También te encaja el ${b}.` : '';
    const within = budget === 'afford' ? ' con lo que llevas' : budget === 'cheap' ? ' sin gastarte mucho' : '';
    switch (topic) {
        case 'speed':
            return `Si lo que quieres es velocidad punta${within}, el ${a} es lo más rápido que tengo: ronda los ${top[0].speed} km/h.${rest}`;
        case 'handling':
            return `Para las curvas${within}, el ${a} es una barbaridad: se agarra al asfalto como ninguno.${rest}`;
        case 'accel':
            return `Si quieres salir disparado en cada semáforo${within}, el ${a} es el que mejor acelera.${rest}`;
        case 'braking':
            return `Para frenar en seco${within}, el ${a}. Para como si hubiera un muro delante.${rest}`;
        case 'offroad':
            return `Para salir del asfalto${within}, te recomiendo el ${a}. Por el campo no hay quien lo pare.${rest}`;
        case 'bikes':
            return `En dos ruedas${within}, mi favorita es la ${a}: rápida, ágil y con mucho carácter.${b ? ` Échale un ojo también a la ${b}.` : ''}`;
        case 'seats':
            return `Si tienes que mover a mucha gente${within}, el ${a} tiene ${top[0].seats} plazas y es lo más cómodo que tengo.${rest}`;
        default:
            return `Con lo que tienes ahora mismo, lo mejor que te puedo ofrecer es el ${a}. En calidad-precio no hay nada mejor.${rest}`;
    }
}

function advise(topic, budget) {
    const top = rank(topic, budget);
    if (!top.length) {
        const text = budget === 'afford'
            ? 'Te soy sincero: con lo que tienes ahora mismo no me llega para nada de eso. Ahorra un poco más y vuelve a verme.'
            : 'Ahora mismo no tengo nada que encaje con eso, lo siento.';
        say(text, () =>
            options([
                { icon: 'fa-rotate-left', label: 'Otra pregunta', run: adviceMenu },
                { icon: 'fa-car-side', label: 'Ver el catálogo', run: () => openCatalog() },
            ])
        );
        return;
    }

    say(adviceText(topic, top, budget), () => {
        $('advice').innerHTML = top
            .map((v, i) => {
                const [val, sub] = statLabel(v, topic);
                return `
                <button class="a-card" data-model="${esc(v.model)}" style="animation-delay:${i * 60}ms">
                    <span class="a-rank">${String(i + 1).padStart(2, '0')}</span>
                    <span class="a-name"><b>${esc(v.name)}</b><small>${esc([v.make, v.category].filter(Boolean).join(' · '))} · ${money(v.price)}</small></span>
                    <span class="a-stat">${esc(val)}<small>${esc(sub)}</small></span>
                    <span class="a-go"><i class="fa-solid fa-eye"></i></span>
                </button>`;
            })
            .join('');
        options([
            { icon: 'fa-eye', label: `Enséñame el ${top[0].name}`, run: () => openCatalog(top[0].model) },
            { icon: 'fa-rotate-left', label: 'Otra pregunta', run: adviceMenu },
            { icon: 'fa-car-side', label: 'Ver todo el catálogo', run: () => openCatalog() },
            { icon: 'fa-door-open', label: 'Gracias, eso es todo', run: goodbye },
        ]);
    });
}

$('advice').addEventListener('click', (e) => {
    const card = e.target.closest('.a-card');
    if (card) openCatalog(card.dataset.model);
});

// ---------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------

// Icono por clase de vehículo de GTA
const CLASS_ICONS = {
    0: 'fa-car-side', 1: 'fa-car', 2: 'fa-truck-monster', 3: 'fa-car-side', 4: 'fa-fire',
    5: 'fa-crown', 6: 'fa-gauge-high', 7: 'fa-bolt', 8: 'fa-motorcycle', 9: 'fa-mountain',
    10: 'fa-industry', 11: 'fa-truck-pickup', 12: 'fa-van-shuttle', 13: 'fa-bicycle', 14: 'fa-ship',
    15: 'fa-helicopter', 16: 'fa-plane', 17: 'fa-bus', 18: 'fa-truck-medical', 19: 'fa-shield-halved',
    20: 'fa-truck', 21: 'fa-train', 22: 'fa-flag-checkered',
};

let categories = [];

function buildCategories() {
    const map = new Map();
    for (const v of state.catalog) {
        const c = map.get(v.class) || { cls: String(v.class), label: v.category, count: 0, from: Infinity };
        c.count += 1;
        c.from = Math.min(c.from, v.price);
        map.set(v.class, c);
    }
    categories = [...map.values()].sort((a, b) => +a.cls - +b.cls);
}

function renderCategories() {
    $('count').textContent = state.catalog.length;
    const all = {
        cls: 'all',
        label: 'Todos los vehículos',
        count: state.catalog.length,
        from: Math.min(...state.catalog.map((v) => v.price)),
        icon: 'fa-layer-group',
    };
    $('list').innerHTML = [all, ...categories]
        .map(
            (c, i) => `
        <button class="cat-row" data-cat="${c.cls}" style="animation-delay:${i * 25}ms">
            <span class="cat-icon"><i class="fa-solid ${c.icon || CLASS_ICONS[c.cls] || 'fa-car'}"></i></span>
            <span class="item-main">
                <b>${esc(c.label)}</b>
                <small>${c.count} ${c.count === 1 ? 'vehículo' : 'vehículos'} · desde ${money(c.from)}</small>
            </span>
            <i class="fa-solid fa-chevron-right cat-go"></i>
        </button>`
        )
        .join('');
}

// Vista del panel izquierdo: 'cats' (lista de categorías) o 'list' (vehículos de una categoría)
function setView(view, category) {
    state.view = view;
    if (category !== undefined) state.category = category;
    const inList = view === 'list';
    $('cat-nav').classList.toggle('hidden', !inList);
    $('sort-wrap').classList.toggle('hidden', !inList && !state.search);
    if (inList) {
        const c = categories.find((x) => x.cls === state.category);
        $('cat-name').textContent = c ? c.label : 'Todos los vehículos';
    }
    $('list').scrollTop = 0;
    renderList();
}

$('cat-back').addEventListener('click', () => setView('cats'));

$('search').addEventListener('input', (e) => {
    state.search = e.target.value.trim().toLowerCase();
    $('sort-wrap').classList.toggle('hidden', state.view !== 'list' && !state.search);
    renderList();
});

$('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
});

function filtered() {
    const q = state.search;
    // En la vista de categorías la búsqueda mira en todo el catálogo
    const cat = state.view === 'list' ? state.category : 'all';
    let list = state.catalog.filter(
        (v) =>
            (cat === 'all' || String(v.class) === cat) &&
            (!q || v.name.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.includes(q))
    );
    const sorters = {
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        speed: (a, b) => b.speed - a.speed,
        accel: (a, b) => b.accel - a.accel,
        handling: (a, b) => b.handling - a.handling,
        braking: (a, b) => b.braking - a.braking,
        name: (a, b) => a.name.localeCompare(b.name, 'es'),
    };
    return list.sort(sorters[state.sort]);
}

let visible = [];

function renderList() {
    if (state.view !== 'list' && !state.search) {
        visible = [];
        renderCategories();
        return;
    }
    visible = filtered();
    $('count').textContent = visible.length;
    if (!visible.length) {
        $('list').innerHTML = '<div class="empty">No hay ningún vehículo que coincida.</div>';
        return;
    }
    const can = maxMoney();
    $('list').innerHTML = visible
        .map(
            (v) => `
        <button class="item${v.model === state.selected ? ' active' : ''}" data-model="${esc(v.model)}">
            <span class="item-main">
                <b>${esc(v.name)}</b>
                <small>${esc([v.make, v.category].filter(Boolean).join(' · '))}</small>
            </span>
            <span class="item-price${v.price > can ? ' no' : ''}">${money(v.price)}</span>
        </button>`
        )
        .join('');
}

$('list').addEventListener('click', (e) => {
    const row = e.target.closest('.cat-row');
    if (row) {
        setView('list', row.dataset.cat);
        return;
    }
    const item = e.target.closest('.item');
    if (item) select(item.dataset.model);
});

let previewTimer = null;

function select(model, instant) {
    const v = state.byModel[model];
    if (!v) return;
    state.selected = model;
    resetBuy();
    $('detail').classList.remove('hidden');

    document.querySelectorAll('.item').forEach((el) => el.classList.toggle('active', el.dataset.model === model));
    const active = document.querySelector('.item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });

    $('d-make').textContent = v.make || v.category;
    $('d-name').textContent = v.name;
    $('d-cat').textContent = v.category;
    $('d-seats').textContent = v.seats;
    $('d-price').textContent = money(v.price);
    $('d-tip-text').textContent = vehicleTip(v);

    const rows = [
        ['Velocidad máxima', `${v.speed} km/h`, v.n.speed],
        ['Aceleración', out10(v.n.accel), v.n.accel],
        ['Manejo', out10(v.n.handling), v.n.handling],
        ['Frenada', out10(v.n.braking), v.n.braking],
    ];
    $('stats').innerHTML = rows
        .map(([l, val]) => `<div><div class="stat-top"><span>${l}</span><b>${val}</b></div><div class="bar"><i></i></div></div>`)
        .join('');
    requestAnimationFrame(() =>
        requestAnimationFrame(() =>
            document.querySelectorAll('#stats .bar i').forEach((el, i) => (el.style.width = `${Math.max(3, rows[i][2] * 100)}%`))
        )
    );
    updateBuy();

    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => post('preview', { model, color: state.color }), instant ? 0 : 180);
}

function renderColors() {
    $('swatches').innerHTML = state.colors
        .map((c) => `<button class="sw${c.id === state.color ? ' active' : ''}" data-id="${c.id}" title="${esc(c.label)}" style="background:${esc(c.hex)}"></button>`)
        .join('');
    const c = state.colors.find((x) => x.id === state.color);
    $('color-name').textContent = c ? c.label : '';
}

$('swatches').addEventListener('click', (e) => {
    const sw = e.target.closest('.sw');
    if (!sw) return;
    state.color = +sw.dataset.id;
    renderColors();
    post('color', { color: state.color });
});

// Se paga con el banco si llega y, si no, en efectivo (el servidor hace lo mismo)
const payAccount = (v) => (state.player.bank >= v.price ? 'bank' : state.player.cash >= v.price ? 'money' : null);

// Comprar: un clic arma la compra y después hay que MANTENER el botón para confirmar
const HOLD_MS = 1300;
let confirmTimer = null;
let confirming = false;
let holdStart = null;
let holdRaf = null;

function setFill(p, animate) {
    const btn = $('buy');
    btn.classList.toggle('fill-back', !!animate);
    btn.style.setProperty('--p', p);
}

function armTimeout() {
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
        resetBuy();
        updateBuy();
    }, 5000);
}

function resetBuy() {
    confirming = false;
    holdStart = null;
    cancelAnimationFrame(holdRaf);
    clearTimeout(confirmTimer);
    $('buy').classList.remove('confirm', 'holding');
    setFill(0);
}

function updateBuy() {
    const v = state.byModel[state.selected];
    const btn = $('buy');
    if (state.buying) return;
    if (!v) {
        btn.disabled = true;
        $('buy-text').textContent = 'Elige un vehículo';
        return;
    }
    btn.disabled = !payAccount(v);
    $('buy-text').innerHTML = btn.disabled
        ? 'Saldo insuficiente'
        : confirming
        ? `<i class="fa-solid fa-fingerprint"></i> Mantén para confirmar · ${money(v.price)}`
        : `Comprar · ${money(v.price)}`;
}

const REASONS = {
    money: 'No tienes suficiente dinero en esa cuenta.',
    far: 'Tienes que estar en el concesionario para comprar.',
    invalid: 'Ese vehículo ya no está a la venta.',
    busy: 'Espera un momento, estamos con el papeleo.',
    plate: 'No hemos podido asignarle matrícula. Inténtalo de nuevo.',
    db: 'Algo ha fallado con el papeleo. Inténtalo de nuevo.',
};

async function doBuy() {
    const v = state.byModel[state.selected];
    if (!v || state.buying) return;
    resetBuy();
    state.buying = true;
    $('buy').disabled = true;
    $('buy-text').innerHTML = '<span class="spinner"></span>';
    const res = await post('buy', { model: v.model, color: state.color });
    state.buying = false;
    if (!res || !res.ok) {
        notify(REASONS[res && res.reason] || 'No se ha podido completar la compra.', 'error');
        updateBuy();
    }
    // Si sale bien, Lua cierra la interfaz y manda 'purchased'
}

function holdTick(now) {
    if (holdStart === null) return;
    const p = Math.min(1, (now - holdStart) / HOLD_MS);
    setFill(p);
    if (p >= 1) {
        holdStart = null;
        doBuy();
        return;
    }
    holdRaf = requestAnimationFrame(holdTick);
}

$('buy').addEventListener('pointerdown', (e) => {
    const v = state.byModel[state.selected];
    if (e.button !== 0 || !v || state.buying || $('buy').disabled) return;
    if (!confirming) {
        confirming = true;
        $('buy').classList.add('confirm');
        updateBuy();
        armTimeout();
        return;
    }
    clearTimeout(confirmTimer);
    $('buy').setPointerCapture(e.pointerId);
    $('buy').classList.add('holding');
    holdStart = performance.now();
    holdRaf = requestAnimationFrame(holdTick);
});

function releaseHold() {
    if (holdStart === null) return;
    holdStart = null;
    cancelAnimationFrame(holdRaf);
    $('buy').classList.remove('holding');
    setFill(0, true);
    armTimeout();
}
$('buy').addEventListener('pointerup', releaseHold);
$('buy').addEventListener('pointercancel', releaseHold);
$('buy').addEventListener('lostpointercapture', releaseHold);

$('back').addEventListener('click', () => {
    showChat();
    post('mode', { mode: 'chat' });
    backToTalk();
});

// Girar con A/D, arrastrar y rueda
let rotDir = 0;
function setRot(dir) {
    if (dir === rotDir) return;
    rotDir = dir;
    post('rotate', { dir });
}

let dragX = null;
let dragAcc = 0;
let dragRaf = null;
$('drag-zone').addEventListener('pointerdown', (e) => {
    dragX = e.clientX;
    $('drag-zone').setPointerCapture(e.pointerId);
});
$('drag-zone').addEventListener('pointermove', (e) => {
    if (dragX === null) return;
    dragAcc += e.clientX - dragX;
    dragX = e.clientX;
    if (!dragRaf) {
        dragRaf = requestAnimationFrame(() => {
            dragRaf = null;
            if (dragAcc) post('drag', { dx: dragAcc });
            dragAcc = 0;
        });
    }
});
const endDrag = () => (dragX = null);
$('drag-zone').addEventListener('pointerup', endDrag);
$('drag-zone').addEventListener('pointercancel', endDrag);
$('drag-zone').addEventListener('wheel', (e) => post('zoom', { delta: Math.sign(e.deltaY) }), { passive: true });

// ---------------------------------------------------------------------
// Contrato de compraventa
// ---------------------------------------------------------------------

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');
const SEX = { m: 'Hombre', f: 'Mujer' };
let dealer = {};
let shopName = '';

// Código de barras a partir del nº de contrato (siempre igual para el mismo nº)
function barcode(text) {
    let x = 0;
    let bars = '';
    let seed = 7;
    for (const ch of `*${text}*`) {
        seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
        for (let k = 0; k < 5; k++) {
            const w = 1 + ((seed >> k) & 1) + ((seed >> (k + 3)) & 1);
            if (k % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="34"/>`;
            x += w + 1;
        }
    }
    return `<svg class="barcode" viewBox="0 0 ${x} 34" preserveAspectRatio="none">${bars}</svg>`;
}

// Sello del concesionario (el mismo en todos los contratos)
function stamp() {
    return `
    <svg class="stamp" viewBox="0 0 120 120">
        <defs><path id="stamp-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <circle cx="60" cy="60" r="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <text font-size="9.6" font-weight="800" letter-spacing="2.1" fill="currentColor">
            <textPath href="#stamp-ring">PREMIUM DELUXE MOTORSPORT · LOS SANTOS ·</textPath>
        </text>
        <text x="60" y="58" text-anchor="middle" font-size="17" font-weight="900" fill="currentColor">PDM</text>
        <text x="60" y="72" text-anchor="middle" font-size="7" font-weight="800" letter-spacing="1.5" fill="currentColor">VENDIDO</text>
    </svg>`;
}

// Firma del director (la misma en todos los contratos)
function dealerSignature() {
    return `
    <span class="sig-dealer">${esc(dealer.director || 'Simeon Yetarian')}</span>
    <svg class="sig-flourish" viewBox="0 0 220 40">
        <path d="M6 26 C 40 8, 70 34, 104 20 S 160 6, 214 18 M150 30 C 170 24, 190 34, 206 26"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
}

function renderDoc() {
    const { list, i, shownBy } = state.doc;
    const c = list[i];
    const d = new Date((c.ts || 0) * 1000);
    const base = Math.round(c.price / 1.21);
    const vat = c.price - base;
    const b = c.buyer || {};
    const vehicle = [c.make, c.name].filter(Boolean).join(' ') || c.model;
    const row = (k, v) => `<div class="p-row"><dt>${k}</dt><dd>${v}</dd></div>`;

    $('paper').innerHTML = `
        <div class="p-watermark">PDM</div>
        <header class="p-head">
            <div class="p-logo"><span>PDM</span></div>
            <div class="p-company">
                <b>${esc(shopName)}</b>
                <small>${esc(dealer.company)} · CIF ${esc(dealer.cif)}</small>
                <small>${esc(dealer.address)} · ${esc(dealer.city)}</small>
                <small>Tel. ${esc(dealer.phone)} · ${esc(dealer.web)}</small>
            </div>
            <div class="p-num">
                <small>Contrato nº</small>
                <b>${esc(c.number || '—')}</b>
                <small>Ejemplar para el comprador</small>
            </div>
        </header>

        <h1 class="p-title">Contrato de compraventa de vehículo</h1>
        <p class="p-place">En ${esc(dealer.city)}, a ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}, siendo las ${pad(d.getHours())}:${pad(d.getMinutes())} horas, en las instalaciones de ${esc(shopName)}.</p>

        <h3><span>I</span> Reunidos</h3>
        <div class="p-parties">
            <div class="party">
                <span class="tag">Parte vendedora</span>
                <b>${esc(dealer.company)}</b>
                <dl>
                    ${row('CIF', esc(dealer.cif))}
                    ${row('Domicilio', `${esc(dealer.address)}, ${esc(dealer.city)}`)}
                    ${row('Representada por', `${esc(dealer.director)} (${esc(dealer.directorRole)})`)}
                    ${row('Asesor comercial', esc(c.seller))}
                </dl>
            </div>
            <div class="party">
                <span class="tag">Parte compradora</span>
                <b>${esc(b.name)}</b>
                <dl>
                    ${row('DNI', esc(b.dni))}
                    ${row('Fecha de nacimiento', esc(b.dob || '—'))}
                    ${row('Sexo', esc(SEX[b.sex] || '—'))}
                    ${row('Residencia', `${esc(dealer.city)}, San Andreas`)}
                </dl>
            </div>
        </div>

        <h3><span>II</span> Vehículo objeto del contrato</h3>
        <dl class="p-veh">
            ${row('Marca', esc(c.make || '—'))}
            ${row('Modelo', esc(c.name || c.model))}
            ${row('Categoría', esc(c.category || '—'))}
            ${row('Plazas', c.seats || '—')}
            ${row('Matrícula', `<span class="p-plate">${esc(c.plate)}</span>`)}
            ${row('Color', `<span class="p-color" style="background:${esc(c.color && c.color.hex)}"></span>${esc(c.color && c.color.label)}`)}
            ${row('Nº de bastidor', `<span class="mono">${esc(c.vin)}</span>`)}
            ${row('Estado', 'Nuevo · 0 km')}
        </dl>

        <h3><span>III</span> Precio y forma de pago</h3>
        <div class="p-price">
            <dl>
                ${row('Base imponible', money(base))}
                ${row('IVA (21 %)', money(vat))}
                ${row('Forma de pago', c.account === 'bank' ? 'Transferencia bancaria' : 'Pago en efectivo')}
            </dl>
            <div class="p-total">
                <small>Total</small>
                <b>${money(c.price)}</b>
                <span class="paid">Pagado</span>
            </div>
        </div>

        <h3><span>IV</span> Cláusulas</h3>
        <ol class="p-clauses">
            <li>La parte vendedora transmite a la parte compradora la plena propiedad del vehículo descrito, libre de cargas, embargos y gravámenes.</li>
            <li>La parte compradora declara recibir en este acto el vehículo y sus llaves en perfecto estado, a su entera satisfacción.</li>
            <li>El vehículo queda registrado a nombre de la parte compradora con la matrícula <b>${esc(c.plate)}</b> desde la firma de este contrato.</li>
            <li>Desde este momento la parte compradora asume la responsabilidad derivada del uso del vehículo, incluidas las sanciones de tráfico.</li>
            <li>El vehículo cuenta con una garantía oficial de dos (2) años en cualquier concesionario de la red ${esc(shopName)}.</li>
        </ol>
        <p class="p-agree">Y en prueba de conformidad, ambas partes firman el presente contrato en el lugar y la fecha arriba indicados.</p>

        <div class="p-sign">
            <div class="sig">
                <div class="sig-area">${stamp()}${dealerSignature()}</div>
                <b>Por la parte vendedora</b>
                <small>${esc(dealer.director)} · ${esc(dealer.directorRole)}</small>
            </div>
            <div class="sig">
                <div class="sig-area"><span class="sig-buyer">${esc(b.name)}</span></div>
                <b>Por la parte compradora</b>
                <small>${esc(b.name)}</small>
            </div>
        </div>

        <footer class="p-foot">
            ${barcode(c.number || String(c.id))}
            <small>${esc(c.number || '')} · Documento original. Consérvelo junto a la documentación del vehículo.</small>
        </footer>`;

    $('doc-shown').classList.toggle('hidden', !shownBy);
    $('doc-shown').querySelector('span').textContent = shownBy ? `${shownBy} te está enseñando su contrato` : '';
    $('doc-show').classList.toggle('hidden', !!shownBy);
    $('doc-pager').classList.toggle('hidden', list.length < 2);
    $('doc-page').textContent = `${i + 1} / ${list.length}`;
    $('doc-prev').disabled = i === 0;
    $('doc-next').disabled = i === list.length - 1;
    $('doc-scroll').scrollTop = 0;
    const paper = $('paper');
    paper.classList.remove('in');
    void paper.offsetWidth;
    paper.classList.add('in');
}

function openDoc(d) {
    dealer = d.dealer || {};
    shopName = d.shop || '';
    state.doc = { list: d.list, i: 0, shownBy: d.shownBy || null };
    state.mode = 'doc';
    $('doc').classList.remove('hidden');
    renderDoc();
}

function closeDoc(notifyLua = true) {
    if (state.mode !== 'doc') return;
    state.mode = null;
    state.doc = null;
    $('doc').classList.add('hidden');
    if (notifyLua) post('closeDoc');
}

function pageDoc(step) {
    const doc = state.doc;
    if (!doc) return;
    const i = Math.max(0, Math.min(doc.list.length - 1, doc.i + step));
    if (i === doc.i) return;
    doc.i = i;
    renderDoc();
}

$('doc-prev').addEventListener('click', () => pageDoc(-1));
$('doc-next').addEventListener('click', () => pageDoc(1));
$('doc-close').addEventListener('click', () => closeDoc());
$('doc-show').addEventListener('click', async () => {
    const c = state.doc && state.doc.list[state.doc.i];
    if (!c) return;
    const res = await post('showDoc', { id: c.id });
    if (!res || !res.ok) notify('No hay nadie lo bastante cerca.', 'error');
});

// ---------------------------------------------------------------------
// Pantallas
// ---------------------------------------------------------------------

function showChat() {
    state.mode = 'chat';
    setRot(0);
    $('catalog').classList.add('hidden');
    $('chat').classList.remove('hidden');
}

function openCatalog(model) {
    state.mode = 'catalog';
    clearInterval(typeTimer);
    typeDone = null;
    $('chat').classList.add('hidden');
    $('catalog').classList.remove('hidden');

    // Sin coche elegido no hay panel de la derecha ni coche en la exposición
    state.selected = null;
    resetBuy();
    $('detail').classList.add('hidden');
    post('mode', { mode: 'catalog' });

    const v = model && state.byModel[model];
    if (v) {
        // Venir desde un consejo: abrir directamente su categoría y quitar la búsqueda
        state.search = '';
        $('search').value = '';
        setView('list', String(v.class));
    } else {
        setView(state.view || 'cats');
    }
    renderColors();
    if (v) select(model, true);
}

function close() {
    clearInterval(typeTimer);
    typeDone = null;
    setRot(0);
    state.mode = null;
    $('chat').classList.add('hidden');
    $('catalog').classList.add('hidden');
    post('close');
}

window.addEventListener('message', (e) => {
    const d = e.data || {};
    switch (d.action) {
        case 'showPrompt':
            showPrompt(d.label);
            break;
        case 'hidePrompt':
            hidePrompt();
            break;
        case 'notify':
            notify(d.text, d.kind);
            break;
        case 'loading':
            $('loading').classList.toggle('hidden', !d.state);
            break;
        case 'open':
            if (d.catalog) prepareCatalog(d.catalog);
            state.view = 'cats';
            state.shop = d.shop;
            state.npc = d.npc;
            state.player = d.player;
            state.colors = d.colors || [];
            if (state.color === null && state.colors.length) state.color = state.colors[0].id;
            state.buying = false;
            $('shop-name').textContent = d.shop;
            $('cat-shop').textContent = d.shop;
            $('npc-name').textContent = d.npc.name;
            $('npc-role').textContent = d.npc.role;
            $('npc-initial').textContent = d.npc.name.charAt(0);
            $('back-name').textContent = d.npc.name;
            hidePrompt();
            showChat();
            greet();
            break;
        case 'reset':
            clearInterval(typeTimer);
            typeDone = null;
            state.mode = null;
            state.buying = false;
            setRot(0);
            $('chat').classList.add('hidden');
            $('catalog').classList.add('hidden');
            $('loading').classList.add('hidden');
            break;
        case 'purchased':
            purchasedToast(d);
            break;
        case 'document':
            openDoc(d);
            break;
        case 'closeDocument':
            closeDoc(false);
            break;
    }
});

window.addEventListener('keydown', (e) => {
    if (!state.mode) return;
    if (state.mode === 'doc') {
        if (e.key === 'Escape' || e.key === 'Backspace') closeDoc();
        else if (e.key === 'ArrowLeft') pageDoc(-1);
        else if (e.key === 'ArrowRight') pageDoc(1);
        return;
    }
    if (e.key === 'Escape') {
        close();
        return;
    }
    const typing = document.activeElement === $('search');

    if (state.mode === 'chat') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= currentOptions.length && !typeDone) currentOptions[n - 1].run();
        else if ((e.key === ' ' || e.key === 'Enter') && typeDone) typeDone();
        return;
    }

    if (typing) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') $('search').blur();
        return;
    }
    const k = e.key.toLowerCase();
    if (e.key === 'Backspace' && state.view === 'list') setView('cats');
    else if (k === 'a') setRot(1);
    else if (k === 'd') setRot(-1);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = visible.findIndex((v) => v.model === state.selected);
        const next = visible[Math.max(0, Math.min(visible.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (next) select(next.model);
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if ((k === 'a' && rotDir === 1) || (k === 'd' && rotDir === -1)) setRot(0);
});

window.addEventListener('blur', () => setRot(0));
