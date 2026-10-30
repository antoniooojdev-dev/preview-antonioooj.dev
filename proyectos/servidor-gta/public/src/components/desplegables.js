/* =====================================================================
   desplegables.js · Color del brillo de los filtros
   El borde y el brillo del botón de cada filtro toman el color del icono
   de la opción elegida. Al cargar, el de la opción "Todas" / "Todos"
   (la marcada o, si no hay ninguna, la primera).

   El color se guarda en la variable CSS --dd-c del botón y de su contenedor;
   lo usan home.html y src/assets/desplegables.css.
   No cambia cómo funciona cada filtro: solo escucha qué opción se pulsa.
   ===================================================================== */
(function () {
    'use strict';
    if (window.__hxDesplegables) return;
    window.__hxDesplegables = true;

    // Cada tipo de filtro de la web: su contenedor, su botón, su menú y sus opciones
    const TIPOS = [
        { cont: '.filter-dropdown-container', btn: '.filter-dropdown-btn', menu: '.filter-dropdown-options, .custom-dropdown-menu', opt: '.filter-dropdown-option, .custom-dropdown-item' },
        { cont: '.custom-dropdown-container', btn: '.filter-dropdown-btn, .custom-dropdown-btn', menu: '.custom-dropdown-menu', opt: '.custom-dropdown-item' },
        { cont: '.sg-dd', btn: '.sg-dd-btn', menu: '.sg-dd-menu', opt: '.sg-dd-item' },
        { cont: '.custom-select', btn: '.select-selected', menu: '.select-items', opt: '.select-items > div' }
    ];
    const TODAS_OPCIONES = TIPOS.map(t => t.opt).join(', ');

    // Menús que la página saca al <body> para que queden por encima (Home): su botón
    const MENU_A_BOTON = { nvDropdownMenu: 'nvDropdownBtn' };

    function colorDe(opcion) {
        const icono = opcion && opcion.querySelector('i');
        if (!icono) return '';
        const c = getComputedStyle(icono).color;
        return c && c !== 'rgba(0, 0, 0, 0)' ? c : '';
    }

    function pintar(boton, color) {
        if (!boton || !color) return;
        boton.style.setProperty('--dd-c', color);
        const cont = boton.parentElement;
        if (cont) cont.style.setProperty('--dd-c', color);
    }

    // Botón que corresponde a una opción pulsada
    function botonDe(opcion) {
        for (const id in MENU_A_BOTON) {
            const menu = document.getElementById(id);
            if (menu && menu.contains(opcion)) return document.getElementById(MENU_A_BOTON[id]);
        }
        for (const t of TIPOS) {
            const cont = opcion.closest(t.cont);
            if (cont) return cont.querySelector(t.btn);
        }
        return null;
    }

    // Opción que se toma al cargar: la marcada, o la primera ("Todas")
    function opcionInicial(menu, selOpt) {
        if (!menu) return null;
        const marcadas = selOpt.split(',').map(s => s.trim()).map(s => `${s}.active, ${s}.on`).join(', ');
        return menu.querySelector(marcadas) || menu.querySelector(selOpt);
    }

    function iniciar() {
        // Home: su menú puede estar ya en el <body>
        for (const id in MENU_A_BOTON) {
            const menu = document.getElementById(id), boton = document.getElementById(MENU_A_BOTON[id]);
            if (menu && boton && !boton.style.getPropertyValue('--dd-c')) pintar(boton, colorDe(menu.querySelector('.custom-dropdown-item')));
        }
        TIPOS.forEach(t => {
            // El selector de categoría de tickets no tiene "Todas": hasta elegir una se queda en morado
            if (t.cont === '.custom-select') return;
            document.querySelectorAll(t.cont).forEach(cont => {
                const boton = cont.querySelector(t.btn);
                if (!boton || boton.style.getPropertyValue('--dd-c')) return;
                const menu = cont.querySelector(t.menu);
                pintar(boton, colorDe(opcionInicial(menu, t.opt)));
            });
        });
    }

    // Al elegir una opción, el botón toma su color. Fase de captura: funciona aunque la página
    // detenga la propagación del clic.
    document.addEventListener('click', (e) => {
        const opcion = e.target.closest && e.target.closest(TODAS_OPCIONES);
        if (!opcion) {
            // Menús que se pintan más tarde (Sugerencias): se colorean al abrirlos la primera vez
            if (e.target.closest && e.target.closest(TIPOS.map(t => t.btn).join(', '))) setTimeout(iniciar, 0);
            return;
        }
        pintar(botonDe(opcion), colorDe(opcion));
    }, true);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
    window.addEventListener('load', iniciar);
})();
