// /pruebas1: animación de entrada en 3D (Three.js + GSAP).
// Una persona llega a la mesa, se sienta, la cámara entra a la pantalla del portátil,
// el cursor pulsa el logo y la pantalla «se abre» (ahí aparecería la web).
//
// Ejes: la persona mira hacia -z (hacia la mesa). En sus articulaciones, rotation.x
// positiva lleva brazos y piernas hacia delante; la rodilla dobla con valores negativos.

import * as THREE from "three";
import gsap from "gsap";

// ── materiales (todo en grises, como la web) ─────
const mat = (color: string, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const M = {
  suelo: mat("#151515", 0.95),
  mesa: mat("#2b2b2b", 0.55),
  pata: mat("#1b1b1b", 0.4, 0.6),
  portatil: mat("#9a9a9a", 0.35, 0.8),
  teclado: mat("#141414", 0.8),
  silla: mat("#1e1e1e", 0.6),
  sillaMetal: mat("#3a3a3a", 0.3, 0.8),
  persona: mat("#d6d6d6", 0.55),
  personaOscuro: mat("#2a2a2a", 0.6),
  taza: mat("#e8e8e8", 0.4),
  maceta: mat("#3a3a3a", 0.8),
  hoja: mat("#7a7a7a", 0.8),
};

function malla(geo: THREE.BufferGeometry, m: THREE.Material, sombra = true) {
  const me = new THREE.Mesh(geo, m);
  me.castShadow = sombra;
  me.receiveShadow = true;
  return me;
}
const caja = (w: number, h: number, d: number, m: THREE.Material) => malla(new THREE.BoxGeometry(w, h, d), m);
/** Cápsula colgando de su articulación (crece hacia -y) */
function miembro(r: number, largo: number, m: THREE.Material) {
  const me = malla(new THREE.CapsuleGeometry(r, largo, 6, 12), m);
  me.position.y = -(largo / 2 + r * 0.4);
  return me;
}

// ── mesa, portátil, silla y detalles ─────
function crearMesa() {
  const g = new THREE.Group();
  const tablero = caja(1.4, 0.04, 0.7, M.mesa);
  tablero.position.y = 0.73;
  g.add(tablero);
  for (const [x, z] of [
    [-0.66, -0.31],
    [0.66, -0.31],
    [-0.66, 0.31],
    [0.66, 0.31],
  ]) {
    const p = caja(0.04, 0.71, 0.04, M.pata);
    p.position.set(x, 0.355, z);
    g.add(p);
  }
  // taza
  const taza = malla(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 24), M.taza);
  taza.position.set(0.42, 0.8, 0.05);
  const asa = malla(new THREE.TorusGeometry(0.025, 0.008, 8, 16), M.taza);
  asa.position.set(0.465, 0.8, 0.05);
  asa.rotation.y = Math.PI / 2;
  g.add(taza, asa);
  // planta
  const maceta = malla(new THREE.CylinderGeometry(0.06, 0.045, 0.12, 20), M.maceta);
  maceta.position.set(-0.52, 0.81, -0.18);
  g.add(maceta);
  for (let i = 0; i < 7; i++) {
    const h = malla(new THREE.IcosahedronGeometry(0.05 + Math.random() * 0.03, 0), M.hoja);
    h.position.set(-0.52 + (Math.random() - 0.5) * 0.1, 0.9 + Math.random() * 0.12, -0.18 + (Math.random() - 0.5) * 0.1);
    h.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    g.add(h);
  }
  return g;
}

