import { randomInt } from "node:crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { discordTime } from "../lib/duration.js";
import { fail, ok } from "../lib/embeds.js";
import { log } from "../lib/logger.js";

function buildEmbed(g, winners = null) {
  const embed = new EmbedBuilder()
    .setColor(winners ? config.colors.neutral : config.colors.warning)
    .setTitle(`🎉 ${g.prize}`)
    .addFields({ name: "Organiza", value: `<@${g.hostId}>`, inline: true }, { name: "Ganadores", value: String(g.winners), inline: true });

  if (winners) {
    embed.setDescription(winners.length ? `**Ganador${winners.length > 1 ? "es" : ""}:** ${winners.map((id) => `<@${id}>`).join(", ")}` : "Nadie participó 😢");
    embed.setFooter({ text: `Sorteo terminado · ${g.entrants.length} participantes` });
  } else {
    embed.setDescription(`Pulsa el botón para participar.\nTermina ${discordTime(g.endsAt)} (${discordTime(g.endsAt, "f")})`);
  }
  return embed;
}

function buildButton(g, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("giveaway:join")
      .setLabel(`Participar (${g.entrants.length})`)
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

export async function create(interaction, prize, winners, durationMs) {
  const g = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    prize,
    winners,
    hostId: interaction.user.id,
    entrants: [],
    endsAt: Date.now() + durationMs,
  };
  const response = await interaction.reply({ embeds: [buildEmbed(g)], components: [buildButton(g)], withResponse: true });
  db.giveaways[response.resource.message.id] = g;
  save();
}

export async function onButton(interaction) {
  const g = db.giveaways[interaction.message.id];
  if (!g) return interaction.reply({ embeds: [fail("Este sorteo ya ha terminado.")], flags: MessageFlags.Ephemeral });

  const id = interaction.user.id;
  const joined = g.entrants.includes(id);
  g.entrants = joined ? g.entrants.filter((e) => e !== id) : [...g.entrants, id];
  save();

  await interaction.update({ components: [buildButton(g)] });
  await interaction.followUp({
    embeds: [joined ? fail("Ya no participas en el sorteo.") : ok("¡Estás dentro! Mucha suerte 🍀")],
    flags: MessageFlags.Ephemeral,
  });
}

/** Elige N ganadores distintos de forma criptográficamente aleatoria (Fisher–Yates) */
function pickWinners(entrants, n) {
  const pool = [...entrants];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export async function end(client, messageId) {
  const g = db.giveaways[messageId];
  delete db.giveaways[messageId];
  save();

  const winners = pickWinners(g.entrants, g.winners);
  try {
    const channel = await client.channels.fetch(g.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildEmbed(g, winners)], components: [buildButton(g, true)] });
    if (winners.length) {
      await message.reply(`🎉 ¡Enhorabuena ${winners.map((id) => `<@${id}>`).join(", ")}! Habéis ganado **${g.prize}**.`);
    }
  } catch (err) {
    log.warn(`No se pudo cerrar el sorteo ${messageId}:`, err.message);
  }
}
