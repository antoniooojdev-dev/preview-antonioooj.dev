// npm run rehacer: vuelve a dibujar con el diseño actual lo que ya está publicado en el foro
// de proyectos y en #novedades (fichas, novedades dentro de cada post y sus tarjetas).
// Se ejecuta donde está el db.json bueno (en la VM) y con el bot parado, porque guarda en db.json.

import { Client, GatewayIntentBits } from "discord.js";
import config from "../config.js";
import { db, flush } from "../lib/store.js";
import { refreshCard, updateCard } from "../features/projects.js";
import { projectCategories } from "./plan.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(process.env.DISCORD_TOKEN);
await new Promise((r) => client.once("clientReady", r));
const guild = await client.guilds.fetch(config.ids.guildId);
await guild.channels.fetch();

/** id de canal y de mensaje a partir de su enlace */
const partes = (url) => url?.match(/channels\/\d+\/(\d+)\/(\d+)/)?.slice(1) ?? [];

async function mensaje(url) {
  const [canalId, msgId] = partes(url);
  if (!canalId) return null;
  const canal = await client.channels.fetch(canalId).catch(() => null);
  return canal?.messages.fetch(msgId).catch(() => null);
}

/** Texto de cambios de una tarjeta antigua: el bloque que es una lista «- …» */
function cuerpoAntiguo(msg) {
  const textos = [];
  const recorrer = (c) => {
    const j = c.toJSON ? c.toJSON() : c;
    if (j.type === 10) textos.push(j.content);
    (j.components ?? []).forEach(recorrer);
  };
  msg.components.forEach(recorrer);
  return textos.find((t) => t.split("\n").every((l) => l.startsWith("- "))) ?? "";
}

let fichas = 0;
let tarjetas = 0;
for (const p of Object.values(db.projects)) {
  await refreshCard(guild, p);
  fichas++;
  for (const u of p.updates) {
    const enPost = await mensaje(u.messageUrl);
    if (!u.body && enPost) u.body = cuerpoAntiguo(enPost);
    const img = (m) => (m?.attachments.first() ? `attachment://${m.attachments.first().name}` : null);
    if (enPost) {
      await enPost.edit({ ...updateCard({ p, u, body: u.body ?? "", imageRef: img(enPost), link: u.link, author: u.author }), allowedMentions: { parse: [] } });
      tarjetas++;
    }
    const enNovedades = await mensaje(u.newsUrl);
    if (enNovedades) {
      const ping = config.ids.roles[projectCategories[p.category].role];
      await enNovedades.edit({
        ...updateCard({ p, u, body: u.body ?? "", imageRef: img(enNovedades), link: u.link, author: u.author, threadUrl: u.messageUrl, ping }),
        allowedMentions: { parse: [] },
      });
      tarjetas++;
    }
  }
}
flush();
console.log(`Rehechas ${fichas} fichas y ${tarjetas} tarjetas de novedades.`);
await client.destroy();
process.exit(0);
