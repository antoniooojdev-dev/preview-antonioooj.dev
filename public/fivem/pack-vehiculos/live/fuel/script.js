const resource = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'my_fuel';

const post = (name, data = {}) =>
    fetch(`https://${resource}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    })
        .then((r) => r.json())
        .catch(() => ({}));

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n, dec = 0) => {
    const [i, d] = Number(n || 0).toFixed(dec).split('.');
    return '$' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '');
};

function animateOut(el, ms, after) {
    el.classList.add('out');
    setTimeout(() => {
        el.classList.remove('out');
        after();
    }, ms);
}
function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

// ---------- Aviso de arriba ----------
const prompt = $('prompt');
let promptTimer = null;

function showPrompt(d) {
    clearTimeout(promptTimer);
    $('prompt-press').classList.toggle('hidden', !d.key);
    $('prompt-key').textContent = d.key || 'E';
    $('prompt-verb').textContent = d.verb || '';
    $('prompt-label').textContent = d.label || '';
    $('prompt-icon').className = `fa-solid ${/^fa-[a-z0-9-]+$/.test(d.icon || '') ? d.icon : 'fa-gas-pump'}`;
    prompt.classList.remove('out', 'hidden');
    restart(prompt, 'swap');
}
function hidePrompt() {
    if (prompt.classList.contains('hidden')) return;
    prompt.classList.add('out');
    promptTimer = setTimeout(() => prompt.classList.add('hidden'), 220);
}

// ---------- Notificaciones ----------
function notify({ title, text, kind = 'info', time = 5000 }) {
    const el = document.createElement('div');
    el.className = `notif ${kind}`;
    el.innerHTML = `
        <div class="notif-icon"><i class="fa-solid ${kind === 'error' ? 'fa-xmark' : 'fa-gas-pump'}"></i></div>
        <div><div class="notif-title">${escapeHtml(title)}</div><div class="notif-text">${escapeHtml(text)}</div></div>
        <div class="notif-timer" style="animation-duration:${time}ms"></div>`;
    const list = $('notifs');
    list.appendChild(el);
    while (list.children.length > 3) list.firstElementChild.remove();
    setTimeout(() => animateOut(el, 300, () => el.remove()), time);
}

function toast({ liters, cost, method, partial }) {
    const time = 6500;
    const bank = method === 'bank';
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
        <div class="toast-top">
            <span class="toast-badge"><i class="fa-solid fa-gas-pump"></i></span>
            <div class="toast-head">
                <span class="toast-kicker">${partial ? 'Repostaje detenido' : 'Repostaje completado'}</span>
                <span class="toast-title">${partial ? 'Has parado de repostar' : 'Depósito repostado'}</span>
            </div>
        </div>
        <div class="toast-receipt">
            <span class="tchip"><i class="fa-solid fa-droplet"></i>${Number(liters || 0).toFixed(1).replace('.', ',')} L</span>
            <span class="tchip"><i class="fa-solid ${bank ? 'fa-credit-card' : 'fa-money-bill-wave'}"></i>${bank ? 'Tarjeta' : 'Efectivo'}</span>
            <span class="toast-amount">-${money(cost)}</span>
        </div>
        <div class="toast-timer" style="animation-duration:${time}ms"></div>`;
    const list = $('toasts');
    list.appendChild(el);
    while (list.children.length > 2) list.firstElementChild.remove();
    setTimeout(() => animateOut(el, 350, () => el.remove()), time);
}

// ---------- Menú del surtidor ----------
const menu = $('menu');
const input = $('liters');
let st = null; // { tank, current, price, cash, bank }
let liters = 0;
let method = 'money';
let fullMode = false;
let paying = false;

const free = () => Math.max(0, Math.floor((st.tank - st.current) * 10) / 10);
const cost = () => Math.ceil(liters * st.price);
const fmtL = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

function setLiters(n, fromFull = false) {
    liters = Math.max(0, Math.min(free(), Math.round((Number(n) || 0) * 10) / 10));
    fullMode = fromFull || (liters > 0 && liters >= free());
    render();
}

function render() {
    if (!st) return;
    const cap = st.tank || 1;
    const nowPct = (st.current / cap) * 100;
    const addPct = (liters / cap) * 100;

    $('tank-now').textContent = fmtL(st.current);
    $('tank-cap').textContent = Math.round(st.tank);
    $('tank-fill').style.width = `${nowPct}%`;
    $('tank-add').style.width = `${addPct}%`;
    $('pct-now').textContent = `${Math.round(nowPct)}%`;
    $('pct-after').textContent = `${Math.round(Math.min(100, nowPct + addPct))}%`;

    if (document.activeElement !== input) input.value = fmtL(liters);

    document.querySelectorAll('.chip').forEach((c) => {
        const l = c.dataset.l;
        c.classList.toggle('active', l === 'full' ? fullMode : !fullMode && Number(l) === liters);
        c.disabled = free() <= 0 || (l !== 'full' && Number(l) > free());
    });
    document.querySelectorAll('.step').forEach((b) => {
        b.disabled = b.dataset.step < 0 ? liters <= 0 : liters >= free();
    });

    const total = cost();
    const totalEl = $('total');
    const txt = money(total);
    if (totalEl.textContent !== txt) {
        totalEl.textContent = txt;
        restart(totalEl, 'bump');
    }

    // forma de pago: sin saldo se marca en rojo
    const balance = { money: st.cash, bank: st.bank };
    document.querySelectorAll('.pay-opt').forEach((o) => {
        o.classList.toggle('active', o.dataset.m === method);
        o.classList.toggle('poor', balance[o.dataset.m] < total);
    });
    const short = balance[method] < total;
    totalEl.classList.toggle('short', short);

    const btn = $('confirm');
    btn.disabled = paying || liters < 0.1 || short;
    if (!paying) {
        btn.innerHTML = free() <= 0
            ? '<i class="fa-solid fa-gas-pump"></i> Depósito lleno'
            : short
                ? '<i class="fa-solid fa-xmark"></i> Saldo insuficiente'
                : '<i class="fa-solid fa-check"></i> Confirmar pago';
    }
}

