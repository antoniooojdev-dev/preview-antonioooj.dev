// Desplegable propio para los <select data-desplegable> del formulario de contacto.
// El <select> se queda (oculto) como fuente de verdad: FormData lo sigue leyendo igual.
// Teclado: ↑ ↓ Inicio Fin para moverse, Intro/Espacio para elegir, Esc para cerrar.

const FLECHA =
  '<svg class="dsp__flecha" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK =
  '<svg class="dsp__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

let abierto: (() => void) | null = null; // cierra el que esté abierto

function montar(select: HTMLSelectElement) {
  const id = select.id;
  const caja = document.createElement("div");
  caja.className = "dsp";
  select.replaceWith(caja);
  caja.append(select);
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dsp__btn";
  btn.id = `${id}-dsp`;
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  const valor = document.createElement("span");
  valor.className = "dsp__valor";
  btn.append(valor);
  btn.insertAdjacentHTML("beforeend", FLECHA);

  // la etiqueta del campo apunta ahora al botón
  const etiqueta = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
  if (etiqueta) {
    etiqueta.id ||= `${id}-lbl`;
    etiqueta.htmlFor = btn.id;
    btn.setAttribute("aria-labelledby", `${etiqueta.id} ${btn.id}`);
  }

  const lista = document.createElement("ul");
  lista.className = "dsp__lista";
  lista.id = `${id}-lista`;
  lista.setAttribute("role", "listbox");
  lista.tabIndex = -1;
  btn.setAttribute("aria-controls", lista.id);

  // solo las opciones con valor: «Selecciona…» es el texto vacío del botón
  const opciones = [...select.options].filter((o) => o.value);
  const conNivel = opciones.some((o) => o.dataset.nivel !== undefined);
  const filas = opciones.map((o, i) => {
    const li = document.createElement("li");
    li.className = "dsp__op";
    li.id = `${id}-op-${i}`;
    li.setAttribute("role", "option");
    li.dataset.valor = o.value;
    // barritas de nivel; las opciones sin nivel («Aún no lo sé») llevan el hueco vacío para alinear el texto
    if (conNivel) {
      const nivel = Number(o.dataset.nivel) || 0;
      const barras = document.createElement("span");
      barras.className = "dsp__nivel";
      barras.setAttribute("aria-hidden", "true");
      for (let n = 1; n <= 4; n++) {
        const b = document.createElement("i");
        if (n <= nivel) b.className = "is-on";
        if (!nivel) b.style.visibility = "hidden";
        barras.append(b);
      }
      li.append(barras);
    }
    const txt = document.createElement("span");
    txt.className = "dsp__txt";
    txt.textContent = o.textContent;
    li.append(txt);
    li.insertAdjacentHTML("beforeend", CHECK);
    return li;
  });
  lista.append(...filas);
  caja.append(btn, lista);

  let activa = -1;

  function pintar() {
    const o = select.selectedOptions[0];
    valor.textContent = o?.textContent ?? "";
    valor.classList.toggle("is-vacio", !select.value);
    filas.forEach((f) => f.setAttribute("aria-selected", String(f.dataset.valor === select.value)));
  }

  function marcar(i: number) {
    activa = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, n) => f.classList.toggle("is-activa", n === activa));
    lista.setAttribute("aria-activedescendant", filas[activa].id);
    filas[activa].scrollIntoView({ block: "nearest" });
  }

  function abrir() {
    if (abierto && abierto !== cerrar) abierto();
    // si no cabe debajo, se abre hacia arriba
    const r = btn.getBoundingClientRect();
    caja.classList.toggle("is-arriba", innerHeight - r.bottom < 300 && r.top > innerHeight - r.bottom);
    caja.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    marcar(Math.max(0, filas.findIndex((f) => f.dataset.valor === select.value)));
    lista.focus({ preventScroll: true });
    abierto = cerrar;
  }

  function cerrar(volverAlBoton = false) {
    caja.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    if (abierto === cerrar) abierto = null;
    if (volverAlBoton) btn.focus({ preventScroll: true });
  }

  function elegir(i: number) {
    select.value = filas[i].dataset.valor ?? "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    pintar();
    cerrar(true);
  }

  btn.addEventListener("click", () => (caja.classList.contains("is-open") ? cerrar() : abrir()));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      abrir();
    }
  });

  filas.forEach((f, i) => {
    f.addEventListener("pointermove", () => activa !== i && marcar(i));
    f.addEventListener("click", () => elegir(i));
  });

  lista.addEventListener("keydown", (e) => {
    const teclas: Record<string, () => void> = {
      ArrowDown: () => marcar(activa + 1),
      ArrowUp: () => marcar(activa - 1),
      Home: () => marcar(0),
      End: () => marcar(filas.length - 1),
      Enter: () => elegir(activa),
      " ": () => elegir(activa),
      Escape: () => cerrar(true),
      Tab: () => cerrar(),
    };
    const accion = teclas[e.key];
    if (!accion) return;
    if (e.key !== "Tab") e.preventDefault();
    accion();
  });

  document.addEventListener("pointerdown", (e) => {
    if (caja.classList.contains("is-open") && !caja.contains(e.target as Node)) cerrar();
  });

  select.addEventListener("change", pintar);
  select.form?.addEventListener("reset", () => setTimeout(pintar));
  pintar();
}

document.querySelectorAll<HTMLSelectElement>("select[data-desplegable]").forEach(montar);
