// Hace de Lua para la demo web: las llamadas fetch('https://antoniooojdev_admincar/...') de la NUI
// no salen a ningún sitio. En modo prueba casi todas las responde demo.js; aquí solo queda cerrar.
(function () {
    const realFetch = window.fetch.bind(window);
    window.fetch = function (url, opts) {
        if (typeof url === 'string' && url.startsWith('https://antoniooojdev_admincar/')) {
            const name = url.split('/').pop();
            if (name === 'demoClose' || name === 'close') setTimeout(() => window.postMessage({ action: 'close' }, location.origin), 0);
            const body = name === 'demoClose' || name === 'close' ? { ok: true } : { ok: false, error: 'En la web no hay juego detrás' };
            return Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }));
        }
        return realFetch(url, opts);
    };
})();
