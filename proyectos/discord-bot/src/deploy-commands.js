// Registra los comandos slash en Discord.  npm run deploy
//  · Con GUILD_ID: solo en ese servidor (aparecen al instante, ideal para desarrollo)
//  · Sin GUILD_ID: globales (pueden tardar hasta 1 h en aparecer)

import { REST, Routes } from "discord.js";
import { loadModules } from "./lib/loader.js";
import { log } from "./lib/logger.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  log.error("Faltan DISCORD_TOKEN o CLIENT_ID en .env");
  process.exit(1);
}

const commands = (await loadModules("commands")).map((c) => c.data.toJSON());
const rest = new REST().setToken(DISCORD_TOKEN);
const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);

try {
  const data = await rest.put(route, { body: commands });
  log.info(`${data.length} comandos registrados ${GUILD_ID ? `en el servidor ${GUILD_ID}` : "globalmente"}`);
} catch (err) {
  log.error("Error registrando comandos:", err);
  process.exit(1);
}
