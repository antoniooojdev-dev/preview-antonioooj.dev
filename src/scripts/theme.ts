// Cambio de tema claro/oscuro.
// El tema inicial se aplica con un script inline en <head> (BaseLayout)
// para evitar el parpadeo; aquí solo gestionamos el botón.
// Al cambiar, el tema nuevo entra como un círculo que crece desde el botón pulsado
// (View Transitions, ver «cambio de tema» en global.css). Sin soporte, los colores
// pasan con un fundido corto (clase .tema-fundido).

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");
const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");

function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return media.matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* almacenamiento no disponible: el tema dura solo esta visita */
  }
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(theme === "dark"));
  });
}

function cambiarConAnimacion(theme: Theme, btn: HTMLElement) {
  const raiz = document.documentElement;
  if (reducido.matches) return applyTheme(theme);

  if (!document.startViewTransition) {
    raiz.classList.add("tema-fundido");
    applyTheme(theme);
    setTimeout(() => raiz.classList.remove("tema-fundido"), 600);
    return;
  }

  // el círculo nace en el centro del botón y crece hasta tapar la esquina más lejana
  const r = btn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  raiz.style.setProperty("--tema-x", `${x}px`);
  raiz.style.setProperty("--tema-y", `${y}px`);
  raiz.style.setProperty("--tema-r", `${radio}px`);
  raiz.classList.add("tema-cambio", theme === "dark" ? "a-oscuro" : "a-claro");

  const vt = document.startViewTransition(() => applyTheme(theme));
  vt.finished.finally(() => raiz.classList.remove("tema-cambio", "a-oscuro", "a-claro"));
}

document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
  btn.setAttribute("aria-pressed", String(currentTheme() === "dark"));
  // (los iconos sol/luna se cruzan girando solos con el cambio de tema, ver ThemeToggle.astro)
  btn.addEventListener("click", () => {
    cambiarConAnimacion(currentTheme() === "dark" ? "light" : "dark", btn);
  });
});
