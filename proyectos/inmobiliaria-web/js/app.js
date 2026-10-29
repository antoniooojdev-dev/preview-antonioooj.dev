(() => {
  "use strict";

  const PROPS = window.PROPIEDADES;
  const AGENCIA = window.AGENCIA;
  const FAV_KEY = "habita:favoritos";
  const GASTOS_COMPRA = 0.1;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat("es-ES");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const TIPOS = { piso: "Piso", atico: "Ático", casa: "Casa", estudio: "Estudio" };
  const EXTRAS = { terraza: "Terraza", ascensor: "Ascensor", garaje: "Garaje", piscina: "Piscina", mascotas: "Admite mascotas" };
  const PRECIOS = {
    venta: [150000, 200000, 300000, 400000, 500000, 750000, 1000000],
    alquiler: [600, 800, 1000, 1250, 1500, 2000, 3000],
  };

  // Abierto como archivo (file://) el navegador bloquea replaceState: la URL no se actualiza pero todo sigue funcionando
  const setURL = (url) => {
    try {
      history.replaceState(null, "", url);
    } catch {
      /* file:// */
    }
  };

  const precioTexto = (p) => (p.op === "alquiler" ? `${eur.format(p.precio)}/mes` : eur.format(p.precio));

  // ── favoritos (localStorage con tolerancia a fallos) ──
  const favoritos = new Set(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(FAV_KEY)) ?? [];
      } catch {
        return [];
      }
    })(),
  );
  let soloFavoritos = false;

  function guardarFavoritos() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favoritos]));
    } catch {
      /* sin almacenamiento: los favoritos duran esta visita */
    }
    $("[data-fav-count]").textContent = favoritos.size;
  }

  function alternarFavorito(id) {
    favoritos.has(id) ? favoritos.delete(id) : favoritos.add(id);
    guardarFavoritos();
    $$(`[data-fav="${id}"]`).forEach((b) => b.setAttribute("aria-pressed", String(favoritos.has(id))));
    if (soloFavoritos) render();
  }

  // ── imagen generada (SVG) para no depender de fotos ──
  function imagen(p) {
    const h = (p.id * 47) % 360;
    const edificio = {
      casa: `<path d="M110 150 200 85l90 65v70H110z" fill="hsl(${h} 25% 92%)"/><path d="M95 155 200 78l105 77" stroke="hsl(${h} 30% 35%)" stroke-width="10" fill="none" stroke-linejoin="round"/><rect x="180" y="170" width="40" height="50" fill="hsl(${h} 30% 35%)"/>`,
      atico: `<rect x="140" y="60" width="120" height="160" fill="hsl(${h} 25% 92%)"/><rect x="125" y="52" width="150" height="10" fill="hsl(${h} 30% 35%)"/>${ventanas(150, 75, 3, 5, h)}`,
      estudio: `<rect x="150" y="110" width="100" height="110" fill="hsl(${h} 25% 92%)"/>${ventanas(162, 125, 2, 3, h)}`,
      piso: `<rect x="130" y="70" width="140" height="150" fill="hsl(${h} 25% 92%)"/>${ventanas(144, 85, 3, 4, h)}`,
    }[p.tipo];
    return `<svg viewBox="0 0 400 240" role="img" aria-label="${esc(TIPOS[p.tipo])} en ${esc(p.barrio)}" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="g${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h} 60% 82%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360} 55% 70%)"/></linearGradient></defs>
      <rect width="400" height="240" fill="url(#g${p.id})"/>
      <circle cx="320" cy="60" r="22" fill="hsl(45 100% 92%)" opacity=".8"/>
      ${edificio}
      <rect y="220" width="400" height="20" fill="hsl(${h} 25% 30%)" opacity=".35"/>
    </svg>`;
  }

  function ventanas(x0, y0, cols, rows, h) {
    let s = "";
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        s += `<rect x="${x0 + c * 38}" y="${y0 + r * 30}" width="22" height="18" rx="2" fill="hsl(${h} 35% 45%)" opacity=".75"/>`;
    return s;
  }

  // ── filtros ────────────────────────────────────────
  const form = $("[data-filters]");
  const sortSel = $("[data-sort]");
  const grid = $("[data-grid]");
  const ciudades = [...new Set(PROPS.map((p) => p.ciudad))].sort();

  $$("[data-ciudades]").forEach((sel) => ciudades.forEach((c) => sel.add(new Option(c, c))));

  function rellenarPrecios(op) {
    const sel = $("[data-precios]");
    const actual = sel.value;
    sel.innerHTML = "";
    sel.add(new Option("Sin límite", ""));
    PRECIOS[op].forEach((v) => sel.add(new Option(op === "alquiler" ? `${num.format(v)} €/mes` : eur.format(v), String(v))));
    if ([...sel.options].some((o) => o.value === actual)) sel.value = actual;
  }

  function leerFiltros() {
    const fd = new FormData(form);
    return {
      op: fd.get("op") || "venta",
      q: String(fd.get("q") || "").trim().toLowerCase(),
      ciudad: fd.get("ciudad") || "",
      tipo: fd.get("tipo") || "",
      hab: Number(fd.get("hab") || 0),
      max: Number(fd.get("max") || 0),
      extras: fd.getAll("extra"),
      orden: sortSel.value,
    };
  }

  const normalizar = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  function filtrar(f) {
    const q = normalizar(f.q);
    const lista = PROPS.filter(
      (p) =>
        p.op === f.op &&
        (!soloFavoritos || favoritos.has(p.id)) &&
        (!f.ciudad || p.ciudad === f.ciudad) &&
        (!f.tipo || p.tipo === f.tipo) &&
        p.hab >= f.hab &&
        (!f.max || p.precio <= f.max) &&
        f.extras.every((e) => p.extras.includes(e)) &&
        (!q || normalizar(`${p.titulo} ${p.barrio} ${p.ciudad} ${p.desc} ${p.extras.join(" ")}`).includes(q)),
    );

    const orden = {
      recientes: (a, b) => b.publicado.localeCompare(a.publicado),
      "precio-asc": (a, b) => a.precio - b.precio,
      "precio-desc": (a, b) => b.precio - a.precio,
      "m2-desc": (a, b) => b.m2 - a.m2,
      "eur-m2": (a, b) => a.precio / a.m2 - b.precio / b.m2,
    }[f.orden];
    return lista.sort(orden);
  }

  // Sincroniza los filtros con la URL para poder compartir búsquedas
  function aURL(f) {
    const params = new URLSearchParams();
    if (f.op !== "venta") params.set("op", f.op);
    if (f.q) params.set("q", f.q);
    if (f.ciudad) params.set("ciudad", f.ciudad);
    if (f.tipo) params.set("tipo", f.tipo);
    if (f.hab) params.set("hab", f.hab);
    if (f.max) params.set("max", f.max);
    f.extras.forEach((e) => params.append("extra", e));
    if (f.orden !== "recientes") params.set("orden", f.orden);
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) params.set("ref", ref);
    setURL(params.size ? `?${params}` : location.pathname);
  }

  function desdeURL() {
    const params = new URLSearchParams(location.search);
    const op = params.get("op") === "alquiler" ? "alquiler" : "venta";
    form.elements.op.value = op;
    rellenarPrecios(op);
    for (const name of ["q", "ciudad", "tipo", "hab", "max"]) {
      if (params.has(name)) form.elements[name].value = params.get(name);
    }
    const extras = params.getAll("extra");
    $$("input[name=extra]", form).forEach((cb) => (cb.checked = extras.includes(cb.value)));
    if (params.has("orden")) sortSel.value = params.get("orden");
  }

  // ── render ─────────────────────────────────────────
  function tarjeta(p) {
    const fav = favoritos.has(p.id);
    return `
      <li class="card prop">
        <div class="prop-img">
          ${imagen(p)}
          <span class="prop-type">${TIPOS[p.tipo]}</span>
          <button type="button" class="fav" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Guardar en favoritos">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.1 3.4 4.5 7 4.5c2 0 3.6 1.1 5 2.8 1.4-1.7 3-2.8 5-2.8 3.6 0 6 3.6 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>
          </button>
        </div>
        <div class="prop-body">
          <p class="prop-price">${precioTexto(p)}</p>
          <h3><button type="button" class="prop-link" data-open="${p.id}">${esc(p.titulo)}</button></h3>
          <p class="prop-loc">${esc(p.barrio)}, ${esc(p.ciudad)}</p>
          <ul class="specs" role="list">
            <li>${p.hab} hab.</li><li>${p.banos} baños</li><li>${p.m2} m²</li>
            ${p.op === "venta" ? `<li>${num.format(Math.round(p.precio / p.m2))} €/m²</li>` : ""}
          </ul>
        </div>
      </li>`;
  }

  function render() {
    const f = leerFiltros();
    const lista = filtrar(f);
    grid.innerHTML = lista.map(tarjeta).join("");
    $("[data-empty]").hidden = lista.length > 0;
    const que = f.op === "venta" ? "en venta" : "en alquiler";
    $("[data-count]").innerHTML = `<strong>${lista.length}</strong> ${lista.length === 1 ? "vivienda" : "viviendas"} ${que}${soloFavoritos ? " en favoritos" : ""}`;
    aURL(f);
  }

  form.addEventListener("input", (e) => {
    if (e.target.name === "op") rellenarPrecios(e.target.value);
    render();
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("reset", () =>
    setTimeout(() => {
      rellenarPrecios("venta");
      render();
    }),
  );
  sortSel.addEventListener("change", render);
  $("[data-clear]").addEventListener("click", () => {
    soloFavoritos = false;
    $("[data-fav-toggle]").setAttribute("aria-pressed", "false");
    form.reset();
  });

  $("[data-fav-toggle]").addEventListener("click", (e) => {
    soloFavoritos = !soloFavoritos;
    e.currentTarget.setAttribute("aria-pressed", String(soloFavoritos));
    render();
    $("#buscar").scrollIntoView({ behavior: "smooth" });
  });

  // delegación de eventos en la rejilla
  grid.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) return alternarFavorito(Number(fav.dataset.fav));
    const card = e.target.closest(".prop");
    if (card) abrirDetalle(Number($("[data-open]", card).dataset.open));
  });

  // ── hipoteca ───────────────────────────────────────
  function hipoteca(precio, entradaPct, anios, tin) {
    const prestamo = precio * (1 - entradaPct / 100);
    const n = anios * 12;
    const r = tin / 100 / 12;
    const cuota = r === 0 ? prestamo / n : (prestamo * r) / (1 - (1 + r) ** -n);
    return {
      prestamo,
      cuota,
      intereses: cuota * n - prestamo,
      ahorro: precio * (entradaPct / 100) + precio * GASTOS_COMPRA,
    };
  }

  const calc = $("[data-calc]");
  function pintarCalculo() {
    const v = Object.fromEntries([...new FormData(calc)].map(([k, val]) => [k, Number(val)]));
    $('[data-out="precio"]').textContent = eur.format(v.precio);
    $('[data-out="entrada"]').textContent = `${v.entrada} % · ${eur.format((v.precio * v.entrada) / 100)}`;
    $('[data-out="anios"]').textContent = `${v.anios} años`;
    $('[data-out="interes"]').textContent = `${v.interes.toFixed(2).replace(".", ",")} %`;
    const r = hipoteca(v.precio, v.entrada, v.anios, v.interes);
    $('[data-res="cuota"]').textContent = `${eur.format(r.cuota)}/mes`;
    $('[data-res="prestamo"]').textContent = eur.format(r.prestamo);
    $('[data-res="intereses"]').textContent = eur.format(r.intereses);
    $('[data-res="ahorro"]').textContent = eur.format(r.ahorro);
  }
  calc.addEventListener("input", pintarCalculo);
  pintarCalculo();

  // ── valoración ─────────────────────────────────────
  const mediana = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const valuation = $("[data-valuation]");
  valuation.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(valuation);
    const ciudad = fd.get("ciudad");
    const m2 = Number(fd.get("m2"));
    const out = $("[data-valuation-result]");
    const muestras = PROPS.filter((p) => p.op === "venta" && p.ciudad === ciudad).map((p) => p.precio / p.m2);

    out.hidden = false;
    if (!muestras.length || !m2) {
      out.innerHTML = "<p>No tenemos suficientes datos en esa ciudad. Te llamamos para valorarla.</p>";
      return;
    }
    const base = mediana(muestras) * m2 * Number(fd.get("estado")) * Number(fd.get("extras"));
    const asunto = encodeURIComponent(`Valoración profesional: ${m2} m² en ${ciudad}`);
    out.innerHTML = `
      <p class="muted">Valor estimado</p>
      <p class="valuation-value">${eur.format(base * 0.92)} – ${eur.format(base * 1.08)}</p>
      <p class="muted small">Basado en ${muestras.length} ${muestras.length === 1 ? "vivienda" : "viviendas"} en venta en ${esc(ciudad)} · ${num.format(Math.round(mediana(muestras)))} €/m² de mediana.</p>
      <a class="btn btn-ghost" href="mailto:${AGENCIA.email}?subject=${asunto}">Pedir valoración profesional</a>`;
  });

  // ── detalle en modal ───────────────────────────────
  const modal = $("[data-modal]");
  const modalBody = $("[data-modal-body]");

  function abrirDetalle(id) {
    const p = PROPS.find((x) => x.id === id);
    if (!p) return;
    const est = p.op === "venta" ? hipoteca(p.precio, 20, 30, 2.75) : null;
    const asunto = encodeURIComponent(`Interesado en ref. ${p.id}: ${p.titulo}`);

    modalBody.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Cerrar">✕</button>
      <div class="modal-img">${imagen(p)}</div>
      <div class="modal-content">
        <p class="prop-loc">${TIPOS[p.tipo]} · ${esc(p.barrio)}, ${esc(p.ciudad)} · Ref. ${p.id}</p>
        <h2 id="modal-title">${esc(p.titulo)}</h2>
        <p class="modal-price">${precioTexto(p)}</p>
        <ul class="specs specs-lg" role="list">
          <li><strong>${p.m2}</strong> m²</li>
          <li><strong>${p.hab}</strong> hab.</li>
          <li><strong>${p.banos}</strong> baños</li>
          <li><strong>${p.planta === 0 ? "Bajo" : p.planta + "ª"}</strong> planta</li>
        </ul>
        <p>${esc(p.desc)}</p>
        ${p.extras.length ? `<ul class="tags" role="list">${p.extras.map((e) => `<li>${EXTRAS[e]}</li>`).join("")}</ul>` : ""}
        ${
          est
            ? `<div class="estimate">
                <span>Hipoteca estimada</span>
                <strong>${eur.format(est.cuota)}/mes</strong>
                <button type="button" class="link" data-to-calc="${p.precio}">Personalizar cálculo</button>
              </div>`
            : ""
        }
        <form class="contact" data-contact>
          <h3>Contactar con el agente</h3>
          <div class="row">
            <label class="field"><span>Nombre</span><input name="nombre" required autocomplete="name" /></label>
            <label class="field"><span>Teléfono</span><input name="tel" type="tel" required autocomplete="tel" /></label>
          </div>
          <label class="field"><span>Mensaje</span><textarea name="msg" rows="3">Hola, me interesa esta vivienda (ref. ${p.id}). ¿Podemos concertar una visita?</textarea></label>
          <div class="contact-actions">
            <button class="btn">Solicitar visita</button>
            <button type="button" class="btn btn-ghost" data-share="${p.id}">Compartir</button>
          </div>
          <p class="small muted" data-share-status aria-live="polite"></p>
        </form>
      </div>`;

    $("[data-contact]", modalBody).addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const cuerpo = encodeURIComponent(`${fd.get("msg")}\n\n${fd.get("nombre")} · ${fd.get("tel")}`);
      location.href = `mailto:${AGENCIA.email}?subject=${asunto}&body=${cuerpo}`;
    });

    const url = new URL(location.href);
    url.searchParams.set("ref", p.id);
    setURL(url);
    modal.showModal();
  }

  modal.addEventListener("click", async (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) return modal.close();

    const toCalc = e.target.closest("[data-to-calc]");
    if (toCalc) {
      calc.elements.precio.value = toCalc.dataset.toCalc;
      pintarCalculo();
      modal.close();
      $("#hipoteca").scrollIntoView({ behavior: "smooth" });
    }

    const share = e.target.closest("[data-share]");
    if (share) {
      const status = $("[data-share-status]", modal);
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else {
          await navigator.clipboard.writeText(location.href);
          status.textContent = "Enlace copiado al portapapeles.";
        }
      } catch {
        /* el usuario canceló */
      }
    }
  });

  modal.addEventListener("close", () => {
    const url = new URL(location.href);
    url.searchParams.delete("ref");
    setURL(url);
  });

  // ── inicio ─────────────────────────────────────────
  $("[data-year]").textContent = new Date().getFullYear();
  desdeURL();
  guardarFavoritos();
  render();
  const ref = Number(new URLSearchParams(location.search).get("ref"));
  if (ref) abrirDetalle(ref);
})();
