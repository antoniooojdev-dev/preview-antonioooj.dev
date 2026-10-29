/* =====================================================================
   rangos.js · Rangos y permisos del staff de Nyx Community

   Aquí se decide qué puede ver cada rango:
     - qué botones del panel (admin.html)
     - qué categorías de tickets (admin/tickets.html)

   Se carga en las páginas del panel con:
       <script src="/rangos.js"></script>
   (va en la misma carpeta que guards.js)

   Los permisos de una persona son la SUMA de los de su rango y los de
   sus especialidades. Un staff Inactivo no tiene ninguno.

   Para cambiar el reparto solo hay que tocar la tabla PERMISOS.
   ===================================================================== */
(function () {
    const MASTER_ADMIN_ID = '732650490588037160';   // siempre cuenta como Owner

    /* ---------- Rangos y especialidades (los mismos ids que en la página de staff) ---------- */
    const RANGOS = [
        { id: 'owner',         nombre: 'Owner' },
        { id: 'desarrollador', nombre: 'Desarrollador' },
        { id: 'game_master',   nombre: 'Game Master' },
        { id: 'administrador', nombre: 'Administrador' },
        { id: 'moderador',     nombre: 'Moderador' },
        { id: 'soporte',       nombre: 'Soporte' }
    ];

    const ESPECIALIDADES = [
        { id: 'encargado_cks',            nombre: "Encargado de CK's" },
        { id: 'encargado_whitelist',      nombre: "Encargado de Whitelist's" },
        { id: 'encargado_locales',        nombre: 'Encargado de locales' },
        { id: 'encargado_faccion_legal',  nombre: 'Encargado de la facción legal' },
        { id: 'encargado_faccion_ilegal', nombre: 'Encargado de la facción ilegal' },
        { id: 'encargado_creadores',      nombre: 'Encargado de creadores de contenido' },
        { id: 'encargado_playmakers',     nombre: "Encargado de playmaker's" }
    ];

    /* ---------- Botones del panel ----------
       Cada botón se reconoce por la página de /admin/ a la que lleva o, si no es un
       enlace, por su texto. "patron" es lo que se busca (sin tildes y en minúsculas). */
    const BOTONES = {
        tickets:    { nombre: 'Tickets',    patron: /ticket/ },
        calendario: { nombre: 'Calendario', patron: /calendario/ },
        sanciones:  { nombre: 'Sanciones',  patron: /sancion/ },
        ck:         { nombre: 'CK',         patron: /(^|[^a-z])cks?([^a-z]|$)/ },
        whitelist:  { nombre: 'Whitelist',  patron: /whitelist/ },
        comercios:  { nombre: 'Comercios',  patron: /comercio|locales/ },
        novedades:  { nombre: 'Novedades',  patron: /novedad/ },
        staff:      { nombre: 'Staff',      patron: /staff/ }
    };
    const OTRO = '__otro__';   // cualquier otra página de /admin/: solo para quien ve todos los botones

    /* ---------- Categorías de tickets ----------
       La categoría de cada ticket es un texto libre, así que se agrupa por palabras clave.
       Se usa el primer grupo que coincida, por eso el orden importa.
       Un ticket cuya categoría no encaje en ningún grupo solo lo ve quien ve todos los tickets. */
    const CATEGORIAS_TICKETS = [
        { id: 'apelaciones',    nombre: 'Apelaciones',            patron: /apela/ },
        { id: 'ck',             nombre: 'CK',                     patron: /(^|[^a-z])cks?([^a-z]|$)|character kill/ },
        { id: 'invitacion',     nombre: 'Invitación al servidor', patron: /invitaci/ },
        { id: 'faccion_ilegal', nombre: 'Facción ilegal',         patron: /ilegal/ },
        { id: 'faccion_legal',  nombre: 'Facción legal',          patron: /legal/ },
        { id: 'creadores',      nombre: 'Creadores de contenido', patron: /creador|contenido|streamer/ },
        { id: 'playmakers',     nombre: 'Playmakers',             patron: /playmaker/ },
        { id: 'bugs',           nombre: 'Bugs y fallos',          patron: /bug|fallo/ },
        { id: 'reporte',        nombre: 'Reportes',               patron: /report/ },
        { id: 'ayuda',          nombre: 'Ayuda',                  patron: /ayuda|duda|soporte|general/ }
    ];

    /* ---------- QUÉ PUEDE VER CADA RANGO ----------
       botones: claves de BOTONES, o '*' para todos.
       tickets: ids de CATEGORIAS_TICKETS, o '*' para todas.
       El botón "Tickets" no hace falta ponerlo: lo ve quien pueda ver alguna categoría. */
    const PERMISOS = {
        // Rangos
        owner:         { botones: '*', tickets: '*' },
        desarrollador: { botones: '*', tickets: '*' },
        game_master:   { botones: '*', tickets: '*' },
        administrador: { botones: ['calendario', 'sanciones', 'ck', 'whitelist'],
                         tickets: ['reporte', 'ayuda', 'bugs', 'apelaciones', 'ck', 'invitacion'] },
        moderador:     { botones: ['calendario', 'sanciones'],
                         tickets: ['reporte', 'ayuda', 'bugs'] },
        soporte:       { botones: [],
                         tickets: ['reporte', 'ayuda', 'bugs'] },

        // Especialidades (se suman a lo que ya dé el rango)
        encargado_cks:            { botones: ['ck'],            tickets: ['ck'] },
        encargado_whitelist:      { botones: ['whitelist'], tickets: ['invitacion'] },
        encargado_locales:        { botones: ['comercios'], tickets: [] },
        encargado_faccion_legal:  { botones: [],            tickets: ['faccion_legal'] },
        encargado_faccion_ilegal: { botones: [],            tickets: ['faccion_ilegal'] },
        encargado_creadores:      { botones: [],            tickets: ['creadores'] },
        encargado_playmakers:     { botones: [],            tickets: ['playmakers'] }
    };

    /* ===================== A partir de aquí no hace falta tocar nada ===================== */

    // minúsculas y sin tildes, para comparar textos
    const normalizar = t => String(t == null ? '' : t)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    function buscar(catalogo, valor) {
        const v = normalizar(valor);
        if (!v) return null;
        return catalogo.find(x => x.id === v || normalizar(x.nombre) === v) || null;
    }

    function nombreDeRol(id) {
        const r = buscar(RANGOS, id) || buscar(ESPECIALIDADES, id);
        return r ? r.nombre : id;
    }

    // Roles de una ficha de staff: su rango + sus especialidades. Inactivo -> ninguno.
    function rolesDeStaff(s) {
        if (!s || (s.status || 'Activo') !== 'Activo') return [];
        const roles = [];
        const rango = buscar(RANGOS, s.rango);
        if (rango) roles.push(rango.id);
        String(s.especialidad || '').split(',').forEach(texto => {
            const esp = buscar(ESPECIALIDADES, texto);
            if (esp && !roles.includes(esp.id)) roles.push(esp.id);
        });
        return roles;
    }

    // Roles de un usuario de Discord según la lista de /api/staff
    function rolesDeUsuario(discordId, lista) {
        const id = String(discordId || '').trim();
        if (!id) return [];
        const ficha = (Array.isArray(lista) ? lista : []).find(s =>
            s && String(s.discordId || '').trim() === id && (s.status || 'Activo') === 'Activo');
        const roles = ficha ? rolesDeStaff(ficha) : [];
        if (id === MASTER_ADMIN_ID && !roles.includes('owner')) roles.unshift('owner');
        return roles;
    }

    // Grupo al que pertenece la categoría de un ticket (o null si no encaja en ninguno)
    function grupoDeCategoria(texto) {
        const t = normalizar(texto);
        return CATEGORIAS_TICKETS.find(c => c.patron.test(t)) || null;
    }

    // Junta los permisos de todos los roles de la persona
    function crearAcceso(roles, error) {
        let todosBotones = false;
        let todosTickets = false;
        const botones = new Set();
        const categorias = new Set();

        roles.forEach(rol => {
            const p = PERMISOS[rol];
            if (!p) return;
            if (p.botones === '*') todosBotones = true; else (p.botones || []).forEach(b => botones.add(b));
            if (p.tickets === '*') todosTickets = true; else (p.tickets || []).forEach(c => categorias.add(c));
        });
        if (todosTickets || categorias.size > 0) botones.add('tickets');

        const puedeVerCategoria = texto => {
            if (todosTickets) return true;
            const grupo = grupoDeCategoria(texto);
            return !!grupo && categorias.has(grupo.id);
        };

        return {
            error: !!error,                       // true = no se pudo consultar /api/staff
            roles: roles,                         // ['moderador', 'encargado_cks']
            nombres: roles.map(nombreDeRol),      // ['Moderador', "Encargado de CK's"]
            todosBotones: todosBotones,
            todosTickets: todosTickets,
            puedeBoton: clave => todosBotones || botones.has(clave),
            puedeVerCategoria: puedeVerCategoria,
            puedeVerTicket: t => puedeVerCategoria((t && (t.categoria || t.category)) || 'General'),
            // Nombres de las categorías que puede ver (null = todas)
            categoriasPermitidas: () => todosTickets ? null
                : CATEGORIAS_TICKETS.filter(c => categorias.has(c.id)).map(c => c.nombre)
        };
    }

    // Permisos de quien tiene la sesión iniciada. Se consulta /api/staff una sola vez por página.
    let promesaAcceso = null;
    function miAcceso(forzar) {
        if (promesaAcceso && !forzar) return promesaAcceso;
        promesaAcceso = (async () => {
            let usuario = {};
            try { usuario = JSON.parse(localStorage.getItem('discord_user') || '{}') || {}; } catch (e) {}
            const id = String(usuario.id || usuario.discordId || '').trim();

            let lista = null;
            try {
                const r = await fetch('/api/staff', { cache: 'no-store', credentials: 'same-origin' });
                if (r.ok) {
                    const d = await r.json();
                    if (Array.isArray(d)) lista = d;
                }
            } catch (e) {}

            if (lista === null) {
                // Sin poder leer el staff solo se reconoce a la ID maestra
                return crearAcceso(id === MASTER_ADMIN_ID ? ['owner'] : [], id !== MASTER_ADMIN_ID);
            }
            return crearAcceso(rolesDeUsuario(id, lista), false);
        })();
        return promesaAcceso;
    }

    /* ---------- Ocultar los botones que no tocan ---------- */
    const CLICABLES = 'a[href], button, [onclick], [role="button"]';

    // ¿A qué botón corresponde una dirección? Solo cuentan las páginas de /admin/
    function claveDeDestino(destino) {
        const d = normalizar(destino);
        const i = d.indexOf('admin/');
        if (i === -1) return null;
        const resto = d.slice(i + 6);
        for (const clave in BOTONES) {
            if (BOTONES[clave].patron.test(resto)) return clave;
        }
        return OTRO;
    }

    function claveDeElemento(el, porTexto) {
        if (el.dataset.permiso) return el.dataset.permiso;           // marcado a mano: data-permiso="calendario"
        const href = el.getAttribute('href') || '';
        const onclick = el.getAttribute('onclick') || '';
        const clave = claveDeDestino(href + ' ' + onclick + ' ' + (el.getAttribute('data-href') || ''));
        if (clave) return clave;
        if (!porTexto) return null;
        if (href && href !== '#' && !/^javascript:/i.test(href)) return null;   // enlace normal a otra página
        if (el.querySelector(CLICABLES)) return null;                           // contiene otros botones
        const texto = normalizar(el.textContent + ' ' + (el.getAttribute('title') || '') + ' ' + onclick);
        if (!texto || texto.length > 200) return null;
        for (const k in BOTONES) {
            if (BOTONES[k].patron.test(texto)) return k;
        }
        return null;
    }

    function filtrar(acceso, raiz, porTexto) {
        if (!raiz) return;
        raiz.querySelectorAll(CLICABLES).forEach(el => {
            if (el.dataset.csOculto) return;
            const clave = claveDeElemento(el, porTexto);
            if (!clave || acceso.puedeBoton(clave)) return;

            // Si el botón está solo dentro de una tarjeta, se oculta la tarjeta entera
            let objetivo = el;
            const tarjeta = el.parentElement ? el.parentElement.closest('[class*="card"]') : null;
            if (tarjeta && tarjeta !== raiz && raiz.contains(tarjeta) && tarjeta.querySelectorAll(CLICABLES).length === 1) {
                objetivo = tarjeta;
            }
            objetivo.style.setProperty('display', 'none', 'important');
            objetivo.dataset.csOculto = '1';
            el.dataset.csOculto = '1';
        });
    }

    // Oculta del menú lateral y del contenido los botones de admin que la persona no puede usar,
    // y lo repite si otro script pinta botones más tarde.
    //   porTexto: true -> en el contenido también se reconocen los botones por su texto (panel admin.html)
    function aplicarPermisos(acceso, opciones) {
        const porTexto = !!(opciones && opciones.porTexto);
        const zonas = [
            { el: document.querySelector('.sidebar-nav'), porTexto: false },
            { el: document.querySelector('.main-content'), porTexto: porTexto }
        ];
        zonas.forEach(z => {
            if (!z.el) return;
            filtrar(acceso, z.el, z.porTexto);
            if (typeof MutationObserver === 'function' && !z.el.dataset.csVigilado) {
                z.el.dataset.csVigilado = '1';
                new MutationObserver(() => filtrar(acceso, z.el, z.porTexto))
                    .observe(z.el, { childList: true, subtree: true });
            }
        });
    }

    // Si este archivo está cargado en una página de /admin/ que la persona no puede usar
    // (porque ha escrito la dirección a mano), se la devuelve al panel.
    function protegerPaginaActual() {
        const clave = claveDeDestino(window.location.pathname);
        if (!clave) return;
        miAcceso().then(acceso => {
            if (!acceso.error && !acceso.puedeBoton(clave)) window.location.replace('/admin.html');
        });
    }

    window.ClickSenseRangos = {
        RANGOS, ESPECIALIDADES, BOTONES, CATEGORIAS_TICKETS, PERMISOS,
        rolesDeStaff, rolesDeUsuario, grupoDeCategoria, crearAcceso, miAcceso, aplicarPermisos
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', protegerPaginaActual);
    else protegerPaginaActual();
})();