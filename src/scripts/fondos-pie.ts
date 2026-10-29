// /pruebas — tarjetas con ideas para el fondo del pie. Cada tarjeta tiene una vista con
// un efecto; solo se anima lo que está en pantalla. Si el ratón no está encima, un puntero
// «fantasma» recorre la vista para que el efecto se vea igualmente.

export {};

type Frame = (t: number) => void;

interface Item {
  art: HTMLElement;
  vista: HTMLElement;
  fx: HTMLElement;
  semilla: number;
  // puntero real (coordenadas de la vista) y si está dentro
  rx: number;
  ry: number;
  dentro: boolean;
  // puntero suavizado: el real o el fantasma
  x: number;
  y: number;
  w: number;
  h: number;
  clics: { x: number; y: number; t: number }[];
  rgb: string;
  bg: string;
  frame?: Frame;
}

const sec = document.querySelector<HTMLElement>("[data-fp]");
const LOGO = sec?.dataset.logo ?? "";

const rgbDe = (c: string) => {
  const m = c.match(/[\d.]+/g);
  return m ? m.slice(0, 3).join(",") : "128,128,128";
};
const rgba = (rgb: string, a: number) => `rgba(${rgb},${a})`;

/* ── utilidades ── */

let logoP: Promise<HTMLImageElement> | null = null;
function logo() {
  return (logoP ??= new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = mal;
    i.src = LOGO;
  }));
}

