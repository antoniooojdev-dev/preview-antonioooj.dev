// Graba los vídeos y saca las capturas del «Pack vehículos» jugando de verdad con las demos
// (public/fivem/pack-vehiculos/live). Controla Chrome por el protocolo de depuración (CDP),
// sin dependencias: teclado, ratón, capturas WebP y screencast que se codifica a WebM en el
// propio navegador (MediaRecorder).
//
// Uso: node tools/capture-fivem-media.mjs [dealer|fuel|speedo|all] [--shots-only]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = join(ROOT, "public/fivem/pack-vehiculos/live");
const OUT = join(ROOT, "public/fivem/pack-vehiculos/media");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });

// ───────────────────────── CDP ─────────────────────────
class Page {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        (this.listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
  off(method) {
    this.listeners.delete(method);
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async goto(url) {
    const loaded = new Promise((r) => this.on("Page.loadEventFired", r));
    await this.send("Page.navigate", { url });
    await loaded;
    this.off("Page.loadEventFired");
    await this.eval("document.fonts.ready.then(() => true)");
    await sleep(600);
  }
  // Teclado
  async key(code, { hold = 0 } = {}) {
    const key = code.startsWith("Key") ? code.slice(3).toLowerCase() : code.startsWith("Digit") ? code.slice(5) : code;
    const vk = code.startsWith("Key") ? code.charCodeAt(3) : code.startsWith("Digit") ? code.charCodeAt(5) : { Escape: 27, Enter: 13, ArrowLeft: 37, ArrowRight: 39 }[code] || 0;
    await this.send("Input.dispatchKeyEvent", { type: "rawKeyDown", code, key, windowsVirtualKeyCode: vk });
    if (hold) await sleep(hold);
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", code, key, windowsVirtualKeyCode: vk });
  }
  // Ratón
  async box(sel) {
    const b = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    if (!b) throw new Error(`No encuentro ${sel}`);
    return b;
  }
  async move(x, y) {
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  }
  async click(sel, { hold = 0 } = {}) {
    const { x, y } = await this.box(sel);
    await this.move(x, y);
    await sleep(120);
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    if (hold) await sleep(hold);
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  async drag(sel, dx, steps = 30) {
    const { x, y } = await this.box(sel);
    await this.move(x, y);
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    for (let i = 1; i <= steps; i++) {
      await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + (dx * i) / steps, y, button: "left", buttons: 1 });
      await sleep(25);
    }
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + dx, y, button: "left", clickCount: 1 });
  }
  async shot(name) {
    const r = await this.send("Page.captureScreenshot", { format: "webp", quality: 82 });
    writeFileSync(join(OUT, `${name}.webp`), Buffer.from(r.data, "base64"));
    console.log(`  📸 ${name}.webp`);
  }
  // Screencast → frames con su tiempo
  async startRec() {
    this.frames = [];
    this.on("Page.screencastFrame", (p) => {
      this.frames.push({ t: p.metadata.timestamp, data: p.data });
      this.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
    });
    await this.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  }
  async stopRec() {
    await sleep(300);
    await this.send("Page.stopScreencast");
    this.off("Page.screencastFrame");
    return this.frames;
  }
}