function crearPortatil(textura: THREE.Texture) {
  const g = new THREE.Group();
  g.position.set(0, 0.75, 0.1); // cerca del borde de la mesa, al alcance de la mano
  const base = caja(0.34, 0.018, 0.23, M.portatil);
  base.position.y = 0.009;
  const teclado = malla(new THREE.PlaneGeometry(0.29, 0.1), M.teclado, false);
  teclado.rotation.x = -Math.PI / 2;
  teclado.position.set(0, 0.0185, -0.025);
  const panel = malla(new THREE.PlaneGeometry(0.1, 0.06), M.teclado, false);
  panel.rotation.x = -Math.PI / 2;
  panel.position.set(0, 0.0185, 0.07);
  g.add(base, teclado, panel);

  // la tapa gira desde la bisagra de atrás, un poco echada hacia atrás
  const bisagra = new THREE.Group();
  bisagra.position.set(0, 0.018, -0.112);
  bisagra.rotation.x = -0.26;
  const tapa = caja(0.34, 0.225, 0.012, M.portatil);
  tapa.position.set(0, 0.112, -0.007);
  const pantalla = new THREE.Mesh(
    new THREE.PlaneGeometry(0.315, 0.193),
    new THREE.MeshBasicMaterial({ map: textura, toneMapped: false }),
  );
  pantalla.position.set(0, 0.114, 0.0005);
  bisagra.add(tapa, pantalla);
  g.add(bisagra);
  return { g, pantalla };
}

function crearSilla() {
  const g = new THREE.Group();
  const asiento = caja(0.46, 0.06, 0.44, M.silla);
  asiento.position.y = 0.44;
  const respaldo = caja(0.44, 0.48, 0.05, M.silla);
  respaldo.position.set(0, 0.78, 0.22);
  respaldo.rotation.x = -0.1;
  const barra = malla(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 12), M.sillaMetal);
  barra.position.y = 0.25;
  g.add(asiento, respaldo, barra);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pata = caja(0.03, 0.025, 0.28, M.sillaMetal);
    pata.position.set(Math.sin(a) * 0.14, 0.08, Math.cos(a) * 0.14);
    pata.rotation.y = a;
    const rueda = malla(new THREE.SphereGeometry(0.025, 10, 8), M.silla);
    rueda.position.set(Math.sin(a) * 0.27, 0.025, Math.cos(a) * 0.27);
    g.add(pata, rueda);
  }
  return g;
}

// ── la persona: un maniquí articulado ─────
function crearPersona() {
  const raiz = new THREE.Group();
  const caderas = new THREE.Group();
  raiz.add(caderas);
  const pelvis = malla(new THREE.CapsuleGeometry(0.11, 0.1, 6, 12), M.personaOscuro);
  pelvis.rotation.z = Math.PI / 2;
  caderas.add(pelvis);

  const torso = new THREE.Group();
  caderas.add(torso);
  const tronco = malla(new THREE.CapsuleGeometry(0.14, 0.3, 6, 16), M.persona);
  tronco.position.y = 0.3;
  tronco.scale.z = 0.75;
  const hombros = malla(new THREE.CapsuleGeometry(0.07, 0.28, 6, 12), M.persona);
  hombros.rotation.z = Math.PI / 2;
  hombros.position.y = 0.5;
  const cuello = malla(new THREE.CylinderGeometry(0.04, 0.045, 0.08, 12), M.persona);
  cuello.position.y = 0.6;
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.64;
  const craneo = malla(new THREE.SphereGeometry(0.105, 24, 18), M.persona);
  craneo.position.y = 0.09;
  craneo.scale.set(0.92, 1.05, 1);
  // «visor» oscuro para que se sepa hacia dónde mira
  const cara = malla(new THREE.SphereGeometry(0.07, 20, 14), M.personaOscuro);
  cara.scale.set(1, 0.55, 0.45);
  cara.position.set(0, 0.1, -0.08);
  cabeza.add(craneo, cara);
  torso.add(tronco, hombros, cuello, cabeza);

  function brazo(lado: number) {
    const hombro = new THREE.Group();
    hombro.position.set(0.22 * lado, 0.5, 0);
    hombro.add(miembro(0.045, 0.22, M.persona));
    const codo = new THREE.Group();
    codo.position.y = -0.3;
    codo.add(miembro(0.04, 0.2, M.persona));
    const mano = malla(new THREE.SphereGeometry(0.045, 12, 10), M.persona);
    mano.position.y = -0.29;
    codo.add(mano);
    hombro.add(codo);
    torso.add(hombro);
    return { hombro, codo };
  }

  function pierna(lado: number) {
    const cadera = new THREE.Group();
    cadera.position.x = 0.09 * lado;
    cadera.add(miembro(0.06, 0.32, M.personaOscuro));
    const rodilla = new THREE.Group();
    rodilla.position.y = -0.45;
    rodilla.add(miembro(0.05, 0.33, M.personaOscuro));
    const pie = caja(0.09, 0.05, 0.2, M.persona);
    pie.position.set(0, -0.455, -0.05);
    rodilla.add(pie);
    cadera.add(rodilla);
    caderas.add(cadera);
    return { cadera, rodilla };
  }

  return {
    raiz,
    caderas,
    torso,
    cabeza,
    brazoI: brazo(-1),
    brazoD: brazo(1),
    piernaI: pierna(-1),
    piernaD: pierna(1),
  };
}

