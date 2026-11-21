import { ActivityType, Events } from "discord.js";
import { startScheduler } from "../features/scheduler.js";
import { startSocials } from "../features/socials.js";
import { startStats } from "../features/stats.js";
import { sweep } from "../features/tempvoice.js";
import { log } from "../lib/logger.js";

export default {
  name: Events.ClientReady,
  once: true,

  /** @param {import("discord.js").Client<true>} client */
  async execute(client) {
    log.info(`Conectado como ${client.user.tag} en ${client.guilds.cache.size} servidor(es)`);
    client.user.setActivity("antonioooj.dev · /ayuda", { type: ActivityType.Watching });
    startScheduler(client);
    startSocials(client);
    await sweep(client);
    await startStats(client);
  },
};
