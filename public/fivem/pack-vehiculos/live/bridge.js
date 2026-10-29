// Puente entre la interfaz NUI real y esta demo web.
// En el juego, la NUI llama a Lua con fetch('https://<recurso>/<callback>') y Lua le habla con
// SendNUIMessage (= window.postMessage). Aquí las respuestas de Lua las da la escena simulada
// (scene.js) registrando sus callbacks en NUI.on('<callback>', fn).
(function () {
    // Solo se aceptan mensajes de la propia web (la escena simulada y la página que contiene la demo).
    // Sin esto, cualquier web que metiera la demo en un iframe podría mandarle mensajes.
    const realAdd = window.addEventListener.bind(window);
    window.addEventListener = (type, fn, opts) => {
        if (type !== 'message' || typeof fn !== 'function') return realAdd(type, fn, opts);
        return realAdd(type, (e) => { if (e.origin === window.location.origin) fn(e); }, opts);
    };

    const handlers = {};
    const realFetch = window.fetch.bind(window);

    window.NUI = {
        on(name, fn) {
            handlers[name] = fn;
        },
        // Lo mismo que SendNUIMessage en Lua
        send(msg) {
            window.postMessage(msg, window.location.origin);
        },
    };

    window.fetch = (url, opts) => {
        const m = typeof url === 'string' && url.match(/^https:\/\/my_[a-z_]+\/([\w-]+)/);
        if (!m) return realFetch(url, opts);
        let data = {};
        try {
            data = opts && opts.body ? JSON.parse(opts.body) : {};
        } catch (e) {}
        const fn = handlers[m[1]];
        return Promise.resolve(fn ? fn(data) : {}).then((res) => ({ json: async () => res ?? {} }));
    };

    // La página que contiene la demo puede pedir que se reinicie o mandar teclas
    window.addEventListener('message', (e) => {
        if (e.data && e.data.demo === 'reset' && window.SCENE && SCENE.reset) SCENE.reset();
    });
})();
