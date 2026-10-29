// Escena de la gasolinera: hace de cliente Lua de my_fuel (coger la manguera, enchufarla,
// pagar, repostar a ritmo real, detener con X, quitarla y dejarla) sobre la NUI original.
(function () {
    const TANK = 65;
    const PRICE = 2;
    const RATE = 7; // L/s (en el servidor es 3,5; aquí va el doble para no esperar tanto)

    const POS = {
        holster: { x: 470, y: 640 },
        hoseBase: { x: 452, y: 780 },
        hand: { x: 585, y: 600 },
        cap: { x: 1352, y: 640 },
    };

    const S = {
        hose: 'idle', // idle | holding | plugged | filling
        fromCar: false, // la manguera en la mano viene del coche (toca dejarla)
        filled: false,
        menu: false,
        current: 14.2,
        fill: null,
    };

    // ---------------------------------------------------------------
    // Mundo
    // ---------------------------------------------------------------
    function skylineSvg() {
        let out = '';
        for (let x = 0; x < 1920; ) {
            const w = 50 + Math.random() * 110;
            const h = 70 + Math.random() * 230;
            const top = 640 - h;
            out += `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#0f1220"/>`;
            for (let yy = top + 14; yy < 630; yy += 20) {
                for (let xx = x + 9; xx < x + w - 9; xx += 16) {
                    if (Math.random() < 0.28) out += `<rect x="${xx.toFixed(0)}" y="${yy.toFixed(0)}" width="5" height="7" fill="#f5d48a" opacity=".55"/>`;
                }
            }
            x += w + Math.random() * 8;
        }
        return out;
    }

    const root = Scene.root;
    root.innerHTML = `
    <svg class="world" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#070a14"/><stop offset=".55" stop-color="#151b2e"/><stop offset="1" stop-color="#262033"/>
            </linearGradient>
            <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#1c1d22"/><stop offset="1" stop-color="#0d0e11"/>
            </linearGradient>
            <radialGradient id="pool" cx=".5" cy=".5" r=".5">
                <stop offset="0" stop-color="#fff6dc" stop-opacity=".22"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff8e6" stop-opacity=".26"/><stop offset="1" stop-color="#fff8e6" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="pumpBody" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#2a2c32"/><stop offset=".5" stop-color="#3a3d45"/><stop offset="1" stop-color="#202227"/>
            </linearGradient>
        </defs>

        <rect width="1920" height="1080" fill="url(#sky)"/>
        ${Array.from({ length: 70 }, () => `<circle cx="${Math.random() * 1920}" cy="${Math.random() * 380}" r="${Math.random() * 1.4 + 0.3}" fill="#fff" opacity="${Math.random() * 0.6 + 0.15}"/>`).join('')}

        <!-- ciudad al fondo (edificios con sus ventanas encendidas) -->
        ${skylineSvg()}

        <!-- suelo -->
        <rect y="640" width="1920" height="440" fill="url(#ground)"/>
        <ellipse cx="900" cy="860" rx="900" ry="190" fill="url(#pool)"/>
        <path d="M0 1000 L1920 940" stroke="#e8d27a" stroke-width="5" stroke-dasharray="70 50" opacity=".35"/>

        <!-- marquesina -->
        <polygon points="160,205 1560,205 1490,560 230,560" fill="url(#cone)" class="lamp"/>
        <rect x="140" y="96" width="1440" height="96" rx="6" fill="#16181d"/>
        <rect x="140" y="96" width="1440" height="10" fill="#fff" opacity=".9"/>
        <rect x="140" y="178" width="1440" height="14" fill="#c0262d"/>
        <g class="lamp">
            ${[260, 520, 780, 1040, 1300].map((x) => `<rect x="${x}" y="192" width="160" height="9" rx="4" fill="#fffaf0"/>`).join('')}
        </g>
        <text x="860" y="160" text-anchor="middle" font-family="Inter, sans-serif" font-size="46" font-weight="900" letter-spacing="10" fill="#fff">GLOBE OIL</text>
        <rect x="200" y="192" width="26" height="700" fill="#1a1c21"/>
        <rect x="1494" y="192" width="26" height="700" fill="#1a1c21"/>

        <!-- isleta y surtidor -->
        <rect x="250" y="870" width="320" height="34" rx="6" fill="#2c2e34"/>
        <rect x="250" y="866" width="320" height="8" rx="4" fill="#e8d27a" opacity=".6"/>
        <rect x="320" y="470" width="150" height="400" rx="14" fill="url(#pumpBody)"/>
        <rect x="320" y="470" width="150" height="54" rx="14" fill="#c0262d"/>
        <text x="395" y="506" text-anchor="middle" font-family="Inter, sans-serif" font-size="22" font-weight="900" fill="#fff" letter-spacing="3">GLOBE</text>
        <rect x="340" y="546" width="110" height="74" rx="8" fill="#0b0d10" stroke="#3a3d45" stroke-width="2"/>
        <text id="pump-l" x="440" y="578" text-anchor="end" font-family="Consolas, monospace" font-size="24" font-weight="700" fill="#7CFC9A">0,0 L</text>
        <text id="pump-$" x="440" y="606" text-anchor="end" font-family="Consolas, monospace" font-size="20" fill="#7CFC9A" opacity=".8">$0,00</text>
        <rect x="350" y="640" width="90" height="16" rx="4" fill="#0b0d10"/>
        <rect x="350" y="664" width="90" height="16" rx="4" fill="#0b0d10"/>
        <rect x="466" y="610" width="18" height="70" rx="5" fill="#141518"/>
    </svg>
    <div class="car-shadow"></div>
    <img class="car" src="../dealer/cars/sultan.webp" alt="" draggable="false">
    <!-- la manguera va por encima del coche (la boquilla se ve metida en el depósito) -->
    <svg class="world" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style="pointer-events:none">
        <path id="hose" class="hose" d=""/>
        <path id="hose-hi" class="hose-hi" d=""/>
        <path id="drip" class="drip" d="" stroke="#d9c06a" stroke-width="4" stroke-dasharray="6 22" fill="none" opacity="0"/>
        <g id="nozzle" class="nozzle">
            <path d="M-6 -16 h34 a6 6 0 0 1 6 6 v6 h22 v8 h-22 v4 a6 6 0 0 1 -6 6 h-34 z" fill="#1c1d21" stroke="#3a3d45" stroke-width="2"/>
            <path d="M0 8 q8 18 26 16" fill="none" stroke="#3a3d45" stroke-width="5" stroke-linecap="round"/>
            <rect x="-10" y="-14" width="10" height="26" rx="3" fill="#c0262d"/>
        </g>
    </svg>
    <div class="tank-chip" id="tank-chip">
        <i class="fa-solid fa-gas-pump"></i>
        <div><small>Depósito</small><b id="tank-text">0 / 65 L</b><div class="bar"><i id="tank-bar"></i></div></div>
    </div>`;

    const $ = (id) => document.getElementById(id);
    const fmtL = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

    function drawHose() {
        const end = S.hose === 'idle' ? POS.holster : S.hose === 'holding' ? POS.hand : POS.cap;
        const b = POS.hoseBase;
        const sag = S.hose === 'idle' ? 60 : 150;
        const mx = (b.x + end.x) / 2;
        const my = Math.max(b.y, end.y) + sag;
        const d = `M${b.x} ${b.y} Q ${mx} ${my} ${end.x} ${end.y}`;
        $('hose').setAttribute('d', d);
        $('hose-hi').setAttribute('d', d);
        $('drip').setAttribute('d', d);
        $('drip').setAttribute('opacity', S.hose === 'filling' ? '0.9' : '0');
        const rot = S.hose === 'idle' ? 90 : S.hose === 'holding' ? -10 : 200;
        $('nozzle').setAttribute('transform', `translate(${end.x} ${end.y}) rotate(${rot})`);
    }

    function drawTank() {
        $('tank-text').textContent = `${fmtL(S.current)} / ${TANK} L`;
        $('tank-bar').style.width = `${(S.current / TANK) * 100}%`;
        $('tank-chip').classList.toggle('low', S.current / TANK < 0.15);
    }

    function pumpDisplay(l, cost) {
        $('pump-l').textContent = `${fmtL(l)} L`;
        $('pump-$').textContent = `$${(Math.round(cost * 100) / 100).toFixed(2).replace('.', ',')}`;
    }

    // ---------------------------------------------------------------
    // Avisos de arriba (lo que hace setPrompt en Lua)
    // ---------------------------------------------------------------
    function prompt() {
        if (S.menu || S.hose === 'filling') return NUI.send({ action: 'hidePrompt' });
        const p = {
            idle: { key: 'E', verb: 'coger', label: 'la manguera', icon: 'fa-gas-pump' },
            holding: S.fromCar
                ? { key: 'E', verb: 'dejar', label: 'la manguera en el surtidor', icon: 'fa-gas-pump' }
                : { key: 'E', verb: 'enchufar', label: 'la manguera al coche', icon: 'fa-plug' },
            plugged: S.filled
                ? { key: 'E', verb: 'quitar', label: 'la manguera del coche', icon: 'fa-plug' }
                : { key: 'E', verb: 'abrir', label: 'el surtidor', icon: 'fa-gas-pump' },
        }[S.hose];
        NUI.send({ action: 'prompt', ...p });
    }

    function openMenu() {
        S.menu = true;
        NUI.send({ action: 'open', tank: TANK, current: S.current, price: PRICE, cash: Scene.money.cash, bank: Scene.money.bank });
        prompt();
    }

    function closeMenu() {
        if (!S.menu) return;
        S.menu = false;
        NUI.send({ action: 'close' });
        prompt();
    }

    function interact() {
        if (S.menu || S.hose === 'filling') return;
        if (S.hose === 'idle') {
            S.hose = 'holding';
            S.fromCar = false;
        } else if (S.hose === 'holding' && !S.fromCar) {
            S.hose = 'plugged';
            S.filled = false;
            drawHose();
            return openMenu();
        } else if (S.hose === 'holding') {
            S.hose = 'idle';
            // el siguiente coche llega con el depósito bajo, para poder repetir
            setTimeout(() => {
                S.current = 6 + Math.random() * 14;
                drawTank();
                pumpDisplay(0, 0);
            }, 900);
        } else if (S.hose === 'plugged' && S.filled) {
            S.hose = 'holding';
            S.fromCar = true;
        } else if (S.hose === 'plugged') {
            return openMenu();
        }
        drawHose();
        prompt();
    }

    // ---------------------------------------------------------------
    // Callbacks de la NUI (lo que contesta Lua / el servidor)
    // ---------------------------------------------------------------
    NUI.on('close', () => {
        closeMenu();
        return {};
    });

    NUI.on('unplug', () => {
        closeMenu();
        S.hose = 'holding';
        S.fromCar = true;
        drawHose();
        prompt();
        return {};
    });

    NUI.on('pay', ({ liters, method }) => {
        const free = TANK - S.current;
        liters = Math.round(Math.min(Number(liters) || 0, free) * 10) / 10;
        if (liters < 0.1) return { ok: false, reason: 'full' };
        const cost = Math.ceil(liters * PRICE);
        const balance = method === 'bank' ? Scene.money.bank : Scene.money.cash;
        if (balance < cost) return { ok: false, reason: 'money', cost };
        // el servidor cobra por adelantado y luego devuelve lo que no entre
        if (method === 'bank') Scene.wallet(Scene.money.cash, Scene.money.bank - cost);
        else Scene.wallet(Scene.money.cash - cost, Scene.money.bank);
        setTimeout(() => {
            closeMenu();
            startFilling(liters, method, cost);
        }, 450);
        return new Promise((r) => setTimeout(() => r({ ok: true, cost }), 380));
    });

    function startFilling(liters, method, cost) {
        S.hose = 'filling';
        const start = S.current;
        S.fill = { liters, method, cost, start, added: 0, last: performance.now() };
        NUI.send({ action: 'fillStart', target: liters, price: PRICE, start, tank: TANK });
        drawHose();
        prompt();
        requestAnimationFrame(fillLoop);
    }

    function fillLoop(now) {
        const f = S.fill;
        if (!f) return;
        const dt = (now - f.last) / 1000;
        f.last = now;
        f.added = Math.min(f.liters, f.added + RATE * dt);
        S.current = f.start + f.added;
        NUI.send({ action: 'fillTick', added: f.added });
        drawTank();
        pumpDisplay(f.added, f.added * PRICE);
        if (f.added >= f.liters) return finishFilling(false);
        requestAnimationFrame(fillLoop);
    }

    function finishFilling(stopped) {
        const f = S.fill;
        if (!f) return;
        S.fill = null;
        const refund = Math.min(f.cost, Math.floor((f.liters - f.added) * PRICE));
        if (refund > 0) {
            if (f.method === 'bank') Scene.wallet(Scene.money.cash, Scene.money.bank + refund);
            else Scene.wallet(Scene.money.cash + refund, Scene.money.bank);
        }
        NUI.send({ action: 'fillEnd' });
        S.hose = 'plugged';
        S.filled = true;
        drawHose();
        setTimeout(() => {
            NUI.send({ action: 'toast', liters: f.added, cost: f.cost - refund, method: f.method, partial: stopped });
            prompt();
        }, 250);
    }

    // ---------------------------------------------------------------
    // Teclado (en el juego: E = control 38, X = control 73)
    // ---------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.repeat || document.activeElement?.tagName === 'INPUT') return;
        if (e.code === 'KeyE') interact();
        if (e.code === 'KeyX' && S.fill) finishFilling(true);
    });
    // El aviso de arriba también se puede pulsar con el ratón
    document.getElementById('prompt').addEventListener('click', interact);
    document.getElementById('prompt').style.cursor = 'pointer';
    document.getElementById('prompt').style.pointerEvents = 'auto';

    Scene.keys('Controles', [
        { key: 'E', code: 'KeyE', label: 'Interactuar' },
        { key: 'X', code: 'KeyX', label: 'Detener el repostaje' },
        { key: 'ESC', code: 'Escape', keyName: 'Escape', label: 'Cerrar el surtidor' },
    ]);

    window.SCENE = {
        reset() {
            S.fill = null;
            closeMenu();
            NUI.send({ action: 'fillEnd' });
            S.hose = 'idle';
            S.filled = false;
            S.current = 14.2;
            Scene.wallet(1840, 52300);
            drawHose();
            drawTank();
            pumpDisplay(0, 0);
            prompt();
        },
        interact,
        state: S,
    };
    SCENE.reset();
})();
