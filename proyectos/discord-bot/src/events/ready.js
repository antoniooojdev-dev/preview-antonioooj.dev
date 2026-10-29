import { ActivityType, Events } from "discord.js";
import { startScheduler } from "../features/scheduler.js";
import { log } from "../lib/logger.js";

export default {
  name: Events.ClientReady,
  once: true,

  /** @param {import("discord.js").Client<true>} client */
  execute(client) {
    log.info(`Conectado como ${client.user.tag} en ${client.guilds.cache.size} servidor(es)`);
    client.user.setActivity("/ayuda", { type: ActivityType.Listening });
    startScheduler(client);
  },
};
