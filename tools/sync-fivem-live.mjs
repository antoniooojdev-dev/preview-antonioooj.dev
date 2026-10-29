// Copia las NUI reales de los scripts de FiveM a las demos jugables del «Pack vehículos»
// (public/fivem/pack-vehiculos/live/<demo>/) e inyecta la escena simulada.
// Uso: node tools/sync-fivem-live.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCES = "C:/Users/anton/Desktop/Servidor_Local/txData/ESXLegacy_8639CB.base/resources";
const LIVE = join(dirname(fileURLToPath(import.meta.url)), "../public/fivem/pack-vehiculos/live");

const DEMOS = {
  dealer: "my_dealership",
  fuel: "my_fuel",
  speedo: "my_speedo",
};

for (const [demo, resource] of Object.entries(DEMOS)) {
  const src = join(RESOURCES, resource, "web");
  const out = join(LIVE, demo);
  mkdirSync(out, { recursive: true });

  for (const f of ["style.css", "script.js"]) writeFileSync(join(out, f), readFileSync(join(src, f)));

  let html = readFileSync(join(src, "index.html"), "utf8");
  const once = (from, to) => {
    if (!html.includes(from)) throw new Error(`${demo}: no encuentro «${from}» en index.html`);
    html = html.replace(from, to);
  };
  html = html.replaceAll('href="fa/', 'href="../fa/');
  once('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css">\n    <link rel="stylesheet" href="../scene-common.css">\n    <link rel="stylesheet" href="scene.css">');
  once("<body>", '<body>\n    <div id="scene"></div>');
  once('<script src="script.js"></script>', '<script src="../bridge.js"></script>\n    <script src="script.js"></script>\n    <script src="../scene-common.js"></script>\n    <script src="scene.js"></script>');
  html = html.replace("<head>", '<head>\n    <meta name="robots" content="noindex">');
  writeFileSync(join(out, "index.html"), html);
  console.log(`✓ ${demo} ← ${resource}`);
}
