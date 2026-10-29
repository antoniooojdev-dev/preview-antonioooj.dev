// La pantalla de la entrada de la web (logo + línea que se llena) usada como cortina:
//  - cambiarConCortina(id): tapa la página, cambia el idioma por debajo, sube arriba del todo
//    y se levanta.
//  - irConCortina(url): tapa la página y navega (p. ej. al pulsar un proyecto de la portada).
//    La página nueva arranca tapada (html.llega-cortina, ver BaseLayout) y aquí se levanta.
// Avisa con eventos para que cada página haga lo suyo:
//  - «aj:arriba»: ir arriba (la portada mueve su scroll suave, Lenis).
//  - «aj:entrada»: la cortina se está levantando (la página repite su animación de entrada).
// `entradaLista` se cumple cuando la página ya se ve: al levantarse la cortina o al irse la
// pantalla de carga (components/SiteLoader.astro, html.is-loading).
// Estilos en global.css («cortina del cambio de idioma»).

import logoUrl from "@/assets/logo-mask.png?url";
import { cambiarIdioma, idiomaActual } from "@/scripts/i18n";
import type { Idioma } from "@/i18n/dict";

const CLAVE = "aj-cortina";
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let ocupado = false;

function crear(): HTMLElement {
  const cortina = document.createElement("div");
  cortina.className = "cortina-idioma";
  cortina.setAttribute("aria-hidden", "true");
  cortina.style.setProperty("--logo", `url("${logoUrl}")`);
  cortina.innerHTML = '<div class="cortina-idioma__logo"></div><div class="cortina-idioma__barra"><i></i></div>';
  document.body.append(cortina);
  void cortina.offsetWidth; // que arranque la transición de entrada
  cortina.classList.add("is-dentro");
  return cortina;
}

async function levantar(cortina: HTMLElement) {
  cortina.classList.add("is-fuera");
  window.dispatchEvent(new CustomEvent("aj:entrada"));
  await espera(800);
  cortina.remove();
}

function arriba() {
  window.dispatchEvent(new CustomEvent("aj:arriba"));
  window.scrollTo({ top: 0, behavior: "instant" });
}

export async function cambiarConCortina(id: Idioma) {
  if (id === idiomaActual() || ocupado) return;
  if (reducido()) {
    cambiarIdioma(id);
    arriba();
    return;
  }
  ocupado = true;
  const cortina = crear();
  await espera(450); // ya tapa la página
  cambiarIdioma(id);
  arriba();
  cortina.classList.add("is-cargando");
  await espera(800); // la línea se llena
  await levantar(cortina);
  ocupado = false;
}

export async function irConCortina(url: string) {
  if (ocupado) return;
  if (reducido()) {
    location.href = url;
    return;
  }
  ocupado = true;
  const cortina = crear();
  await espera(350);
  cortina.classList.add("is-cargando");
  await espera(700);
  try {
    sessionStorage.setItem(CLAVE, "1");
  } catch {}
  location.href = url;
}

// Volver atrás con el botón del navegador restaura la página tal cual se dejó (con la
// cortina puesta): se quita.
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  document.querySelectorAll(".cortina-idioma:not(.cortina-llegada)").forEach((c) => c.remove());
  ocupado = false;
});

// ── llegada con cortina ──
const llegada = document.documentElement.classList.contains("llega-cortina")
  ? document.querySelector<HTMLElement>(".cortina-llegada")
  : null;

export const entradaLista: Promise<void> = llegada
  ? (async () => {
      // un respiro para que fuentes y estilos estén listos debajo
      await Promise.race([document.fonts.ready, espera(600)]);
      await espera(200);
      // (la clase se quita al final: sin ella la cortina de llegada desaparece de golpe)
      levantar(llegada).then(() => document.documentElement.classList.remove("llega-cortina"));
    })()
  : new Promise<void>((listo) => {
      const raiz = document.documentElement;
      if (!raiz.classList.contains("is-loading")) return listo();
      const obs = new MutationObserver(() => {
        if (raiz.classList.contains("is-loading")) return;
        obs.disconnect();
        listo();
      });
      obs.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    });
