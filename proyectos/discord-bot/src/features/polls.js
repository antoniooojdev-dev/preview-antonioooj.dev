import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { discordTime } from "../lib/duration.js";
import { fail, progressBar } from "../lib/embeds.js";
import { log } from "../lib/logger.js";

const EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function buildEmbed(poll, ended = false) {
  const counts = poll.options.map((_, i) => Object.values(poll.votes).filter((v) => v === i).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts);

  const lines = poll.options.map((opt, i) => {
    const pct = total ? Math.round((counts[i] / total) * 100) : 0;
    const winner = ended && total > 0 && counts[i] === max ? " 🏆" : "";
    return `${EMOJIS[i]} **${opt}**${winner}\n${progressBar(counts[i], total || 1, 12)} ${pct}% (${counts[i]})`;
  });

  return new EmbedBuilder()
    .setColor(ended ? config.colors.neutral : config.colors.primary)
    .setTitle(`📊 ${poll.question}`)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: `${total} ${total === 1 ? "voto" : "votos"}${ended ? " · Encuesta cerrada" : ""}` })
    .addFields(ended ? [] : [{ name: "Termina", value: discordTime(poll.endsAt) }]);
}

function buildButtons(poll, disabled = false) {
  const rows = [];
  for (let i = 0; i < poll.options.length; i += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        poll.options.slice(i, i + 5).map((_, j) =>
          new ButtonBuilder()
            .setCustomId(`poll:vote:${i + j}`)
            .setEmoji(EMOJIS[i + j])
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        ),
      ),
    );
  }
  return rows;
}

/** Publica una encuesta como respuesta al comando */
export async function create(interaction, question, options, durationMs) {
  const poll = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    question,
    options,
    votes: {},
    endsAt: Date.now() + durationMs,
  };
  const response = await interaction.reply({
    embeds: [buildEmbed(poll)],
    components: buildButtons(poll),
    withResponse: true,
  });
  db.polls[response.resource.message.id] = poll;
  save();
}

/** Votar / cambiar voto / quitar voto (pulsando la misma opción) */
export async function onButton(interaction, action, arg) {
  const poll = db.polls[interaction.message.id];
  if (!poll) {
    return interaction.reply({ embeds: [fail("Esta encuesta ya ha terminado.")], flags: MessageFlags.Ephemeral });
  }

  const index = Number(arg);
  if (poll.votes[interaction.user.id] === index) delete poll.votes[interaction.user.id];
  else poll.votes[interaction.user.id] = index;
  save();

  await interaction.update({ embeds: [buildEmbed(poll)] });
}

/** Cierra la encuesta: resultados finales y botones desactivados */
export async function end(client, messageId) {
  const poll = db.polls[messageId];
  delete db.polls[messageId];
  save();

  try {
    const channel = await client.channels.fetch(poll.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildEmbed(poll, true)], components: buildButtons(poll, true) });
  } catch (err) {
    log.warn(`No se pudo cerrar la encuesta ${messageId}:`, err.message);
  }
}