// ── la pantalla: se dibuja en un canvas que hace de textura ─────
interface EstadoPantalla {
  encendida: number; // 0 apagada → 1 encendida
  cursor: number; // 0 esquina → 1 sobre el logo
  cursorA: number; // opacidad del cursor
  pulsar: number; // 0 → 1 → 0 al hacer clic
  onda: number; // 0 → 1 onda tras el clic
  apertura: number; // 0 → 1 el logo crece y la pantalla se llena de blanco
}

function crearPantalla(mascara: HTMLImageElement) {
  // logo-mask.png solo vale por su transparencia (sus píxeles son oscuros): se pinta de blanco una vez
  const logo = document.createElement("canvas");
  logo.width = mascara.naturalWidth;
  logo.height = mascara.naturalHeight;
  const lc = logo.getContext("2d")!;
  lc.drawImage(mascara, 0, 0);
  lc.globalCompositeOperation = "source-in";
  lc.fillStyle = "#f2f2f2";
  lc.fillRect(0, 0, logo.width, logo.height);

  const W = 1280;
  const H = 784;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;

  const centro = { x: W / 2, y: H * 0.44 };
  const tamLogo = H * 0.34;

  function cursorEn(t: number) {
    // curva desde la esquina de abajo a la derecha hasta el logo
    const a = { x: W * 0.86, y: H * 0.86 };
    const b = { x: W * 0.78, y: H * 0.42 };
    const k = centro;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * b.x + t * t * k.x, y: u * u * a.y + 2 * u * t * b.y + t * t * k.y };
  }

  function dibujar(e: EstadoPantalla) {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, W, H);
    if (e.encendida <= 0) {
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(W - 40, H - 34, 5, 0, Math.PI * 2);
      ctx.fill();
      textura.needsUpdate = true;
      return;
    }
    ctx.globalAlpha = e.encendida;

    // fondo con un brillo suave en el centro
    const gr = ctx.createRadialGradient(centro.x, centro.y, 10, centro.x, centro.y, W * 0.7);
    gr.addColorStop(0, "#1c1c1c");
    gr.addColorStop(1, "#070707");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);

    // barra de arriba
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, W, 44);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.arc(28 + i * 22, 22, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#8a8a8a";
    ctx.font = '500 20px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("antonioooj.dev", W / 2, 29);

    // ¿el cursor está encima del logo?
    const pc = cursorEn(e.cursor);
    const encima = e.cursorA > 0 && Math.hypot(pc.x - centro.x, pc.y - centro.y) < tamLogo * 0.6;

    // logo
    const s = (1 + (encima ? 0.04 : 0) - e.pulsar * 0.08) * (1 + e.apertura * e.apertura * 7);
    const lado = tamLogo * s;
    if (encima && e.apertura === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      const m = tamLogo * 0.62;
      ctx.beginPath();
      ctx.roundRect(centro.x - m, centro.y - m, m * 2, m * 2, 36);
      ctx.fill();
    }
    const alto = (lado * logo.height) / logo.width;
    ctx.drawImage(logo, centro.x - lado / 2, centro.y - alto / 2, lado, alto);

    // nombre debajo (se va al abrir)
    ctx.globalAlpha = e.encendida * (1 - e.apertura * 3 > 0 ? 1 - e.apertura * 3 : 0);
    ctx.fillStyle = "#f2f2f2";
    ctx.font = '800 54px "Archivo", sans-serif';
    ctx.fillText("AntonioooJ", W / 2, H * 0.74);
    ctx.fillStyle = "#7a7a7a";
    ctx.font = '400 22px "IBM Plex Mono", monospace';
    ctx.fillText("Desarrollador web · pulsa para entrar", W / 2, H * 0.8);
    ctx.globalAlpha = e.encendida;

    // onda del clic
    if (e.onda > 0 && e.onda < 1) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - e.onda) * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centro.x, centro.y, tamLogo * (0.4 + e.onda * 0.9), 0, Math.PI * 2);
      ctx.stroke();
    }

    // cursor (flecha)
    if (e.cursorA > 0 && e.apertura < 0.3) {
      ctx.save();
      ctx.globalAlpha = e.cursorA * (1 - e.apertura / 0.3);
      ctx.translate(pc.x, pc.y);
      ctx.scale(1.6 * (1 - e.pulsar * 0.15), 1.6 * (1 - e.pulsar * 0.15));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 26);
      ctx.lineTo(7, 20);
      ctx.lineTo(12, 31);
      ctx.lineTo(17, 29);
      ctx.lineTo(12, 18);
      ctx.lineTo(21, 18);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // al abrir, la pantalla se llena de blanco
    if (e.apertura > 0.55) {
      ctx.globalAlpha = Math.min(1, (e.apertura - 0.55) / 0.45);
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    textura.needsUpdate = true;
  }

  return { textura, dibujar };
}

