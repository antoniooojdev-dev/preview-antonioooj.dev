// Animaciones de la ficha de un proyecto (/proyectos/<slug>), con el mismo lenguaje que la
// portada: el titular sube línea a línea cuando se levanta la cortina de la entrada y, al
// bajar, cada bloque aparece en su momento (datos, secciones, lista, código y cierre).
// Sin JS o con «reducir movimiento» todo se ve igualmente, solo que sin animar.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { tr } from "@/scripts/i18n";
import { entradaLista, irConCortina } from "@/scripts/cortina-idioma";

gsap.registerPlugin(ScrollTrigger, SplitText);

const raiz = document.querySelector<HTMLElement>("[data-proyecto]");
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (raiz) iniciar(raiz);

function iniciar(raiz: HTMLElement) {
  const $$ = <T extends Element = HTMLElement>(s: string) => [...raiz.querySelectorAll<T>(s)];
  const titulo = raiz.querySelector<HTMLElement>("[data-pr-split]")!;

  // El titular se parte en líneas: i18n.ts no lo toca ([data-pr-split]) y se traduce aquí
  titulo.dataset.es ??= (titulo.textContent ?? "").replace(/[ \t\n\r]+/g, " ").trim();
  const ponerTitulo = () => (titulo.textContent = tr(titulo.dataset.es!));
  ponerTitulo();
  if (reducido) {
    addEventListener("aj:idioma", ponerTitulo);
    return;
  }

  let split = new SplitText(titulo, { type: "lines,words", mask: "lines" });
  const cabecera = $$("[data-pr-cab]");

  // hasta que se levante la cortina (o al instante si se entró directamente) no se ve nada
  gsap.set(split.words, { yPercent: 110 });
  gsap.set(cabecera, { y: 24, opacity: 0 });

  function entrar() {
    gsap.fromTo(split.words, { yPercent: 110 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.05 });
    gsap.fromTo(cabecera, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.07, delay: 0.2 });
  }
  entradaLista.then(entrar);

  // cambio de idioma: se rehace el titular con el texto nuevo y la cabecera vuelve a entrar
  addEventListener("aj:idioma", () => {
    split.revert();
    ponerTitulo();
    split = new SplitText(titulo, { type: "lines,words", mask: "lines" });
    gsap.set(split.words, { yPercent: 110 });
    ScrollTrigger.refresh();
  });
  addEventListener("aj:entrada", entrar);

  // ── al bajar ─────
  // cada sección sube y aparece; su etiqueta («// el problema») se escribe sola
  $$("[data-pr-sec]").forEach((sec) => {
    gsap.from(sec, {
      y: 48,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
      scrollTrigger: { trigger: sec, start: "top 85%" },
    });
    const etiqueta = sec.querySelector<HTMLElement>("h2");
    if (etiqueta) {
      gsap.from(etiqueta, {
        clipPath: "inset(0 100% 0 0)",
        duration: 0.9,
        ease: "steps(18)",
        scrollTrigger: { trigger: sec, start: "top 85%" },
      });
    }
  });

  // los datos (sector, año…) en cascada y la línea de arriba se dibuja
  const meta = raiz.querySelector<HTMLElement>("[data-pr-meta]");
  if (meta) {
    gsap.from(meta.children, {
      y: 16,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: { trigger: meta, start: "top 90%" },
    });
    gsap.fromTo(meta, { "--linea": 0 }, { "--linea": 1, duration: 1.2, ease: "expo.inOut", scrollTrigger: { trigger: meta, start: "top 90%" } });
  }

  // lo más destacado: cada punto entra desde la izquierda y su check se marca
  $$("[data-pr-lista]").forEach((lista) =>
    gsap.from(lista.children, {
      x: -24,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.1,
      scrollTrigger: { trigger: lista, start: "top 85%" },
    }),
  );

  // el código: las líneas aparecen una tras otra
  $$("[data-pr-codigo]").forEach((codigo) =>
    gsap.from(codigo.querySelectorAll(".line"), {
      opacity: 0,
      x: -12,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.035,
      scrollTrigger: { trigger: codigo, start: "top 75%" },
    }),
  );

  // el cierre crece un poco al llegar
  const cta = raiz.querySelector<HTMLElement>("[data-pr-cta]");
  if (cta) {
    gsap.from(cta, {
      scale: 0.94,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
      scrollTrigger: { trigger: cta, start: "top 90%" },
    });
  }

  // «más proyectos»: se abren con la misma cortina que desde la portada
  $$<HTMLAnchorElement>('[data-pr-otros] a[href^="/proyectos/"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      irConCortina(a.href);
    }),
  );

  addEventListener("load", () => ScrollTrigger.refresh());
}
