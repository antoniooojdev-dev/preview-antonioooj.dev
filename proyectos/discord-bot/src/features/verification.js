// Verificación en dos pasos:
//  1. #normas → «He leído y acepto las normas» (verify:normas) guarda que las aceptó
//  2. #verificación → «Verificarme» (verify:go) da el rol de miembro, solo si ya las aceptó
// Los mensajes de los canales son iguales para todos: lo personal (botón cambiado, avisos) se
// enseña en respuestas que solo ve quien pulsa.

import { ButtonStyle } from "discord.js";
import { box, btn, etiqueta, h1, h3, linkBtn, row, v2, v2Ephemeral } from "../lib/ui.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { sendLog } from "../lib/logger.js";

const canal = (id, txt) => (id ? `<#${id}>` : txt);
const enlaceCanal = (guildId, id) => `https://discord.com/channels/${guildId}/${id}`;

/** db.normas[guildId][userId] = fecha en que aceptó las normas */
function aceptadas(guildId) {
  db.normas ??= {};
  db.normas[guildId] ??= {};
  return db.normas[guildId];
}

/** Mensaje fijo de #verificación (lo publica el setup) */
export function panelMessage() {
  const { rules } = config.channels;
  return v2(
    box([
      h1("Verificación"),
      "---",
      [
        `**\`01\`  NORMAS**`,
        `Se aceptan en ${canal(rules, "#normas")}, con el botón que hay debajo de ellas.`,
        "",
        `**\`02\`  VERIFICACIÓN**`,
        "Con las normas aceptadas, el botón de aquí abajo desbloquea **todo el servidor**.",
      ].join("\n"),
      "---",
      "-# Un paso rápido que frena a los **bots** y las **raids**.",
    ]),
    row(btn("verify:go", "Verificarme", { emoji: "🔓", style: ButtonStyle.Success })),
  );
}

/** Botón desactivado que confirma que ya aceptó las normas */
const yaConfirmado = () =>
  row(btn("verify:hecho", "Ya has confirmado la lectura de las normas", { emoji: "✅", style: ButtonStyle.Success, disabled: true }));

/** @param {import("discord.js").ButtonInteraction} interaction */
export async function onButton(interaction, action) {
  const { guild, member, user } = interaction;
  const roleId = config.roles.verified;
  const verificado = !!roleId && member.roles.cache.has(roleId);
  const lista = aceptadas(guild.id);
  const responder = (...partes) => interaction.reply(v2Ephemeral(...partes));
  const { verificacion } = config.ids.channels;

  // ── paso 1: aceptar las normas ──
  if (action === "normas") {
    if (verificado || lista[user.id]) {
      return responder(box(["Las normas ya están **aceptadas**."]), yaConfirmado());
    }
    lista[user.id] = Date.now();
    save();
    await sendLog(guild, { title: "📜 Normas aceptadas", color: config.colors.neutral, description: `${user} (${user.id})` });
    return responder(
      box([
        etiqueta("Paso 1 de 2", "**completado**"),
        h3("Normas aceptadas", "✅"),
        `Queda un último paso: el botón de ${canal(verificacion, "#verificación")}.`,
      ]),
      yaConfirmado(),
    );
  }

  // ── paso 2: verificarse ──
  if (action !== "go") return;
  if (!roleId) return responder(box(["La verificación no está configurada (falta el rol de miembro)."]));
  if (verificado) return responder(box(["**Ya estás verificado**: tienes acceso a todo el servidor."]));

  if (!lista[user.id]) {
    const { rules } = config.channels;
    return responder(
      box([
        h3("Faltan las normas", "📜"),
        `Para verificarse hace falta haber aceptado antes las normas de ${canal(rules, "#normas")}.`,
      ]),
      ...(rules ? [row(linkBtn("Ir a las normas", enlaceCanal(guild.id, rules), "📜"))] : []),
    );
  }

  try {
    await member.roles.add(roleId, "Verificación por botón (normas aceptadas)");
  } catch {
    return responder(box(["No se ha podido dar el rol. Un administrador tiene que revisar que el rol del bot esté **por encima** del de miembro."]));
  }

  await sendLog(guild, {
    title: "✅ Usuario verificado",
    color: config.colors.success,
    description: `${user} (${user.id})`,
  });
  const guia = config.channels.guide;
  return responder(
    box([
      etiqueta("Paso 2 de 2", "**completado**"),
      h3("Verificado", "🔓"),
      "Ya tienes acceso a **todo el servidor**.",
      guia && `-# En <#${guia}> se eligen los avisos e intereses.`,
    ]),
  );
}
