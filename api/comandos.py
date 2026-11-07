"""
comandos.py · Comandos slash del bot de la web.

  /clear cantidad:<1-100>  borra los últimos mensajes del canal (hace falta «Gestionar mensajes»)

Se registran como comandos del servidor (aparecen al momento, no tardan como los globales) en
cada servidor de SERVIDORES. presencia.py llama a registrar() desde setup_hook.
"""
import logging

import discord
from discord import app_commands

log = logging.getLogger("comandos")

SERVIDORES = [1568736656264142999]                  # Nación | IAA


@app_commands.command(name="clear", description="Borra mensajes de este canal")
@app_commands.describe(cantidad="Cuántos mensajes borrar (1-100)")
@app_commands.default_permissions(manage_messages=True)
@app_commands.guild_only()
async def clear(interaction: discord.Interaction, cantidad: app_commands.Range[int, 1, 100]):
    canal = interaction.channel
    if not isinstance(canal, (discord.TextChannel, discord.VoiceChannel, discord.Thread)):
        await interaction.response.send_message("❌ Aquí no se pueden borrar mensajes.", ephemeral=True)
        return
    if not canal.permissions_for(interaction.user).manage_messages:
        await interaction.response.send_message("❌ No tienes permiso para borrar mensajes.", ephemeral=True)
        return
    await interaction.response.defer(ephemeral=True, thinking=True)
    try:
        # Los de más de 14 días Discord no deja borrarlos en bloque: discord.py los borra uno a uno
        borrados = await canal.purge(limit=cantidad, reason=f"/clear por {interaction.user}")
    except discord.HTTPException as e:
        log.warning("comandos: /clear falló: %s", e)
        await interaction.followup.send("❌ No he podido borrar los mensajes.", ephemeral=True)
        return
    n = len(borrados)
    await interaction.followup.send(f"🧹 {n} mensaje{'s' if n != 1 else ''} borrado{'s' if n != 1 else ''}.",
                                    ephemeral=True)


async def registrar(cliente: discord.Client) -> None:
    arbol = app_commands.CommandTree(cliente)
    for gid in SERVIDORES:
        g = discord.Object(id=gid)
        arbol.add_command(clear, guild=g)
        try:
            await arbol.sync(guild=g)
        except discord.HTTPException as e:
            log.warning("comandos: no se pudieron registrar en %s: %s", gid, e)
