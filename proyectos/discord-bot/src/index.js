import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { loadModules } from "./lib/loader.js";
import { log } from "./lib/logger.js";

if (!process.env.DISCORD_TOKEN) {
  log.error("Falta DISCORD_TOKEN. Copia .env.example como .env y rellénalo.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privilegiado: bienvenidas y auto-rol
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privilegiado: automod y niveles
  ],
  partials: [Partials.Message, Partials.Channel],
  // Sin roles: así nadie puede usar el bot (encuestas, recordatorios…) para mencionar a un rol
  // entero. Los mensajes que sí deben avisar a un rol lo permiten uno a uno (tickets.js).
  allowedMentions: { parse: ["users"], repliedUser: false },
});

// comandos
client.commands = new Collection();
for (const command of await loadModules("commands")) {
  client.commands.set(command.data.name, command);
}
log.info(`${client.commands.size} comandos cargados`);

// eventos
for (const event of await loadModules("events")) {
  const handler = (...args) =>
    Promise.resolve(event.execute(...args)).catch((err) => log.error(`Error en el evento ${event.name}:`, err));
  event.once ? client.once(event.name, handler) : client.on(event.name, handler);
}

process.on("unhandledRejection", (err) => log.error("Promesa no controlada:", err));

await client.login(process.env.DISCORD_TOKEN);