async function launch() {
  const profile = join(tmpdir(), `fivem-media-${Date.now()}`);
  const proc = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--window-size=1920,1080",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ]);
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/json/version`);
      break;
    } catch {
      await sleep(200);
    }
  }
  const open = async () => {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r));
    const p = new Page(ws);
    await p.send("Page.enable");
    await p.send("Runtime.enable");
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    return p;
  };
  return {
    open,
    close() {
      proc.kill();
      setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1500);
    },
  };
}

// Codifica los frames a WebM dentro de Chrome (canvas + MediaRecorder), respetando sus tiempos
async function encode(browser, frames, name) {
  if (frames.length < 2) throw new Error("Sin frames");
  const p = await browser.open();
  await p.goto("about:blank");
  await p.eval(`(() => { window.F = []; return true; })()`);
  // se pasan en trozos para no mandar un mensaje enorme
  const t0 = frames[0].t;
  for (let i = 0; i < frames.length; i += 20) {
    const chunk = frames.slice(i, i + 20).map((f) => ({ t: f.t - t0, d: f.data }));
    await p.eval(`(() => { window.F.push(...${JSON.stringify(chunk)}); return true; })()`);
  }
  const b64 = await p.eval(`(async () => {
    const imgs = await Promise.all(F.map((f) => new Promise((res) => { const im = new Image(); im.onload = () => res({ t: f.t, im }); im.src = 'data:image/jpeg;base64,' + f.d; })));
    const cv = document.createElement('canvas');
    cv.width = imgs[0].im.naturalWidth; cv.height = imgs[0].im.naturalHeight;
    document.body.appendChild(cv);
    const g = cv.getContext('2d');
    g.drawImage(imgs[0].im, 0, 0);
    const stream = cv.captureStream(30);
    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3500000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(100);
    const start = performance.now();
    let i = 0;
    await new Promise((resolve) => {
      const step = () => {
        const now = (performance.now() - start) / 1000;
        while (i < imgs.length - 1 && imgs[i + 1].t <= now) i++;
        g.drawImage(imgs[i].im, 0, 0);
        if (now > imgs[imgs.length - 1].t + 0.4) return resolve();
        setTimeout(step, 16); // setTimeout y no rAF: la pestaña del codificador puede no estar visible
      };
      step();
    });
    rec.stop();
    await done;
    const blob = new Blob(chunks, { type: 'video/webm' });
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); });
  })()`);
  writeFileSync(join(OUT, `${name}.webm`), Buffer.from(b64, "base64"));
  console.log(`  🎬 ${name}.webm (${frames.length} frames, ${(frames[frames.length - 1].t - t0).toFixed(1)} s)`);
  await p.send("Page.close").catch(() => {});
}

const url = (demo) => pathToFileURL(join(LIVE, demo, "index.html")).href;

// ───────────────────────── Guiones ─────────────────────────
const SCRIPTS = {
  async dealer(p, rec) {
    await p.goto(url("dealer"));
    await sleep(800);
    await p.shot("dealer-01-prompt");
    if (rec) await p.startRec();
    await sleep(900);
    await p.key("KeyE");
    await sleep(2600);
    await p.shot("dealer-02-chat");
    await p.click(".opt:nth-child(2)"); // Necesito un consejo
    await sleep(1600);
    await p.click(".opt:nth-child(1)"); // Velocidad punta
    await sleep(1300);
    await p.click(".opt:nth-child(1)"); // Sin límite
    await sleep(3200);
    await p.shot("dealer-03-consejo");
    await p.click(".opt:nth-child(3)"); // Ver todo el catálogo
    await sleep(1400);
    await p.shot("dealer-04-categorias");
    await p.click('.cat-row[data-cat="7"]'); // Super
    await sleep(1000);
    await p.click('.item[data-model="turismor"]');
    await sleep(1800);
    await p.drag("#drag-zone", 260);
    await sleep(900);
    await p.click('.sw[data-id="70"]');
    await sleep(1300);
    await p.shot("dealer-05-detalle");
    await p.click('.sw[data-id="27"]');
    await sleep(900);
    await p.click("#cat-back");
    await sleep(700);
    await p.click('.cat-row[data-cat="6"]');
    await sleep(900);
    await p.click('.item[data-model="comet2"]');
    await sleep(1800);
    await p.click("#buy");
    await sleep(900);
    await p.shot("dealer-06-confirmar");
    await p.click("#buy", { hold: 1500 });
    await sleep(2300);
    await p.shot("dealer-07-comprado");
    await sleep(1500);
    if (rec) await encode(rec, await p.stopRec(), "dealer");
  },

  async fuel(p, rec) {
    await p.goto(url("fuel"));
    await sleep(600);
    await p.shot("fuel-01-coger");
    if (rec) await p.startRec();
    await sleep(900);
    await p.key("KeyE");
    await sleep(1300);
    await p.shot("fuel-02-manguera");
    await p.key("KeyE");
    await sleep(1600);
    await p.click('.chip[data-l="30"]');
    await sleep(700);
    await p.click('.pay-opt[data-m="bank"]');
    await sleep(900);
    await p.shot("fuel-03-surtidor");
    await p.click("#confirm");
    await sleep(2400);
    await p.shot("fuel-04-repostando");
    await sleep(2600);
    await p.shot("fuel-05-ticket");
    await sleep(1400);
    await p.key("KeyE");
    await sleep(1100);
    await p.key("KeyE");
    await sleep(1500);
    if (rec) await encode(rec, await p.stopRec(), "fuel");
  },

  async speedo(p, rec) {
    await p.goto(url("speedo"));
    await sleep(900);
    if (rec) await p.startRec();
    await sleep(600);
    await p.key("KeyW", { hold: 2600 });
    await sleep(200);
    await p.shot("speedo-01-sin-cinturon");
    await p.key("KeyB");
    await sleep(700);
    await p.shot("speedo-02-cinturon");
    await sleep(1200);
    await p.key("KeyW", { hold: 3400 });
    await p.shot("speedo-03-velocidad");
    await p.key("KeyS", { hold: 2200 });
    await sleep(300);
    await p.key("KeyF");
    await sleep(600);
    await p.shot("speedo-04-no-bajar");
    await sleep(1400);
    await p.key("KeyC");
    await sleep(900);
    await p.key("KeyB");
    await sleep(1300);
    await p.key("KeyW", { hold: 3000 });
    await p.key("KeyC");
    await sleep(700);
    await p.shot("speedo-05-despedido");
    await sleep(2800);
    await p.eval("(SCENE.state.health = 28, SCENE.state.liters = 6, true)");
    await p.key("KeyW", { hold: 1500 });
    await sleep(400);
    await p.shot("speedo-06-averiado");
    await sleep(800);
    if (rec) await encode(rec, await p.stopRec(), "speedo");
  },
};

const which = process.argv[2] && process.argv[2] !== "all" ? [process.argv[2]] : Object.keys(SCRIPTS);
const shotsOnly = process.argv.includes("--shots-only");
const browser = await launch();
try {
  for (const name of which) {
    console.log(`▶ ${name}`);
    const page = await browser.open();
    await SCRIPTS[name](page, shotsOnly ? null : browser);
    await page.send("Page.close").catch(() => {});
  }
} finally {
  browser.close();
}
