// Scroll suave (Lenis) con los mismos ajustes que la portada, para el resto de páginas.
// La portada crea el suyo (scripts/pruebas/pagina.ts, va con GSAP ScrollTrigger), así que
// allí no se hace nada.
// - Las cajas con scroll propio (chat, listas del panel…) y los <dialog> siguen con su
//   scroll normal.
// - Parado mientras está la pantalla de carga (html.is-loading).
// - «aj:arriba» (cambio de idioma con cortina) vuelve arriba del todo al instante.

import Lenis from "lenis";
import "lenis/dist/lenis.css";

const raiz = document.documentElement;
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!document.querySelector("[data-pr]") && !reducido) {
  const lenis = new Lenis({
    duration: 1.15,
    anchors: { offset: -64 },
    allowNestedScroll: true,
    prevent: (nodo) => !!nodo.closest("dialog, [data-lenis-prevent]"),
  });

  function bucle(t: number) {
    lenis.raf(t);
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  const cargando = () => raiz.classList.contains("is-loading") || raiz.classList.contains("llega-cortina");
  if (cargando()) {
    lenis.stop();
    const obs = new MutationObserver(() => {
      if (cargando()) return;
      obs.disconnect();
      lenis.start();
    });
    obs.observe(raiz, { attributes: true, attributeFilter: ["class"] });
  }

  addEventListener("aj:arriba", () => lenis.scrollTo(0, { immediate: true, force: true }));
  // al volver atrás con el navegador la página se restaura tal cual: que el scroll siga vivo
  addEventListener("pageshow", (e) => e.persisted && lenis.start());
}
