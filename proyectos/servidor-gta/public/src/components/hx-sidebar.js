/* =====================================================================
   hx-sidebar.js · Menú lateral común de Nyx Community
   Se carga en todas las páginas que tienen <aside class="sidebar">.

   1. Aspecto del menú lateral igual en todas las páginas (el de home1.html):
      cristal, página activa con barra luminosa y logo del index.
   2. Lupa a la derecha de "Nyx Community" que abre el buscador de páginas.
   3. Buscador (también con Ctrl + K): muestra cada categoría del menú
      (GENERAL, MI CUENTA...) con sus botones debajo, y filtra al escribir.

   El buscador lee el menú en el momento de abrirse, así enseña justo lo
   que guards.js deja ver a cada usuario.
   ===================================================================== */
(function () {
    'use strict';
    if (window.__hxSidebar) return;
    window.__hxSidebar = true;

    const LOGO_URL = 'https://i.imgur.com/VPqGp7U.png';   // mismo logo que index.html

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    /* ---------------------------------------------------------------
       Estilos
       --------------------------------------------------------------- */
    const CSS = `
        aside.sidebar {
            background: rgba(8, 5, 14, 0.78);
            -webkit-backdrop-filter: blur(20px) saturate(150%);
            backdrop-filter: blur(20px) saturate(150%);
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            animation: none !important;          /* el menú aparece quieto; solo se anima el contenido */
        }
        aside.sidebar .sidebar-logo-title { display: flex; align-items: center; gap: 10px; min-width: 0; }

        /* Logo + "Nyx Community": llevan al index */
        .hx-brand-home {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            color: inherit;
            text-decoration: none;
            border-radius: 9px;
            transition: opacity .2s ease;
        }
        .hx-brand-home:hover { opacity: .85; }
        .hx-brand-home:focus-visible { outline: 2px solid #a855f7; outline-offset: 3px; }
        aside.sidebar .sidebar-logo.hx-brand-logo {
            width: 46px; height: 30px;
            object-fit: contain;
            flex-shrink: 0;
            filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.35));
        }

        /* Botón hamburguesa: mismo cuadrito y color que la lupa al pasar el ratón */
        aside.sidebar #sidebarToggleBtn {
            flex-shrink: 0;
            width: 30px; height: 30px;
            padding: 0;
            border-radius: 9px;
            display: grid;
            place-items: center;
            background: transparent;
            border: 1px solid transparent;
            cursor: pointer;
            transition: background .2s ease, border-color .2s ease, color .2s ease;
        }
        aside.sidebar #sidebarToggleBtn:hover {
            color: #fff;
            background: rgba(168, 85, 247, 0.18);
            border-color: rgba(168, 85, 247, 0.55);
        }
        aside.sidebar #sidebarToggleBtn:focus-visible { outline: 2px solid #a855f7; outline-offset: 2px; }

        .hx-brand-search {
            flex-shrink: 0;
            width: 30px; height: 30px;
            padding: 0;
            border-radius: 9px;
            display: grid;
            place-items: center;
            font-size: 12px;
            color: #cbd5e1;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: background .2s ease, border-color .2s ease, color .2s ease;
        }
        .hx-brand-search:hover,
        .hx-brand-search[aria-expanded="true"] {
            color: #fff;
            background: rgba(168, 85, 247, 0.18);
            border-color: rgba(168, 85, 247, 0.55);
        }
        .hx-brand-search:focus-visible { outline: 2px solid #a855f7; outline-offset: 2px; }

        aside.sidebar .nav-category { color: #7c7391; letter-spacing: 0.14em; font-size: 10.5px; }
        /* Botones del menú: diseño "Contorno" (borde morado con brillo en la página activa) */
        aside.sidebar .nav-item {
            position: relative;
            border-radius: 10px;
            border: 1px solid transparent;
            transition: background .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease;
        }
        aside.sidebar .nav-item:hover {
            border-color: rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
            color: #fff;
        }
        aside.sidebar .nav-item.active {
            border-color: rgba(168, 85, 247, 0.6);
            background: rgba(168, 85, 247, 0.08);
            color: #fff;
            font-weight: 600;
            box-shadow: 0 0 14px rgba(168, 85, 247, 0.25), inset 0 0 12px rgba(168, 85, 247, 0.12);
        }
        aside.sidebar .nav-item.active::before,
        aside.sidebar .nav-item.active::after { content: none; }
        aside.sidebar .nav-item.active i { color: #c084fc; }
        aside.sidebar .nav-item:focus-visible { outline: 2px solid #a855f7; outline-offset: 1px; }
        aside.sidebar .sidebar-footer { background: rgba(5, 3, 8, 0.5); }

        /* Buscador de páginas */
        .hx-palette {
            position: fixed; inset: 0;
            z-index: 2147483000;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 12vh 16px 16px;
            box-sizing: border-box;
            background: rgba(6, 4, 12, 0.55);
            -webkit-backdrop-filter: blur(6px);
            backdrop-filter: blur(6px);
            opacity: 0;
            transition: opacity .2s ease;
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
        }
        .hx-palette[hidden] { display: none; }
        .hx-palette.show { opacity: 1; }
        .hx-palette * { box-sizing: border-box; }
        .hx-palette__box {
            width: min(560px, 100%);
            border-radius: 18px;
            overflow: hidden;
            background: rgba(19, 13, 28, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 40px 100px -20px rgba(0, 0, 0, 0.95), 0 0 50px -20px rgba(168, 85, 247, 0.6);
            transform: translateY(-8px) scale(0.98);
            transition: transform .25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hx-palette.show .hx-palette__box { transform: none; }
        .hx-palette__search {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 18px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hx-palette__search i { color: #c084fc; }
        .hx-palette__search input {
            flex: 1;
            min-width: 0;
            background: transparent;
            border: 0;
            outline: 0;
            color: #fff;
            font: 500 15px 'Plus Jakarta Sans', 'Inter', sans-serif;
        }
        .hx-palette__search input::placeholder { color: #64748b; }
        .hx-palette__close {
            flex-shrink: 0;
            width: 30px; height: 30px;
            padding: 0;
            border-radius: 9px;
            display: grid;
            place-items: center;
            font-size: 14px;
            color: #cbd5e1;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: background .2s ease, border-color .2s ease, color .2s ease;
        }
        .hx-palette__close:hover {
            color: #fff;
            background: rgba(168, 85, 247, 0.18);
            border-color: rgba(168, 85, 247, 0.55);
        }
        .hx-palette__close:focus-visible { outline: 2px solid #a855f7; outline-offset: 2px; }
        .hx-palette__search i.fa-xmark { color: inherit; }
        .hx-palette__list {
            list-style: none;
            margin: 0;
            max-height: 56vh;
            overflow-y: auto;
            overscroll-behavior: contain;      /* el scroll no pasa a la página de detrás */
            padding: 6px 8px 10px;
        }
        .hx-palette__list::-webkit-scrollbar { width: 6px; }
        .hx-palette__list::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.35); border-radius: 6px; }

        /* Título de cada categoría, a la izquierda, con sus botones debajo */
        .hx-palette__group {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 12px 6px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #d8b4fe;
            list-style: none;
        }
        .hx-palette__group::after {
            content: '';
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, rgba(168, 85, 247, 0.35), transparent);
        }
        .hx-palette__group:first-child { padding-top: 8px; }

        .hx-palette__item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border-radius: 10px;
            cursor: pointer;
            color: #cbd5e1;
            font-size: 14px;
            list-style: none;
        }
        .hx-palette__item i { width: 18px; text-align: center; color: #94a3b8; }
        .hx-palette__item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hx-palette__item .hx-palette__here {
            flex: 0 0 auto;
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #c084fc;
        }
        .hx-palette__item.is-active { background: rgba(168, 85, 247, 0.18); color: #fff; }
        .hx-palette__item.is-active i { color: #f0abfc; }
        .hx-palette__item mark { background: transparent; color: #f0abfc; font-weight: 700; }
        .hx-palette__empty { padding: 22px; text-align: center; color: #94a3b8; font-size: 13.5px; list-style: none; }
        @media (prefers-reduced-motion: reduce) {
            .hx-palette, .hx-palette__box, aside.sidebar .nav-item { transition: none; }
        }
    `;

    function inyectarEstilos() {
        if (document.getElementById('hx-sidebar-css')) return;
        const st = document.createElement('style');
        st.id = 'hx-sidebar-css';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    /* ---------------------------------------------------------------
       Cabecera del menú: logo del index + lupa junto a "Nyx Community"
       --------------------------------------------------------------- */
    function prepararCabecera(sidebar) {
        const brand = sidebar.querySelector('.sidebar-brand');
        if (!brand) return null;

        let contenedor = brand.querySelector('.sidebar-logo-title');
        if (!contenedor) {
            contenedor = document.createElement('div');
            contenedor.className = 'sidebar-logo-title';
            brand.insertBefore(contenedor, brand.firstChild);
        }
        contenedor.removeAttribute('style');

        let logo = contenedor.querySelector('img.sidebar-logo, img');
        if (!logo) {
            logo = document.createElement('img');
            contenedor.insertBefore(logo, contenedor.firstChild);
        }
        logo.src = LOGO_URL;
        logo.alt = 'Nyx Community Logo';
        logo.removeAttribute('style');            // quita el tamaño de 32 x 32 escrito en cada página
        logo.classList.add('sidebar-logo', 'hx-brand-logo');

        // El logo y el nombre del servidor llevan al index
        let inicio = contenedor.querySelector('.hx-brand-home');
        if (!inicio) {
            inicio = document.createElement('a');
            inicio.className = 'hx-brand-home';
            inicio.href = '/index.html';
            inicio.title = 'Ir al inicio';
            contenedor.insertBefore(inicio, contenedor.firstChild);
            inicio.appendChild(logo);
            const nombre = contenedor.querySelector('.server-main-title');
            if (nombre) inicio.appendChild(nombre);
        }

        let lupa = brand.querySelector('.hx-brand-search');
        if (!lupa) {
            lupa = document.createElement('button');
            lupa.type = 'button';
            lupa.className = 'hx-brand-search';
            lupa.id = 'hxOpenPalette';
            lupa.title = 'Buscar página (Ctrl + K)';
            lupa.setAttribute('aria-label', 'Buscar página');
            lupa.setAttribute('aria-haspopup', 'dialog');
            lupa.setAttribute('aria-expanded', 'false');
            lupa.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
            inicio.after(lupa);
        }
        return lupa;
    }

    /* ---------------------------------------------------------------
       Buscador de páginas agrupado por categorías
       --------------------------------------------------------------- */
    function crearBuscador(lupa) {
        const pal = document.createElement('div');
        pal.className = 'hx-palette';
        pal.id = 'hxPalette';
        pal.hidden = true;
        pal.setAttribute('role', 'dialog');
        pal.setAttribute('aria-modal', 'true');
        pal.setAttribute('aria-label', 'Buscar página');
        pal.innerHTML = `
            <div class="hx-palette__box">
                <div class="hx-palette__search">
                    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <input type="text" placeholder="¿A dónde quieres ir?" autocomplete="off" spellcheck="false"
                           role="combobox" aria-expanded="true" aria-controls="hxPaletteList" aria-autocomplete="list">
                    <button type="button" class="hx-palette__close" title="Cerrar (Esc)" aria-label="Cerrar buscador">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>
                <ul class="hx-palette__list" id="hxPaletteList" role="listbox"></ul>
            </div>`;
        document.body.appendChild(pal);

        const input = pal.querySelector('input');
        const list = pal.querySelector('.hx-palette__list');
        const btnCerrar = pal.querySelector('.hx-palette__close');

        // Con el buscador abierto solo se desplaza su lista, nunca la página de detrás
        function bloquearScroll(e) {
            if (!list.contains(e.target)) { e.preventDefault(); return; }
            if (e.type !== 'wheel') return;
            const arriba = list.scrollTop <= 0;
            const abajo = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
            if ((e.deltaY < 0 && arriba) || (e.deltaY > 0 && abajo)) e.preventDefault();
        }
        pal.addEventListener('wheel', bloquearScroll, { passive: false });
        pal.addEventListener('touchmove', bloquearScroll, { passive: false });

        let grupos = [];       // [{ nombre, items: [{ href, texto, icono, actual }] }]
        let planos = [];       // items visibles en orden (para moverse con las flechas)
        let activo = 0;
        let focoPrevio = null;

        // Lee el menú lateral tal como está pintado ahora: cada .nav-category abre un grupo
        function leerMenu() {
            const nav = document.querySelector('aside.sidebar .sidebar-nav');
            const out = [];
            let actual = null;
            if (!nav) return out;
            nav.querySelectorAll('.nav-category, a[href]').forEach(el => {
                if (el.classList.contains('nav-category')) {
                    actual = { nombre: el.textContent.trim() || 'Menú', items: [] };
                    out.push(actual);
                    return;
                }
                const href = el.getAttribute('href');
                if (!href || href === '#') return;
                if (!actual) { actual = { nombre: 'General', items: [] }; out.push(actual); }
                const icono = el.querySelector('i');
                actual.items.push({
                    href,
                    texto: el.textContent.replace(/\s+/g, ' ').trim(),
                    icono: icono ? icono.className : 'fa-solid fa-link',
                    actual: el.classList.contains('active')
                });
            });
            return out.filter(g => g.items.length);
        }

        // Resalta lo que coincide con la búsqueda
        function resaltar(texto, q) {
            if (!q) return esc(texto);
            const i = norm(texto).indexOf(q);
            if (i < 0) return esc(texto);
            return esc(texto.slice(0, i)) + '<mark>' + esc(texto.slice(i, i + q.length)) + '</mark>' + esc(texto.slice(i + q.length));
        }

        function pintar() {
            const q = norm(input.value.trim());
            planos = [];
            let html = '';
            grupos.forEach(g => {
                // Si se escribe el nombre de la categoría, salen todos sus botones
                const grupoCoincide = q && norm(g.nombre).includes(q);
                const items = g.items.filter(i => !q || grupoCoincide || norm(i.texto).includes(q));
                if (!items.length) return;
                html += `<li class="hx-palette__group" role="presentation">${esc(g.nombre)}</li>`;
                items.forEach(i => {
                    const n = planos.length;
                    planos.push(i);
                    html += `
                        <li role="option" id="hxOpt${n}" class="hx-palette__item ${n === activo ? 'is-active' : ''}" aria-selected="${n === activo}" data-n="${n}">
                            <i class="${esc(i.icono)}" aria-hidden="true"></i>
                            <span>${resaltar(i.texto, q)}</span>
                            ${i.actual ? '<small class="hx-palette__here">Aquí</small>' : ''}
                        </li>`;
                });
            });
            if (activo >= planos.length) activo = 0;
            list.innerHTML = planos.length ? html : '<li class="hx-palette__empty">No hay ninguna página con ese nombre.</li>';
            if (planos.length) {
                input.setAttribute('aria-activedescendant', 'hxOpt' + activo);
                const act = list.querySelector('.is-active');
                if (act) act.scrollIntoView({ block: 'nearest' });
            } else {
                input.removeAttribute('aria-activedescendant');
            }
        }

        function marcar(n) {
            const prev = list.querySelector('.is-active');
            if (prev) { prev.classList.remove('is-active'); prev.setAttribute('aria-selected', 'false'); }
            activo = n;
            const el = list.querySelector(`[data-n="${n}"]`);
            if (el) {
                el.classList.add('is-active');
                el.setAttribute('aria-selected', 'true');
                el.scrollIntoView({ block: 'nearest' });
                input.setAttribute('aria-activedescendant', el.id);
            }
        }

        function abrir() {
            grupos = leerMenu();
            focoPrevio = document.activeElement;
            pal.hidden = false;
            requestAnimationFrame(() => pal.classList.add('show'));
            if (lupa) lupa.setAttribute('aria-expanded', 'true');
            input.value = '';
            activo = 0;
            pintar();
            input.focus();
        }
        function cerrar() {
            if (pal.hidden) return;
            pal.classList.remove('show');
            if (lupa) lupa.setAttribute('aria-expanded', 'false');
            setTimeout(() => { pal.hidden = true; }, 200);
            if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
        }
        function ir(n) {
            const i = planos[n];
            if (!i) return;
            cerrar();
            window.location.href = i.href;
        }

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                pal.hidden ? abrir() : cerrar();
                return;
            }
            if (pal.hidden) return;
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); }
            else if (e.key === 'ArrowDown' && planos.length) { e.preventDefault(); marcar((activo + 1) % planos.length); }
            else if (e.key === 'ArrowUp' && planos.length) { e.preventDefault(); marcar((activo - 1 + planos.length) % planos.length); }
            else if (e.key === 'Enter') { e.preventDefault(); ir(activo); }
        }, true);

        input.addEventListener('input', () => { activo = 0; pintar(); });
        list.addEventListener('click', (e) => {
            const li = e.target.closest('[data-n]');
            if (li) ir(Number(li.dataset.n));
        });
        list.addEventListener('mousemove', (e) => {
            const li = e.target.closest('[data-n]');
            if (li && Number(li.dataset.n) !== activo) marcar(Number(li.dataset.n));
        });
        pal.addEventListener('click', (e) => { if (e.target === pal) cerrar(); });
        btnCerrar.addEventListener('click', cerrar);
        if (lupa) lupa.addEventListener('click', (e) => { e.stopPropagation(); abrir(); });
    }

    function iniciar() {
        const sidebar = document.querySelector('aside.sidebar');
        if (!sidebar) return;
        inyectarEstilos();
        const lupa = prepararCabecera(sidebar);
        crearBuscador(lupa);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