/** rectángulo donde cabe el logo dentro de w×h dejando un margen m (proporción) */
function encaje(img: HTMLImageElement, w: number, h: number, m: number) {
  const s = Math.min((w * (1 - 2 * m)) / img.naturalWidth, (h * (1 - 2 * m)) / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
}

/** alfa (0–255) de cada píxel del logo dibujado a w×h */
function alfaLogo(img: HTMLImageElement, w: number, h: number, m = 0.1) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const r = encaje(img, c.width, c.height, m);
  g.drawImage(img, r.x, r.y, r.w, r.h);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const a = new Uint8ClampedArray(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
  return { a, w: c.width };
}

/** el logo pintado de un color (los píxeles del png son oscuros: se tiñe con source-in) */
function logoTenido(img: HTMLImageElement, w: number, h: number, rgb: string, m = 0.1) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext("2d")!;
  const r = encaje(img, c.width, c.height, m);
  g.drawImage(img, r.x, r.y, r.w, r.h);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = `rgb(${rgb})`;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** canvas a tamaño de la vista (con devicePixelRatio) que se reajusta solo */
function lienzo(it: Item, alCambiar?: (w: number, h: number) => void) {
  const c = document.createElement("canvas");
  it.fx.append(c);
  const g = c.getContext("2d")!;
  const s = { c, g, w: 0, h: 0 };
  const ajustar = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    s.w = it.fx.clientWidth;
    s.h = it.fx.clientHeight;
    c.width = Math.round(s.w * dpr);
    c.height = Math.round(s.h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    alCambiar?.(s.w, s.h);
  };
  new ResizeObserver(ajustar).observe(it.fx);
  ajustar();
  return s;
}

/** clics nuevos desde la última vez que se preguntó */
function clicsNuevos(it: Item, visto: { t: number }) {
  const n = it.clics.filter((c) => c.t > visto.t);
  if (n.length) visto.t = n[n.length - 1].t;
  return n;
}

/* ── efectos ── */

const efectos: Record<string, (it: Item) => Frame | Promise<Frame>> = {
  // 01 · nombre a sangre: contorno que se rellena de izquierda a derecha
  nombre(it) {
    it.fx.innerHTML = `<div class="fx-nom"><span class="fx-nom__borde">ANTONIOOOJ</span><span class="fx-nom__lleno">ANTONIOOOJ</span><i class="fx-nom__raya"></i></div>`;
    const el = it.fx.firstElementChild as HTMLElement;
    let p = 0;
    return () => {
      p += (it.x / it.w - p) * 0.12;
      el.style.setProperty("--p", p.toFixed(4));
    };
  },

  // 02 · CTA gigante con un círculo que lo rellena
  cta(it) {
    it.fx.innerHTML = `<div class="fx-cta"><span class="fx-cta__b">¿Hablamos?</span><span class="fx-cta__l">¿Hablamos?</span><span class="fx-cta__nota">Escríbeme →</span></div>`;
    const el = it.fx.firstElementChild as HTMLElement;
    let r = 0;
    return () => {
      r += ((it.dentro ? it.h * 0.62 : it.h * 0.2) - r) * 0.1;
      el.style.setProperty("--x", `${it.x}px`);
      el.style.setProperty("--y", `${it.y}px`);
      el.style.setProperty("--r", `${r}px`);
    };
  },

  // 03 · letras de fuente variable que engordan cerca del cursor
  variable(it) {
    it.fx.innerHTML = `<div class="fx-var">${[..."ANTONIOOOJ"].map((c) => `<span>${c}</span>`).join("")}</div>`;
    const spans = [...it.fx.querySelectorAll<HTMLElement>("span")];
    return () => {
      const v = it.vista.getBoundingClientRect();
      const s = it.w * 0.13;
      const cajas = spans.map((sp) => sp.getBoundingClientRect());
      cajas.forEach((b, i) => {
        const dx = b.left + b.width / 2 - v.left - it.x;
        const dy = (b.top + b.height / 2 - v.top - it.y) * 0.5;
        const k = Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
        spans[i].style.fontVariationSettings = `"wght" ${Math.round(120 + 780 * k)}, "wdth" ${Math.round(62 + 63 * k)}`;
        spans[i].style.opacity = String(0.25 + 0.75 * k);
      });
    };
  },

  // 04 · dos cintas en sentidos opuestos que aceleran con el scroll
  marquee(it) {
    const txt = "Webs a medida · Aplicaciones · Bots de Discord · Scripts FiveM · Paneles · ";
    const fila = (cls: string) =>
      `<div class="fx-mq__f ${cls}"><div class="fx-mq__pista"><span>${txt.repeat(2)}</span><span>${txt.repeat(2)}</span></div></div>`;
    it.fx.innerHTML = `<div class="fx-mq">${fila("")}${fila("fx-mq__f--b")}</div>`;
    const pistas = [...it.fx.querySelectorAll<HTMLElement>(".fx-mq__pista")];
    let ultimoY = scrollY;
    let impulso = 0;
    let dir = 1;
    let x = 0;
    addEventListener(
      "scroll",
      () => {
        const dy = scrollY - ultimoY;
        ultimoY = scrollY;
        if (dy) dir = Math.sign(dy);
        impulso = Math.min(impulso + Math.abs(dy) * 0.06, 12);
      },
      { passive: true },
    );
    return () => {
      x += (0.6 + impulso) * dir * (it.dentro ? 0.3 : 1);
      impulso *= 0.94;
      pistas.forEach((p, i) => {
        const mitad = (p.firstElementChild as HTMLElement).offsetWidth || 1;
        const m = (((i ? -x : x) % mitad) + mitad) % mitad;
        p.style.transform = `translate3d(${-m}px,0,0)`;
      });
    };
  },

  // 05 · el logo hecho de partículas que se apartan del cursor
  async particulas(it) {
    const img = await logo();
    let pts: { hx: number; hy: number; x: number; y: number; vx: number; vy: number }[] = [];
    const L = lienzo(it, (w, h) => {
      const paso = Math.max(3, Math.round(Math.sqrt((w * h) / 16000)));
      const { a, w: aw } = alfaLogo(img, Math.round(w), Math.round(h), 0.12);
      pts = [];
      for (let y = 0; y < h; y += paso)
        for (let x = 0; x < w; x += paso)
          if (a[Math.round(y) * aw + Math.round(x)] > 120)
            pts.push({ hx: x, hy: y, x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0 });
    });
    const visto = { t: 0 };
    return () => {
      const { g, w, h } = L;
      g.clearRect(0, 0, w, h);
      g.fillStyle = rgba(it.rgb, 0.6);
      const R = Math.max(50, w * 0.08);
      for (const c of clicsNuevos(it, visto))
        for (const p of pts) {
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 260) {
            p.vx += (dx / d) * (260 - d) * 0.12;
            p.vy += (dy / d) * (260 - d) * 0.12;
          }
        }
      for (const p of pts) {
        const dx = p.x - it.x;
        const dy = p.y - it.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * 3;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx = (p.vx + (p.hx - p.x) * 0.03) * 0.86;
        p.vy = (p.vy + (p.hy - p.y) * 0.03) * 0.86;
        p.x += p.vx;
        p.y += p.vy;
        g.fillRect(p.x, p.y, 1.6, 1.6);
      }
    };
  },

  // 06 · rejilla de puntos tipo radar con ondas
  radar(it) {
    const L = lienzo(it);
    const ondas: { x: number; y: number; t: number }[] = [];
    const visto = { t: 0 };
    let auto = 0;
    return (t) => {
      const { g, w, h } = L;
      g.clearRect(0, 0, w, h);
      for (const c of clicsNuevos(it, visto)) ondas.push({ ...c });
      if (!it.dentro && t - auto > 2400) {
        auto = t;
        ondas.push({ x: it.x, y: it.y, t });
      }
      const max = Math.hypot(w, h);
      for (let i = ondas.length - 1; i >= 0; i--) if ((t - ondas[i].t) * 0.35 > max) ondas.splice(i, 1);
      const paso = 18;
      const s = Math.max(60, w * 0.1);
      g.fillStyle = `rgb(${it.rgb})`;
      for (let y = paso / 2; y < h; y += paso)
        for (let x = paso / 2; x < w; x += paso) {
          const dx = x - it.x;
          const dy = y - it.y;
          let k = Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
          for (const o of ondas) {
            const r = (t - o.t) * 0.35;
            const d = Math.abs(Math.hypot(x - o.x, y - o.y) - r);
            if (d < 16) k = Math.max(k, (1 - d / 16) * Math.max(0, 1 - r / max) * 1.2);
          }
          g.globalAlpha = 0.14 + 0.8 * Math.min(1, k);
          const r = 0.9 + 2.2 * Math.min(1, k);
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
      g.globalAlpha = 1;
    };
  },

  // 07 · terreno wireframe en perspectiva
  malla(it) {
    const L = lienzo(it);
    const COLS = 44;
    const FILAS = 26;
    const sx = new Float32Array(COLS * FILAS);
    const sy = new Float32Array(COLS * FILAS);
    return (t) => {
      const { g, w, h } = L;
      g.clearRect(0, 0, w, h);
      const tt = t * 0.0008;
      for (let j = 0; j < FILAS; j++) {
        const z = (j / (FILAS - 1)) * 3;
        const s = 1 / (z * 0.9 + 0.6);
        for (let i = 0; i < COLS; i++) {
          const x = (i / (COLS - 1)) * 4.4 - 2.2;
          const y = 0.1 * Math.sin(x * 2.6 + tt) + 0.09 * Math.sin(z * 3.4 - tt * 1.3) + 0.05 * Math.sin((x + z) * 5 + tt * 2);
          const px = w / 2 + x * w * 0.42 * s;
          let py = h * 0.12 + (0.85 + y) * h * 0.55 * s;
          const dx = px - it.x;
          const dy = py - it.y;
          py -= h * 0.22 * s * Math.exp(-(dx * dx + dy * dy) / (2 * (w * 0.09) ** 2));
          sx[j * COLS + i] = px;
          sy[j * COLS + i] = py;
        }
      }
      g.lineWidth = 1;
      for (let j = 0; j < FILAS; j++) {
        g.strokeStyle = rgba(it.rgb, 0.08 + 0.42 * (j / (FILAS - 1)));
        g.beginPath();
        for (let i = 0; i < COLS; i++) {
          const k = j * COLS + i;
          i ? g.lineTo(sx[k], sy[k]) : g.moveTo(sx[k], sy[k]);
        }
        g.stroke();
      }
      g.strokeStyle = rgba(it.rgb, 0.18);
      g.beginPath();
      for (let i = 0; i < COLS; i++)
        for (let j = 0; j < FILAS; j++) {
          const k = j * COLS + i;
          j ? g.lineTo(sx[k], sy[k]) : g.moveTo(sx[k], sy[k]);
        }
      g.stroke();
    };
  },

  // 08 · curvas de nivel (marching squares) que se mueven despacio
  topo(it) {
    const L = lienzo(it);
    const CS = 12;
    // segmentos por caso: bordes 0 arriba, 1 derecha, 2 abajo, 3 izquierda
    const T: number[][] = [[], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0], [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];
    let v = new Float32Array(0);
    return (t) => {
      const { g, w, h } = L;
      g.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / CS) + 1;
      const filas = Math.ceil(h / CS) + 1;
      if (v.length !== cols * filas) v = new Float32Array(cols * filas);
      const s = Math.max(70, w * 0.11);
      for (let j = 0; j < filas; j++)
        for (let i = 0; i < cols; i++) {
          const x = i * CS;
          const y = j * CS;
          const dx = x - it.x;
          const dy = y - it.y;
          v[j * cols + i] =
            Math.sin(x * 0.011 + t * 0.0003) +
            Math.sin(y * 0.016 - t * 0.0002 + Math.sin(x * 0.006)) +
            0.6 * Math.sin((x + y) * 0.008 + t * 0.00025) +
            1.6 * Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
        }
      const pt = (e: number, x0: number, y0: number, a: number, b: number, c: number, d: number, L0: number): [number, number] => {
        if (e === 0) return [x0 + (CS * (L0 - a)) / (b - a), y0];
        if (e === 1) return [x0 + CS, y0 + (CS * (L0 - b)) / (c - b)];
        if (e === 2) return [x0 + (CS * (L0 - d)) / (c - d), y0 + CS];
        return [x0, y0 + (CS * (L0 - a)) / (d - a)];
      };
      let n = 0;
      for (let L0 = -2.2; L0 < 3.2; L0 += 0.3, n++) {
        const fuerte = n % 4 === 0;
        g.strokeStyle = rgba(it.rgb, fuerte ? 0.55 : 0.22);
        g.lineWidth = fuerte ? 1.3 : 0.8;
        g.beginPath();
        for (let j = 0; j < filas - 1; j++)
          for (let i = 0; i < cols - 1; i++) {
            const a = v[j * cols + i];
            const b = v[j * cols + i + 1];
            const c = v[(j + 1) * cols + i + 1];
            const d = v[(j + 1) * cols + i];
            const caso = (a > L0 ? 8 : 0) | (b > L0 ? 4 : 0) | (c > L0 ? 2 : 0) | (d > L0 ? 1 : 0);
            const seg = T[caso];
            for (let k = 0; k < seg.length; k += 2) {
              const p1 = pt(seg[k], i * CS, j * CS, a, b, c, d, L0);
              const p2 = pt(seg[k + 1], i * CS, j * CS, a, b, c, d, L0);
              g.moveTo(p1[0], p1[1]);
              g.lineTo(p2[0], p2[1]);
            }
          }
        g.stroke();
      }
    };
  },

  // 09 · logo en ASCII que cambia y se desordena con el cursor
  async ascii(it) {
    const img = await logo();
    const CW = 8;
    const CH = 13;
    const RAMPA = " .:-=+*#%@";
    let mapa = { a: new Uint8ClampedArray(0), w: 0 };
    const L = lienzo(it, (w, h) => (mapa = alfaLogo(img, Math.round(w), Math.round(h), 0.1)));
    let par = false;
    return (t) => {
      if ((par = !par)) return; // a 30 fps sobra
      const { g, w, h } = L;
      g.clearRect(0, 0, w, h);
      g.font = `500 11px "IBM Plex Mono", monospace`;
      g.textBaseline = "top";
      g.fillStyle = `rgb(${it.rgb})`;
      const R = Math.max(60, w * 0.09);
      for (let j = 0; j * CH < h; j++)
        for (let i = 0; i * CW < w; i++) {
          const x = i * CW;
          const y = j * CH;
          const a = (mapa.a[Math.round(y + CH / 2) * mapa.w + Math.round(x + CW / 2)] ?? 0) / 255;
          const n = 0.5 + 0.5 * Math.sin(i * 0.31 + t * 0.002) * Math.sin(j * 0.47 - t * 0.0016);
          let val = a > 0.4 ? 0.45 + 0.55 * n : n * 0.22;
          if (Math.hypot(x - it.x, y - it.y) < R && Math.random() < 0.55) val = Math.random();
          const c = RAMPA[Math.min(RAMPA.length - 1, Math.floor(val * RAMPA.length))];
          if (c === " ") continue;
          g.globalAlpha = 0.15 + 0.85 * val;
          g.fillText(c, x, y);
        }
      g.globalAlpha = 1;
    };
  },

  // 10 · lluvia de letras con las tecnologías
  lluvia(it) {
    const STACK = "ASTRO THREE.JS GSAP TYPESCRIPT PYTHON FASTAPI NODE LUA DISCORD.JS SQLITE ESX FIVEM ";
    const PASO = 16;
    let gotas: { y: number; v: number; i: number }[] = [];
    const L = lienzo(it, (w, h) => {
      gotas = Array.from({ length: Math.ceil(w / PASO) }, () => ({
        y: -Math.random() * h,
        v: 0.25 + Math.random() * 0.45,
        i: Math.floor(Math.random() * STACK.length),
      }));
    });
    let ultimo = 0;
    return (t) => {
      const { g, w, h } = L;
      if (t - ultimo < 33) return;
      ultimo = t;
      g.fillStyle = rgba(it.bg, 0.16);
      g.fillRect(0, 0, w, h);
      g.font = `500 13px "IBM Plex Mono", monospace`;
      g.textAlign = "center";
      gotas.forEach((d, k) => {
        const x = k * PASO + PASO / 2;
        const cerca = Math.abs(x - it.x) < 70 && Math.abs(d.y - it.y) < 90;
        d.y += PASO * d.v * (cerca ? 0.15 : 1);
        d.i = (d.i + 1) % STACK.length;
        if (STACK[d.i] === " ") d.i = (d.i + 1) % STACK.length;
        g.fillStyle = rgba(it.rgb, cerca ? 1 : 0.7);
        g.fillText(STACK[d.i], x, d.y);
        if (d.y > h + 20 && Math.random() < 0.06) d.y = -Math.random() * 80;
      });
    };
  },

  // 11 · linterna: el logo y una rejilla escondidos que se iluminan con el cursor
  linterna(it) {
    it.fx.innerHTML = `<div class="fx-lin"><div class="fx-lin__base"></div><div class="fx-lin__rej"></div><div class="fx-lin__logo"></div></div>`;
    const el = it.fx.firstElementChild as HTMLElement;
    let r = 0;
    return () => {
      r += ((it.dentro ? Math.max(150, it.w * 0.2) : Math.max(90, it.w * 0.12)) - r) * 0.1;
      el.style.setProperty("--x", `${it.x}px`);
      el.style.setProperty("--y", `${it.y}px`);
      el.style.setProperty("--r", `${r}px`);
    };
  },

  // 12 · logo glitch: franjas que se desplazan a ratos
  async glitch(it) {
    const img = await logo();
    let tinte = "";
    let capa: HTMLCanvasElement | null = null;
    const L = lienzo(it, () => (tinte = ""));
    let golpe = 0;
    return (t) => {
      const { g, w, h } = L;
      if (tinte !== it.rgb) {
        tinte = it.rgb;
        capa = logoTenido(img, Math.round(w), Math.round(h), it.rgb, 0.1);
      }
      if (!capa) return;
      g.clearRect(0, 0, w, h);
      if (Math.random() < 0.015) golpe = 1;
      golpe *= 0.9;
      const BANDA = 5;
      const sx = capa.width / w;
      for (let y = 0; y < h; y += BANDA) {
        const kp = it.dentro ? Math.exp(-((y - it.y) ** 2) / (2 * 40 ** 2)) : 0;
        const ruido = Math.sin(y * 0.37 + t * 0.03) * Math.sin(y * 0.11 - t * 0.017);
        const salta = Math.random() < 0.35 ? (Math.random() - 0.5) * 2 : ruido * 0.3;
        const off = salta * (golpe * 70 + kp * 45);
        g.globalAlpha = 0.5;
        g.drawImage(capa, 0, y * sx, capa.width, BANDA * sx, off, y, w, BANDA);
        if (golpe > 0.2 || kp > 0.3) {
          g.globalAlpha = 0.15;
          g.drawImage(capa, 0, y * sx, capa.width, BANDA * sx, off * -1.6 + 6, y, w, BANDA);
        }
      }
      // línea de barrido
      const by = ((t * 0.08) % (h + 60)) - 30;
      g.globalAlpha = 0.12;
      g.fillStyle = `rgb(${it.rgb})`;
      g.fillRect(0, by, w, 2);
      g.globalAlpha = 1;
    };
  },

  // 13 · terminal que escribe comandos sola
  terminal(it) {
    const LINEAS = [
      "$ npm run build",
      "✓ agendo · 12 páginas en 1,8 s",
      "$ git push origin main",
      "→ desplegando antonioooj.dev",
      "✓ online en 41 s",
      "$ node bot.js --tickets",
      "✓ bot conectado · 3 servidores",
      "$ ensure antoniooojdev_phone",
      "✓ recurso iniciado",
      "$ uvicorn api:app --port 8002",
      "✓ API escuchando",
      "$ lighthouse antonioooj.dev",
      "✓ rendimiento 100 · accesibilidad 100",
    ];
    it.fx.innerHTML = `<pre class="fx-ter"><span></span><i></i></pre>`;
    const txt = it.fx.querySelector("span")!;
    const hechas: string[] = [];
    let n = 0;
    let c = 0;
    let siguiente = 0;
    return (t) => {
      if (t < siguiente) return;
      const linea = LINEAS[n % LINEAS.length];
      c++;
      siguiente = t + (linea.startsWith("$") ? 45 + Math.random() * 60 : 12);
      if (c > linea.length) {
        hechas.push(linea);
        const caben = Math.max(3, Math.floor(it.h / 20) - 1);
        while (hechas.length > caben) hechas.shift();
        n++;
        c = 0;
        siguiente = t + (linea.startsWith("$") ? 380 : 700);
      }
      const actual = LINEAS[n % LINEAS.length].slice(0, c);
      txt.textContent = [...hechas, actual].join("\n");
    };
  },

  // 14 · reloj en directo con la hora de España
  reloj(it) {
    it.fx.innerHTML = `<div class="fx-rel"><div class="fx-rel__h"></div><p class="fx-rel__sub">España · <span></span></p></div>`;
    const caja = it.fx.querySelector<HTMLElement>(".fx-rel__h")!;
    const sub = it.fx.querySelector<HTMLElement>(".fx-rel__sub span")!;
    const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    let antes = "";
    let ultimo = 0;
    return (t) => {
      if (t - ultimo < 200) return;
      ultimo = t;
      const ahora = new Date();
      const s = fmt.format(ahora);
      if (s === antes) return;
      if (antes.length !== s.length) caja.innerHTML = [...s].map((ch) => `<span class="${ch === ":" ? "dos" : "dig"}"><b>${ch}</b></span>`).join("");
      else
        [...s].forEach((ch, i) => {
          if (ch === antes[i]) return;
          const slot = caja.children[i] as HTMLElement;
          slot.innerHTML = `<b class="entra">${ch}</b>`;
        });
      antes = s;
      const [hh, mm] = s.split(":").map(Number);
      let dif = Math.round((hh * 60 + mm - (ahora.getHours() * 60 + ahora.getMinutes())) / 60);
      if (dif > 12) dif -= 24;
      if (dif < -12) dif += 24;
      sub.textContent = dif === 0 ? "la misma hora que tú" : `${Math.abs(dif)} h ${dif > 0 ? "por delante" : "por detrás"} de ti`;
    };
  },
};

