// Copia la NUI real de antoniooojdev_admincar (/admincar, menú de handling) a la demo jugable
// del «Menú de handling» (public/fivem/menu-handling/live/admincar/) y le mete la escena:
// la web abre el panel en el mismo modo prueba que /prueba en el juego (web/demo.js), con
// coches de ejemplo y los campos sacados de shared/handling.lua. No toca ningún servidor.
// Uso: node tools/sync-handling-live.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RES = "C:/Users/anton/Desktop/Servidor_Local/txData/ESXLegacy_8639CB.base/resources/antoniooojdev_admincar";
const LIVE = join(dirname(fileURLToPath(import.meta.url)), "../public/fivem/menu-handling/live");
const OUT = join(LIVE, "admincar");
mkdirSync(OUT, { recursive: true });

for (const f of ["style.css", "themes.css", "app.js", "demo.js"]) writeFileSync(join(OUT, f), readFileSync(join(RES, "web", f)));
cpSync(join(RES, "web/fa"), join(LIVE, "fa"), { recursive: true });

// ── shared/handling.lua → JSON (grupos y campos) ──
const lua = readFileSync(join(RES, "shared/handling.lua"), "utf8").replace(/^\s*--[^\n]*/gm, "");
function tabla(nombre) {
  const ini = lua.indexOf(`${nombre} = {`);
  if (ini < 0) throw new Error(`No encuentro ${nombre} en handling.lua`);
  const filas = [];
  const re = /\{([^{}]*)\}/g;
  re.lastIndex = ini + nombre.length + 4;
  const fin = lua.indexOf("\n}", ini);
  let m;
  while ((m = re.exec(lua)) && m.index < fin) {
    const o = {};
    const par = /(\w+)\s*=\s*('(?:[^'\\]|\\.)*'|-?[\d.]+)/g;
    let p;
    while ((p = par.exec(m[1]))) o[p[1]] = p[2].startsWith("'") ? p[2].slice(1, -1).replace(/\\'/g, "'") : Number(p[2]);
    filas.push(o);
  }
  return filas;
}
const datos = { groups: tabla("HandlingGroups"), fields: tabla("HandlingFields") };
writeFileSync(join(OUT, "handling.js"), `// Generado por tools/sync-handling-live.mjs desde shared/handling.lua\nwindow.HANDLING = ${JSON.stringify(datos)};\n`);

// ── index.html ──
let html = readFileSync(join(RES, "web/index.html"), "utf8");
const once = (from, to) => {
  if (!html.includes(from)) throw new Error(`No encuentro «${from}» en index.html`);
  html = html.replace(from, to);
};
html = html.replaceAll('href="fa/', 'href="../fa/');
once('<link rel="stylesheet" href="themes.css">', '<link rel="stylesheet" href="themes.css">\n    <link rel="stylesheet" href="scene.css">');
once("<body>", '<body>\n    <div id="scene"></div>');
once('<script src="app.js"></script>', '<script src="shim.js"></script>\n    <script src="handling.js"></script>\n    <script src="app.js"></script>');
once('<script src="demo.js"></script>', '<script src="demo.js"></script>\n    <script src="scene.js"></script>');
html = html.replace("<head>", '<head>\n    <meta name="robots" content="noindex">');
writeFileSync(join(OUT, "index.html"), html);
console.log(`✓ admincar ← antoniooojdev_admincar (${datos.groups.length} grupos, ${datos.fields.length} campos)`);