// ── todo junto ─────
export interface Animacion {
  linea: gsap.core.Timeline;
}

export async function crearAnimacion(
  canvas: HTMLCanvasElement,
  logoUrl: string,
  ui: { capitulo: (t: string) => void; fin: gsap.TweenTarget; destello: gsap.TweenTarget },
): Promise<Animacion> {
  const logo = new Image();
  logo.src = logoUrl;
  await Promise.all([logo.decode(), document.fonts.ready]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // el suavizado lo da sol.shadow.radius
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0a0a0a");
  scene.fog = new THREE.Fog("#0a0a0a", 4, 9);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);

  // luces
  scene.add(new THREE.HemisphereLight("#bfbfbf", "#0a0a0a", 0.6));
  const sol = new THREE.DirectionalLight("#ffffff", 2.2);
  sol.position.set(2.5, 4, 2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.left = -2;
  sol.shadow.camera.right = 2;
  sol.shadow.camera.top = 2;
  sol.shadow.camera.bottom = -2;
  sol.shadow.bias = -0.0005;
  sol.shadow.radius = 4;
  scene.add(sol);
  const foco = new THREE.SpotLight("#ffffff", 14, 6, 0.6, 0.6, 1.5);
  foco.position.set(0, 3, 0.4);
  foco.target.position.set(0, 0.7, 0.2);
  scene.add(foco, foco.target);
  const contra = new THREE.DirectionalLight("#ffffff", 0.8);
  contra.position.set(-2, 2, -3);
  scene.add(contra);

  // suelo con un círculo de luz
  const suelo = malla(new THREE.CircleGeometry(6, 64), M.suelo, false);
  suelo.rotation.x = -Math.PI / 2;
  scene.add(suelo);

  scene.add(crearMesa());
  const { textura, dibujar } = crearPantalla(logo);
  const { g: portatil, pantalla } = crearPortatil(textura);
  scene.add(portatil);
  const luzPantalla = new THREE.PointLight("#ffffff", 0, 1.6, 2);
  scene.add(luzPantalla);

  const silla = crearSilla();
  scene.add(silla);
  const p = crearPersona();
  scene.add(p.raiz);

  // dónde está la pantalla y hacia dónde mira (para acercar la cámara justo de frente)
  scene.updateMatrixWorld(true);
  const centroPantalla = pantalla.getWorldPosition(new THREE.Vector3());
  const normalPantalla = new THREE.Vector3(0, 0, 1).applyQuaternion(pantalla.getWorldQuaternion(new THREE.Quaternion()));
  luzPantalla.position.copy(centroPantalla).addScaledVector(normalPantalla, 0.15);

  // ── estado que mueve GSAP ─────
  const e = {
    andar: 0,
    x: 2.2,
    giro: Math.PI / 2, // mirando hacia -x mientras camina
    sentarse: 0,
    alcanzar: 0,
    mirar: 0,
    toque: 0,
    sillaX: 0.32,
    sillaZ: 1.05,
    sillaGiro: 0.55,
  };
  const pant: EstadoPantalla = { encendida: 0, cursor: 0, cursorA: 0, pulsar: 0, onda: 0, apertura: 0 };
  // cámara: posición, punto al que mira y si está «pegada» a la pantalla (0..1)
  const cam = { px: 3.4, py: 2.0, pz: 3.8, tx: 0.8, ty: 0.75, tz: 0.4, pantalla: 0, dentro: 0 };

  let fase = 0;
  const lerp = THREE.MathUtils.lerp;

  function posar(dt: number) {
    fase += dt * 7.5 * e.andar;
    const s = Math.sin(fase);
    const a = e.andar;
    const st = e.sentarse;

    p.raiz.position.set(e.x, 0, 0.47);
    p.raiz.rotation.y = e.giro;
    // al sentarse la cadera baja al asiento y se echa un poco atrás
    p.caderas.position.y = lerp(0.935 + Math.abs(s) * 0.025 * a, 0.53, st);
    p.caderas.position.z = lerp(0, 0.06, st);

    p.piernaI.cadera.rotation.x = lerp(s * 0.55 * a, 1.5, st);
    p.piernaD.cadera.rotation.x = lerp(-s * 0.55 * a, 1.5, st);
    p.piernaI.rodilla.rotation.x = lerp(-0.7 * a * Math.max(0, Math.cos(fase)), -1.45, st);
    p.piernaD.rodilla.rotation.x = lerp(-0.7 * a * Math.max(0, -Math.cos(fase)), -1.45, st);

    p.torso.rotation.x = -0.1 * e.alcanzar + 0.04 * a;
    p.cabeza.rotation.x = -0.32 * e.mirar;

    const rc = e.alcanzar;
    p.brazoI.hombro.rotation.x = lerp(-s * 0.45 * a, 0.62, rc);
    p.brazoD.hombro.rotation.x = lerp(s * 0.45 * a, 0.62, rc) - e.toque * 0.05;
    // al andar, un poco abiertos; al teclado, hacia dentro (izquierdo +z, derecho -z)
    p.brazoI.hombro.rotation.z = lerp(-0.08, 0.2, rc);
    p.brazoD.hombro.rotation.z = lerp(0.08, -0.2, rc);
    p.brazoI.codo.rotation.x = lerp(0.15 + 0.15 * a, 1.0, rc);
    p.brazoD.codo.rotation.x = lerp(0.15 + 0.15 * a, 1.0, rc) + e.toque * 0.12;

    silla.position.set(e.sillaX, 0, e.sillaZ);
    silla.rotation.y = e.sillaGiro;
  }

  function encuadrar() {
    const aspecto = camera.aspect;
    // pegada a la pantalla: a la distancia justa para que llene la vista
    const tanMedio = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dLlena = Math.max(0.193 / (2 * tanMedio), 0.315 / (2 * tanMedio * aspecto)) * 1.06;
    const dist = lerp(dLlena, 0.02, cam.dentro);
    const cercaPos = centroPantalla.clone().addScaledVector(normalPantalla, dist);

    // planos generales: en pantallas estrechas la cámara se aleja para que quepa la escena
    const objetivo = new THREE.Vector3(cam.tx, cam.ty, cam.tz);
    const lejosPos = new THREE.Vector3(cam.px, cam.py, cam.pz);
    if (aspecto < 1.25) lejosPos.sub(objetivo).multiplyScalar(Math.pow(1.25 / aspecto, 0.85)).add(objetivo);

    camera.position.lerpVectors(lejosPos, cercaPos, cam.pantalla);
    camera.lookAt(objetivo.lerp(centroPantalla, cam.pantalla));
  }

  function medir() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  medir();
  new ResizeObserver(medir).observe(canvas);

  let antes = performance.now();
  let ultimaPantalla = "";
  renderer.setAnimationLoop((ahora: number) => {
    const dt = Math.min((ahora - antes) / 1000, 0.05);
    antes = ahora;
    posar(dt);
    encuadrar();
    luzPantalla.intensity = pant.encendida * 0.9 * (1 + pant.apertura * 3);
    // la pantalla solo se vuelve a dibujar (y a subir a la GPU) si algo ha cambiado
    const clave = Object.values(pant).join();
    if (clave !== ultimaPantalla) {
      ultimaPantalla = clave;
      dibujar(pant);
    }
    renderer.render(scene, camera);
  });

  // ── la coreografía ─────
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });

  // 1. llega andando
  tl.add(() => ui.capitulo("Llega a su sitio"))
    .to(cam, { px: 2.2, py: 1.5, pz: 2.6, tx: 0.4, ty: 0.8, tz: 0.4, duration: 4.2, ease: "power1.inOut" }, 0)
    .to(e, { andar: 1, duration: 0.4, ease: "power1.out" }, 0.2)
    .to(e, { x: 0, duration: 3.4, ease: "power1.inOut" }, 0.2)
    .to(e, { andar: 0, duration: 0.5, ease: "power1.in" }, 3.1)
    // 2. se gira hacia la mesa y se sienta; la silla se acerca debajo
    .add(() => ui.capitulo("Se sienta"), 3.5)
    .to(e, { giro: 0, duration: 0.7 }, 3.4)
    .to(e, { sillaX: 0, sillaZ: 0.58, sillaGiro: 0, duration: 1.1, ease: "power3.out" }, 3.9)
    .to(e, { sentarse: 1, duration: 1.2 }, 4.0)
    .to(cam, { px: 1.25, py: 1.35, pz: 1.9, tx: 0, ty: 0.85, tz: 0.2, duration: 2.2 }, 3.6)
    // 3. se acerca al teclado y la pantalla se enciende
    .to(e, { alcanzar: 1, mirar: 1, duration: 0.9 }, 5.0)
    .add(() => ui.capitulo("Enciende el portátil"), 5.3)
    .to(pant, { encendida: 1, duration: 1.0, ease: "power1.inOut" }, 5.4)
    // 4. por encima del hombro y zoom a la pantalla
    .to(cam, { px: 0.62, py: 1.58, pz: 1.25, tx: 0, ty: 0.86, tz: 0, duration: 1.6 }, 5.9)
    .add(() => ui.capitulo("Abre la web"), 7.2)
    .to(cam, { pantalla: 1, duration: 1.9, ease: "power3.inOut" }, 7.2)
    // 5. el cursor va al logo y hace clic
    .to(pant, { cursorA: 1, duration: 0.3 }, 8.6)
    .to(pant, { cursor: 1, duration: 1.3, ease: "power2.inOut" }, 8.7)
    .to(pant, { pulsar: 1, duration: 0.1, ease: "power1.out" }, 10.1)
    .to(e, { toque: 1, duration: 0.1, yoyo: true, repeat: 1 }, 10.1)
    .to(pant, { pulsar: 0, duration: 0.25, ease: "back.out(3)" }, 10.2)
    .to(pant, { onda: 1, duration: 0.8, ease: "power2.out" }, 10.15)
    // 6. la pantalla se abre: el logo crece, se llena de blanco y la cámara entra
    .to(pant, { apertura: 1, duration: 1.3, ease: "expo.in" }, 10.6)
    .to(cam, { dentro: 1, duration: 1.3, ease: "expo.in" }, 10.6)
    .add(() => ui.capitulo(""), 11.4)
    .to(ui.destello, { autoAlpha: 1, duration: 0.25, ease: "power1.in" }, 11.65)
    .to(ui.fin, { autoAlpha: 1, duration: 0.01 }, 11.9)
    .to(ui.destello, { autoAlpha: 0, duration: 0.9, ease: "power2.out" }, 11.95);

  return { linea: tl };
}
