const $ = (id) => document.getElementById(id);
const speedo = $('speedo');

let cfg = { kmh: true, lowFuel: 15 };
let hideTimer = null;

// La velocidad se anima suave hacia el valor real
let shownSpeed = 0;
let targetSpeed = 0;
function tick() {
    shownSpeed += (targetSpeed - shownSpeed) * 0.25;
    if (Math.abs(targetSpeed - shownSpeed) < 0.5) shownSpeed = targetSpeed;
    $('speed').textContent = Math.round(shownSpeed);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

function setText(id, text, anim) {
    const el = $(id);
    if (el.textContent === text) return;
    el.textContent = text;
    if (anim) restart(el, anim);
}

let lastGear = null;
let lastHigh = 0;
let lastEngine = null;

function stateText(d) {
    if (!d.running) return 'Motor apagado';
    if (d.gear === 'R' && d.speed >= 1) return 'Marcha atrás';
    if (d.speed >= (cfg.kmh ? 160 : 100)) return 'Alta velocidad';
    return '';
}

function update(d) {
    targetSpeed = d.speed;
    speedo.classList.toggle('off', !d.running);

    setText('state', stateText(d), 'swap');

    // sin cinturón y en marcha: el aviso se pone más serio
    $('belt').classList.toggle('danger', beltAvailable && !belted && d.speed >= (cfg.kmh ? 30 : 20));

    // Línea de velocidad (sobre 240 km/h o 150 mph)
    $('speed-fill').style.width = `${Math.min(100, (d.speed / (cfg.kmh ? 240 : 150)) * 100)}%`;

    // Marcha
    const gear = $('gear');
    if (d.gear !== lastGear) {
        gear.textContent = d.gear;
        gear.classList.toggle('reverse', d.gear === 'R');
        if (lastGear !== null) restart(gear, 'shift');
        lastGear = d.gear;
    }
    const high = Math.max(0, Math.min(10, d.highGear || 0));
    const dots = $('gear-dots');
    if (high !== lastHigh) {
        dots.innerHTML = '<span></span>'.repeat(high);
        lastHigh = high;
    }
    const n = parseInt(d.gear, 10);
    [...dots.children].forEach((s, i) => s.classList.toggle('on', i + 1 === n));

    // Gasolina
    const fuel = Math.max(0, Math.min(100, d.fuel || 0));
    if (d.liters != null) {
        $('liters').textContent = Math.round(d.liters);
        $('fuel-unit').textContent = 'L';
    } else {
        $('liters').textContent = Math.round(fuel);
        $('fuel-unit').textContent = '%';
    }
    $('fuel-fill').style.width = `${fuel}%`;
    $('fuel').classList.toggle('low', fuel <= cfg.lowFuel);

    // Estado del motor
    const engine = $('engine');
    if (d.engine !== lastEngine) {
        engine.classList.remove('good', 'regular', 'broken');
        engine.classList.add(d.engine);
        $('engine-label').textContent = { good: 'Bien', regular: 'Regular', broken: 'Averiado' }[d.engine] || 'Bien';
        if (lastEngine !== null) restart(engine, 'swap');
        lastEngine = d.engine;
    }
    $('engine-pct').textContent = `Motor ${d.health}%`;
}

// ---------- Cinturón ----------
let belted = false;
let beltAvailable = true;
let beltTimer = null;
const beltRow = $('belt-row');
const belt = $('belt');

function renderBelt(text) {
    belt.classList.toggle('on', belted);
    $('belt-text').textContent = text || (belted ? 'Cinturón puesto' : 'Ponte el cinturón');
}

function setBelt(state, animate) {
    clearTimeout(beltTimer);
    belted = state;
    renderBelt();
    if (belted) belt.classList.remove('danger');
    if (!beltAvailable) return;
    if (belted) {
        // se ve la correa abrochándose y luego el aviso se pliega
        beltRow.classList.remove('collapsed');
        beltTimer = setTimeout(() => beltRow.classList.add('collapsed'), animate ? 1600 : 0);
    } else {
        beltRow.classList.remove('collapsed');
    }
}

function setBeltAvailable(available) {
    beltAvailable = available;
    belted = false;
    clearTimeout(beltTimer);
    renderBelt();
    beltRow.classList.toggle('collapsed', !available);
}

// Intentar bajarte con el cinturón puesto
function beltNudge() {
    clearTimeout(beltTimer);
    renderBelt('Quítate el cinturón para bajar');
    belt.classList.remove('on');
    beltRow.classList.remove('collapsed');
    restart(belt, 'nudge');
    beltTimer = setTimeout(() => {
        renderBelt();
        if (belted) beltRow.classList.add('collapsed');
    }, 2000);
}

function show() {
    clearTimeout(hideTimer);
    if (!speedo.classList.contains('hidden') && !speedo.classList.contains('out')) return;
    speedo.classList.remove('hidden', 'out');
    lastGear = null;
    lastEngine = null;
    shownSpeed = 0;
}

function hide() {
    if (speedo.classList.contains('hidden')) return;
    speedo.classList.add('out');
    hideTimer = setTimeout(() => {
        speedo.classList.add('hidden');
        speedo.classList.remove('out');
    }, 350);
}

window.addEventListener('message', (e) => {
    const d = e.data;
    switch (d.action) {
        case 'config':
            cfg = { kmh: d.kmh !== false, lowFuel: d.lowFuel || 15 };
            $('unit').textContent = cfg.kmh ? 'km/h' : 'mph';
            if (d.beltKey) $('belt-key').textContent = String(d.beltKey).toUpperCase();
            break;
        case 'belt': setBelt(!!d.belted, d.animate); break;
        case 'beltAvailable': setBeltAvailable(!!d.available); break;
        case 'beltNudge': beltNudge(); break;
        case 'update': update(d); break;
        case 'show': show(); break;
        case 'hide': hide(); break;
    }
});