/* ── arranque y bucle ── */

const items: Item[] = [];
const activos = new Set<Item>();

function colores(it: Item) {
  it.rgb = rgbDe(getComputedStyle(it.fx).color);
  it.bg = rgbDe(getComputedStyle(it.vista).backgroundColor);
}

async function iniciar(it: Item) {
  colores(it);
  try {
    it.frame = await efectos[it.art.dataset.fondo ?? ""]?.(it);
  } catch (e) {
    console.warn("[fondos-pie]", it.art.dataset.fondo, e);
  }
}

document.querySelectorAll<HTMLElement>("[data-fondo]").forEach((art, i) => {
  const vista = art.querySelector<HTMLElement>(".fp__vista")!;
  const fx = art.querySelector<HTMLElement>("[data-fx]")!;
  const it: Item = { art, vista, fx, semilla: i * 1.7, rx: 0, ry: 0, dentro: false, x: 0, y: 0, w: 1, h: 1, clics: [], rgb: "", bg: "" };
  items.push(it);

  const medir = () => {
    it.w = vista.clientWidth || 1;
    it.h = vista.clientHeight || 1;
  };
  medir();
  it.x = it.w / 2;
  it.y = it.h / 2;
  new ResizeObserver(medir).observe(vista);

  const local = (e: PointerEvent) => {
    const r = vista.getBoundingClientRect();
    it.rx = e.clientX - r.left;
    it.ry = e.clientY - r.top;
  };
  vista.addEventListener("pointerenter", (e) => {
    local(e);
    it.dentro = true;
  });
  vista.addEventListener("pointermove", local);
  vista.addEventListener("pointerleave", () => (it.dentro = false));
  vista.addEventListener("pointerdown", (e) => {
    local(e);
    it.clics.push({ x: it.rx, y: it.ry, t: performance.now() });
    if (it.clics.length > 8) it.clics.shift();
  });

  // ampliar la tarjeta a todo el ancho
  const amp = art.querySelector<HTMLButtonElement>(".fp__amp");
  amp?.addEventListener("click", () => {
    const grande = art.classList.toggle("is-grande");
    amp.setAttribute("aria-pressed", String(grande));
    amp.textContent = grande ? "Reducir" : "Ampliar";
    requestAnimationFrame(() => art.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  });
});

const io = new IntersectionObserver(
  (entradas) => {
    for (const e of entradas) {
      const it = items.find((x) => x.vista === e.target);
      if (!it) continue;
      if (e.isIntersecting) {
        if (!it.frame && !it.art.dataset.iniciado) {
          it.art.dataset.iniciado = "1";
          iniciar(it);
        }
        activos.add(it);
      } else activos.delete(it);
    }
  },
  { rootMargin: "100px" },
);
items.forEach((it) => io.observe(it.vista));

let cuadros = 0;
function bucle(t: number) {
  const refrescar = ++cuadros % 30 === 0;
  for (const it of activos) {
    if (refrescar) colores(it);
    const tx = it.dentro ? it.rx : it.w * (0.5 + 0.38 * Math.sin(t * 0.00052 + it.semilla));
    const ty = it.dentro ? it.ry : it.h * (0.5 + 0.3 * Math.sin(t * 0.00083 + it.semilla * 2));
    const k = it.dentro ? 0.25 : 0.08;
    it.x += (tx - it.x) * k;
    it.y += (ty - it.y) * k;
    it.frame?.(t);
  }
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// mostrar u ocultar el contenido del pie encima de los fondos
const btnMock = document.querySelector<HTMLButtonElement>("[data-fp-mock]");
btnMock?.addEventListener("click", () => {
  const sin = sec!.classList.toggle("sin-mock");
  btnMock.setAttribute("aria-pressed", String(!sin));
  btnMock.textContent = sin ? "Mostrar contenido del pie" : "Ocultar contenido del pie";
});
