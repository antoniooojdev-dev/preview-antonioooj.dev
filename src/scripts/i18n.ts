// Cambio de idioma de la web (español, inglés y portugués) en el navegador.
//  - Recorre los textos de la página y cambia los que estén en src/i18n/dict.ts.
//  - Guarda el texto original de cada nodo para poder volver al español sin recargar.
//  - Vigila la página (MutationObserver): lo que otros scripts escriban después en español
//    (p. ej. «en línea» de las demos) también se traduce.
//  - Lo que se rellena con datos en directo ([data-b], src/scripts/bento.ts) o se marca con
//    [data-no-i18n] no se toca aquí: esos scripts traducen por su cuenta al oír «aj:idioma».
//  - [data-i18n-words]: titulares partidos palabra a palabra; se rehacen con la traducción.
// La elección se guarda en localStorage («aj-lang»); la primera vez se usa la del navegador.

import { IDIOMAS, t, tieneTraduccion, original as originalDe, norm, type Idioma } from "@/i18n/dict";

const CLAVE = "aj-lang";
const ATRIBUTOS = ["aria-label", "title", "placeholder", "alt"] as const;
// [data-pr-split]: textos que la portada parte en letras con SplitText (los traduce pagina.ts)
const SALTAR = "script, style, code, pre, textarea, [data-no-i18n], [data-b], [data-pr-split]";

/** El original en español de un texto: él mismo si está en el diccionario, o el texto del que
 *  es traducción (un script ha vuelto a escribir algo ya traducido). */
function buscarOriginal(texto: string): string | undefined {
  if (tieneTraduccion(texto)) return texto;
  const es = originalDe(texto);
  if (es === undefined) return undefined;
  // conserva los espacios de alrededor
  return texto.match(/^\s*/)![0] + es + texto.match(/\s*$/)![0];
}

export function idiomaPorDefecto(): Idioma {
  try {
    const g = localStorage.getItem(CLAVE);
    if (g === "es" || g === "en" || g === "pt") return g;
  } catch {}
  const nav = (navigator.language || "es").slice(0, 2);
  return nav === "en" || nav === "pt" ? nav : "es";
}

let actual: Idioma = idiomaPorDefecto();
export const idiomaActual = () => actual;
export const localeActual = () => IDIOMAS.find((i) => i.id === actual)!.locale;
/** Traduce al idioma elegido un texto escrito en español desde un script. */
export const tr = (es: string) => t(es, actual);

// textos y atributos originales (en español)
const textos = new WeakMap<Text, string>();
const atributos = new WeakMap<Element, Map<string, string>>();
let tituloOriginal = document.title;

const saltar = (n: Node) => {
  const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
  return !el || !!el.closest(SALTAR);
};

function traducirTexto(n: Text) {
  if (saltar(n)) return;
  let original = textos.get(n);
  if (original === undefined) {
    original = buscarOriginal(n.data);
    if (original === undefined) return;
    textos.set(n, original);
  }
  // mantiene los espacios de alrededor (separan palabras de etiquetas vecinas)
  const ini = original.match(/^\s*/)![0];
  const fin = original.match(/\s*$/)![0];
  const nuevo = actual === "es" ? original : ini + t(norm(original), actual) + fin;
  if (n.data !== nuevo) n.data = nuevo;
}

function traducirAtributos(el: Element) {
  if (el.closest("[data-no-i18n]")) return;
  for (const a of ATRIBUTOS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    let mapa = atributos.get(el);
    let original = mapa?.get(a);
    if (original === undefined) {
      original = buscarOriginal(v);
      if (original === undefined) continue;
      if (!mapa) atributos.set(el, (mapa = new Map()));
      mapa.set(a, original);
    }
    const nuevo = t(original, actual);
    if (v !== nuevo) el.setAttribute(a, nuevo);
  }
}

/** Titular partido en palabras: <h1 data-i18n-words="frase"> con .w > span por palabra. */
function traducirPalabras(el: HTMLElement) {
  const frase = t(el.dataset.i18nWords!, actual);
  const ahora = Array.from(el.querySelectorAll(".w > span"), (s) => s.textContent).join(" ");
  if (ahora === frase) return;
  const plantilla = el.querySelector(".w");
  if (!plantilla) return;
  el.setAttribute("aria-label", frase);
  el.replaceChildren(
    ...frase.split(" ").map((palabra, i) => {
      const w = plantilla.cloneNode(false) as HTMLElement;
      const s = document.createElement("span");
      for (const at of plantilla.firstElementChild?.attributes ?? []) s.setAttribute(at.name, at.value);
      s.style.setProperty("--w", String(i));
      s.textContent = palabra;
      w.append(s);
      return w;
    }),
  );
}

function recorrer(raiz: Node) {
  if (raiz.nodeType === 3) return traducirTexto(raiz as Text);
  if (raiz.nodeType !== 1) return;
  const el = raiz as Element;
  if (el.matches?.("[data-i18n-words]")) return traducirPalabras(el as HTMLElement);
  traducirAtributos(el);
  const paseo = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType === 1) {
        const e = n as Element;
        if (e.matches(SALTAR)) return NodeFilter.FILTER_REJECT;
        if (e.matches("[data-i18n-words]")) {
          traducirPalabras(e as HTMLElement);
          return NodeFilter.FILTER_REJECT;
        }
        traducirAtributos(e);
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = paseo.nextNode())) traducirTexto(n as Text);
}

const vigia = new MutationObserver((cambios) => {
  for (const c of cambios) {
    if (c.type === "characterData") {
      // nuestros propios cambios se descartan con takeRecords(), así que esto lo ha escrito
      // otro script: el texto nuevo pasa a ser el original en español
      const n = c.target as Text;
      textos.delete(n);
      traducirTexto(n);
    } else {
      c.addedNodes.forEach(recorrer);
    }
  }
  vigia.takeRecords();
});

function aplicar() {
  document.documentElement.lang = actual;
  if (document.title !== t(tituloOriginal, "en") && document.title !== t(tituloOriginal, "pt")) tituloOriginal = document.title;
  document.title = t(tituloOriginal, actual);
  recorrer(document.body);
  vigia.takeRecords();
}

export function cambiarIdioma(id: Idioma) {
  if (id === actual) return;
  actual = id;
  try {
    localStorage.setItem(CLAVE, id);
  } catch {}
  aplicar();
  window.dispatchEvent(new CustomEvent("aj:idioma", { detail: id }));
}

aplicar();
vigia.observe(document.body, { childList: true, subtree: true, characterData: true });
// la cabecera oculta la página un instante si el idioma no es español (ver BaseLayout)
document.documentElement.classList.remove("i18n-wait");
