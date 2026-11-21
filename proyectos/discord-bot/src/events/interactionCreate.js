import { Events, MessageFlags } from "discord.js";
import * as tickets from "../features/tickets.js";
import * as verification from "../features/verification.js";
import * as polls from "../features/polls.js";
import * as giveaways from "../features/giveaways.js";
import * as selfroles from "../features/selfroles.js";
import * as announcements from "../features/announcements.js";
import { fail } from "../lib/embeds.js";
import { log } from "../lib/logger.js";

// customId de botones, menús y formularios: "<función>:<acción>:<argumento>"
const handlers = {
  button: {
    ticket: tickets.onButton,
    verify: verification.onButton,
    poll: polls.onButton,
    giveaway: giveaways.onButton,
    roles: selfroles.onButton,
  },
  select: {
    ticket: tickets.onSelect,
    roles: selfroles.onSelect,
  },
  modal: {
    ticket: tickets.onModal,
    anuncio: announcements.onModal,
  },
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

    const kind = interaction.isButton() ? "button" : interaction.isStringSelectMenu() ? "select" : interaction.isModalSubmit() ? "modal" : null;
    if (!kind) return;

    const [feature, action, ...args] = interaction.customId.split(":");
    const handler = handlers[kind][feature];
    if (!handler) return;
    try {
      await handler(interaction, action, ...args);
    } catch (err) {
      log.error(`${kind} ${interaction.customId}:`, err);
      await replyError(interaction);
    }
  },
};
