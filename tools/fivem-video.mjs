// Pasa un vídeo grabado del juego (mp4) a WebM ligero para la web y saca capturas WebP en los
// segundos que digas. Sin ffmpeg: Chrome sin ventana reproduce el vídeo, lo pinta en un canvas
// y lo graba con MediaRecorder (tarda lo mismo que dura el vídeo).
//
// Uso: node tools/fivem-video.mjs <video.mp4> <carpeta-salida> <nombre> [--probe] [--shots=3,12.5,40] [--no-video] [--kbps=2500] [--width=1600] [--quality=0.82]
//   --probe     solo dice duración y tamaño
//   --shots     segundos de las capturas: <nombre>-01.webp, <nombre>-02.webp…
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const [src, outDir, name] = args.filter((a) => !a.startsWith("--"));
const opt = (k) => args.find((a) => a.startsWith(`--${k}`))?.split("=")[1];
if (!src || !outDir || !name) {
  console.error("Uso: node tools/fivem-video.mjs <video.mp4> <carpeta-salida> <nombre> [--probe] [--shots=...] [--no-video]");
  process.exit(1);
}
const kbps = Number(opt("kbps") || 2500);
const width = Number(opt("width") || 1600);
const quality = Number(opt("quality") || 0.82);
const shots = (opt("shots") || "").split(",").filter(Boolean).map(Number);
mkdirSync(outDir, { recursive: true });

const proc = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), `fivem-video-${Date.now()}`)}`,
  "--allow-file-access-from-files",
  "--autoplay-policy=no-user-gesture-required",
  "about:blank",
]);
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {
    /* todavía arrancando */
  }
  if (!wsUrl) await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
async function ev(expression) {
  const m = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (m.error) throw new Error(m.error.message);
  if (m.result.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text);
  return m.result.result.value;
}

const url = pathToFileURL(resolve(src)).href;
await send("Page.navigate", { url: pathToFileURL(resolve(tmpdir())).href });
await sleep(500);
const info = await ev(`new Promise((ok, ko) => {
  const v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.src = ${JSON.stringify(url)};
  v.onloadedmetadata = () => { window.V = v; ok({ d: v.duration, w: v.videoWidth, h: v.videoHeight }); };
  v.onerror = () => ko(new Error('Chrome no puede abrir el vídeo'));
})`);
console.log(`Vídeo: ${info.d.toFixed(1)} s · ${info.w}×${info.h}`);

if (!args.includes("--probe")) {
  const W = Math.min(width, info.w);
  const H = Math.round((info.h * W) / info.w / 2) * 2;
  await ev(`window.C = Object.assign(document.createElement('canvas'), { width: ${W}, height: ${H} }); window.X = C.getContext('2d'); true`);

  // Capturas
  for (const [i, t] of shots.entries()) {
    const b64 = await ev(`new Promise(ok => {
      V.onseeked = () => { X.drawImage(V, 0, 0, C.width, C.height); C.toBlob(b => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(b); }, 'image/webp', ${quality}); };
      V.currentTime = ${Math.min(t, info.d - 0.05)};
    })`);
    const f = `${name}-${String(i + 1).padStart(2, "0")}.webp`;
    writeFileSync(join(outDir, f), Buffer.from(b64, "base64"));
    console.log(`  📸 ${f} (${t} s)`);
  }

  // Vídeo
  if (!args.includes("--no-video")) {
    console.log(`  🎬 grabando ${name}.webm a ${W}×${H}, ${kbps} kbps (≈ ${Math.ceil(info.d)} s)…`);
    const b64 = await ev(`new Promise(ok => {
      V.currentTime = 0;
      V.onseeked = () => {
        V.onseeked = null;
        const stream = C.captureStream(30);
        const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: ${kbps * 1000} });
        const chunks = [];
        rec.ondataavailable = e => e.data.size && chunks.push(e.data);
        rec.onstop = () => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(new Blob(chunks, { type: 'video/webm' })); };
        const draw = () => { X.drawImage(V, 0, 0, C.width, C.height); if (!V.ended) V.requestVideoFrameCallback(draw); };
        V.onended = () => setTimeout(() => rec.stop(), 200);
        rec.start(1000);
        V.requestVideoFrameCallback(draw);
        V.play();
      };
    })`);
    const buf = Buffer.from(b64, "base64");
    writeFileSync(join(outDir, `${name}.webm`), buf);
    console.log(`  ✓ ${name}.webm · ${(buf.length / 1048576).toFixed(1)} MB`);
  }
}

ws.close();
proc.kill();
