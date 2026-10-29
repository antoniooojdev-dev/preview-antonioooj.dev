import { Events, MessageFlags } from "discord.js";
import * as tickets from "../features/tickets.js";
import * as verification from "../features/verification.js";
import * as polls from "../features/polls.js";
import * as giveaways from "../features/giveaways.js";
import { fail } from "../lib/embeds.js";
import { log } from "../lib/logger.js";

// customId de los botones: "<función>:<acción>:<argumento>"
const buttonHandlers = {
  ticket: tickets.onButton,
  verify: verification.onButton,
  poll: polls.onButton,
  giveaway: giveaways.onButton,
};

async function replyError(interaction, text = "Ha ocurrido un error. Inténtalo de nuevo.") {
  const payload = { embeds: [fail(text)], flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
  else await interaction.reply(payload).catch(() => {});
}

export default {
  name: Events.InteractionCreate,

  /** @param {import("discord.js").Interaction} interaction */
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      if (interaction.isRepliable()) await replyError(interaction, "Este bot solo funciona dentro de un servidor.");
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return replyError(interaction, "Comando desconocido. ¿Has ejecutado `npm run deploy`?");
      try {
        await command.execute(interaction);
      } catch (err) {
        log.error(`/${interaction.commandName}:`, err);
        await replyError(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      const [feature, action, arg] = interaction.customId.split(":");
      const handler = buttonHandlers[feature];
      if (!handler) return;
      try {
        await handler(interaction, action, arg);
      } catch (err) {
        log.error(`Botón ${interaction.customId}:`, err);
        await replyError(interaction);
      }
    }
  },
};
