import { Events, MessageFlags } from "discord.js";
import * as tickets from "../features/tickets.js";
import * as verification from "../features/verification.js";
import * as polls from "../features/polls.js";
import * as giveaways from "../features/giveaways.js";
import * as selfroles from "../features/selfroles.js";
import * as announcements from "../features/announcements.js";
import * as projects from "../features/projects.js";
import { onModal as proyectoModal } from "../commands/proyecto.js";
import { onModal as novedadModal } from "../commands/novedad.js";
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
    proyecto: projects.onButton,
  },
  select: {
    ticket: tickets.onSelect,
    roles: selfroles.onSelect,
  },
  modal: {
    ticket: tickets.onModal,
    anuncio: announcements.onModal,
    proyecto: proyectoModal,
    novedad: novedadModal,
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

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      await command?.autocomplete?.(interaction).catch((err) => log.warn(`Autocompletar /${interaction.commandName}:`, err.message));
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
