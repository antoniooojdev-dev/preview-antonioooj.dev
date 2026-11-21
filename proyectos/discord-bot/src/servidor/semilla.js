// Crea las fichas iniciales del foro #proyectos con los proyectos públicos de antonioooj.dev.
// Se ejecuta una vez (npm run semilla) con el bot APAGADO; no duplica proyectos que ya existan.

import { Client, GatewayIntentBits } from "discord.js";
import { db, flush } from "../lib/store.js";
import { loadServidor } from "../lib/servidor.js";
import { createProject, postUpdate } from "../features/projects.js";

const SITE = "https://antonioooj.dev/proyectos";

const PROYECTOS = [
  {
    name: "Sistema de garajes",
    category: "fivem",
    summary: "Garajes y depósito con interfaz NUI propia, compatible con ESX y QBCore y validado en servidor.",
    stack: "Lua · ox_lib · oxmysql · NUI",
    link: `${SITE}/fivem-garajes/`,
  },
  {
    name: "Sistema de bandas",
    category: "fivem",
    summary: "Tablet de bandas para ESX: miembros, rangos y crews, con interfaz NUI propia.",
    stack: "Lua · ESX · NUI",
    link: "https://youtu.be/SV2FrPFin5s",
  },
  {
    name: "Web de servidor de GTA – FiveM",
    category: "web",
    summary: "Web y panel de jugadores de un servidor de rol: login con Discord, sugerencias con votos, postulaciones y estado en vivo.",
    stack: "HTML · CSS · JavaScript · FiveM API",
    link: "https://fivem.antonioooj.dev",
  },
  {
    name: "Web de restaurante con reservas",
    category: "web",
    summary: "Carta dinámica, estado «abierto ahora» y reservas online con control de aforo real.",
    stack: "HTML · CSS · JavaScript · PHP",
    link: `${SITE}/restaurante-reservas/`,
  },
  {
    name: "Portal inmobiliario",
    category: "app",
    summary: "Buscador avanzado, favoritos, calculadora de hipoteca y valoración automática de viviendas.",
    stack: "HTML · CSS · JavaScript",
    link: `${SITE}/portal-inmobiliario/`,
  },
  {
    name: "AJ Bot",
    category: "bot",
    summary: "El bot que gestiona este servidor: tickets con formulario, verificación, roles, niveles, avisos de redes, novedades por categoría y salas de voz.",
    stack: "Node.js · discord.js",
    link: `${SITE}/discord-bot/`,
    version: "v2.0.0",
    update: {
      type: "lanzamiento",
      title: "Nueva versión del servidor y del bot",
      version: "v2.0.0",
      changes: [
        "+ Diseño minimalista con los nuevos componentes de Discord",
        "+ Foro de proyectos con ficha e historial de cambios de cada uno",
        "+ Novedades por categoría: FiveM, Web, App web y Bot, con aviso solo a quien lo elija",
        "+ Tickets con formulario, botón Reclamar y transcripción por privado",
        "+ Salas de voz temporales y contador de miembros",
        "~ Servidor más compacto: menos canales, todo en su sitio",
      ].join("\n"),
    },
  },
];

const ids = loadServidor();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const ready = new Promise((r) => client.once("clientReady", r));
await client.login(process.env.DISCORD_TOKEN);
await ready;
const guild = await client.guilds.fetch(process.env.GUILD_ID || ids.guildId);
await guild.channels.fetch();

const existing = new Set(Object.values(db.projects).map((p) => p.name));
for (const def of PROYECTOS) {
  if (existing.has(def.name)) {
    console.log(`=  ${def.name} (ya existe)`);
    continue;
  }
  const { update, ...data } = def;
  const thread = await createProject(guild, data);
  console.log(`➕ ${def.name} → ${thread.url}`);
  if (update) {
    const { newsMsg } = await postUpdate(guild, thread.id, update, null);
    console.log(`   novedad publicada ${newsMsg?.url ?? ""}`);
  }
}

flush();
await client.destroy();
process.exit(0);