function openMenu(d) {
    st = { tank: d.tank, current: d.current, price: d.price, cash: d.cash, bank: d.bank };
    paying = false;
    method = d.cash >= Math.ceil(free() * d.price) || d.cash >= d.bank ? 'money' : 'bank';
    $('price-l').textContent = money(d.price, 2);
    $('cash').textContent = money(d.cash);
    $('bank').textContent = money(d.bank);
    menu.classList.remove('hidden', 'out');
    hidePrompt();
    setLiters(free(), true); // por defecto: lleno
}

function closeMenuUI() {
    if (menu.classList.contains('hidden')) return;
    animateOut(menu, 300, () => menu.classList.add('hidden'));
    st = null;
}

// Litros: botones (mantener = más rápido), atajos y escribir
let holdTimer = null;
const stopHold = () => clearTimeout(holdTimer);
document.querySelectorAll('.step').forEach((b) =>
    b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !st) return;
        e.preventDefault();
        const dir = Number(b.dataset.step);
        stopHold();
        setLiters(liters + dir);
        let delay = 140;
        const repeat = () => {
            const before = liters;
            setLiters(liters + dir);
            if (liters === before) return stopHold();
            delay = Math.max(30, delay * 0.86);
            holdTimer = setTimeout(repeat, delay);
        };
        holdTimer = setTimeout(repeat, 380);
    })
);
window.addEventListener('pointerup', stopHold);

document.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => {
        if (!st) return;
        if (c.dataset.l === 'full') setLiters(free(), true);
        else setLiters(Number(c.dataset.l));
    })
);

document.querySelector('.value').addEventListener('click', () => {
    input.focus();
    input.select();
});
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    else if (e.key.length === 1 && !/[0-9.,]/.test(e.key) && !e.ctrlKey) e.preventDefault();
});
input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9.,]/g, '');
});
input.addEventListener('change', () => {
    setLiters(parseFloat(input.value.replace(',', '.')));
});
input.addEventListener('blur', () => render());

document.querySelectorAll('.pay-opt').forEach((o) =>
    o.addEventListener('click', () => {
        method = o.dataset.m;
        render();
    })
);

$('confirm').addEventListener('click', () => {
    if (!st || paying) return;
    paying = true;
    const btn = $('confirm');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch"></i> Pagando...';

    post('pay', { liters, method }).then((r) => {
        paying = false;
        btn.classList.remove('loading');
        if (r.ok) return; // Lua cierra el menú y empieza a repostar
        if (r.reason === 'money') notify({ title: 'Pago rechazado', text: `Necesitas ${money(r.cost)} ${method === 'bank' ? 'en el banco' : 'en efectivo'}.`, kind: 'error' });
        else if (r.reason === 'full') notify({ title: 'Depósito lleno', text: 'No cabe más gasolina.', kind: 'error' });
        else notify({ title: 'Algo ha fallado', text: 'No se ha podido completar el pago.', kind: 'error' });
        render();
    });
});

$('close').addEventListener('click', () => post('close'));
$('unplug').addEventListener('click', () => post('unplug'));
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !st) return;
    if (document.activeElement === input) input.blur();
    else post('close');
});

// ---------- Repostando ----------
const filling = $('filling');
let fill = null;

function fillStart(d) {
    fill = d;
    $('fill-target').textContent = fmtL(d.target);
    filling.classList.remove('hidden', 'out');
    fillTick({ added: 0 });
}
function fillTick({ added }) {
    if (!fill) return;
    $('fill-now').textContent = fmtL(added);
    $('fill-bar').style.width = `${Math.min(100, (added / fill.target) * 100)}%`;
    $('fill-cost').textContent = money(added * fill.price, 2);
}
function fillEnd() {
    fill = null;
    if (!filling.classList.contains('hidden')) animateOut(filling, 300, () => filling.classList.add('hidden'));
}

// ---------- Mensajes desde Lua ----------
window.addEventListener('message', (e) => {
    const d = e.data;
    switch (d.action) {
        case 'prompt': showPrompt(d); break;
        case 'hidePrompt': hidePrompt(); break;
        case 'notify': notify(d); break;
        case 'toast': toast(d); break;
        case 'open': openMenu(d); break;
        case 'close': closeMenuUI(); break;
        case 'fillStart': fillStart(d); break;
        case 'fillTick': fillTick(d); break;
        case 'fillEnd': fillEnd(); break;
    }
});
