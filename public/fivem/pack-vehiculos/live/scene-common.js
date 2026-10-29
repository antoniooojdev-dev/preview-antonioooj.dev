// Utilidades compartidas por las escenas de las demos (controles, cartera, avisos, foco).
window.Scene = (function () {
    const root = document.getElementById('scene');
    const fmt = (n) => '$' + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const notifs = document.createElement('div');
    notifs.className = 'sc-notifs';
    document.body.appendChild(notifs);

    function notify(text, kind = 'info', icon) {
        const el = document.createElement('div');
        el.className = `sc-notif ${kind}`;
        const ic = icon || { error: 'fa-xmark', success: 'fa-check', info: 'fa-info' }[kind] || 'fa-info';
        el.innerHTML = `<i class="fa-solid ${ic}"></i><span></span>`;
        el.querySelector('span').textContent = text;
        notifs.appendChild(el);
        while (notifs.children.length > 3) notifs.firstElementChild.remove();
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 300);
        }, 3600);
    }

    // Panel de controles. keys = [{ key: 'E', code: 'KeyE', label: '...' }]
    let keysEl = null;
    function keys(title, list) {
        if (!keysEl) {
            keysEl = document.createElement('div');
            keysEl.className = 'sc-keys';
            document.body.appendChild(keysEl);
            // Pulsar las teclas en pantalla (útil en móvil o con ratón)
            keysEl.addEventListener('pointerdown', (e) => {
                const k = e.target.closest('kbd');
                if (!k) return;
                e.preventDefault();
                press(k.dataset.code, k.dataset.key, true);
                const up = () => {
                    press(k.dataset.code, k.dataset.key, false);
                    window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointerup', up);
            });
        }
        keysEl.innerHTML = `<b>${title}</b>` + list
            .map((k) => `<div class="sc-key"><kbd data-code="${k.code}" data-key="${k.keyName || k.key}">${k.key}</kbd>${k.label}</div>`)
            .join('');
    }

    function press(code, key, down) {
        // Se lanza en el documento y sube hasta window: les llega a todos los listeners una vez
        document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key, bubbles: true }));
    }

    // Marca la tecla en pantalla mientras se pulsa de verdad
    function highlight(code, down) {
        if (!keysEl) return;
        keysEl.querySelectorAll(`kbd[data-code="${code}"]`).forEach((k) => k.classList.toggle('down', down));
    }
    document.addEventListener('keydown', (e) => highlight(e.code, true));
    document.addEventListener('keyup', (e) => highlight(e.code, false));

    // Cartera
    let walletEl = null;
    const money = { cash: 0, bank: 0 };
    function wallet(cash, bank) {
        if (!walletEl) {
            walletEl = document.createElement('div');
            walletEl.className = 'sc-wallet';
            walletEl.innerHTML = `
                <div class="sc-money cash"><i class="fa-solid fa-money-bill-wave"></i><span></span></div>
                <div class="sc-money bank"><i class="fa-solid fa-building-columns"></i><span></span></div>`;
            document.body.appendChild(walletEl);
        }
        for (const [k, v] of [['cash', cash], ['bank', bank]]) {
            const el = walletEl.querySelector(`.${k}`);
            if (v < money[k]) {
                el.classList.remove('minus');
                void el.offsetWidth;
                el.classList.add('minus');
            }
            money[k] = v;
            el.querySelector('span').textContent = fmt(v);
        }
    }

    // Capa "haz clic para jugar" (dentro de un iframe el teclado solo llega con el foco)
    const focus = document.createElement('div');
    focus.className = 'sc-focus';
    focus.innerHTML = '<span><i class="fa-solid fa-gamepad"></i> Haz clic para jugar</span>';
    document.body.appendChild(focus);
    const inFrame = window.self !== window.top;
    if (!inFrame) focus.classList.add('hidden');
    focus.addEventListener('pointerdown', () => {
        focus.classList.add('hidden');
        window.focus();
    });
    window.addEventListener('blur', () => inFrame && !document.body.classList.contains('recording') && focus.classList.remove('hidden'));
    window.addEventListener('focus', () => focus.classList.add('hidden'));

    return { root, notify, keys, wallet, money, fmt, press };
})();
