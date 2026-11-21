// Salas de voz temporales: al entrar en «➕ Crear sala» el bot crea un canal
// para ti (puedes renombrarlo, poner límite, echar gente…) y lo borra al vaciarse.

import { ChannelType, PermissionFlagsBits } from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { log } from "../lib/logger.js";

const lobbyId = () => config.ids.channels.crear_sala;

/** @param {import("discord.js").VoiceState} oldState @param {import("discord.js").VoiceState} newState */
export async function handleVoice(oldState, newState) {
  // alguien entra al lobby → nueva sala
  if (newState.channelId && newState.channelId === lobbyId() && newState.member && !newState.member.user.bot) {
    await createRoom(newState);
  }
  // alguien sale de una sala temporal → borrar si se ha quedado vacía
  if (oldState.channelId && oldState.channelId !== newState.channelId && db.tempVoice[oldState.channelId]) {
    await cleanup(oldState.channel);
  }
}

async function createRoom(state) {
  const { member, guild } = state;
  const lobby = state.channel;
  try {
    const room = await guild.channels.create({
      name: `🔊 Sala de ${member.displayName}`.slice(0, 100),
      type: ChannelType.GuildVoice,
      parent: lobby.parentId,
      bitrate: lobby.bitrate,
      permissionOverwrites: [
        ...lobby.permissionOverwrites.cache.map((o) => ({ id: o.id, type: o.type, allow: o.allow, deny: o.deny })),
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
          ],
        },
      ],
    });
    db.tempVoice[room.id] = { ownerId: member.id, guildId: guild.id };
    save();
    await member.voice.setChannel(room).catch(() => {});
    // si no se pudo mover (ya se fue), no dejar la sala huérfana
    if (!room.members.size) setTimeout(() => cleanup(room), 5000);
  } catch (err) {
    log.warn("Sala temporal:", err.message);
  }
}

async function cleanup(channel) {
  if (!channel || channel.members.size) return;
  delete db.tempVoice[channel.id];
  save();
  await channel.delete("Sala temporal vacía").catch(() => {});
}

/** Al arrancar: borra salas que se quedaron vacías mientras el bot estaba apagado */
export async function sweep(client) {
  for (const [id, { guildId }] of Object.entries(db.tempVoice)) {
    const channel = client.guilds.cache.get(guildId)?.channels.cache.get(id);
    if (!channel) {
      delete db.tempVoice[id];
      continue;
    }
    await cleanup(channel);
  }
  save();
}
