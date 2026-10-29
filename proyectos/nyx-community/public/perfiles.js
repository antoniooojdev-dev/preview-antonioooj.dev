const express = require('express');
const fs = require('fs');
const router = express.Router();

const PERFIL_FILE = './data/perfiles.json';
const leerPerfiles = () => { try { return JSON.parse(fs.readFileSync(PERFIL_FILE, 'utf8')); } catch { return {}; } };

// ADAPTA ESTA LÍNEA: debe devolver el ID de Discord de quien tiene la sesión iniciada
const sessionUserId = req => String(req.session?.user?.id || '');

function limpiarRedes(r) {
    const out = {};
    ['instagram', 'youtube', 'twitch', 'kick'].forEach(k => {
        const v = String((r && r[k]) || '').trim();
        if (!v || v.length > 200) return;
        if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:\/\//i.test(v)) return;
        out[k] = v;
    });
    return out;
}
const normalizar = d => ({
    redes: limpiarRedes(d && d.redes),
    publico: !d || d.publico !== false,
    mostrar: {
        redes: !d?.mostrar || d.mostrar.redes !== false,
        fotos: !d?.mostrar || d.mostrar.fotos !== false,
        sugerencias: !d?.mostrar || d.mostrar.sugerencias !== false
    }
});

router.get('/perfil-settings', (req, res) => {
    const id = String(req.query.userId || '');
    const p = normalizar(leerPerfiles()[id]);
    const esDueno = sessionUserId(req) === id;
    if (!p.publico && !esDueno) return res.json({ publico: false });
    if (!esDueno && !p.mostrar.redes) p.redes = {};
    res.json(p);
});

router.post('/perfil-settings', (req, res) => {
    const yo = sessionUserId(req);
    if (!yo) return res.status(401).end();
    const todos = leerPerfiles();
    todos[yo] = normalizar(req.body);
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(PERFIL_FILE, JSON.stringify(todos));
    res.json({ ok: true });
});

router.get('/perfiles-publicos', (req, res) => {
    const todos = leerPerfiles(), out = {};
    for (const id in todos) {
        const p = normalizar(todos[id]);
        if (p.publico) out[id] = { publico: true, redes: p.mostrar.redes ? p.redes : {} };
    }
    res.json(out);
});

module.exports = router;