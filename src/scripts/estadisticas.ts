// Estadísticas anónimas de la web (las ves en /admin → «Estadísticas»). Sin cookies y sin guardar
// nada en el navegador:
//  - al cargar una página se avisa a la API (ruta, título, de dónde vienes, idioma, pantalla);
//  - al salir (o al cambiar de pestaña) se manda cuánto tiempo has estado y hasta dónde has bajado.
// Las sesiones las deduce la API (ver api/estadisticas.py). Con Global Privacy Control no se manda nada.

const nav = navigator as Navigator & { globalPrivacyControl?: boolean };

function iniciar() {
  if (nav.webdriver || nav.globalPrivacyControl) return;
  if (location.pathname.startsWith("/admin")) return;   // tu panel no cuenta como visita

  // Solo interesa la web de fuera; si vienes de otra página de aquí, no hay referente
  let referente: string | null = null;
  try {
    if (document.referrer && new URL(document.referrer).host !== location.host) referente = document.referrer;
  } catch {}

  const nav0 = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const raiz = document.documentElement;
  const oscuro =
    raiz.dataset.theme === "dark" || (!raiz.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);

  const inicio = performance.now();
  let visibleDesde = document.visibilityState === "visible" ? inicio : 0;
  let visto = 0;            // ms con la página a la vista
  let scrollMax = 0;
  let visita: { id: number; clave: string } | null = null;

  const medirScroll = () => {
    const alto = document.documentElement.scrollHeight - innerHeight;
    const pct = alto > 0 ? Math.round((scrollY / alto) * 100) : 100;
    if (pct > scrollMax) scrollMax = Math.min(100, pct);
  };
  addEventListener("scroll", medirScroll, { passive: true });

  const enviarFin = () => {
    if (!visita) return;
    if (visibleDesde) visto += performance.now() - visibleDesde;
    visibleDesde = 0;
    medirScroll();
    const cuerpo = JSON.stringify({ ...visita, duracion: Math.round(visto / 1000), scroll: scrollMax });
    const blob = new Blob([cuerpo], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/estadisticas/fin", blob)) {
      fetch("/api/estadisticas/fin", { method: "POST", body: cuerpo, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") enviarFin();
    else visibleDesde = performance.now();
  });
  addEventListener("pagehide", enviarFin);

  const params = new URLSearchParams(location.search);
  const enviar = () =>
    fetch("/api/estadisticas/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruta: location.pathname,
        titulo: document.title.split(" · ")[0].slice(0, 120),
        referente,
        utm: params.get("utm_source") || params.get("ref"),
        idioma: document.documentElement.lang || navigator.language,
        pantalla: `${screen.width}x${screen.height}`,
        tema: oscuro ? "oscuro" : "claro",
        carga: nav0 ? Math.round(nav0.loadEventEnd || nav0.domContentLoadedEventEnd) || null : null,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.id === "number") visita = { id: d.id, clave: d.clave };
      })
      .catch(() => {});

  // Después de la carga, para no competir con lo importante
  if (document.readyState === "complete") setTimeout(enviar, 300);
  else addEventListener("load", () => setTimeout(enviar, 300), { once: true });
}

iniciar();
