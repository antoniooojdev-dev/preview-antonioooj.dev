// Avisos automáticos de redes sociales.
//  · Feeds RSS/Atom (YouTube, GitHub, Instagram/TikTok vía rss.app o RSSHub…) cada 5 min
//  · Directos de Twitch (opcional, con TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET / TWITCH_USER)
// La primera lectura de cada feed solo memoriza lo que ya existe: no inunda el canal con lo antiguo.

import { box, gallery, linkBtn, row, v2 } from "../lib/ui.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { log } from "../lib/logger.js";
import { socials } from "../servidor/plan.js";

const EVERY_MS = 5 * 60_000;
const KEEP = 200; // ids recordados por feed
const UA = { "User-Agent": "AJBot/1.0 (+https://antonioooj.dev)" };

// ── Lector RSS/Atom mínimo (sin dependencias) ────────────────

const decode = (s = "") =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();

const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1]);
const attr = (xml, name, attribute) => decode(xml.match(new RegExp(`<${name}\\s[^>]*${attribute}="([^"]+)"`, "i"))?.[1]) || undefined;
const stripHtml = (s) => decode(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<(entry|item)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return blocks.map((b) => {
    const link = attr(b, "link", "href") || tag(b, "link");
    return {
      id: tag(b, "yt:videoId") || tag(b, "id") || tag(b, "guid") || link,
      title: stripHtml(tag(b, "title")) || "(sin título)",
      link,
      date: tag(b, "published") || tag(b, "updated") || tag(b, "pubDate"),
      image: attr(b, "media:thumbnail", "url") || attr(b, "media:content", "url") || attr(b, "enclosure", "url") || b.match(/<img[^>]+src="([^"]+)"/i)?.[1],
      summary: stripHtml(tag(b, "media:description") || tag(b, "summary") || tag(b, "description") || tag(b, "content")).slice(0, 300),
    };
  });
}

// ── Publicación ──────────────────────────────────────────────

const roleId = (key) => (key ? config.ids.roles[key] : "");

/** Publica un mensaje (payload completo) y lo difunde si el canal es de anuncios */
async function post(client, channelKey, payload) {
  const channel = await client.channels.fetch(config.ids.channels[channelKey] ?? "").catch(() => null);
  if (!channel?.isTextBased()) return;
  const message = await channel.send(payload);
  if (message.crosspostable) await message.crosspost().catch(() => {});
}

const pingText = (ping) => (ping ? `  ·  <@&${ping}>` : "");
const when = (date) => `<t:${Math.floor((date ? new Date(date) : new Date()).getTime() / 1000)}:R>`;

/** Vídeo: texto con el enlace suelto para que Discord muestre el reproductor */
function videoPayload(feed, item, ping) {
  return {
    content: [`-# ${feed.emoji} ${feed.name}${pingText(ping)}  ·  ${when(item.date)}`, `### ${item.title}`, item.link].join("\n"),
    allowedMentions: { roles: ping ? [ping] : [] },
  };
}

/** Resto: tarjeta minimalista */
function cardPayload(feed, item, ping) {
  return {
    ...v2(
      box([
        `-# ${feed.emoji} ${feed.name}${pingText(ping)}  ·  ${when(item.date)}`,
        `### ${item.link ? `[${item.title}](${item.link})` : item.title}`,
        item.summary && `*${item.summary}*`,
        item.image && gallery(item.image),
      ]),
    ),
    allowedMentions: { roles: ping ? [ping] : [] },
  };
}

async function checkFeed(client, feed) {
  if (!feed.url) return;
  const res = await fetch(feed.url, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let items = parseFeed(await res.text()).filter((i) => i.id);
  if (feed.include) items = items.filter((i) => feed.include.test(i.title));

  let seen = db.socialSeen[feed.key];
  const firstRun = !seen;
  if (firstRun) {
    // primera vez: se memoriza lo antiguo; con `backfill` se publican las N últimas (sin mencionar a nadie)
    seen = items.slice(feed.backfill ?? 0).map((i) => i.id);
    log.info(`Redes: feed ${feed.name} inicializado (${items.length} entradas previas)`);
    if (!feed.backfill) {
      db.socialSeen[feed.key] = seen.slice(0, KEEP);
      save();
      return;
    }
  }

  const fresh = items.filter((i) => !seen.includes(i.id)).reverse(); // de más antigua a más nueva
  for (const item of fresh.slice(-5)) {
    const ping = firstRun ? null : roleId(feed.ping); // lo antiguo se publica sin mencionar
    await post(client, feed.channel, feed.video ? videoPayload(feed, item, ping) : cardPayload(feed, item, ping));
  }
  db.socialSeen[feed.key] = [...fresh.map((i) => i.id), ...seen].slice(0, KEEP);
  if (fresh.length || firstRun) save();
}

// ── Twitch ───────────────────────────────────────────────────

let twitchToken = null;

async function twitchFetch(path) {
  const { TWITCH_CLIENT_ID: id, TWITCH_CLIENT_SECRET: secret } = process.env;
  if (!twitchToken || twitchToken.expires < Date.now()) {
    const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: "POST" });
    const j = await r.json();
    if (!j.access_token) throw new Error("Twitch: credenciales no válidas");
    twitchToken = { value: j.access_token, expires: Date.now() + (j.expires_in - 60) * 1000 };
  }
  const r = await fetch(`https://api.twitch.tv/helix/${path}`, { headers: { "Client-ID": id, Authorization: `Bearer ${twitchToken.value}` } });
  return r.json();
}

async function checkTwitch(client) {
  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_USER } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_USER) return;

  const { data = [] } = await twitchFetch(`streams?user_login=${encodeURIComponent(TWITCH_USER)}`);
  const stream = data[0];
  const wasLive = db.socialSeen.twitchLive;

  if (stream && wasLive !== stream.id) {
    db.socialSeen.twitchLive = stream.id;
    save();
    const url = `https://twitch.tv/${TWITCH_USER}`;
    const ping = roleId(socials.twitch.ping);
    await post(client, socials.twitch.channel, {
      ...v2(
        box(
          [
            `-# 🔴 Twitch · en directo${pingText(ping)}`,
            `## [${stream.title}](${url})`,
            `*${stream.game_name || "Sin categoría"}*`,
            gallery(`${stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720")}?t=${Date.now()}`),
            row(linkBtn("Ver directo", url, "🔴")),
          ],
          0x9146ff,
        ),
      ),
      allowedMentions: { roles: ping ? [ping] : [] },
    });
  } else if (!stream && wasLive) {
    db.socialSeen.twitchLive = null;
    save();
  }
}

// ── Arranque ─────────────────────────────────────────────────

export function startSocials(client) {
  const active = socials.feeds.filter((f) => f.url);
  const tick = async () => {
    for (const feed of active) {
      await checkFeed(client, feed).catch((err) => log.warn(`Redes (${feed.name}):`, err.message));
    }
    await checkTwitch(client).catch((err) => log.warn("Redes (Twitch):", err.message));
  };
  tick();
  setInterval(tick, EVERY_MS);
  log.info(`Avisos de redes: ${active.map((f) => f.name).join(", ") || "ningún feed"}${process.env.TWITCH_USER ? " + Twitch" : ""}`);
}
