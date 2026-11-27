// npm run migrar-proyectos: pasa cada proyecto del antiguo foro único 📂・proyectos al foro de su
// categoría (🌐・webs, 🤖・bots-discord, 🎮・scripts-fivem, 🧩・apps-web) con su ficha, portada y
// novedades, y borra el foro antiguo cuando queda vacío. Se ejecuta en la VM con el bot parado
// (guarda en db.json) y después de `npm run setup`, que crea los foros nuevos.

import { Client, GatewayIntentBits } from "discord.js";
import config from "../config.js";
import { db, flush } from "../lib/store.js";
import { forum, moveProject } from "../features/projects.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);
await new Promise((r) => client.once("clientReady", r));
const guild = await client.guilds.fetch(config.ids.guildId);
await guild.channels.fetch();

let movidos = 0;
const viejos = new Set(); // foros de donde salen los posts
for (const p of Object.values(db.projects)) {
  const destino = forum(guild, p.category);
  if (!destino) {
    console.log(`⚠️  ${p.name}: no existe el foro de ${p.category} (¿falta npm run setup?)`);
    continue;
  }
  const hilo = await guild.channels.fetch(p.threadId).catch(() => null);
  if (hilo?.parentId === destino.id) continue;
  if (hilo?.parentId) viejos.add(hilo.parentId);
  await moveProject(guild, p);
  console.log(`➡️  ${p.name} → #${destino.name}`);
  movidos++;
}
flush();

// el foro antiguo, si ya no le queda ningún post (nunca uno de los foros nuevos)
const nuevos = new Set(Object.keys(db.projects).length ? ["web", "bot", "fivem", "app"].map((c) => forum(guild, c)?.id) : []);
for (const id of viejos) {
  const viejo = guild.channels.cache.get(id);
  if (!viejo || nuevos.has(id)) continue;
  const activos = await viejo.threads.fetchActive().catch(() => null);
  const archivados = await viejo.threads.fetchArchived().catch(() => null);
  const quedan = (activos?.threads.size ?? 0) + (archivados?.threads.size ?? 0);
  if (quedan === 0) {
    await viejo.delete("Proyectos repartidos en un foro por categoría");
    console.log(`🗑️  Foro antiguo #${viejo.name} borrado`);
  } else console.log(`ℹ️  El foro antiguo #${viejo.name} aún tiene ${quedan} posts: no se borra`);
}

console.log(`Movidos ${movidos} proyectos.`);
await client.destroy();
process.exit(0);
