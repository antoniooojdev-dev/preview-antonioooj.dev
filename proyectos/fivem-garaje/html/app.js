"use strict";

const resource = typeof GetParentResourceName === "function" ? GetParentResourceName() : "aj_garage";

const els = {
  panel: document.getElementById("panel"),
  kind: document.getElementById("kind"),
  title: document.getElementById("title"),
  search: document.getElementById("search"),
  count: document.getElementById("count"),
  fee: document.getElementById("fee"),
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  tpl: document.getElementById("card-tpl"),
};

const state = { kind: "garage", vehicles: [], busy: false };

/** Llama a un RegisterNUICallback del cliente Lua */
async function post(event, data = {}) {
  try {
    const res = await fetch(`https://${resource}/${event}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return false;
  }
}

const pct = (value, max) => Math.max(0, Math.min(100, Math.round((value / max) * 100)));

function badgeFor(v) {
  if (state.kind === "impound") return { text: "En depósito", cls: "impound" };
  if (v.available) return { text: "Disponible", cls: "" };
  if (v.state === "garage") return { text: v.garage ?? "Otro garaje", cls: "out" };
  if (v.state === "impound") return { text: "En depósito", cls: "impound" };
  return { text: "Fuera", cls: "out" };
}

function render() {
  const q = els.search.value.trim().toLowerCase();
  const list = state.vehicles.filter((v) => !q || v.label.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q));

  els.list.replaceChildren(
    ...list.map((v) => {
      const node = els.tpl.content.firstElementChild.cloneNode(true);
      node.classList.toggle("disabled", !v.available);
      node.querySelector(".model").textContent = v.label;
      node.querySelector(".plate").textContent = v.plate;

      const badge = badgeFor(v);
      const badgeEl = node.querySelector(".badge");
      badgeEl.textContent = badge.text;
      if (badge.cls) badgeEl.classList.add(badge.cls);

      const values = { fuel: pct(v.fuel, 100), engine: pct(v.engine, 1000), body: pct(v.body, 1000) };
      for (const [key, value] of Object.entries(values)) {
        const bar = node.querySelector(`[data-stat="${key}"]`);
        bar.style.width = `${value}%`;
        if (value < 25) bar.classList.add("low");
        else if (value < 60) bar.classList.add("mid");
      }

      const btn = node.querySelector(".take");
      btn.textContent = state.kind === "impound" ? "Pagar y sacar" : "Sacar vehículo";
      btn.disabled = !v.available;
      btn.addEventListener("click", () => takeOut(v.plate, btn));
      return node;
    }),
  );

  const available = state.vehicles.filter((v) => v.available).length;
  els.count.textContent = `${available}/${state.vehicles.length}`;
  els.empty.hidden = list.length > 0;
}

async function takeOut(plate, btn) {
  if (state.busy) return;
  state.busy = true;
  btn.disabled = true;
  btn.textContent = "…";
  const ok = await post("takeOut", { plate });
  state.busy = false;
  if (!ok) render(); // si falla, se vuelve a pintar (Lua ya muestra la notificación)
}

function open({ kind, title, fee, vehicles }) {
  state.kind = kind;
  state.vehicles = vehicles;
  els.panel.classList.toggle("impound", kind === "impound");
  els.kind.textContent = kind === "impound" ? "DEPÓSITO" : "GARAJE";
  els.title.textContent = title;
  els.fee.hidden = !(kind === "impound" && fee > 0);
  els.fee.textContent = `Tasa de recuperación: $${fee.toLocaleString("es-ES")} (se cobra del banco)`;
  els.search.value = "";
  els.panel.hidden = false;
  render();
  els.search.focus();
}

function close() {
  els.panel.hidden = true;
  state.vehicles = [];
}

window.addEventListener("message", ({ data }) => {
  if (data.action === "open") open(data);
  if (data.action === "close") close();
});

els.search.addEventListener("input", render);
document.getElementById("close").addEventListener("click", () => post("close"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.panel.hidden) post("close");
});
