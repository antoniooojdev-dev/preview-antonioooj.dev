// Foros: sugerencias con votación 👍/👎 y etiqueta «En revisión»,
// bugs con plantilla de seguimiento y ayuda con recordatorio de marcar «Resuelto».

import { EmbedBuilder, Events } from "discord.js";
import config from "../config.js";
import { categories } from "../servidor/plan.js";

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
      await thread
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.primary)
              .setDescription("💡 ¡Gracias por la sugerencia! Votad con 👍 / 👎 en el primer mensaje. El equipo la revisará y cambiará su etiqueta."),
          ],
        })
        .catch(() => {});
      return;
    }

    if (def.bugs) {
      await thread
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.warning)
              .setTitle("🐛 Bug recibido")
              .setDescription(
                "Gracias por avisar. Si no lo has puesto ya, añade:\n• Pasos para reproducirlo\n• Qué esperabas que pasara\n• Capturas o el error de la consola (F8 en FiveM)",
              ),
          ],
        })
        .catch(() => {});
      return;
    }

    if (def.reaction && starter) await starter.react(def.reaction).catch(() => {});
    if (key === "ayuda") {
      await thread
        .send("🆘 Cuando esté resuelto, añade la etiqueta **✅ Resuelto** al post para que otros encuentren la solución.")
        .catch(() => {});
    }
  },
};
