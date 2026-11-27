// Foros: sugerencias con votación 👍/👎 y etiqueta «En revisión»,
// bugs con plantilla de seguimiento y ayuda con recordatorio de marcar «Resuelto».

import { Events } from "discord.js";
import config from "../config.js";
import { box, etiqueta, h2, v2 } from "../lib/ui.js";
import { categories } from "../servidor/plan.js";

// Respuestas automáticas con el mismo estilo que los paneles (título en mayúsculas y subrayado,
// pasos numerados, tono enunciativo)
const avisos = {
  sugerencia: () =>
    v2(
      box([
        etiqueta("💡 Sugerencia", "**en revisión**"),
        h2("Sugerencia recibida"),
        "---",
        [
          "**`01`**  La comunidad vota con 👍 / 👎 en el **primer mensaje**",
          "**`02`**  El equipo la **revisa** y cambia su etiqueta",
          "**`03`**  Si se acepta, se anuncia en novedades",
        ].join("\n"),
        "---",
        "-# Gracias por ayudar a mejorar el servidor y los proyectos.",
      ]),
    ),
  bug: () =>
    v2(
      box([
        etiqueta("🐛 Bug", "**recibido**"),
        h2("Gracias por avisar"),
        "---",
        "Para arreglarlo antes, ayuda que el post tenga:",
        [
          "**`01`**  Los **pasos** para reproducirlo",
          "**`02`**  Qué se **esperaba** que pasara",
          "**`03`**  Capturas o el **error de la consola** (F8 en FiveM)",
        ].join("\n"),
        "---",
        "-# El equipo cambia la etiqueta a 🟡 Confirmado y ✅ Arreglado según avanza.",
      ]),
    ),
  ayuda: () =>
    v2(
      box([
        etiqueta("🆘 Ayuda", "**abierta**"),
        "Cuando esté resuelto, la etiqueta **✅ Resuelto** ayuda a que otros encuentren la solución.",
      ]),
    ),
};

const forums = Object.fromEntries(
  categories
    .flatMap((c) => c.channels)
    .filter((c) => c.type === "forum")
    .map((c) => [c.key, c]),
);

const keyOf = (channelId) => Object.keys(forums).find((k) => config.ids.channels[k] === channelId);
const findTag = (forum, text) => forum.availableTags.find((t) => t.name.includes(text))?.id;

export default {
  name: Events.ThreadCreate,

  /** @param {import("discord.js").AnyThreadChannel} thread */
  async execute(thread, newlyCreated) {
    if (!newlyCreated || !thread.parent) return;
    const key = keyOf(thread.parentId);
    if (!key) return;
    const def = forums[key];

    // el mensaje inicial puede tardar un momento en existir
    const starter = await thread.fetchStarterMessage().catch(() => null);

    if (def.suggestions) {
      if (starter) {
        await starter.react("👍").catch(() => {});
        await starter.react("👎").catch(() => {});
      }
      const review = findTag(thread.parent, "En revisión");
      if (review && !thread.appliedTags.includes(review)) {
        await thread.setAppliedTags([...thread.appliedTags, review].slice(0, 5)).catch(() => {});
      }
      await thread.send({ ...avisos.sugerencia(), allowedMentions: { parse: [] } }).catch(() => {});
      return;
    }

    if (def.bugs) {
      await thread.send({ ...avisos.bug(), allowedMentions: { parse: [] } }).catch(() => {});
      return;
    }

    if (def.reaction && starter) await starter.react(def.reaction).catch(() => {});
    if (key === "ayuda") {
      await thread.send({ ...avisos.ayuda(), allowedMentions: { parse: [] } }).catch(() => {});
    }
  },
};
