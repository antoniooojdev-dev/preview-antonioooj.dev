// Tickets: menú con tipos → formulario (modal) → canal privado con el equipo.
// Botones dentro del ticket: Reclamar (staff) y Cerrar (con motivo).
// Al cerrar: transcripción .txt al canal de transcripciones y por privado al usuario.

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { discordTime } from "../lib/duration.js";
import { fail, ok } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";
import { LOGO, ticketTypes } from "../servidor/plan.js";

const pad = (n) => String(n).padStart(4, "0");

/** Mensaje del panel con el menú de tipos de ticket */
export function panelMessage() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: "AJ · DEV", iconURL: LOGO })
    .setTitle("🎫 Centro de soporte")
    .setDescription(
      [
        "Elige el tipo de ticket en el menú, rellena el formulario y se abrirá un **canal privado** solo para ti y el equipo.",
        "",
        ...Object.values(ticketTypes).map((t) => `${t.emoji} **${t.label}** — ${t.desc}`),
        "",
        "• Un ticket abierto a la vez por persona",
        "• Cuanto más detalle des, antes se resuelve",
        "• Al cerrarlo recibirás la conversación por privado",
      ].join("\n"),
    )
    .setFooter({ text: "El staff nunca te pedirá pagos ni contraseñas fuera de un ticket." });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket:menu")
      .setPlaceholder("📩 Abrir un ticket…")
      .addOptions(Object.entries(ticketTypes).map(([value, t]) => ({ value, label: t.label, emoji: t.emoji, description: t.desc }))),
  );
  return { embeds: [embed], components: [row] };
}

const isSupport = (member) =>
  config.roles.supportTeam.some((r) => member.roles.cache.has(r)) || member.permissions.has(PermissionFlagsBits.ManageChannels);

function openTicketOf(guild, userId) {
  return Object.entries(db.tickets).find(([channelId, t]) => t.guildId === guild.id && t.ownerId === userId && guild.channels.cache.has(channelId));
}

// ── Router ───────────────────────────────────────────────────

export async function onSelect(interaction, action) {
  if (action === "menu") return showForm(interaction, interaction.values[0]);
}

export async function onButton(interaction, action, arg) {
  if (action === "quick") return showForm(interaction, arg);
  if (action === "open") return showForm(interaction, "soporte"); // paneles antiguos
  if (action === "claim") return claim(interaction);
  if (action === "close") return askClose(interaction);
}

export async function onModal(interaction, action, arg) {
  if (action === "create") return create(interaction, arg);
  if (action === "close") return close(interaction);
}

// ── Abrir ────────────────────────────────────────────────────

async function showForm(interaction, typeKey) {
  const type = ticketTypes[typeKey];
  if (!type) return interaction.reply({ embeds: [fail("Tipo de ticket desconocido.")], flags: MessageFlags.Ephemeral });

  const existing = openTicketOf(interaction.guild, interaction.user.id);
  if (existing) {
    return interaction.reply({ embeds: [fail(`Ya tienes un ticket abierto: <#${existing[0]}>`)], flags: MessageFlags.Ephemeral });
  }

  const modal = new ModalBuilder().setCustomId(`ticket:create:${typeKey}`).setTitle(`${type.emoji} ${type.label}`.slice(0, 45));
  for (const f of type.fields.slice(0, 5)) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label)
      .setStyle(f.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setMaxLength(f.max ?? 1000)
      .setRequired(f.required !== false);
    if (f.placeholder) input.setPlaceholder(f.placeholder);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return interaction.showModal(modal);
}

async function create(interaction, typeKey) {
  const type = ticketTypes[typeKey];
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // doble envío del formulario
  const existing = openTicketOf(guild, user.id);
  if (existing) return interaction.editReply({ embeds: [fail(`Ya tienes un ticket abierto: <#${existing[0]}>`)] });

  const number = ++db.counters.ticket;
  const userPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ReadMessageHistory,
  ];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: userPerms },
    {
      id: interaction.client.user.id,
      allow: [...userPerms, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
    },
    ...config.roles.supportTeam.map((id) => ({ id, allow: [...userPerms, PermissionFlagsBits.ManageMessages] })),
  ];

  const channel = await guild.channels.create({
    name: `${type.emoji}・${typeKey}-${pad(number)}`,
    type: ChannelType.GuildText,
    parent: config.channels.ticketCategory || null,
    topic: `${type.label} · ${user.tag} (${user.id})`,
    permissionOverwrites: overwrites,
  });

  db.tickets[channel.id] = { guildId: guild.id, ownerId: user.id, number, type: typeKey, openedAt: Date.now() };
  save();

  const answers = type.fields.map((f) => ({
    name: f.label,
    value: (interaction.fields.getTextInputValue(f.id)?.trim() || "—").slice(0, 1024),
  }));

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setTitle(`${type.emoji} ${type.label} · #${pad(number)}`)
    .setDescription(`Hola ${user}, gracias por escribir. El equipo te responderá lo antes posible.\nMientras tanto, añade capturas o cualquier detalle útil.`)
    .addFields(answers)
    .setFooter({ text: "Pulsa «Cerrar» cuando esté resuelto." })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel("Reclamar").setEmoji("🙋").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Cerrar").setEmoji("🔒").setStyle(ButtonStyle.Danger),
  );

  // presupuestos y partners → fundador; el resto → soporte
  const pings = ["presupuesto", "partner"].includes(typeKey)
    ? config.roles.staff.slice(0, 1)
    : config.roles.support
      ? [config.roles.support]
      : [];
  await channel.send({
    content: [user.toString(), ...pings.map((r) => `<@&${r}>`)].join(" "),
    // el resto del bot no menciona roles (index.js); aquí solo los del equipo
    allowedMentions: { users: [user.id], roles: pings },
    embeds: [embed],
    components: [row],
  });

  await sendLog(
    guild,
    {
      title: "🎫 Ticket abierto",
      color: config.colors.primary,
      fields: [
        { name: "Tipo", value: `${type.emoji} ${type.label}`, inline: true },
        { name: "Usuario", value: `${user} (${user.id})`, inline: true },
        { name: "Canal", value: channel.toString(), inline: true },
      ],
    },
    [],
    "ticketLogs",
  );

  return interaction.editReply({ embeds: [ok(`Ticket creado: ${channel}`)] });
}

