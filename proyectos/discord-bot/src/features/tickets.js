import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { fail, ok } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";

/** Mensaje del panel con el botón "Abrir ticket" */
export function panelMessage() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle("🎫 Soporte")
    .setDescription(
      "¿Necesitas ayuda? Pulsa el botón y se abrirá un canal privado con el equipo.\n\n" +
        "• Explica tu problema con detalle\n• Adjunta capturas si las tienes\n• No abras más de un ticket a la vez",
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:open").setLabel("Abrir ticket").setEmoji("📩").setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}

/** @param {import("discord.js").ButtonInteraction} interaction */
export async function onButton(interaction, action) {
  if (action === "open") return open(interaction);
  if (action === "close") return close(interaction);
}

async function open(interaction) {
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // ¿ya tiene uno abierto?
  const existing = Object.entries(db.tickets).find(
    ([channelId, t]) => t.guildId === guild.id && t.ownerId === user.id && guild.channels.cache.has(channelId),
  );
  if (existing) {
    return interaction.editReply({ embeds: [fail(`Ya tienes un ticket abierto: <#${existing[0]}>`)] });
  }

  const number = ++db.counters.ticket;
  const name = `ticket-${String(number).padStart(4, "0")}`;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];
  if (config.roles.support) {
    overwrites.push({
      id: config.roles.support,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: config.channels.ticketCategory || null,
    topic: `Ticket de ${user.tag} (${user.id})`,
    permissionOverwrites: overwrites,
  });

  db.tickets[channel.id] = { guildId: guild.id, ownerId: user.id, number, openedAt: Date.now() };
  save();

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`Ticket #${String(number).padStart(4, "0")}`)
    .setDescription(`Hola ${user}, cuéntanos en qué podemos ayudarte. El equipo te responderá lo antes posible.`)
    .setFooter({ text: "Pulsa «Cerrar ticket» cuando esté resuelto." });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Cerrar ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    content: [user.toString(), config.roles.support && `<@&${config.roles.support}>`].filter(Boolean).join(" "),
    // el resto del bot no menciona roles (index.js); aquí solo el de soporte
    allowedMentions: { users: [user.id], roles: config.roles.support ? [config.roles.support] : [] },
    embeds: [embed],
    components: [row],
  });

  await sendLog(guild, {
    title: "🎫 Ticket abierto",
    color: config.colors.primary,
    fields: [
      { name: "Usuario", value: `${user} (${user.id})`, inline: true },
      { name: "Canal", value: channel.toString(), inline: true },
    ],
  });

  return interaction.editReply({ embeds: [ok(`Ticket creado: ${channel}`)] });
}

async function close(interaction) {
  const { channel, member, guild } = interaction;
  const ticket = db.tickets[channel.id];
  if (!ticket) {
    return interaction.reply({ embeds: [fail("Este canal no es un ticket.")], flags: MessageFlags.Ephemeral });
  }

  const allowed =
    ticket.ownerId === member.id ||
    (config.roles.support && member.roles.cache.has(config.roles.support)) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels);
  if (!allowed) {
    return interaction.reply({ embeds: [fail("No puedes cerrar este ticket.")], flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({ embeds: [ok("El ticket se cerrará en 5 segundos…")] });

  const transcript = await buildTranscript(channel);
  const file = new AttachmentBuilder(Buffer.from(transcript, "utf8"), { name: `${channel.name}.txt` });

  await sendLog(
    guild,
    {
      title: "🔒 Ticket cerrado",
      color: config.colors.warning,
      fields: [
        { name: "Ticket", value: channel.name, inline: true },
        { name: "Abierto por", value: `<@${ticket.ownerId}>`, inline: true },
        { name: "Cerrado por", value: member.toString(), inline: true },
      ],
    },
    [file],
  );

  delete db.tickets[channel.id];
  save();
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
    const files = m.attachments.size ? ` [adjuntos: ${m.attachments.map((a) => a.url).join(", ")}]` : "";
    return `[${when}] ${m.author.tag}: ${m.content || "(embed)"}${files}`;
  });
  return `Transcripción de #${channel.name}\n${"=".repeat(40)}\n${lines.join("\n")}\n`;
}
