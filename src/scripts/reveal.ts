// Aparición suave de elementos con [data-reveal] al entrar en pantalla.
// Sin JS (o con reduced-motion) todo se ve igualmente: la clase .js
// solo se añade si este script se ejecuta.
// En la primera visita espera a que se vaya la pantalla de carga (html.is-loading),
// para que la entrada de la portada se vea y no ocurra tapada.

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
const root = document.documentElement;

function observar() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
  );

  items.forEach((el) => observer.observe(el));
}

if (!reduced && "IntersectionObserver" in window && items.length) {
  root.classList.add("js");

  if (root.classList.contains("is-loading")) {
    const espera = new MutationObserver(() => {
      if (root.classList.contains("is-loading")) return;
      espera.disconnect();
      observar();
    });
    espera.observe(root, { attributes: true, attributeFilter: ["class"] });
  } else {
    observar();
  }
}
