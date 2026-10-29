// Animaciones de /pruebas: scroll suave (Lenis) + GSAP con ScrollTrigger y SplitText.
// Sin JS o con «reducir movimiento» todo se ve igualmente, solo que sin animar.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { crearEscena } from "./escena";
import type { Tecnologia } from "@/data/tecnologias";
import { tr } from "@/scripts/i18n";
import { irConCortina } from "@/scripts/cortina-idioma";

gsap.registerPlugin(ScrollTrigger, SplitText);

const raiz = document.querySelector<HTMLElement>("[data-pr]")!;
const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = raiz) => el.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = raiz) => [...el.querySelectorAll<T>(s)];
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const punteroFino = matchMedia("(pointer: fine)").matches;

// ── idioma de los textos partidos ─────
// SplitText convierte cada texto en muchos <span> que i18n.ts no sabría traducir. Por eso esos
// textos (data-pr-split) guardan su español en data-es y se traducen aquí antes de partirlos;
// al cambiar de idioma se deshace el partido, se cambia el texto y se vuelve a partir.
const rehacer = new Map<HTMLElement, () => void>();
function ponerTexto(el: HTMLElement) {
  el.dataset.es ??= (el.textContent ?? "").replace(/[ \t\n\r]+/g, " ").trim();
  el.textContent = tr(el.dataset.es);
}
$$("[data-pr-split]").forEach(ponerTexto);
addEventListener("aj:idioma", () => {
  $$("[data-pr-split]").forEach((el) => (rehacer.get(el) ?? (() => ponerTexto(el)))());
  ScrollTrigger.refresh();
});
// la cortina del cambio de idioma lleva arriba del todo (con Lenis hay que decírselo a él)
addEventListener("aj:arriba", () => {
  lenis?.scrollTo(0, { immediate: true, force: true });
  ScrollTrigger.update();
});

/** Parte un texto y lo anima; al cambiar de idioma se rehace con el texto nuevo. */
function partir(el: HTMLElement, crear: () => () => void) {
  let deshacer = crear();
  rehacer.set(el, () => {
    deshacer();
    ponerTexto(el);
    deshacer = crear();
  });
}

