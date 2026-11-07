"""
bienvenida.py · Mensaje de bienvenida del bot de la web cuando alguien entra en un servidor.

Lo llama presencia.py (on_member_join). Un solo mensaje: la mención a la persona y debajo un
embed con su nombre de Discord, su ID, la fecha y hora en que entró y el aviso para que pida
su rol en el canal de solicitudes.

Para añadir otro servidor, añade una entrada a SERVIDORES con sus IDs de canal.
"""
import logging

import discord

log = logging.getLogger("bienvenida")

# id del servidor → canales (bienvenida, solicitud de roles)
SERVIDORES: dict[int, dict] = {
    1568736656264142999: {                          # Nación | IAA
        "bienvenida": 1568739056412663909,          # 👋┃bienvenida
        "roles": 1568739056999997666,               # 🎭┃solicitud-roles
    },
}

COLOR = 0x2B2D31


def embed(m: discord.Member, roles: int) -> discord.Embed:
    """Embed de bienvenida (también sirve para probarlo a mano)."""
    unido = m.joined_at or discord.utils.utcnow()
    ts = int(unido.timestamp())
    e = discord.Embed(
        title=f"¡Bienvenido/a a {m.guild.name}!",
        color=COLOR,
        description=(
            f"Para poder participar en el servidor necesitas tu rol.\n"
            f"Pásate por <#{roles}> y solicita el tuyo; un miembro del equipo lo revisará "
            f"lo antes posible."
        ),
        timestamp=unido,
    )
    e.set_thumbnail(url=m.display_avatar.replace(size=256).url)
    e.add_field(name="Nombre de Discord", value=f"{m.global_name or m.name} (@{m.name})", inline=False)
    e.add_field(name="ID de Discord", value=f"`{m.id}`", inline=False)
    e.add_field(name="Fecha y hora de unión", value=f"<t:{ts}:F> (<t:{ts}:R>)", inline=False)
    e.set_footer(text=f"Miembro n.º {m.guild.member_count}" if m.guild.member_count else m.guild.name,
                 icon_url=m.guild.icon.url if m.guild.icon else None)
    return e


async def dar(m: discord.Member) -> None:
    """Manda la bienvenida si el servidor está en SERVIDORES. Nunca lanza excepciones."""
    conf = SERVIDORES.get(m.guild.id)
    if not conf or m.bot:
        return
    try:
        canal = m.guild.get_channel(conf["bienvenida"])
        if not isinstance(canal, discord.TextChannel):
            log.warning("bienvenida: no encuentro el canal %s en %s", conf["bienvenida"], m.guild.name)
            return
        await canal.send(
            content=m.mention,
            embed=embed(m, conf["roles"]),
            allowed_mentions=discord.AllowedMentions(users=[m], roles=False, everyone=False),
        )
    except Exception as e:  # noqa: BLE001 (que un fallo no afecte al bot)
        log.warning("bienvenida: no se pudo mandar a %s en %s: %s", m, m.guild.name, e)
