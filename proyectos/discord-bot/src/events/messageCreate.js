import { Events } from "discord.js";
import * as automod from "../features/automod.js";
import * as levels from "../features/levels.js";

export default {
  name: Events.MessageCreate,

  /** @param {import("discord.js").Message} message */
  async execute(message) {
    if (message.author.bot || !message.inGuild()) return;

    // si el automod borra el mensaje, no cuenta para XP
    const removed = await automod.handleMessage(message);
    if (!removed) await levels.handleMessage(message);
  },
};
