/* =====================================================================
   postulaciones.js · Motor de los formularios de postulación
   Lo usan post-staff.html y post-playmaker.html. post-ilegales.html usa
   solo window.PostulacionesAPI (enviar y listar en el servidor).

   Marcado que espera (ver post-staff.html):
     <form class="pf-wizard" data-tipo="staff" data-max-abiertas="1" novalidate>
       <section class="pf-step" data-title="Sobre ti"> ...campos... </section>
       ...
       <section class="pf-step" data-title="Revisión" data-review> <div class="pf-review"></div> ... </section>
     </form>
     <div id="pfMine"></div>   -> "Mis postulaciones"

   Cada campo va dentro de <div class="pf-field">. Opciones:
     data-show-if="campo:Valor|Otro"  -> solo se ve (y se pide) si "campo" vale eso
     data-autofill="name|username|id" -> se rellena con la cuenta de Discord y no se puede editar
     data-group + data-required       -> grupo de casillas: hay que marcar al menos una
     data-label="Texto"               -> nombre de la pregunta en la revisión (si no, el <label>)
     data-pattern-msg="Texto"         -> mensaje si no cumple el pattern
   ===================================================================== */
(function () {
    'use strict';

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function usuario() {
        try { return JSON.parse(localStorage.getItem('discord_user') || '{}') || {}; } catch (e) { return {}; }
    }

    /* ---------------------------------------------------------------
       Servidor
       --------------------------------------------------------------- */
    async function llamar(url, opciones) {
        let r;
        try {
            r = await fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opciones || {}));
        } catch (e) {
            return { ok: false, status: 0, error: 'No se ha podido conectar con el servidor.' };
        }
        let data = null;
        try { data = await r.json(); } catch (e) {}
        if (r.ok) return { ok: true, status: r.status, data };
        const detalle = data && (typeof data.detail === 'string' ? data.detail : null);
        return { ok: false, status: r.status, error: detalle || ('Error ' + r.status) };
    }

    const API = {
        usuario,
        listar: (tipo) => llamar('/api/postulaciones?tipo=' + encodeURIComponent(tipo)),
        enviar: (tipo, respuestas) => {
            const u = usuario();
            return llamar('/api/postulaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, respuestas, usuario: u.displayName || u.username || '' })
            });
        }
    };
    window.PostulacionesAPI = API;

    const ESTADOS = {
        'Pendiente':   { cls: 'is-pendiente', texto: 'Pendiente' },
        'En revisión': { cls: 'is-revision',  texto: 'En revisión' },
        'Aprobada':    { cls: 'is-aprobada',  texto: 'Aprobada' },
        'Rechazada':   { cls: 'is-rechazada', texto: 'Rechazada' }
    };
    const ABIERTOS = ['Pendiente', 'En revisión'];

    const fecha = iso => {
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    /* ---------------------------------------------------------------
       Aviso flotante
       --------------------------------------------------------------- */
    let toastEl = null, toastTimer = null;
    function toast(texto, tipo) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'pf-toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastEl);
        }
        const icono = tipo === 'error' ? 'fa-circle-exclamation' : (tipo === 'info' ? 'fa-circle-info' : 'fa-circle-check');
        toastEl.className = 'pf-toast' + (tipo === 'error' ? ' is-error' : tipo === 'info' ? ' is-info' : '');
        toastEl.innerHTML = `<i class="fa-solid ${icono}" aria-hidden="true"></i><span>${esc(texto)}</span>`;
        requestAnimationFrame(() => toastEl.classList.add('show'));
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 5200);
    }
    API.toast = toast;

    /* ---------------------------------------------------------------
       Asistente
       --------------------------------------------------------------- */
    function iniciar(form) {
        const tipo = form.dataset.tipo;
        const maxAbiertas = Number(form.dataset.maxAbiertas || 1);
        const steps = Array.from(form.querySelectorAll('.pf-step'));
        const mine = document.getElementById('pfMine');
        const u = usuario();
        const claveBorrador = `pf_borrador_${tipo}_${u.id || 'anon'}`;
        let actual = 0;
        let enviando = false;

        /* --- Estructura: indicador de pasos, barra y botones --- */
        const stepper = document.createElement('ol');
        stepper.className = 'pf-stepper';
        stepper.innerHTML = steps.map((s, i) =>
            `<li data-i="${i}"><span class="pf-num">${i + 1}</span><span class="pf-name">${esc(s.dataset.title || 'Paso ' + (i + 1))}</span></li>`).join('');
        const bar = document.createElement('div');
        bar.className = 'pf-bar';
        bar.innerHTML = '<i></i>';
        // "Paso 2 de 4": solo se ve en el diseño minimalista (.pf-minimal), en lugar de los círculos
        const etiquetaPaso = document.createElement('p');
        etiquetaPaso.className = 'pf-step-label';
        etiquetaPaso.setAttribute('aria-live', 'polite');
        form.prepend(etiquetaPaso, stepper, bar);

        const acciones = document.createElement('div');
        acciones.className = 'pf-actions';
        acciones.innerHTML = `
            <button type="button" class="pf-btn" data-pf="atras"><i class="fa-solid fa-arrow-left"></i> Anterior</button>
            <span class="pf-saved" aria-live="polite"></span>
            <div class="pf-actions__right">
                <button type="button" class="pf-btn pf-btn--ghost" data-pf="vaciar" title="Borrar todas las respuestas"><i class="fa-solid fa-eraser"></i> Vaciar</button>
                <button type="button" class="pf-btn pf-btn--primary" data-pf="siguiente">Continuar <i class="fa-solid fa-arrow-right"></i></button>
                <button type="submit" class="pf-btn pf-btn--primary" data-pf="enviar"><i class="fa-solid fa-paper-plane"></i> Enviar postulación</button>
            </div>`;
        form.appendChild(acciones);
        const btnAtras = acciones.querySelector('[data-pf="atras"]');
        const btnSig = acciones.querySelector('[data-pf="siguiente"]');
        const btnEnviar = acciones.querySelector('[data-pf="enviar"]');
        const guardadoEl = acciones.querySelector('.pf-saved');
        if (form.dataset.submitText) btnEnviar.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${esc(form.dataset.submitText)}`;
        const textoEnviar = btnEnviar.innerHTML;

        // Casilla con data-unlocks-submit: el botón de enviar no se puede pulsar hasta marcarla
        const llaveEnvio = form.querySelector('[data-unlocks-submit]');
        function actualizarEnvio() {
            if (!llaveEnvio) return;
            const bloqueado = !llaveEnvio.checked;
            btnEnviar.disabled = bloqueado;
            btnEnviar.title = bloqueado ? 'Marca la casilla de confirmación para poder enviar' : '';
        }
        if (llaveEnvio) llaveEnvio.addEventListener('change', actualizarEnvio);

        /* --- Mensajes de error y contadores en cada campo --- */
        form.querySelectorAll('.pf-field').forEach(f => {
            if (!f.querySelector('.pf-error')) {
                const meta = document.createElement('div');
                meta.className = 'pf-meta';
                meta.innerHTML = '<span class="pf-error" role="alert"></span>';
                f.appendChild(meta);
            }
            const ta = f.querySelector('textarea.pf-input');
            if (ta && (ta.minLength > 0 || ta.maxLength > 0)) {
                const c = document.createElement('span');
                c.className = 'pf-count';
                f.querySelector('.pf-meta').appendChild(c);
                const pintar = () => {
                    const n = ta.value.trim().length;
                    const min = ta.minLength > 0 ? ta.minLength : 0;
                    c.textContent = min ? `${n} / ${min} mín.` : `${n} / ${ta.maxLength}`;
                    c.classList.toggle('is-ok', min ? n >= min : false);
                };
                ta.addEventListener('input', pintar);
                pintar();
            }
        });

        /* --- Datos de Discord --- */
        form.querySelectorAll('[data-autofill]').forEach(el => {
            const v = { name: u.displayName || u.username, username: u.username, id: u.id }[el.dataset.autofill];
            if (v) { el.value = v; el.readOnly = true; el.title = 'Se rellena con tu cuenta de Discord'; }
        });

        /* --- Campos que dependen de otra respuesta --- */
        const condicionales = Array.from(form.querySelectorAll('[data-show-if]'));
        function valorDe(nombre) {
            const els = form.querySelectorAll(`[name="${nombre}"]`);
            if (!els.length) return '';
            if (els[0].type === 'radio') { const c = Array.from(els).find(e => e.checked); return c ? c.value : ''; }
            if (els[0].type === 'checkbox') return Array.from(els).filter(e => e.checked).map(e => e.value);
            return els[0].value;
        }
        function aplicarCondiciones() {
            condicionales.forEach(f => {
                const [campo, valores] = f.dataset.showIf.split(':');
                const v = valorDe(campo);
                const lista = valores.split('|');
                const ver = Array.isArray(v) ? v.some(x => lista.includes(x)) : lista.includes(v);
                f.hidden = !ver;
                f.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = !ver; });
                if (!ver) f.classList.remove('is-invalid');
            });
        }

        /* --- Validación --- */
        function etiqueta(f) {
            if (f.dataset.label) return f.dataset.label;
            const l = f.querySelector(':scope > label, :scope > .pf-legend');
            return l ? l.textContent.replace('*', '').trim() : '';
        }
        function mensaje(el, f) {
            const v = el.validity;
            if (f.dataset.group !== undefined) return 'Elige al menos una opción.';
            if (v.valueMissing) {
                if (el.type === 'checkbox') return 'Tienes que marcar esta casilla para poder enviar.';
                if (el.type === 'radio' || el.tagName === 'SELECT') return 'Elige una opción.';
                return 'Este campo es obligatorio.';
            }
            if (v.tooShort) return `Escribe al menos ${el.minLength} caracteres (llevas ${el.value.trim().length}).`;
            if (v.tooLong) return `Como máximo ${el.maxLength} caracteres.`;
            if (v.typeMismatch && el.type === 'url') return 'Pon el enlace completo, empezando por https://';
            if (v.patternMismatch) return el.dataset.patternMsg || 'El formato no es válido.';
            if (v.rangeUnderflow && el.dataset.minMsg) return el.dataset.minMsg;
            if (v.rangeUnderflow || v.rangeOverflow) return `Debe estar entre ${el.min} y ${el.max}.`;
            if (v.badInput) return 'Escribe solo números.';
            return el.validationMessage || 'Revisa este campo.';
        }
        // Comprobaciones que el navegador no hace por sí solo: una respuesta hecha solo de espacios
        // y el mínimo de caracteres en textos recuperados del borrador (el navegador solo lo mira al teclear)
        function recortado(el) {
            if (!('value' in el) || el.type === 'checkbox' || el.type === 'radio') return '';
            const n = el.value.trim().length;
            if (el.required && n === 0) return 'Este campo es obligatorio.';
            if (el.minLength > 0 && n > 0 && n < el.minLength) return `Escribe al menos ${el.minLength} caracteres (llevas ${n}).`;
            return '';
        }
        function validarCampo(f) {
            if (f.hidden) return true;
            const err = f.querySelector('.pf-error');
            let malo = '';
            if (f.dataset.group !== undefined) {
                if (f.dataset.required !== undefined && !f.querySelector('input:checked')) malo = 'Elige al menos una opción.';
            } else {
                const el = f.querySelector('input:not([type=hidden]), select, textarea');
                if (el && !el.disabled) malo = recortado(el) || (el.checkValidity() ? '' : mensaje(el, f));
            }
            f.classList.toggle('is-invalid', !!malo);
            if (err) err.textContent = malo;
            f.querySelectorAll('input, select, textarea').forEach(el => el.setAttribute('aria-invalid', malo ? 'true' : 'false'));
            return !malo;
        }
        function validarPaso(i) {
            const campos = Array.from(steps[i].querySelectorAll('.pf-field'));
            const malos = campos.filter(f => !validarCampo(f));
            if (malos.length) {
                const primero = malos[0].querySelector('input, select, textarea');
                malos[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (primero) setTimeout(() => primero.focus({ preventScroll: true }), 250);
                toast(malos.length === 1 ? 'Revisa el campo marcado en rojo.' : `Revisa los ${malos.length} campos marcados en rojo.`, 'error');
            }
            return !malos.length;
        }
        form.addEventListener('focusout', (e) => {
            const f = e.target.closest && e.target.closest('.pf-field');
            if (f && f.dataset.group === undefined && e.target.value !== '') validarCampo(f);
        });
        form.addEventListener('input', (e) => {
            const f = e.target.closest && e.target.closest('.pf-field');
            if (f && f.classList.contains('is-invalid')) validarCampo(f);
        });
        form.addEventListener('change', (e) => {
            aplicarCondiciones();
            const f = e.target.closest && e.target.closest('.pf-field');
            if (f && f.classList.contains('is-invalid')) validarCampo(f);
        });

        /* --- Respuestas --- */
        function recoger() {
            const respuestas = {};
            const preguntas = {};
            const fases = {};      // en qué fase está cada pregunta (para enseñarlas agrupadas después)
            form.querySelectorAll('.pf-field').forEach(f => {
                if (f.hidden) return;
                const els = Array.from(f.querySelectorAll('[name]')).filter(el => !el.disabled);
                if (!els.length) return;
                const nombre = els[0].name;
                let valor;
                if (els[0].type === 'radio') { const c = els.find(e => e.checked); valor = c ? c.value : ''; }
                else if (els[0].type === 'checkbox' && els.length > 1) valor = els.filter(e => e.checked).map(e => e.value);
                else if (els[0].type === 'checkbox') valor = els[0].checked;
                else valor = els[0].value.trim();
                if (valor === '' || (Array.isArray(valor) && !valor.length)) return;
                respuestas[nombre] = valor;
                preguntas[nombre] = etiqueta(f);
                const paso = f.closest('.pf-step');
                if (paso) fases[nombre] = paso.dataset.review !== undefined ? 'Confirmación' : (paso.dataset.title || '');
            });
            respuestas._preguntas = preguntas;
            respuestas._fases = fases;
            return respuestas;
        }

        /* --- Revisión antes de enviar --- */
        function pintarRevision() {
            const caja = form.querySelector('[data-review] .pf-review');
            if (!caja) return;
            const r = recoger();
            caja.innerHTML = steps.filter(s => s.dataset.review === undefined).map((s) => {
                const filas = Array.from(s.querySelectorAll('.pf-field')).filter(f => !f.hidden).map(f => {
                    const el = f.querySelector('[name]');
                    if (!el) return '';
                    let v = r[el.name];
                    if (v === undefined) return '';
                    if (Array.isArray(v)) v = v.join(', ');
                    if (v === true) v = 'Sí';
                    return `<dt>${esc(etiqueta(f))}</dt><dd>${esc(v)}</dd>`;
                }).join('');
                const i = steps.indexOf(s);
                return `
                    <div class="pf-review__group">
                        <div class="pf-review__head"><span>${i + 1}. ${esc(s.dataset.title)}</span>
                            <button type="button" class="pf-review__edit" data-ir="${i}"><i class="fa-solid fa-pen"></i> Editar</button></div>
                        <dl>${filas || '<dt>—</dt><dd>Sin respuestas</dd>'}</dl>
                    </div>`;
            }).join('<hr class="pf-phase-sep">');   // línea entre fase y fase
        }
        form.addEventListener('click', (e) => {
            const b = e.target.closest('[data-ir]');
            if (b) irA(Number(b.dataset.ir));
        });

        /* --- Navegación entre pasos --- */
        function irA(i) {
            actual = Math.max(0, Math.min(i, steps.length - 1));
            steps.forEach((s, n) => s.classList.toggle('is-active', n === actual));
            stepper.querySelectorAll('li').forEach((li, n) => {
                li.classList.toggle('is-active', n === actual);
                li.classList.toggle('is-done', n < actual);
                li.querySelector('.pf-num').innerHTML = n < actual ? '<i class="fa-solid fa-check"></i>' : String(n + 1);
                if (n === actual) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
                li.style.cursor = n < actual ? 'pointer' : 'default';
            });
            bar.firstElementChild.style.width = ((actual + 1) / steps.length * 100) + '%';
            etiquetaPaso.innerHTML = `Paso ${actual + 1} de ${steps.length}<span>${esc(steps[actual].dataset.title || '')}</span>`;
            const ultimo = actual === steps.length - 1;
            btnAtras.style.visibility = actual === 0 ? 'hidden' : 'visible';
            btnSig.hidden = ultimo;
            btnEnviar.hidden = !ultimo;
            if (steps[actual].dataset.review !== undefined) pintarRevision();
            actualizarEnvio();
            guardarBorrador();
            const top = form.getBoundingClientRect().top + window.scrollY - 90;
            if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
        }
        stepper.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li && Number(li.dataset.i) < actual) irA(Number(li.dataset.i));
        });
        btnAtras.addEventListener('click', () => irA(actual - 1));
        btnSig.addEventListener('click', () => { if (validarPaso(actual)) irA(actual + 1); });
        // Enter en un campo de texto pasa al siguiente paso en vez de enviar
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT' && actual < steps.length - 1) {
                e.preventDefault();
                btnSig.click();
            }
        });

        /* --- Borrador automático --- */
        let tBorrador = null;
        let tocado = false;   // no se guarda nada hasta que el usuario escribe o elige algo
        function guardarBorrador(e) {
            if (e && e.isTrusted) tocado = true;
            if (!tocado) return;
            clearTimeout(tBorrador);
            tBorrador = setTimeout(() => {
                const datos = { paso: actual, valores: {} };
                form.querySelectorAll('[name]').forEach(el => {
                    if (el.readOnly || el.hasAttribute('data-unlocks-submit')) return;
                    if (el.type === 'radio' || el.type === 'checkbox') {
                        if (!datos.valores[el.name]) datos.valores[el.name] = [];
                        if (el.checked) datos.valores[el.name].push(el.value);
                    } else if (el.value) datos.valores[el.name] = el.value;
                });
                try {
                    localStorage.setItem(claveBorrador, JSON.stringify(datos));
                    const h = new Date();
                    guardadoEl.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Borrador guardado ${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}`;
                } catch (e) {}
            }, 400);
        }
        function recuperarBorrador() {
            let datos = null;
            try { datos = JSON.parse(localStorage.getItem(claveBorrador) || 'null'); } catch (e) {}
            if (!datos || !datos.valores) return false;
            let hay = false;
            Object.entries(datos.valores).forEach(([nombre, valor]) => {
                form.querySelectorAll(`[name="${CSS.escape(nombre)}"]`).forEach(el => {
                    if (el.readOnly) return;
                    if (el.type === 'radio' || el.type === 'checkbox') {
                        el.checked = Array.isArray(valor) && valor.includes(el.value);
                        if (el.checked) hay = true;
                    } else { el.value = valor; if (valor) hay = true; }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
            aplicarCondiciones();
            if (hay) {
                // Se vuelve al paso donde se dejó, sin saltarse la validación de los anteriores
                let destino = 0;
                while (destino < Math.min(datos.paso || 0, steps.length - 1) &&
                       Array.from(steps[destino].querySelectorAll('.pf-field')).every(f => validarCampoSilencioso(f))) destino++;
                irA(destino);
                toast('Hemos recuperado el borrador que dejaste a medias.', 'info');
            }
            return hay;
        }
        function validarCampoSilencioso(f) {
            if (f.hidden) return true;
            if (f.dataset.group !== undefined) return f.dataset.required === undefined || !!f.querySelector('input:checked');
            const el = f.querySelector('input:not([type=hidden]), select, textarea');
            return !el || el.disabled || (el.checkValidity() && !recortado(el));
        }
        form.addEventListener('input', guardarBorrador);
        form.addEventListener('change', guardarBorrador);

        acciones.querySelector('[data-pf="vaciar"]').addEventListener('click', () => {
            if (!confirm('¿Seguro que quieres borrar todas tus respuestas y empezar de cero?')) return;
            form.querySelectorAll('[name]').forEach(el => {
                if (el.readOnly) return;
                if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
                else el.value = '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
            });
            form.querySelectorAll('.pf-field.is-invalid').forEach(f => f.classList.remove('is-invalid'));
            try { localStorage.removeItem(claveBorrador); } catch (e) {}
            tocado = false;
            clearTimeout(tBorrador);
            guardadoEl.textContent = '';
            aplicarCondiciones();
            irA(0);
        });

        /* --- Enviar --- */
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (enviando) return;
            for (let i = 0; i < steps.length; i++) {
                if (!Array.from(steps[i].querySelectorAll('.pf-field')).every(validarCampoSilencioso)) {
                    irA(i);
                    validarPaso(i);
                    return;
                }
            }
            enviando = true;
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<i class="fa-solid fa-spinner"></i> Enviando...';

            const res = await API.enviar(tipo, recoger());

            enviando = false;
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = textoEnviar;
            actualizarEnvio();

            if (res.ok) {
                try { localStorage.removeItem(claveBorrador); } catch (err) {}
                mostrarResultado('ok', res.data);
                cargarMias();
                return;
            }
            if (res.status === 401) {
                toast('Tu sesión ha caducado. Vuelve a iniciar sesión con Discord; tus respuestas siguen guardadas.', 'error');
                return;
            }
            if (res.status === 409) {
                toast(res.error, 'error');
                cargarMias();
                return;
            }
            toast((res.status ? res.error : 'No se ha podido conectar con el servidor.') + ' Tus respuestas siguen guardadas; inténtalo de nuevo.', 'error');
        });

        /* --- Pantallas de resultado (enviada / ya tienes una en curso) --- */
        const resultado = document.createElement('div');
        resultado.className = 'pf-result';
        resultado.hidden = true;
        form.after(resultado);

        // Espera mínima entre envíos (data-espera-horas="12"): cuándo se podrá enviar la siguiente
        const esperaHoras = Number(form.dataset.esperaHoras || 0);
        let misPostulaciones = [];
        let tEspera = null;
        function proximoEnvio(lista) {
            if (!esperaHoras || !lista.length) return 0;
            const ultima = Math.max(...lista.map(p => new Date(p.fecha).getTime() || 0));
            const t = ultima + esperaHoras * 3600 * 1000;
            return t > Date.now() ? t : 0;
        }
        const horaYDia = t => new Date(t).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        function faltan(t) {
            const min = Math.max(1, Math.ceil((t - Date.now()) / 60000));
            const h = Math.floor(min / 60), m = min % 60;
            return h ? `${h} h ${m} min` : `${m} min`;
        }

        function mostrarResultado(clase, p) {
            form.hidden = true;
            resultado.hidden = false;
            const card = resultado.closest('.pf-card') || resultado.parentElement;
            const verBtn = p ? `<button type="button" class="pf-btn" data-ver="${esc(p.id)}"><i class="fa-solid fa-eye"></i> Ver mis respuestas</button>` : '';
            if (clase === 'ok') {
                const siguiente = esperaHoras ? `<br>Podrás enviar otra dentro de ${esperaHoras} horas.` : '';
                resultado.innerHTML = `
                    <div class="pf-result__icon"><i class="fa-solid fa-paper-plane"></i></div>
                    <h2>¡Postulación enviada!</h2>
                    <p>Tu código es <span class="pf-code">${esc(p.id)}</span>. El staff la revisará y te avisaremos por <b>mensaje privado de Discord</b> cuando cambie de estado. Ten los MD abiertos.${siguiente}</p>
                    <div class="pf-result__actions">${verBtn}<a class="pf-btn pf-btn--primary" href="/home.html"><i class="fa-solid fa-house"></i> Volver al inicio</a></div>`;
            } else if (clase === 'espera') {
                resultado.innerHTML = `
                    <div class="pf-result__icon is-warn"><i class="fa-solid fa-clock"></i></div>
                    <h2>Podrás enviar otra en ${esc(faltan(p.siguiente))}</h2>
                    <p>Solo se puede enviar una postulación cada ${esperaHoras} horas. Tu última, <span class="pf-code">${esc(p.id)}</span>, se envió el ${esc(fecha(p.fecha))}. El formulario volverá a estar disponible el <b>${esc(horaYDia(p.siguiente))}</b>.</p>
                    <div class="pf-result__actions">${verBtn}</div>`;
            } else {
                const est = ESTADOS[p.estado] || ESTADOS.Pendiente;
                resultado.innerHTML = `
                    <div class="pf-result__icon is-warn"><i class="fa-solid fa-hourglass-half"></i></div>
                    <h2>Ya tienes una postulación en curso</h2>
                    <p>Tu postulación <span class="pf-code">${esc(p.id)}</span> está <span class="pf-badge ${est.cls}">${esc(est.texto)}</span>. Cuando el staff responda podrás volver a enviar otra si hace falta.</p>
                    <div class="pf-result__actions">${verBtn}</div>`;
            }
            if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        function volverAlFormulario() {
            resultado.hidden = true;
            form.hidden = false;
            irA(0);
        }

        /* --- Mis postulaciones --- */
        async function cargarMias() {
            if (!mine) return;
            const res = await API.listar(tipo);
            if (!res.ok) {
                mine.innerHTML = `<div class="pf-empty"><i class="fa-solid fa-plug-circle-xmark"></i>${res.status === 401 ? 'Inicia sesión para ver tus postulaciones.' : 'No se han podido cargar tus postulaciones.'}</div>`;
                return;
            }
            // El staff recibe todas; aquí solo se enseñan las del propio usuario
            const lista = (res.data || []).filter(p => !u.id || String(p.discordId) === String(u.id));
            misPostulaciones = lista;
            if (!lista.length) {
                mine.innerHTML = '<div class="pf-empty"><i class="fa-regular fa-folder-open"></i>Todavía no has enviado ninguna postulación.</div>';
            } else {
                mine.innerHTML = lista.map(p => {
                    const est = ESTADOS[p.estado] || ESTADOS.Pendiente;
                    // Toda la tarjeta abre la ventana con las respuestas (también con Enter / espacio)
                    return `
                        <div class="pf-app is-clickable" data-ver="${esc(p.id)}" role="button" tabindex="0"
                             aria-label="Ver las respuestas de la postulación ${esc(p.id)}">
                            <div class="pf-app__top"><span class="pf-app__id">${esc(p.id)}</span><span class="pf-badge ${est.cls}">${esc(est.texto)}</span></div>
                            <div class="pf-app__date">Enviada el ${esc(fecha(p.fecha))}${p.fechaEstado && p.estado !== 'Pendiente' ? ' · actualizada el ' + esc(fecha(p.fechaEstado)) : ''}</div>
                            ${p.nota ? `<div class="pf-app__note"><b>Nota del staff</b>${esc(p.nota)}</div>` : ''}
                            <span class="pf-app__go" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>
                        </div>`;
                }).join('');
            }

            // Bloqueos: postulación abierta (si hay límite) o espera entre envíos
            const abiertas = lista.filter(p => ABIERTOS.includes(p.estado));
            const siguiente = proximoEnvio(lista);
            clearTimeout(tEspera);
            if (maxAbiertas > 0 && abiertas.length >= maxAbiertas) {
                if (!form.hidden) mostrarResultado('bloqueado', abiertas[0]);
            } else if (siguiente) {
                const ultima = lista.slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
                // Si se acaba de enviar se deja la pantalla de "enviada"; si no, la de espera
                if (!form.hidden || !resultado.querySelector('.pf-result__icon:not(.is-warn)')) {
                    mostrarResultado('espera', Object.assign({}, ultima, { siguiente }));
                }
                // Cuando se cumplen las horas, el formulario vuelve solo
                const ms = Math.min(siguiente - Date.now() + 1000, 2147483000);
                tEspera = setTimeout(() => { volverAlFormulario(); toast('Ya puedes enviar una nueva postulación.', 'info'); }, ms);
            } else if (form.hidden && resultado.querySelector('.pf-result__icon.is-warn')) {
                volverAlFormulario();
            }
        }

        /* --- Ver todas las respuestas de una postulación enviada --- */
        document.addEventListener('click', (e) => {
            const b = e.target.closest && e.target.closest('[data-ver]');
            if (!b) return;
            const p = misPostulaciones.find(x => x.id === b.dataset.ver);
            if (p) abrirRespuestas(p, b);
        });
        if (mine) mine.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const b = e.target.closest && e.target.closest('.pf-app[data-ver]');
            if (!b) return;
            e.preventDefault();
            b.click();
        });

        /* --- Arranque --- */
        aplicarCondiciones();
        irA(0);
        recuperarBorrador();
        cargarMias();
    }

    /* ---------------------------------------------------------------
       Ventana con todas las respuestas de una postulación enviada
       (mismo formato que la fase de REVISIÓN, agrupadas por fases)
       --------------------------------------------------------------- */
    let modalEl = null, focoModal = null;

    function formatoValor(v) {
        if (v === true) return 'Sí';
        if (v === false) return 'No';
        if (Array.isArray(v)) {
            if (v.length && typeof v[0] === 'object') {
                return v.map(o => Object.entries(o || {}).map(([k, x]) => `${k}: ${x}`).join(' · ')).join('\n');
            }
            return v.join(', ');
        }
        if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join('\n');
        return String(v ?? '');
    }

    function cerrarRespuestas() {
        if (!modalEl || modalEl.hidden) return;
        modalEl.classList.remove('show');
        setTimeout(() => { modalEl.hidden = true; }, 200);
        document.documentElement.style.overflow = '';
        if (focoModal && focoModal.focus) focoModal.focus();
    }

    function abrirRespuestas(p, origen) {
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.className = 'pf-modal';
            modalEl.hidden = true;
            modalEl.setAttribute('role', 'dialog');
            modalEl.setAttribute('aria-modal', 'true');
            modalEl.setAttribute('aria-labelledby', 'pfModalTitle');
            document.body.appendChild(modalEl);
            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl || (e.target.closest && e.target.closest('[data-cerrar]'))) cerrarRespuestas();
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarRespuestas(); });
        }

        const r = p.respuestas || {};
        const preguntas = r._preguntas || {};
        const fases = r._fases || {};
        const claves = Object.keys(preguntas).length
            ? Object.keys(preguntas).filter(k => k in r)
            : Object.keys(r).filter(k => !k.startsWith('_'));

        // Se agrupan por fase, en el mismo orden en que se respondieron
        const grupos = [];
        const indice = {};
        claves.forEach(k => {
            const g = fases[k] || 'Respuestas';
            if (!(g in indice)) { indice[g] = grupos.length; grupos.push({ nombre: g, filas: [] }); }
            grupos[indice[g]].filas.push([preguntas[k] || k, formatoValor(r[k])]);
        });

        const est = ESTADOS[p.estado] || ESTADOS.Pendiente;
        modalEl.innerHTML = `
            <div class="pf-modal__box">
                <header class="pf-modal__head">
                    <div>
                        <span class="pf-eyebrow">Postulación enviada</span>
                        <h2 id="pfModalTitle">${esc(p.id)} <span class="pf-badge ${est.cls}">${esc(est.texto)}</span></h2>
                        <p>Enviada el ${esc(fecha(p.fecha))}${p.fechaEstado && p.estado !== 'Pendiente' ? ' · actualizada el ' + esc(fecha(p.fechaEstado)) : ''}</p>
                    </div>
                    <button type="button" class="pf-modal__close" data-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <div class="pf-modal__body">
                    ${p.nota ? `<div class="pf-app__note"><b>Nota del staff</b>${esc(p.nota)}</div>` : ''}
                    <div class="pf-review">
                        ${grupos.map((g, i) => `
                            <div class="pf-review__group">
                                <div class="pf-review__head"><span>${grupos.length > 1 ? (i + 1) + '. ' : ''}${esc(g.nombre).toUpperCase()}</span></div>
                                <dl>${g.filas.map(([q, v]) => `<dt>${esc(q)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
                            </div>`).join('<hr class="pf-phase-sep">') || '<div class="pf-empty">Esta postulación no tiene respuestas guardadas.</div>'}
                    </div>
                </div>
            </div>`;

        focoModal = origen || document.activeElement;
        modalEl.hidden = false;
        document.documentElement.style.overflow = 'hidden';
        requestAnimationFrame(() => modalEl.classList.add('show'));
        modalEl.querySelector('.pf-modal__close').focus();
    }

    /* ---------------------------------------------------------------
       Botón de Soporte (mismo menú que home1.html)
       <button id="pfSupportBtn"> + <div id="pfSupportMenu" class="pf-support-menu">
       --------------------------------------------------------------- */
    function iniciarSoporte() {
        const btn = document.getElementById('pfSupportBtn');
        const menu = document.getElementById('pfSupportMenu');
        if (!btn || !menu) return;
        document.body.appendChild(menu);   // fuera del contenido, para que nada lo tape
        const colocar = () => {
            const r = btn.getBoundingClientRect();
            menu.style.top = (r.bottom + 8) + 'px';
            menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
        };
        const abrir = (si) => {
            if (si) colocar();
            menu.classList.toggle('show', si);
            btn.setAttribute('aria-expanded', String(si));
        };
        btn.addEventListener('click', (e) => { e.stopPropagation(); abrir(!menu.classList.contains('show')); });
        document.addEventListener('click', (e) => { if (!menu.contains(e.target)) abrir(false); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('show')) { abrir(false); btn.focus(); }
        });
        window.addEventListener('resize', () => abrir(false));
        window.addEventListener('scroll', () => { if (menu.classList.contains('show')) colocar(); }, { passive: true });
    }

    function arrancar() {
        iniciarSoporte();
        document.querySelectorAll('form.pf-wizard[data-tipo]').forEach(iniciar);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
})();