// ── scroll suave ─────────────────────────────
let lenis: Lenis | null = null;
if (!reducido) {
  lenis = new Lenis({ duration: 1.15, anchors: { offset: -64 } });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ── entrada ─────
// La pantalla de siempre (logo + línea). Cuando la escena 3D está lista, el logo vuela
// hasta donde estará el logo de partículas, se deshace en ellas y aparece la portada.
async function entrada() {
  const intro = $(".pr-intro")!;
  const logo = $(".pr-intro__logo")!;
  const canvas = $<HTMLCanvasElement>(".pr-hero__canvas")!;
  const titulo = $(".pr-hero__titulo")!;

  lenis?.stop(); // sin scroll mientras dura la entrada
  const listo = Promise.all([crearEscena(canvas, canvas.dataset.logo!).catch(() => null), document.fonts.ready]);
  const linea = gsap.to(".pr-intro__barra i", { scaleX: 1, duration: reducido ? 0.2 : 1.6, ease: "power2.inOut" });
  const [escena] = await listo;
  await linea;
  if (!escena) raiz.classList.add("sin-webgl");

  let split = new SplitText(titulo, { type: "lines,words,chars", mask: "lines" });
  rehacer.set(titulo, () => {
    split.revert();
    ponerTexto(titulo);
    split = new SplitText(titulo, { type: "lines,words,chars", mask: "lines" });
  });
  // al cambiar de idioma, cuando se levanta la cortina (scripts/cortina-idioma.ts), la
  // portada vuelve a entrar como al llegar a la web
  addEventListener("aj:entrada", () => {
    if (reducido) return;
    gsap.from(split.chars, { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.012, ease: "expo.out" });
    gsap.from(".pr-hero [data-pr-aparece]", { y: 24, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out", delay: 0.3 });
    if (escena) {
      escena.uniforms.uScatter.value = 0.6;
      gsap.to(escena.uniforms.uScatter, { value: 0, duration: 1.6, ease: "expo.out" });
    }
  });
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  if (escena) {
    escena.setProgreso(1);
    escena.uniforms.uOpacity.value = 0;
  }

  if (reducido || getComputedStyle(intro).display === "none") {
    intro.style.display = "none";
    if (escena) escena.uniforms.uOpacity.value = 1;
  } else {
    // FLIP: del centro de la pantalla al sitio del logo en la portada
    const desde = logo.getBoundingClientRect();
    const hasta = escena ? escena.rectLogo() : $(".pr-hero__plano")!.getBoundingClientRect();
    logo.style.animation = "none";
    tl.to(".pr-intro__barra", { opacity: 0, y: 10, duration: 0.4, ease: "power2.in" })
      .to(
        logo,
        {
          x: hasta.left - desde.left,
          y: hasta.top - desde.top,
          scaleX: hasta.width / desde.width,
          scaleY: hasta.height / desde.height,
          duration: 1.3,
          ease: "expo.inOut",
        },
        "<0.1",
      )
      .to(".pr-intro__fondo", { opacity: 0, duration: 1.1, ease: "power2.inOut" }, "<0.15")
      // en cuanto el fondo empieza a irse, la página ya responde: la capa de la entrada deja
      // pasar los clics y vuelve el scroll (antes había que esperar a que acabara todo)
      .add(() => {
        intro.style.pointerEvents = "none";
        lenis?.start();
      }, "<0.3");

    if (escena) {
      // ya en su sitio: el logo plano se apaga mientras las partículas se encienden y se asientan
      escena.uniforms.uScatter.value = 0.18;
      tl.to(logo, { opacity: 0, duration: 0.7, ease: "power2.out" })
        .to(escena.uniforms.uOpacity, { value: 1, duration: 0.6, ease: "power2.out" }, "<")
        .to(escena.uniforms.uScatter, { value: 0, duration: 1.6, ease: "expo.out" }, "<");
    } else {
      tl.to(logo, { opacity: 0, duration: 0.5 });
    }
    tl.set(intro, { display: "none" });
  }
  tl.add(() => lenis?.start());

  if (!reducido) {
    tl.from(split.chars, { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.012 }, escena ? "-=1.4" : "-=0.3")
      .from(".pr-hero [data-pr-aparece]", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, "<0.4");
  }

  tl.add(() => {
    raiz.classList.add("is-listo");
    if (!escena || reducido) return;
    // al bajar, el logo se deshace
    gsap.fromTo(
      escena.uniforms.uScatter,
      { value: 0 },
      { value: 1, ease: "none", scrollTrigger: { trigger: ".pr-hero", start: "top top", end: "bottom top", scrub: true } },
    );
  });

  // el texto de la portada sube y se apaga al hacer scroll
  if (!reducido) {
    gsap.to(".pr-hero__contenido", {
      yPercent: -18,
      opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: ".pr-hero", start: "top top", end: "bottom top", scrub: true },
    });
  }
}

entrada();

if (!reducido) {
  // ── manifiesto: las palabras se encienden al leer ─────
  const manifiesto = $(".pr-manifiesto__texto");
  if (manifiesto) {
    partir(manifiesto, () => {
      const s = new SplitText(manifiesto, { type: "words" });
      const tw = gsap.fromTo(
        s.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: manifiesto, start: "top 78%", end: "bottom 45%", scrub: true },
        },
      );
      return () => {
        tw.scrollTrigger?.kill();
        tw.kill();
        s.revert();
      };
    });
  }

  // ── servicios: en horizontal mientras la sección queda fija (solo en pantallas anchas) ─────
  const mm = gsap.matchMedia();
  mm.add("(min-width: 64rem)", () => {
    const seccion = $(".pr-serv")!;
    const pista = $(".pr-serv__pista")!;
    const dist = () => pista.scrollWidth - innerWidth + 48;
    const mov = gsap.to(pista, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: seccion,
        start: "top top",
        end: () => `+=${dist()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    gsap.to(".pr-serv__barra i", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: seccion, start: "top top", end: () => `+=${dist()}`, scrub: true },
    });
    // cada tarjeta entra girando un poco
    $$(".pr-serv__card").forEach((card) => {
      gsap.from(card, {
        rotate: 4,
        y: 60,
        opacity: 0.3,
        ease: "power2.out",
        scrollTrigger: { trigger: card, containerAnimation: mov, start: "left 95%", end: "left 55%", scrub: true },
      });
    });
  });

  // ── proyectos: se apilan; la de debajo encoge un poco y se oscurece levemente ─────
  // Sin inclinación 3D y con force3D: false: así el navegador no convierte la tarjeta en una
  // imagen que luego escala (eso la emborronaba) y la vuelve a pintar nítida a cada paso.
  const huecos = $$(".pr-trab__hueco");
  huecos.forEach((hueco, i) => {
    const card = $(".pr-trab__card", hueco)!;
    const siguiente = huecos[i + 1];
    if (siguiente) {
      const quedan = huecos.length - 1 - i; // cuantas más tiene encima, más pequeña
      gsap.to(card, {
        scale: 1 - 0.02 * quedan,
        "--sombra": 1,
        ease: "none",
        force3D: false,
        scrollTrigger: { trigger: siguiente, start: "top bottom", end: "top 25%", scrub: true },
      });
    }
    // al llegar, las líneas de código aparecen una tras otra
    gsap.from($$(".pr-trab__pre .line", hueco), {
      opacity: 0,
      x: -12,
      duration: 0.5,
      stagger: 0.045,
      ease: "power2.out",
      scrollTrigger: { trigger: hueco, start: "top 70%" },
    });
  });

  // ── contacto: una luz suave sigue al ratón ─────
  const contacto = $(".pr-cta");
  contacto?.addEventListener("pointermove", (e) => {
    const r = contacto.getBoundingClientRect();
    contacto.style.setProperty("--mx", `${e.clientX - r.left}px`);
    contacto.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
  // (se anima el contenedor: cada tarjeta tiene transición CSS en transform, ver «stack»)
  gsap.from(".pr-cta__vias", {
    x: 50,
    opacity: 0,
    duration: 1,
    ease: "expo.out",
    scrollTrigger: { trigger: ".pr-cta__vias", start: "top 85%" },
  });

  // ── proceso: la línea se dibuja y cada paso se enciende ─────
  gsap.fromTo(
    ".pr-proc__linea i",
    { scaleY: 0 },
    { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".pr-proc__lista", start: "top 65%", end: "bottom 65%", scrub: true } },
  );
  $$(".pr-proc__paso").forEach((paso) =>
    ScrollTrigger.create({
      trigger: paso,
      start: "top 65%",
      end: "max",
      onToggle: (st) => paso.classList.toggle("is-on", st.isActive || st.progress === 1),
    }),
  );

  // ── títulos de sección: suben palabra a palabra ─────
  $$("[data-pr-titulo]").forEach((t) =>
    partir(t, () => {
      const s = new SplitText(t, { type: "lines,words", mask: "lines" });
      const tw = gsap.from(s.words, {
        yPercent: 110,
        duration: 1,
        ease: "expo.out",
        stagger: 0.04,
        scrollTrigger: { trigger: t, start: "top 85%" },
      });
      return () => {
        tw.scrollTrigger?.kill();
        tw.progress(1).kill();
        s.revert();
      };
    }),
  );

  // ── stack: las filas aparecen en cascada ─────
  // (se anima la fila y no cada etiqueta: las etiquetas tienen transición CSS en transform
  // y GSAP leería mal su posición final al recalcular, dejándolas desplazadas)
  gsap.from(".pr-stack__grupo", {
    y: 24,
    opacity: 0,
    duration: 0.7,
    ease: "power2.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".pr-stack__grupos", start: "top 80%" },
  });

  // ── final: el «¿Hablamos?» se rellena al bajar ─────
  const grande = $(".pr-cta__grande");
  if (grande) {
    gsap.fromTo(
      grande,
      { "--relleno": "0%" },
      { "--relleno": "100%", ease: "none", scrollTrigger: { trigger: ".pr-cta", start: "top 80%", end: "center 55%", scrub: true } },
    );
  }

  // ── botones que siguen un poco al ratón ─────
  if (punteroFino) {
    $$("[data-pr-iman]").forEach((el) => {
      const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
      const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.35);
        y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", () => {
        x(0);
        y(0);
      });
    });
  }
}

// ── ficha de cada tecnología («Con qué trabajo») ─────
const fichas: Record<string, Tecnologia> = JSON.parse($("[data-pr-tecs]")?.textContent || "{}");
const dialogo = $<HTMLDialogElement>(".pr-tec");
if (dialogo) {
  const lista = (sel: string, items: string[]) =>
    $(sel, dialogo)!.replaceChildren(
      ...items.map((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        return li;
      }),
    );

  function abrir(boton: HTMLElement) {
    const nombre = boton.dataset.prTec!;
    const f = fichas[nombre];
    if (!f || !dialogo) return;
    $("[data-pr-tec-tipo]", dialogo)!.textContent = f.tipo;
    $("[data-pr-tec-nombre]", dialogo)!.textContent = nombre;
    $("[data-pr-tec-resumen]", dialogo)!.textContent = f.resumen;
    lista("[data-pr-tec-sirve]", f.sirve);
    lista("[data-pr-tec-ejemplos]", f.ejemplos);
    // sale desde la etiqueta pulsada
    const r = boton.getBoundingClientRect();
    dialogo.style.setProperty("--dx", `${r.left + r.width / 2 - innerWidth / 2}px`);
    dialogo.style.setProperty("--dy", `${r.top + r.height / 2 - innerHeight / 2}px`);
    dialogo.classList.remove("is-cerrando");
    dialogo.showModal();
    lenis?.stop();
  }

  function cerrar() {
    if (!dialogo?.open || dialogo.classList.contains("is-cerrando")) return;
    dialogo.classList.add("is-cerrando");
    const fin = () => {
      dialogo.classList.remove("is-cerrando");
      dialogo.close();
    };
    if (reducido) return fin();
    // solo la animación del propio diálogo (las de dentro también lanzan animationend)
    const alAcabar = (e: AnimationEvent) => {
      if (e.target !== dialogo) return;
      dialogo.removeEventListener("animationend", alAcabar);
      fin();
    };
    dialogo.addEventListener("animationend", alAcabar);
  }

  dialogo.addEventListener("close", () => lenis?.start());
  $$("[data-pr-tec]").forEach((b) => b.addEventListener("click", () => abrir(b)));
  $("[data-pr-tec-cerrar]", dialogo)!.addEventListener("click", cerrar);
  dialogo.addEventListener("click", (e) => e.target === dialogo && cerrar()); // clic en el fondo
  dialogo.addEventListener("cancel", (e) => {
    e.preventDefault(); // Esc: cierra con la misma animación
    cerrar();
  });
}

// ── efecto «descifrar» al pasar por los enlaces con data-pr-scramble ─────
const SIGNOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>";
$$("[data-pr-scramble]").forEach((el) => {
  let id = 0;
  el.addEventListener("pointerenter", () => {
    let f = 0;
    cancelAnimationFrame(id);
    const original = tr(el.dataset.es ?? el.textContent ?? "");
    const paso = () => {
      el.textContent = [...original]
        .map((c, i) => (c === " " || i < f / 2 ? c : SIGNOS[(Math.random() * SIGNOS.length) | 0]))
        .join("");
      if (f++ < original.length * 2) id = requestAnimationFrame(paso);
      else el.textContent = original;
    };
    paso();
  });
});

// ── copiar el email ─────
$$<HTMLButtonElement>("[data-pr-copiar]").forEach((b) =>
  b.addEventListener("click", async () => {
    const txt = b.querySelector("[data-pr-copiado]") ?? b.querySelector("span")!;
    const antes = txt.textContent;
    try {
      await navigator.clipboard.writeText(b.dataset.prCopiar!);
      txt.textContent = "¡Copiado!";
    } catch {
      location.href = `mailto:${b.dataset.prCopiar}`;
    }
    setTimeout(() => (txt.textContent = antes), 1600);
  }),
);

// ── proyectos: al abrir uno, la pantalla de la entrada tapa la página y se navega ─────
// (con Ctrl/Cmd/Mayús o la rueda se abre como siempre, en otra pestaña o ventana)
$$<HTMLAnchorElement>(".pr-trab__card").forEach((a) =>
  a.addEventListener("click", (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    lenis?.stop();
    irConCortina(a.href);
  }),
);
// al volver atrás con el navegador la página se restaura con el scroll parado
addEventListener("pageshow", (e) => e.persisted && lenis?.start());

// recalcula posiciones cuando todo (fuentes, imágenes) está cargado
addEventListener("load", () => ScrollTrigger.refresh());
