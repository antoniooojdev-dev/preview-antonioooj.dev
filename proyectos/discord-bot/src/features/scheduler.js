// Motor de tareas automáticas. Cada 30 s revisa:
//   · recordatorios vencidos      · encuestas y sorteos que terminan
//   · mensajes programados (config.scheduled)
// Todo está persistido, así que sobrevive a reinicios del bot.

import { EmbedBuilder } from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { log } from "../lib/logger.js";
import * as polls from "./polls.js";
import * as giveaways from "./giveaways.js";

const TICK_MS = 30_000;

/** Hora local del servidor según config.timezone */
function nowInTimezone() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: config.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23", // "00:05" y no "24:05" a medianoche
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: weekdays[parts.weekday],
  };
}

async function runReminders(client) {
  const now = Date.now();
  const due = db.reminders.filter((r) => r.at <= now);
  if (!due.length) return;

  db.reminders = db.reminders.filter((r) => r.at > now);
  save();

  for (const r of due) {
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("⏰ Recordatorio").setDescription(r.text);
    try {
      const user = await client.users.fetch(r.userId);
      await user.send({ embeds: [embed] });
    } catch {
      // DMs cerrados: lo enviamos en el canal donde se creó
      const channel = await client.channels.fetch(r.channelId).catch(() => null);
      await channel?.send({ content: `<@${r.userId}>`, embeds: [embed] }).catch(() => {});
    }
  }
}

async function runEndings(client) {
  const now = Date.now();
  for (const [id, p] of Object.entries(db.polls)) if (p.endsAt <= now) await polls.end(client, id);
  for (const [id, g] of Object.entries(db.giveaways)) if (g.endsAt <= now) await giveaways.end(client, id);
}

async function runScheduled(client) {
  const { date, time, weekday } = nowInTimezone();

  for (const [i, job] of config.scheduled.entries()) {
    const key = `job${i}:${job.time}:${job.channel}`;
    if (job.time !== time || db.scheduledRuns[key] === date) continue;
    if (job.days && !job.days.includes(weekday)) continue;

    db.scheduledRuns[key] = date;
    save();

    const channel = await client.channels.fetch(job.channel).catch(() => null);
    if (!channel?.isTextBased()) {
      log.warn(`Mensaje programado #${i}: canal ${job.channel} no encontrado`);
      continue;
    }
    await channel.send(job.message).catch((err) => log.warn(`Mensaje programado #${i}:`, err.message));
  }
}

export function startScheduler(client) {
  const tick = async () => {
    try {
      await runReminders(client);
      await runEndings(client);
      await runScheduled(client);
    } catch (err) {
      log.error("Error en el planificador:", err);
    }
  };
  tick(); // al arrancar procesa lo que venció mientras el bot estaba apagado
  setInterval(tick, TICK_MS);
  log.info(`Planificador iniciado (cada ${TICK_MS / 1000} s, zona ${config.timezone})`);
}
