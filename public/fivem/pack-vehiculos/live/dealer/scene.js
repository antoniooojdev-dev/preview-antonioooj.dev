// Escena del concesionario: hace de cliente Lua de my_dealership. Abre la conversación con
// Marcos, enseña en la plataforma el coche que eliges (con su color, girando y con zoom) y
// "compra" con la misma validación que el servidor (saldo del banco y, si no, efectivo).
(function () {
    const CLASSES = {
        0: 'Compactos', 1: 'Sedanes', 2: 'SUV', 3: 'Coupés', 4: 'Muscle', 5: 'Clásicos', 6: 'Deportivos',
        7: 'Super', 8: 'Motos', 9: 'Todoterreno', 12: 'Furgonetas',
    };
    // modelo, marca, nombre, clase, plazas, velocidad, aceleración, frenada, manejo, precio (el del servidor)
    const RAW = [
        ['zentorno', 'Pegassi', 'Zentorno', 7, 2, 213, 0.36, 1.0, 2.9, 1500000],
        ['t20', 'Progen', 'T20', 7, 2, 214, 0.37, 1.0, 2.85, 300000],
        ['adder', 'Truffade', 'Adder', 7, 2, 220, 0.32, 0.9, 2.7, 900000],
        ['turismor', 'Grotti', 'Turismo R', 7, 2, 210, 0.35, 1.0, 2.8, 350000],
        ['osiris', 'Pegassi', 'Osiris', 7, 2, 210, 0.34, 0.95, 2.75, 160000],
        ['entityxf', 'Överflöd', 'Entity XF', 7, 2, 215, 0.33, 0.95, 2.75, 425000],
        ['infernus', 'Pegassi', 'Infernus', 7, 2, 200, 0.3, 0.9, 2.6, 180000],
        ['cheetah', 'Grotti', 'Cheetah', 7, 2, 205, 0.31, 0.9, 2.65, 375000],
        ['jester', 'Dinka', 'Jester', 6, 2, 195, 0.31, 0.9, 2.6, 65000],
        ['elegy2', 'Annis', 'Elegy RH8', 6, 2, 192, 0.3, 0.85, 2.55, 38500],
        ['comet2', 'Pfister', 'Comet', 6, 2, 195, 0.3, 0.9, 2.6, 65000],
        ['banshee', 'Bravado', 'Banshee', 6, 2, 196, 0.31, 0.85, 2.5, 70000],
        ['massacro', 'Dewbauchee', 'Massacro', 6, 2, 198, 0.31, 0.9, 2.6, 65000],
        ['feltzer2', 'Benefactor', 'Feltzer', 6, 2, 192, 0.29, 0.85, 2.55, 55000],
        ['buffalo', 'Bravado', 'Buffalo', 6, 4, 180, 0.27, 0.8, 2.4, 12000],
        ['sultan', 'Karin', 'Sultan', 6, 4, 175, 0.26, 0.8, 2.4, 15000],
        ['dominator', 'Vapid', 'Dominator', 4, 2, 190, 0.29, 0.7, 2.2, 35000],
        ['gauntlet', 'Bravado', 'Gauntlet', 4, 2, 185, 0.28, 0.7, 2.15, 30000],
        ['sabregt', 'Declasse', 'Sabre Turbo', 4, 2, 180, 0.27, 0.65, 2.1, 20000],
        ['stinger', 'Grotti', 'Stinger', 5, 2, 180, 0.25, 0.65, 2.2, 80000],
        ['ztype', 'Truffade', 'Z-Type', 5, 2, 190, 0.27, 0.6, 2.2, 220000],
        ['felon', 'Lampadati', 'Felon', 3, 4, 178, 0.24, 0.75, 2.3, 42000],
        ['oracle', 'Übermacht', 'Oracle', 3, 4, 175, 0.24, 0.75, 2.25, 30000],
        ['cogcabrio', 'Enus', 'Cognoscenti Cabrio', 3, 4, 172, 0.23, 0.7, 2.2, 55000],
        ['tailgater', 'Obey', 'Tailgater', 1, 4, 170, 0.23, 0.7, 2.15, 30000],
        ['schafter2', 'Benefactor', 'Schafter', 1, 4, 172, 0.24, 0.7, 2.2, 25000],
        ['fugitive', 'Cheval', 'Fugitive', 1, 4, 165, 0.22, 0.65, 2.1, 12000],
        ['asea', 'Declasse', 'Asea', 1, 4, 155, 0.18, 0.6, 1.9, 5500],
        ['panto', 'Benefactor', 'Panto', 0, 2, 150, 0.2, 0.6, 2.1, 10000],
        ['issi2', 'Weeny', 'Issi', 0, 2, 155, 0.2, 0.6, 2.0, 10000],
        ['blista', 'Dinka', 'Blista', 0, 4, 160, 0.21, 0.6, 2.0, 8000],
        ['baller', 'Gallivanter', 'Baller', 2, 4, 170, 0.22, 0.7, 2.0, 35000],
        ['granger', 'Declasse', 'Granger', 2, 8, 160, 0.2, 0.6, 1.8, 50000],
        ['huntley', 'Enus', 'Huntley S', 2, 4, 172, 0.23, 0.7, 2.0, 40000],
        ['dubsta', 'Benefactor', 'Dubsta', 2, 4, 165, 0.22, 0.65, 1.9, 45000],
        ['sandking', 'Vapid', 'Sandking XL', 9, 4, 160, 0.2, 0.6, 1.7, 55000],
        ['kamacho', 'Canis', 'Kamacho', 9, 4, 170, 0.23, 0.65, 1.9, 80000],
        ['rebel2', 'Karin', 'Rebel', 9, 2, 160, 0.2, 0.6, 1.75, 35000],
        ['mesa', 'Canis', 'Mesa', 9, 4, 155, 0.19, 0.6, 1.7, 16000],
        ['bati', 'Pegassi', 'Bati 801', 8, 2, 205, 0.38, 0.9, 2.0, 12000],
        ['akuma', 'Dinka', 'Akuma', 8, 2, 200, 0.36, 0.85, 1.95, 7500],
        ['hakuchou', 'Shitzu', 'Hakuchou', 8, 2, 210, 0.37, 0.85, 1.95, 31000],
        ['sanchez', 'Maibatsu', 'Sanchez', 8, 2, 150, 0.3, 0.7, 1.8, 5300],
        ['faggio', 'Pegassi', 'Faggio', 8, 2, 85, 0.12, 0.5, 1.5, 1900],
        ['burrito3', 'Declasse', 'Burrito', 12, 6, 140, 0.15, 0.5, 1.5, 19000],
        ['rumpo', 'Bravado', 'Rumpo', 12, 6, 145, 0.16, 0.5, 1.55, 15000],
    ];
    const CATALOG = RAW.map(([model, make, name, cls, seats, speed, accel, braking, handling, price]) => ({
        model, make, name, class: cls, category: CLASSES[cls], seats, speed, accel, braking, handling, price,
    }));
    const COLORS = [
        { id: 111, label: 'Blanco', hex: '#f2f2f2' },
        { id: 4, label: 'Plata', hex: '#a6abb0' },
        { id: 5, label: 'Gris', hex: '#5b5f63' },
        { id: 12, label: 'Negro mate', hex: '#151515' },
        { id: 0, label: 'Negro', hex: '#0a0a0a' },
        { id: 27, label: 'Rojo', hex: '#c00e1a' },
        { id: 38, label: 'Naranja', hex: '#f78616' },
        { id: 89, label: 'Amarillo', hex: '#f5d10f' },
        { id: 53, label: 'Verde', hex: '#155c2d' },
        { id: 64, label: 'Azul', hex: '#2354a1' },
        { id: 70, label: 'Azul eléctrico', hex: '#0b9cf1' },
        { id: 145, label: 'Morado', hex: '#621276' },
    ];
    // Colores sin tono: se pinta en gris y se ajusta el brillo
    const NEUTRAL = { 111: 1.55, 4: 1.25, 5: 0.85, 12: 0.5, 0: 0.42 };

    const S = { open: false, mode: null, model: 'zentorno', color: 27, angle: 18, rotDir: 0, auto: true, zoom: 1 };

    Scene.root.innerHTML = `
        <div class="dz-room"></div>
        <div class="dz-spot"></div>
        <div class="dz-sign">PREMIUM DELUXE MOTORSPORT</div>
        <div class="dz-stage">
            <div class="dz-plate">
                <svg viewBox="0 0 1120 190" preserveAspectRatio="none">
                    <ellipse class="glow" cx="560" cy="95" rx="552" ry="90"/>
                    <ellipse class="dash" id="ring" cx="560" cy="95" rx="520" ry="78"/>
                </svg>
            </div>
            <div class="dz-car" id="car">
                <div class="dz-turn" id="turn">
                    <img id="car-img" alt="" draggable="false">
                    <div class="dz-paint" id="paint"></div>
                </div>
                <img class="dz-refl" id="car-refl" alt="" draggable="false">
            </div>
        </div>`;

    const $ = (id) => document.getElementById(id);
    const byModel = Object.fromEntries(CATALOG.map((v) => [v.model, v]));

    function showCar(model, animate) {
        const src = `cars/${model}.webp`;
        $('car-img').src = src;
        $('car-refl').src = src;
        const p = $('paint');
        p.style.webkitMaskImage = p.style.maskImage = `url(${src})`;
        $('car').classList.remove('empty');
        if (animate) {
            $('car').classList.remove('swap');
            void $('car').offsetWidth;
            $('car').classList.add('swap');
        }
        paint();
    }

    function paint() {
        const c = COLORS.find((x) => x.id === S.color) || COLORS[0];
        const car = $('car');
        if (NEUTRAL[c.id] !== undefined) {
            car.style.setProperty('--paint', '#808080');
            car.style.setProperty('--bri', NEUTRAL[c.id]);
            car.style.setProperty('--sat', 0.2);
        } else {
            car.style.setProperty('--paint', c.hex);
            car.style.setProperty('--bri', 1.15);
            car.style.setProperty('--sat', 1.2);
        }
    }

    // Giro "falso": la plataforma gira de verdad y el coche se estrecha / se da la vuelta
    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (S.rotDir) S.angle += S.rotDir * 70 * dt;
        else if (S.auto) S.angle += 9 * dt;
        const cos = Math.cos((S.angle * Math.PI) / 180);
        const sx = Math.sign(cos || 1) * (0.42 + 0.58 * Math.abs(cos));
        $('car').style.setProperty('--sx', sx.toFixed(3));
        // la línea discontinua de la plataforma avanza con el giro
        $('ring').style.strokeDashoffset = String(-S.angle * 9);
        $('car').style.setProperty('--zoom', S.zoom);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // ---------------------------------------------------------------
    // Callbacks de la NUI
    // ---------------------------------------------------------------
    function prompt() {
        NUI.send({ action: 'showPrompt', label: 'Marcos' });
    }

    function talk() {
        if (S.open) return;
        S.open = true;
        S.mode = 'chat';
        NUI.send({
            action: 'open',
            shop: 'Premium Deluxe Motorsport',
            npc: { name: 'Marcos', role: 'Asesor de ventas' },
            player: { cash: Scene.money.cash, bank: Scene.money.bank, firstname: 'Antonio' },
            colors: COLORS,
            catalog: CATALOG,
        });
    }

    NUI.on('mode', ({ mode }) => {
        S.mode = mode;
        document.body.classList.toggle('catalog', mode === 'catalog');
        if (mode === 'catalog') {
            // sin coche elegido la exposición está vacía
            $('car').classList.add('empty');
            S.auto = true;
        } else {
            showCar('zentorno', true);
        }
        return {};
    });

    NUI.on('preview', ({ model, color }) => {
        if (!byModel[model]) return {};
        if (color !== undefined && color !== null) S.color = color;
        NUI.send({ action: 'loading', state: true });
        setTimeout(() => {
            S.model = model;
            S.zoom = 1;
            S.auto = true;
            showCar(model, true);
            NUI.send({ action: 'loading', state: false });
        }, 420);
        return {};
    });

    NUI.on('color', ({ color }) => {
        S.color = color;
        paint();
        return {};
    });

    NUI.on('rotate', ({ dir }) => {
        S.rotDir = dir;
        if (dir) S.auto = false;
        return {};
    });

    NUI.on('drag', ({ dx }) => {
        S.angle += dx * 0.35;
        S.auto = false;
        return {};
    });

    NUI.on('zoom', ({ delta }) => {
        S.zoom = Math.max(0.75, Math.min(1.4, S.zoom - delta * 0.08));
        return {};
    });

    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    const plate = () =>
        Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') + ' ' + String(Math.floor(Math.random() * 900) + 100);

    NUI.on('buy', ({ model, color }) => {
        const v = byModel[model];
        if (!v) return { ok: false, reason: 'invalid' };
        // Igual que el servidor: banco si llega y, si no, efectivo
        let account = null;
        if (Scene.money.bank >= v.price) account = 'bank';
        else if (Scene.money.cash >= v.price) account = 'money';
        if (!account) return { ok: false, reason: 'money' };

        return new Promise((resolve) =>
            setTimeout(() => {
                if (account === 'bank') Scene.wallet(Scene.money.cash, Scene.money.bank - v.price);
                else Scene.wallet(Scene.money.cash - v.price, Scene.money.bank);
                resolve({ ok: true });
                // Lua cierra la interfaz y enseña el aviso de compra
                setTimeout(() => {
                    S.open = false;
                    S.mode = null;
                    document.body.classList.remove('catalog');
                    NUI.send({ action: 'reset' });
                    NUI.send({ action: 'purchased', name: v.name, make: v.make, plate: plate(), price: v.price, account, contract: true, inGarage: false });
                    setTimeout(prompt, 6800);
                }, 350);
            }, 900)
        );
    });

    NUI.on('close', () => {
        S.open = false;
        S.mode = null;
        document.body.classList.remove('catalog');
        showCar('zentorno', true);
        setTimeout(prompt, 500);
        return {};
    });

    document.addEventListener('keydown', (e) => {
        if (e.repeat || S.open || document.activeElement?.tagName === 'INPUT') return;
        if (e.code === 'KeyE') {
            NUI.send({ action: 'hidePrompt' });
            talk();
        }
    });
    const pr = document.getElementById('prompt');
    pr.style.cursor = 'pointer';
    pr.style.pointerEvents = 'auto';
    pr.addEventListener('click', () => {
        if (S.open) return;
        NUI.send({ action: 'hidePrompt' });
        talk();
    });

    Scene.keys('Controles', [
        { key: 'E', code: 'KeyE', label: 'Hablar con Marcos' },
        { key: '1-4', code: 'Digit1', keyName: '1', label: 'Elegir respuesta' },
        { key: 'ESC', code: 'Escape', keyName: 'Escape', label: 'Salir' },
    ]);

    window.SCENE = {
        reset() {
            Scene.wallet(42000, 310000);
            S.open = false;
            NUI.send({ action: 'reset' });
            document.body.classList.remove('catalog');
            showCar('zentorno', false);
            prompt();
        },
        talk,
        state: S,
    };
    SCENE.reset();
})();
