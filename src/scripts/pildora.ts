// Filtros con «píldora» deslizante: un fondo que viaja de un botón a otro al cambiar de filtro
// (los botones de «Todos / Abiertos / …» del chat y de /cuenta).
// Uso: const mover = pildora(grupo, "[aria-pressed='true']"); y llamar a mover() al cambiar.
// El estilo va en global.css (.pildora / .pildora__marca); cada página pone el color con
// --pildora-bg y --pildora-sombra.

export function pildora(grupo: HTMLElement, activo: string): () => void {
  const marca = document.createElement("span");
  marca.className = "pildora__marca";
  marca.setAttribute("aria-hidden", "true");
  grupo.classList.add("pildora");
  grupo.prepend(marca);

  let antes: HTMLElement | null = null;

  function mover(animar = true) {
    const b = grupo.querySelector<HTMLElement>(activo);
    if (!b) return;
    marca.classList.toggle("sin-anim", !animar);
    marca.style.width = `${b.offsetWidth}px`;
    marca.style.height = `${b.offsetHeight}px`;
    marca.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    // al saltar a otro botón, la píldora se estira un instante (sensación de «goma»)
    if (animar && antes && antes !== b) {
      marca.classList.remove("is-salto");
      void marca.offsetWidth;
      marca.classList.add("is-salto");
    }
    antes = b;
  }

  mover(false);
  // si cambia el tamaño (fuentes, ventana), se recoloca sin animar
  new ResizeObserver(() => mover(false)).observe(grupo);
  return () => mover(true);
}