// ── Reclamar ─────────────────────────────────────────────────

async function claim(interaction) {
  const ticket = db.tickets[interaction.channelId];
  if (!ticket) return interaction.reply({ embeds: [fail("Este canal no es un ticket.")], flags: MessageFlags.Ephemeral });
  if (!isSupport(interaction.member)) {
    return interaction.reply({ embeds: [fail("Solo el equipo puede reclamar tickets.")], flags: MessageFlags.Ephemeral });
  }
  if (ticket.claimedBy) {
    return interaction.reply({ embeds: [fail(`Ya lo atiende <@${ticket.claimedBy}>.`)], flags: MessageFlags.Ephemeral });
  }
  ticket.claimedBy = interaction.user.id;
  save();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:claim")
      .setLabel(`Atendido por ${interaction.member.displayName}`.slice(0, 80))
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Cerrar").setEmoji("🔒").setStyle(ButtonStyle.Danger),
  );
  await interaction.update({ components: [row] });
  await interaction.channel.send({ embeds: [ok(`${interaction.user} se encarga de este ticket.`)] });
}

// ── Cerrar ───────────────────────────────────────────────────

async function askClose(interaction) {
  const ticket = db.tickets[interaction.channelId];
  if (!ticket) return interaction.reply({ embeds: [fail("Este canal no es un ticket.")], flags: MessageFlags.Ephemeral });
  if (ticket.ownerId !== interaction.user.id && !isSupport(interaction.member)) {
    return interaction.reply({ embeds: [fail("No puedes cerrar este ticket.")], flags: MessageFlags.Ephemeral });
  }
  const modal = new ModalBuilder()
    .setCustomId("ticket:close")
    .setTitle("Cerrar ticket")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("motivo")
          .setLabel("Motivo / resolución")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200)
          .setPlaceholder("Opcional — ej. Resuelto, presupuesto enviado…"),
      ),
    );
  return interaction.showModal(modal);
}

async function close(interaction) {
  const { channel, member, guild } = interaction;
  const ticket = db.tickets[channel.id];
  if (!ticket) return interaction.reply({ embeds: [fail("Este ticket ya está cerrado.")], flags: MessageFlags.Ephemeral });

  const reason = interaction.fields.getTextInputValue("motivo")?.trim() || "Sin motivo";
  delete db.tickets[channel.id];
  save();

  await interaction.reply({ embeds: [ok(`Ticket cerrado por ${member}. El canal se borrará en 5 segundos…`)] });

  const type = ticketTypes[ticket.type] ?? { label: "Ticket", emoji: "🎫" };
  const transcript = await buildTranscript(channel);
  const fileName = `${ticket.type ?? "ticket"}-${pad(ticket.number)}.txt`;
  const summary = [
    { name: "Ticket", value: `${type.emoji} ${type.label} · #${pad(ticket.number)}`, inline: true },
    { name: "Abierto por", value: `<@${ticket.ownerId}>`, inline: true },
    { name: "Cerrado por", value: member.toString(), inline: true },
    { name: "Atendido por", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "—", inline: true },
    { name: "Abierto", value: discordTime(ticket.openedAt), inline: true },
    { name: "Motivo", value: reason.slice(0, 1024) },
  ];

  await sendLog(
    guild,
    { title: "🔒 Ticket cerrado", color: config.colors.warning, fields: summary },
    [new AttachmentBuilder(Buffer.from(transcript, "utf8"), { name: fileName })],
    "ticketLogs",
  );

  // copia para el usuario (si tiene los privados abiertos)
  const owner = await interaction.client.users.fetch(ticket.ownerId).catch(() => null);
  await owner
    ?.send({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? LOGO })
          .setTitle("🔒 Tu ticket se ha cerrado")
          .setDescription("Te dejamos la conversación completa adjunta. Si necesitas algo más, abre otro ticket cuando quieras.")
          .addFields(summary.filter((f) => f.name !== "Abierto por")),
      ],
      files: [new AttachmentBuilder(Buffer.from(transcript, "utf8"), { name: fileName })],
    })
    .catch(() => {});

  setTimeout(() => channel.delete("Ticket cerrado").catch(() => {}), 5000);
}

/** Descarga hasta 1000 mensajes y los convierte en texto plano */
async function buildTranscript(channel) {
  const messages = [];
  let before;
  while (messages.length < 1000) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
  }

  const lines = messages.reverse().map((m) => {
    const when = m.createdAt.toLocaleString("es-ES", { timeZone: config.timezone });
    const embedText = m.embeds
      .map((e) => [e.title, e.description, ...e.fields.map((f) => `${f.name}: ${f.value}`)].filter(Boolean).join(" | "))
      .join(" || ");
    const files = m.attachments.size ? ` [adjuntos: ${m.attachments.map((a) => a.url).join(", ")}]` : "";
    return `[${when}] ${m.author.tag}: ${m.content || ""}${embedText ? ` [embed: ${embedText}]` : ""}${files}`;
  });
  return `Transcripción de #${channel.name}\n${"=".repeat(40)}\n${lines.join("\n")}\n`;
}
