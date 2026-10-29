(() => {
  "use strict";

  const { horario, intervaloReserva, antelacionMinutos, margenCierre } = window.RESTAURANTE;
  const CARTA = window.CARTA;
  const ALERGENOS = window.ALERGENOS;
  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // ── utilidades de horas ─────────────────────────────
  // "20:30" → 1230 minutos. "00:00" como cierre se trata como medianoche (1440).
  const toMin = (hhmm, esCierre = false) => {
    const [h, m] = hhmm.split(":").map(Number);
    const total = h * 60 + m;
    return esCierre && total === 0 ? 1440 : total;
  };
  const toHHMM = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const fechaISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // ── cabecera y menú móvil ───────────────────────────
  const header = $("[data-header]");
  const menuBtn = $("[data-menu-btn]");

  const setMenu = (open) => {
    header.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  };
  menuBtn.addEventListener("click", () => setMenu(!header.classList.contains("is-open")));
  $$("#nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 10), { passive: true });

  $("[data-year]").textContent = new Date().getFullYear();

  // ── "abierto ahora" ─────────────────────────────────
  function estadoApertura(ahora = new Date()) {
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    const turnosHoy = horario[ahora.getDay()];

    for (const [ini, fin] of turnosHoy) {
      if (min >= toMin(ini) && min < toMin(fin, true)) {
        return { abierto: true, texto: `Abierto ahora · cierra a las ${fin}` };
      }
    }
    // siguiente apertura (hoy o próximos días)
    for (let i = 0; i < 7; i++) {
      const dia = (ahora.getDay() + i) % 7;
      const siguiente = horario[dia].find(([ini]) => i > 0 || toMin(ini) > min);
      if (siguiente) {
        const cuando = i === 0 ? "hoy" : i === 1 ? "mañana" : `el ${DIAS[dia].toLowerCase()}`;
        return { abierto: false, texto: `Cerrado · abrimos ${cuando} a las ${siguiente[0]}` };
      }
    }
    return { abierto: false, texto: "Cerrado temporalmente" };
  }

  const statusEl = $("[data-open-status]");
  const pintarEstado = () => {
    const { abierto, texto } = estadoApertura();
    statusEl.textContent = texto;
    statusEl.classList.toggle("is-open", abierto);
  };
  pintarEstado();
  setInterval(pintarEstado, 60_000);

  // ── tabla de horario (lunes primero, hoy resaltado) ─
  const tbody = $("[data-hours] tbody");
  const hoy = new Date().getDay();
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
    const tr = document.createElement("tr");
    if (d === hoy) tr.className = "is-today";
    const turnos = horario[d];
    tr.innerHTML = `<th scope="row">${DIAS[d]}</th><td>${
      turnos.length ? turnos.map(([a, b]) => `${a} – ${b}`).join("<br>") : "Cerrado"
    }</td>`;
    tbody.append(tr);
  });

  // ── carta con pestañas y filtro de alérgenos ────────
  const tabsEl = $("[data-tabs]");
  const menuEl = $("[data-menu]");
  const emptyEl = $("[data-menu-empty]");
  const allergenSel = $("[data-allergen]");
  const categorias = [...new Set(CARTA.map((p) => p.cat))];
  const estado = { cat: categorias[0], sin: "" };

  Object.entries(ALERGENOS).forEach(([value, label]) => allergenSel.add(new Option(label.toLowerCase(), value)));

  categorias.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.textContent = cat;
    btn.setAttribute("aria-selected", String(i === 0));
    btn.addEventListener("click", () => {
      estado.cat = cat;
      $$("button", tabsEl).forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      pintarCarta();
    });
    tabsEl.append(btn);
  });

  allergenSel.addEventListener("change", () => {
    estado.sin = allergenSel.value;
    pintarCarta();
  });

  function pintarCarta() {
    const platos = CARTA.filter((p) => p.cat === estado.cat && (!estado.sin || !p.alergenos.includes(estado.sin)));
    menuEl.innerHTML = platos
      .map(
        (p) => `
        <li class="dish">
          <div class="dish-head">
            <h3>${p.nombre}${p.veg ? ' <span class="badge" title="Vegetariano">veg</span>' : ""}</h3>
            <span class="dots" aria-hidden="true"></span>
            <span class="price">${euro.format(p.precio)}</span>
          </div>
          <p>${p.desc}</p>
          ${
            p.alergenos.length
              ? `<p class="allergens">Contiene: ${p.alergenos.map((a) => ALERGENOS[a].toLowerCase()).join(", ")}</p>`
              : ""
          }
        </li>`,
      )
      .join("");
    emptyEl.hidden = platos.length > 0;
  }
  pintarCarta();

  // ── reservas ────────────────────────────────────────
  const form = $("[data-reserva-form]");
  const fechaEl = $("[data-fecha]");
  const horaEl = $("[data-hora]");
  const statusForm = $("[data-form-status]");

  const hoyDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  fechaEl.min = fechaISO(hoyDate);
  fechaEl.max = fechaISO(maxDate);

  // Calcula los huecos en el navegador (se usa si la API no está disponible)
  function huecosLocales(fecha) {
    const d = new Date(`${fecha}T00:00`);
    const ahora = new Date();
    const esHoy = fechaISO(ahora) === fecha;
    const limite = ahora.getHours() * 60 + ahora.getMinutes() + antelacionMinutos;
    const horas = [];
    for (const [ini, fin] of horario[d.getDay()]) {
      for (let m = toMin(ini); m <= toMin(fin, true) - margenCierre; m += intervaloReserva) {
        if (!esHoy || m >= limite) horas.push({ hora: toHHMM(m), plazas: null });
      }
    }
    return horas;
  }

  // Pide los huecos con plazas libres al servidor (PHP)
  async function huecos(fecha) {
    try {
      const res = await fetch(`api/disponibilidad.php?fecha=${encodeURIComponent(fecha)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      return json.horas;
    } catch {
      return huecosLocales(fecha);
    }
  }

  fechaEl.addEventListener("change", async () => {
    horaEl.innerHTML = "<option value=''>Cargando…</option>";
    const horas = fechaEl.value ? await huecos(fechaEl.value) : [];
    horaEl.innerHTML = "";
    if (!horas.length) {
      horaEl.add(new Option("Sin horas disponibles", ""));
      return;
    }
    horaEl.add(new Option("Elige hora", ""));
    horas.forEach(({ hora, plazas }) => {
      const opt = new Option(plazas === null ? hora : `${hora} · ${plazas} plazas`, hora);
      opt.disabled = plazas === 0;
      horaEl.add(opt);
    });
  });

  const validar = (data) => {
    const errores = [];
    if (data.nombre.trim().length < 2) errores.push("nombre");
    if (!/^[+\d\s]{9,15}$/.test(data.telefono.trim())) errores.push("telefono");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errores.push("email");
    if (!data.fecha) errores.push("fecha");
    if (!data.hora) errores.push("hora");
    return errores;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.web) return; // honeypot

    $$("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid"));
    const errores = validar(data);
    if (errores.length) {
      errores.forEach((name) => form.elements[name].setAttribute("aria-invalid", "true"));
      form.elements[errores[0]].focus();
      mostrar("Revisa los campos marcados.", "error");
      return;
    }

    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    mostrar("Enviando reserva…");

    try {
      const res = await fetch("api/reservar.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo completar la reserva.");
      form.reset();
      horaEl.innerHTML = "<option value=''>Elige fecha</option>";
      mostrar(`¡Reserva confirmada! Código ${json.codigo}. Te hemos enviado un email.`, "ok");
    } catch (err) {
      const sinServidor = err instanceof TypeError || err instanceof SyntaxError;
      mostrar(
        sinServidor
          ? "Las reservas necesitan el servidor PHP (ver README: php -S localhost:8000)."
          : err.message,
        "error",
      );
    } finally {
      btn.disabled = false;
    }
  });

  function mostrar(texto, tipo = "") {
    statusForm.textContent = texto;
    statusForm.dataset.tipo = tipo;
  }
})();
