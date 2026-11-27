// /script [nombre]: ficha de un script de FiveM de la tienda (o el catálogo si no se elige ninguno).
// Los datos salen de src/servidor/scripts.js.

import { SlashCommandBuilder } from "discord.js";
import { box, etiqueta, gallery, h1, h3, linkBtn, row, v2 } from "../lib/ui.js";
import { SITE } from "../servidor/plan.js";
import { FRAMEWORKS, scripts } from "../servidor/scripts.js";

const euros = (n) => `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const precio = (s) => (s.precioAntes ? `~~${euros(s.precioAntes)}~~  **${euros(s.precio)}**` : `**${euros(s.precio)}**`);
const n2 = (i) => String(i + 1).padStart(2, "0");
const ficha = (s) => `${SITE}/servicios/fivem/${s.id}`;

function fichaScript(s) {
  return v2(
    box([
      gallery(s.portada),
      etiqueta(`${s.emoji} Script de FiveM`, `\`v${s.version}\``),
      h1(s.nombre),
      `*${s.lema}*`,
      "---",
      s.resumen,
      s.claves.map((c, i) => `**\`${n2(i)}\`**  ${c}`).join("\n"),
      "---",
      s.cifras.map(([v, l]) => `**${v}** ${l}`).join("  ·  "),
      "---",
      [`**PRECIO** · ${precio(s)}  ·  *pago único*`, `**FRAMEWORKS** · ${FRAMEWORKS.join(" · ")}`].join("\n"),
      `-# Recurso \`${s.recurso}\`  ·  licencia en tu cuenta de Cfx.re`,
    ]),
    row(linkBtn("Ver ficha", ficha(s), "🛒"), linkBtn("Documentación", `${SITE}/documentacion#${s.id}`, "📖")),
  );
}

function catalogo() {
  return v2(
    box([
      h1("Scripts de FiveM"),
      `Para ${FRAMEWORKS.join(", ")}. **Pago único** y configuración abierta.`,
      "---",
      scripts.map((s) => `${h3(s.nombre, s.emoji)}\n*${s.lema}*\n${precio(s)}  ·  \`v${s.version}\``).join("\n\n"),
      "---",
      "-# `/script` con un nombre muestra su ficha completa",
    ]),
    row(linkBtn("Ver todos en la web", `${SITE}/servicios/fivem`, "🛒"), linkBtn("Documentación", `${SITE}/documentacion`, "📖")),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName("script")
    .setDescription("Ficha de un script de FiveM de la tienda: qué incluye, precio y enlaces")
    .addStringOption((o) =>
      o
        .setName("nombre")
        .setDescription("El script (sin elegir ninguno, sale el catálogo)")
        .setRequired(false)
        .addChoices(...scripts.map((s) => ({ name: s.nombre, value: s.id }))),
    ),

  async execute(interaction) {
    const id = interaction.options.getString("nombre");
    const s = scripts.find((x) => x.id === id);
    await interaction.reply({ ...(s ? fichaScript(s) : catalogo()), allowedMentions: { parse: [] } });
  },
};
