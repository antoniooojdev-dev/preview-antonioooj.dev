// Escena del velocímetro: un coche que se conduce de verdad (física sencilla) y manda a la NUI
// de my_speedo lo mismo que el cliente Lua: velocidad, marcha, gasolina, motor y cinturón.
(function () {
    const MAX = 210; // km/h
    const TANK = 65;
    const GEARS = [0, 22, 48, 78, 112, 150]; // a partir de qué velocidad entra cada marcha

    const S = {
        speed: 0,
        running: true,
        health: 100,
        liters: 41,
        belted: false,
        inCar: true,
        ejected: false,
        z: 0, // distancia recorrida (para la carretera)
        shake: 0,
        keys: {},
    };

    Scene.root.innerHTML = '<canvas id="road" width="1920" height="1080"></canvas><div class="flash" id="flash"></div>';
    const cv = document.getElementById('road');
    const g = cv.getContext('2d');

    // Edificios del horizonte (fijos)
    const skyline = [];
    for (let x = 0; x < 1920; ) {
        const w = 40 + Math.random() * 110;
        skyline.push({ x, w, h: 60 + Math.random() * 230, lights: Math.random() });
        x += w + Math.random() * 10;
    }
    const stars = Array.from({ length: 80 }, () => ({ x: Math.random() * 1920, y: Math.random() * 330, r: Math.random() * 1.3 + 0.3 }));

    const H = 520; // horizonte
    const F = (1080 - H) * 4; // y = H + F / d
    const W = 3800; // medio ancho de la calzada * d
    const proj = (d) => ({ y: H + F / d, half: W / d });

    function draw(dt) {
        const sh = S.shake > 0 ? (Math.random() - 0.5) * S.shake * 30 : 0;
        g.setTransform(1, 0, 0, 1, sh, sh * 0.6);

        // cielo
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#05070f');
        sky.addColorStop(0.7, '#141a2c');
        sky.addColorStop(1, '#2a2338');
        g.fillStyle = sky;
        g.fillRect(-40, -40, 2000, H + 40);
        g.fillStyle = '#fff';
        for (const s of stars) {
            g.globalAlpha = 0.5;
            g.beginPath();
            g.arc(s.x, s.y, s.r, 0, 7);
            g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = '#e8e4d6';
        g.beginPath();
        g.arc(1560, 140, 46, 0, 7);
        g.fill();

        // ciudad
        for (const b of skyline) {
            g.fillStyle = '#0d1020';
            g.fillRect(b.x, H - b.h, b.w, b.h);
            g.fillStyle = 'rgba(245,212,138,.55)';
            for (let yy = H - b.h + 12; yy < H - 10; yy += 18) {
                for (let xx = b.x + 8; xx < b.x + b.w - 8; xx += 16) {
                    if (((xx * 7 + yy * 13) % 10) / 10 < b.lights * 0.5) g.fillRect(xx, yy, 5, 7);
                }
            }
        }
        const glow = g.createLinearGradient(0, H - 80, 0, H);
        glow.addColorStop(0, 'rgba(255,140,80,0)');
        glow.addColorStop(1, 'rgba(255,140,80,.18)');
        g.fillStyle = glow;
        g.fillRect(0, H - 80, 1920, 80);

        // suelo
        g.fillStyle = '#0c0d10';
        g.fillRect(-40, H, 2000, 1120 - H);

        // calzada
        const near = proj(2.2);
        g.fillStyle = '#1b1c20';
        g.beginPath();
        g.moveTo(960 - 2, H);
        g.lineTo(960 + 2, H);
        g.lineTo(960 + near.half * 1.15, near.y);
        g.lineTo(960 - near.half * 1.15, near.y);
        g.fill();

        // líneas de los bordes
        g.strokeStyle = 'rgba(255,255,255,.55)';
        g.lineWidth = 5;
        for (const side of [-1, 1]) {
            g.beginPath();
            g.moveTo(960 + side * 2, H);
            g.lineTo(960 + side * near.half * 1.05, near.y);
            g.stroke();
        }

        // discontinuas del centro (se mueven con la distancia)
        const dash = 14;
        const off = ((S.z % dash) + dash) % dash;
        g.fillStyle = '#e9d27a';
        for (let k = 0; k < 18; k++) {
            const d1 = k * dash - off + 2.5;
            const d2 = d1 + 6;
            if (d2 < 2.4) continue;
            const a = proj(Math.max(2.4, d1));
            const b = proj(d2);
            const wa = a.half * 0.025;
            const wb = b.half * 0.025;
            g.beginPath();
            g.moveTo(960 - wa, a.y);
            g.lineTo(960 + wa, a.y);
            g.lineTo(960 + wb, b.y);
            g.lineTo(960 - wb, b.y);
            g.fill();
        }

        // farolas
        const lampGap = 45;
        const loff = ((S.z % lampGap) + lampGap) % lampGap;
        for (let k = 12; k >= 0; k--) {
            const d = k * lampGap - loff + 6;
            if (d < 3) continue;
            const p = proj(d);
            for (const side of [-1, 1]) {
                const x = 960 + side * p.half * 1.45;
                const top = p.y - 2600 / d;
                g.strokeStyle = '#2a2c33';
                g.lineWidth = Math.max(1.5, 90 / d);
                g.beginPath();
                g.moveTo(x, p.y);
                g.lineTo(x, top);
                g.lineTo(x - side * 260 / d, top);
                g.stroke();
                const lx = x - side * 260 / d;
                const r = Math.max(3, 420 / d);
                const lg = g.createRadialGradient(lx, top, 0, lx, top, r * 2.4);
                lg.addColorStop(0, 'rgba(255,240,205,.95)');
                lg.addColorStop(0.25, 'rgba(255,236,190,.35)');
                lg.addColorStop(1, 'rgba(255,236,190,0)');
                g.fillStyle = lg;
                g.beginPath();
                g.arc(lx, top, r * 2.4, 0, 7);
                g.fill();
                // charco de luz en el suelo
                const pool = g.createRadialGradient(lx, p.y, 0, lx, p.y, p.half * 0.5);
                pool.addColorStop(0, 'rgba(255,236,190,.10)');
                pool.addColorStop(1, 'rgba(255,236,190,0)');
                g.fillStyle = pool;
                g.beginPath();
                g.ellipse(lx, p.y, p.half * 0.5, p.half * 0.12, 0, 0, 7);
                g.fill();
            }
        }

        // faros del coche sobre el asfalto
        if (S.running && S.inCar) {
            const hl = g.createRadialGradient(960, 1080, 40, 960, 820, 700);
            hl.addColorStop(0, 'rgba(255,250,235,.20)');
            hl.addColorStop(1, 'rgba(255,250,235,0)');
            g.fillStyle = hl;
            g.fillRect(0, H, 1920, 1080 - H);
        }

        // rayas de velocidad
        const v = Math.abs(S.speed);
        if (v > 110) {
            g.strokeStyle = `rgba(255,255,255,${Math.min(0.18, (v - 110) / 500)})`;
            g.lineWidth = 2;
            for (let i = 0; i < 26; i++) {
                const a = Math.random() * Math.PI * 2;
                const r1 = 380 + Math.random() * 300;
                const r2 = r1 + 120 + v;
                g.beginPath();
                g.moveTo(960 + Math.cos(a) * r1, 560 + Math.sin(a) * r1 * 0.6);
                g.lineTo(960 + Math.cos(a) * r2, 560 + Math.sin(a) * r2 * 0.6);
                g.stroke();
            }
        }

        // salpicadero
        const dashG = g.createLinearGradient(0, 960, 0, 1080);
        dashG.addColorStop(0, 'rgba(0,0,0,0)');
        dashG.addColorStop(1, 'rgba(0,0,0,.75)');
        g.fillStyle = dashG;
        g.fillRect(-40, 960, 2000, 160);
    }

    // ---------------------------------------------------------------
    // Coche
    // ---------------------------------------------------------------
    const engineState = () => (S.health >= 70 ? 'good' : S.health >= 35 ? 'regular' : 'broken');

    function gear() {
        if (!S.running) return 'N';
        if (S.speed < -0.5) return 'R';
        if (Math.abs(S.speed) < 1 && !S.keys.KeyW) return 'N';
        let n = 1;
        GEARS.forEach((min, i) => {
            if (S.speed >= min) n = i + 1;
        });
        return String(n);
    }

    function send() {
        NUI.send({
            action: 'update',
            speed: Math.round(Math.abs(S.speed)),
            gear: gear(),
            highGear: 6,
            running: S.running,
            fuel: (S.liters / TANK) * 100,
            liters: S.liters,
            engine: engineState(),
            health: Math.round(S.health),
        });
    }

    let last = performance.now();
    let sendAt = 0;
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const k = S.keys;
        const canDrive = S.inCar && S.running && S.liters > 0;

        if (k.KeyW && canDrive) {
            if (S.speed < -0.5) S.speed += 70 * dt;
            else S.speed += 30 * Math.pow(1 - Math.max(0, S.speed) / MAX, 1.15) * dt * 1.6;
        }
        if (k.KeyS && S.inCar) {
            if (S.speed > 0.5) S.speed -= 75 * dt;
            else if (canDrive) S.speed = Math.max(-28, S.speed - 14 * dt);
        }
        if (!k.KeyW && !k.KeyS) {
            const drag = (5 + Math.abs(S.speed) * 0.025) * dt;
            S.speed = Math.abs(S.speed) <= drag ? 0 : S.speed - Math.sign(S.speed) * drag;
        }

        // gasolina
        if (S.running && S.inCar) {
            S.liters = Math.max(0, S.liters - (0.02 + (k.KeyW ? 0.35 : 0) * (0.4 + Math.abs(S.speed) / MAX)) * dt);
            if (S.liters <= 0 && S.running) {
                S.running = false;
                Scene.notify('Te has quedado sin gasolina. Pulsa G para llenar el depósito.', 'error', 'fa-gas-pump');
            }
        }

        S.z += (S.speed / 3.6) * dt;
        S.shake = Math.max(0, S.shake - dt * 1.8);
        draw(dt);
        if (S.inCar && now >= sendAt) {
            sendAt = now + 33;
            send();
        }
        requestAnimationFrame(frame);
    }

    // ---------------------------------------------------------------
    // Acciones
    // ---------------------------------------------------------------
    function toggleBelt() {
        if (!S.inCar || S.ejected) return;
        S.belted = !S.belted;
        NUI.send({ action: 'belt', belted: S.belted, animate: true });
    }

    function toggleEngine() {
        if (!S.inCar || S.ejected) return;
        if (!S.running && S.liters <= 0) return Scene.notify('No arranca: el depósito está vacío.', 'error', 'fa-gas-pump');
        if (!S.running && S.health < 10) return Scene.notify('El motor está demasiado dañado para arrancar.', 'error', 'fa-wrench');
        S.running = !S.running;
        Scene.notify(S.running ? 'Motor encendido' : 'Motor apagado', 'info', 'fa-key');
    }

    let exitEl = null;
    function exitOrEnter() {
        if (S.ejected) return;
        if (!S.inCar) {
            exitEl && exitEl.remove();
            exitEl = null;
            S.inCar = true;
            NUI.send({ action: 'show' });
            NUI.send({ action: 'beltAvailable', available: true });
            S.belted = false;
            return;
        }
        if (S.belted) return NUI.send({ action: 'beltNudge' }); // con el cinturón puesto no se baja
        if (Math.abs(S.speed) > 6) return Scene.notify('Para el coche antes de bajarte.', 'error', 'fa-hand');
        S.inCar = false;
        S.speed = 0;
        NUI.send({ action: 'hide' });
        exitEl = document.createElement('div');
        exitEl.className = 'sc-exit';
        exitEl.innerHTML = '<i class="fa-solid fa-car-side"></i> Pulsa <kbd>F</kbd> para subir al coche';
        exitEl.addEventListener('click', exitOrEnter);
        document.body.appendChild(exitEl);
    }

    function crash() {
        if (!S.inCar || S.ejected) return;
        const v = Math.abs(S.speed);
        const flash = document.getElementById('flash');
        flash.classList.remove('go');
        void flash.offsetWidth;
        flash.classList.add('go');
        if (v < 15) {
            S.health = Math.max(0, S.health - 4);
            S.shake = 0.3;
            return Scene.notify('Solo ha sido un roce.', 'info', 'fa-car-burst');
        }
        const dmg = Math.min(65, v * 0.38);
        S.health = Math.max(0, S.health - dmg);
        S.shake = 1;
        // Sin cinturón y a más de 55 km/h: sales despedido por el parabrisas
        if (v > 55 && !S.belted) {
            S.ejected = true;
            S.speed = 0;
            NUI.send({ action: 'hide' });
            const ov = document.createElement('div');
            ov.className = 'eject';
            ov.innerHTML = `<div><b>¡Has salido despedido!</b><span>Ibas a ${Math.round(v)} km/h sin el cinturón puesto.</span></div>`;
            document.body.appendChild(ov);
            setTimeout(() => {
                ov.remove();
                S.ejected = false;
                NUI.send({ action: 'show' });
                NUI.send({ action: 'beltAvailable', available: true });
                S.belted = false;
            }, 2800);
            return;
        }
        S.speed *= 0.12;
        if (S.health < 10) {
            S.running = false;
            Scene.notify('El motor se ha calado: está destrozado.', 'error', 'fa-wrench');
        } else {
            Scene.notify(`Golpe a ${Math.round(v)} km/h${S.belted ? ', el cinturón te ha salvado' : ''}. Motor al ${Math.round(S.health)} %.`, S.belted ? 'info' : 'error', 'fa-car-burst');
        }
    }

    function refill() {
        S.liters = TANK;
        S.health = 100;
        if (!S.running && S.inCar) S.running = true;
        Scene.notify('Depósito lleno y motor reparado (atajo de la demo).', 'success', 'fa-gas-pump');
    }

    document.addEventListener('keydown', (e) => {
        const code = e.code || (e.key === 'ArrowUp' ? 'KeyW' : '');
        const map = { ArrowUp: 'KeyW', ArrowDown: 'KeyS' };
        const c = map[code] || code;
        if (['KeyW', 'KeyS'].includes(c)) {
            S.keys[c] = true;
            e.preventDefault();
            return;
        }
        if (e.repeat) return;
        if (c === 'KeyB') toggleBelt();
        else if (c === 'KeyE') toggleEngine();
        else if (c === 'KeyF') exitOrEnter();
        else if (c === 'KeyC') crash();
        else if (c === 'KeyG') refill();
    });
    document.addEventListener('keyup', (e) => {
        const map = { ArrowUp: 'KeyW', ArrowDown: 'KeyS' };
        S.keys[map[e.code] || e.code] = false;
    });
    window.addEventListener('blur', () => (S.keys = {}));

    Scene.keys('Conducir', [
        { key: 'W', code: 'KeyW', label: 'Acelerar' },
        { key: 'S', code: 'KeyS', label: 'Frenar / marcha atrás' },
        { key: 'B', code: 'KeyB', label: 'Cinturón' },
        { key: 'C', code: 'KeyC', label: 'Chocar' },
        { key: 'F', code: 'KeyF', label: 'Bajarse / subir' },
        { key: 'E', code: 'KeyE', label: 'Motor' },
        { key: 'G', code: 'KeyG', label: 'Llenar y reparar' },
    ]);

    window.SCENE = {
        reset() {
            Object.assign(S, { speed: 0, running: true, health: 100, liters: 41, belted: false, inCar: true, ejected: false, keys: {} });
            exitEl && exitEl.remove();
            exitEl = null;
            NUI.send({ action: 'config', kmh: true, lowFuel: 15, beltKey: 'B' });
            NUI.send({ action: 'show' });
            NUI.send({ action: 'beltAvailable', available: true });
        },
        state: S,
        crash,
        toggleBelt,
    };
    SCENE.reset();
    requestAnimationFrame(frame);
})();
