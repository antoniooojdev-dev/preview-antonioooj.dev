/* =====================================================================
   cabecera.js · Mueve el "pulgar" de los selectores .cab-seg (cabecera.css)
   hasta el botón marcado con .on, como el de sugerencias.html.
   Cada página decide qué hace cada botón; aquí solo se mueve el pulgar.
   Uso desde la página: window.cabMoverPulgar(seg) tras cambiar el .on.
   ===================================================================== */
(function () {
    'use strict';
    // Marcado: .on (o .active, que usan algunas páginas como tickets.html)
    function mover(seg) {
        const on = seg.querySelector('button.on, button.active');
        let thumb = seg.querySelector('.cab-seg-thumb');
        if (!thumb) {
            thumb = document.createElement('span');
            thumb.className = 'cab-seg-thumb';
            thumb.setAttribute('aria-hidden', 'true');
            seg.prepend(thumb);
        }
        if (!on) { thumb.style.width = '0'; return; }
        thumb.style.width = on.offsetWidth + 'px';
        thumb.style.transform = `translateX(${on.offsetLeft}px)`;
    }
    const todos = () => document.querySelectorAll('.cab-seg').forEach(mover);
    window.cabMoverPulgar = mover;

    // Al pulsar un botón del selector se marca y se mueve el pulgar
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('.cab-seg button');
        if (!b) return;
        const seg = b.closest('.cab-seg');
        seg.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
        mover(seg);
    });

    // Si la página cambia el botón marcado desde su código (sin clic), el pulgar le sigue
    function vigilar() {
        document.querySelectorAll('.cab-seg').forEach(seg => {
            if (seg.__cabVigilado) return;
            seg.__cabVigilado = true;
            new MutationObserver(() => mover(seg)).observe(seg, { attributes: true, attributeFilter: ['class'], subtree: true });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { todos(); vigilar(); }); else { todos(); vigilar(); }
    window.addEventListener('load', todos);
    window.addEventListener('resize', todos);
    if (document.fonts) document.fonts.ready.then(todos);
})();
