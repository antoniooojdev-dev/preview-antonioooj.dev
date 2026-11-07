"""
solicitudes.py · Solicitud de rango con botón + formulario (bot de la web).

En el canal de solicitud de roles hay un embed con los pasos y un botón. El botón abre un
formulario (modal) con: nombre del personaje, placa (1-3 cifras) y rango (desplegable).
Al enviarlo, la solicitud llega como embed al canal de logs (privado, en ADMINISTRACIÓN).

El botón es persistente (custom_id fijo): sigue funcionando aunque el bot se reinicie, porque
presencia.py registra la vista en setup_hook. El panel se publica una sola vez (ver panel()).
"""
import logging
import time

import discord

log = logging.getLogger("solicitudes")

# id del servidor → canal de logs de solicitudes
SERVIDORES: dict[int, dict] = {
    1568736656264142999: {                          # Nación | IAA
        "logs": 1568740960496517220,                # 📥┃solicitudes
    },
}

RANGOS = ["Coordinador IAA", "Supervisor IAA", "Miembro IAA", "En prácticas IAA"]
ESPERA = 300                                        # segundos entre solicitudes de la misma persona
COLOR = 0x2B2D31
ID_BOTON = "aj:solicitud_rol"

_ultima: dict[int, float] = {}


def panel() -> tuple[discord.Embed, "Panel"]:
    """Embed con los pasos + vista con el botón (para publicarlo en el canal de solicitudes)."""
    e = discord.Embed(
        title="🎭 Solicitud de rango",
        color=COLOR,
        description=(
            "Para obtener tu rango dentro de la **IAA**, sigue estos pasos:\n\n"
            "**1.** Pulsa el botón **Solicitar rango** de abajo.\n"
            "**2.** Escribe el **nombre de tu personaje** tal y como aparece en el servidor.\n"
            "**3.** Indica tu **número de placa** (solo números, máximo 3 cifras).\n"
            "**4.** Elige en el desplegable el **rango** que solicitas.\n"
            "**5.** Envía el formulario y espera: jefatura revisará tu solicitud y te "
            "asignará el rol.\n\n"
            "⚠️ No envíes varias solicitudes seguidas ni pidas un rango que no te corresponde."
        ),
    )
    e.set_footer(text="Nación | IAA · Solicitudes de rango")
    return e, Panel()


class Panel(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Solicitar rango", emoji="📝", style=discord.ButtonStyle.primary, custom_id=ID_BOTON)
    async def solicitar(self, interaction: discord.Interaction, _boton: discord.ui.Button):
        if not interaction.guild or interaction.guild.id not in SERVIDORES:
            await interaction.response.send_message("Este botón no está activo en este servidor.", ephemeral=True)
            return
        falta = int(_ultima.get(interaction.user.id, 0) + ESPERA - time.time())
        if falta > 0:
            await interaction.response.send_message(
                f"Ya has enviado una solicitud. Podrás enviar otra en {falta // 60 + 1} min.", ephemeral=True)
            return
        await interaction.response.send_modal(Formulario())


class Formulario(discord.ui.Modal, title="Solicitud de rango"):
    personaje = discord.ui.TextInput(label="Nombre del personaje", placeholder="Ej.: John Smith",
                                     min_length=2, max_length=40)
    placa = discord.ui.TextInput(label="Placa (solo números, máx. 3 cifras)", placeholder="Ej.: 123",
                                 min_length=1, max_length=3)
    rango = discord.ui.Label(
        text="Rango a solicitar",
        component=discord.ui.Select(
            placeholder="Elige un rango",
            options=[discord.SelectOption(label=r, value=r) for r in RANGOS],
        ),
    )

    async def on_submit(self, interaction: discord.Interaction):
        placa = self.placa.value.strip()
        if not (placa.isdigit() and 1 <= len(placa) <= 3):
            await interaction.response.send_message(
                "❌ La placa solo puede tener números (máximo 3 cifras). Pulsa el botón y vuelve a intentarlo.",
                ephemeral=True)
            return
        seleccion = self.rango.component.values  # type: ignore[union-attr]
        rango = seleccion[0] if seleccion else None
        if rango not in RANGOS:
            await interaction.response.send_message("❌ Elige un rango del desplegable.", ephemeral=True)
            return

        conf = SERVIDORES[interaction.guild.id]
        canal = interaction.guild.get_channel(conf["logs"])
        if not isinstance(canal, discord.TextChannel):
            log.warning("solicitudes: no encuentro el canal de logs %s", conf["logs"])
            await interaction.response.send_message(
                "❌ No se ha podido registrar la solicitud. Avisa a jefatura.", ephemeral=True)
            return

        u = interaction.user
        ahora = discord.utils.utcnow()
        ts = int(ahora.timestamp())
        e = discord.Embed(title="📥 Nueva solicitud de rango", color=COLOR, timestamp=ahora)
        e.set_thumbnail(url=u.display_avatar.replace(size=256).url)
        e.add_field(name="Usuario", value=f"{u.mention}\n{u.global_name or u.name} (@{u.name})", inline=True)
        e.add_field(name="ID de Discord", value=f"`{u.id}`", inline=True)
        e.add_field(name="​", value="​", inline=True)
        e.add_field(name="Nombre del personaje", value=discord.utils.escape_markdown(self.personaje.value.strip()),
                    inline=True)
        e.add_field(name="Placa", value=f"`{placa}`", inline=True)
        e.add_field(name="Rango solicitado", value=rango, inline=True)
        e.add_field(name="Fecha y hora", value=f"<t:{ts}:F> (<t:{ts}:R>)", inline=False)
        e.set_footer(text="Solicitud de rango")
        try:
            await canal.send(embed=e, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException as err:
            log.warning("solicitudes: no se pudo mandar el log: %s", err)
            await interaction.response.send_message(
                "❌ No se ha podido registrar la solicitud. Avisa a jefatura.", ephemeral=True)
            return

        _ultima[u.id] = time.time()
        await interaction.response.send_message(
            f"✅ Solicitud enviada: **{rango}** · placa **{placa}**. Jefatura la revisará pronto.", ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception):
        log.warning("solicitudes: error en el formulario: %s", error)
        if not interaction.response.is_done():
            await interaction.response.send_message("❌ Ha habido un error. Inténtalo de nuevo.", ephemeral=True)


def registrar(cliente: discord.Client) -> None:
    """Hace que el botón del panel funcione siempre (también tras reiniciar)."""
    cliente.add_view(Panel())
