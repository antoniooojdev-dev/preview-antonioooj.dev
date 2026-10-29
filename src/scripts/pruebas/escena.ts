// Portada de /pruebas: el logo hecho de partículas con Three.js.
// - En la entrada aparecen ya formando el logo (uOpacity), justo donde aterriza el logo
//   plano de la pantalla de carga (rectLogo dice dónde es).
// - El ratón las aparta; el logo se inclina un poco hacia él.
// - Al hacer scroll se vuelven a dispersar (setDispersion, lo mueve ScrollTrigger).
// - Solo se pinta mientras la portada está en pantalla.
// Si no hay WebGL, devuelve null y la página enseña el logo plano (CSS).

import * as THREE from "three";

const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute float aRand;
  attribute float aLogo;
  uniform float uTime;
  uniform float uProgress;
  uniform float uScatter;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  varying float vAlpha;

  void main() {
    // cada partícula llega con su propio retraso
    float d = clamp((uProgress - aRand * 0.4) / 0.6, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - d, 3.0);
    vec3 p = mix(aStart, position, e);

    // flotan un poco, siempre
    p.x += sin(uTime * 0.7 + aRand * 40.0) * 0.012;
    p.y += cos(uTime * 0.6 + aRand * 25.0) * 0.012;

    // el ratón las aparta
    vec2 diff = p.xy - uMouse;
    float dist = length(diff);
    float fuerza = smoothstep(0.45, 0.0, dist) * aLogo;
    p.xy += normalize(diff + 0.0001) * fuerza * 0.22;
    p.z += fuerza * 0.4;

    // al bajar, vuelven hacia la nube
    p = mix(p, aStart * 1.4, uScatter * (0.35 + aRand * 0.65));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9) * (1.0 + fuerza) / -mv.z;
    vAlpha = mix(0.18, 0.35 + aRand * 0.65, aLogo) * (1.0 - uScatter * 0.5);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.05, r) * vAlpha * uOpacity);
  }
`;

export interface Escena {
  /** 0 = nube, 1 = logo formado */
  setProgreso(v: number): void;
  /** 0 = logo, 1 = disperso (scroll) */
  setDispersion(v: number): void;
  /** Dónde está el logo en la pantalla (para que la entrada lleve el logo plano justo ahí) */
  rectLogo(): DOMRect;
  readonly uniforms: { uProgress: { value: number }; uScatter: { value: number }; uOpacity: { value: number } };
}

/** Lee el logo (PNG con transparencia) y devuelve un punto por cada píxel opaco, y su alto en unidades. */
async function puntosDelLogo(url: string, ancho: number): Promise<{ pts: number[]; altoU: number }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const alto = Math.round((ancho * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, ancho, alto);
  const { data } = ctx.getImageData(0, 0, ancho, alto);
  const escala = 2.6 / ancho; // el logo mide 2,6 unidades de ancho
  const pts: number[] = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (data[(y * ancho + x) * 4 + 3] > 128) {
        pts.push((x - ancho / 2) * escala, -(y - alto / 2) * escala, (Math.random() - 0.5) * 0.06);
      }
    }
  }
  return { pts, altoU: alto * escala };
}

export async function crearEscena(canvas: HTMLCanvasElement, logoUrl: string): Promise<Escena | null> {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const movil = matchMedia("(max-width: 48rem)").matches;
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.z = 6;

  const { pts: logo, altoU } = await puntosDelLogo(logoUrl, movil ? 120 : 170);
  const nLogo = logo.length / 3;
  const nAmbiente = movil ? 500 : 1400; // polvo de fondo que no forma el logo
  const n = nLogo + nAmbiente;

  const pos = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  const rand = new Float32Array(n);
  const esLogo = new Float32Array(n);
  pos.set(logo);
  for (let i = 0; i < n; i++) {
    // origen: una esfera hueca alrededor
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    const r = 3 + Math.random() * 4;
    start[i * 3] = r * Math.sin(v) * Math.cos(u);
    start[i * 3 + 1] = r * Math.sin(v) * Math.sin(u);
    start[i * 3 + 2] = r * Math.cos(v) - 2;
    rand[i] = Math.random();
    esLogo[i] = i < nLogo ? 1 : 0;
    if (i >= nLogo) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = -Math.random() * 6;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
  geo.setAttribute("aLogo", new THREE.BufferAttribute(esLogo, 1));

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uScatter: { value: 0 },
    uSize: { value: movil ? 13 : 16 },
    uPixelRatio: { value: pr },
    uMouse: { value: new THREE.Vector2(9, 9) },
    uColor: { value: new THREE.Color("#f2f2f2") },
    uOpacity: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const grupo = new THREE.Group();
  grupo.add(new THREE.Points(geo, mat));
  scene.add(grupo);

  // el logo a la derecha en pantallas anchas (el texto va a la izquierda); centrado en móvil
  let mitadAncho = 1;
  let mitadAlto = 1;
  function medir() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mitadAlto = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    mitadAncho = mitadAlto * camera.aspect;
    const ancho = w > 900;
    grupo.position.set(ancho ? mitadAncho * 0.55 : 0, ancho ? 0 : mitadAlto * 0.2, 0);
    grupo.scale.setScalar(ancho ? 1 : 0.85);
  }
  medir();
  new ResizeObserver(medir).observe(canvas);

  // ratón → coordenadas del logo (plano z = 0)
  const raton = { x: 0, y: 0, mx: 9, my: 9 };
  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    raton.x = nx;
    raton.y = ny;
    raton.mx = (nx * mitadAncho - grupo.position.x) / grupo.scale.x;
    raton.my = (ny * mitadAlto - grupo.position.y) / grupo.scale.y;
  });
  canvas.closest("section")?.addEventListener("pointerleave", () => {
    raton.mx = raton.my = 9;
    raton.x = raton.y = 0;
  });

  // solo se pinta con la portada a la vista
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  renderer.setAnimationLoop((ahora: number) => {
    if (!visible) return;
    const t = ahora / 1000;
    uniforms.uTime.value = reducido ? 0 : t;
    const m = uniforms.uMouse.value;
    m.x += (raton.mx - m.x) * 0.12;
    m.y += (raton.my - m.y) * 0.12;
    if (!reducido) {
      grupo.rotation.y += (raton.x * 0.25 + Math.sin(t * 0.3) * 0.08 - grupo.rotation.y) * 0.05;
      grupo.rotation.x += (-raton.y * 0.15 - grupo.rotation.x) * 0.05;
    }
    renderer.render(scene, camera);
  });

  // esquinas del logo (sin girar) proyectadas a la pantalla
  function rectLogo() {
    grupo.updateMatrixWorld();
    const r = canvas.getBoundingClientRect();
    const g = grupo.position;
    const s = grupo.scale.x;
    const a = new THREE.Vector3(g.x - 1.3 * s, g.y + (altoU / 2) * s, 0).project(camera);
    const b = new THREE.Vector3(g.x + 1.3 * s, g.y - (altoU / 2) * s, 0).project(camera);
    const x1 = r.left + ((a.x + 1) / 2) * r.width;
    const y1 = r.top + ((1 - a.y) / 2) * r.height;
    const x2 = r.left + ((b.x + 1) / 2) * r.width;
    const y2 = r.top + ((1 - b.y) / 2) * r.height;
    return new DOMRect(x1, y1, x2 - x1, y2 - y1);
  }

  return {
    uniforms,
    rectLogo,
    setProgreso: (v) => (uniforms.uProgress.value = v),
    setDispersion: (v) => (uniforms.uScatter.value = v),
  };
}
