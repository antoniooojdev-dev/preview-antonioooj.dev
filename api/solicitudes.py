"""
solicitudes.py · Solicitud de rango con botón + formulario (bot de la web).

En el canal de solicitud de roles hay un embed con los pasos y un botón. El botón abre un
formulario (modal) con: nombre y apellido del personaje, placa (1-3 cifras) y rango (desplegable).
Al enviarlo, se le pone de apodo el nombre del personaje y la solicitud llega como embed al
canal de logs (privado, en ADMINISTRACIÓN) con botones Aceptar / Rechazar. Al aceptar, se le
da el rol del rango (y se le quitan los otros rangos IAA); en ambos casos se le avisa por MD.

Los botones son persistentes: siguen funcionando aunque el bot se reinicie, porque presencia.py
los registra en setup_hook. El panel se publica una sola vez (ver panel()).
"""
import logging
import re
import time

import discord

log = logging.getLogger("solicitudes")

# id del servidor → canal de logs y rol de cada rango
SERVIDORES: dict[int, dict] = {
    1568736656264142999: {                          # Nación | IAA
        "logs": 1568740960496517220,                # 📥┃solicitudes
        "roles": {                                  # rango → rol que se entrega al aceptar
            "Coordinador IAA": 1568741587310215298,
            "Supervisor IAA": 1568741591118651503,
            "Miembro IAA": 1568741591684747396,
            "En prácticas IAA": 1568741592817209416,
        },
    },
}

RANGOS = ["Coordinador IAA", "Supervisor IAA", "Miembro IAA", "En prácticas IAA"]
COLOR = 0x2B2D31
VERDE = 0x3BA55D
ROJO = 0xED4245
BLANCO = 0xFFFFFF
ID_BOTON = "aj:solicitud_rol"


def panel() -> tuple[discord.Embed, "Panel"]:
    """Embed con los pasos + vista con el botón (para publicarlo en el canal de solicitudes)."""
    e = discord.Embed(
        color=VERDE,
        description=(
            "__**SOLICITUD DE RANGO**__\n\n"
            "Para obtener tu rango dentro de la **IAA**, sigue estos pasos:\n\n"
            "**1.** Pulsa el botón **Solicitar rango** de abajo.\n"
            "**2.** Escribe el **nombre y apellido de tu personaje** (será tu apodo en el servidor).\n"
            "**3.** Indica tu **número de placa** (solo números, máximo 3 cifras).\n"
            "**4.** Elige en el desplegable el **rango** que solicitas.\n"
            "**5.** Envía el formulario y espera: jefatura revisará tu solicitud y, si se acepta, "
            "recibirás tu rol automáticamente y un aviso por MD.\n\n"
            "*⚠️ No envíes varias solicitudes seguidas ni pidas un rango que no te corresponde.*"
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
        await interaction.response.send_modal(Formulario())


class Formulario(discord.ui.Modal, title="Solicitud de rango"):
    personaje = discord.ui.TextInput(label="Nombre y apellido del personaje", placeholder="Ej.: John Smith",
                                     min_length=3, max_length=32)
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
        personaje = " ".join(self.personaje.value.split())

        # Apodo = nombre y apellido del personaje (no se puede con el dueño ni con roles por encima del bot)
        apodo = "✅ Puesto"
        try:
            await u.edit(nick=personaje[:32], reason="Solicitud de rango: nombre del personaje")
        except (discord.HTTPException, AttributeError):
            apodo = "⚠️ No se pudo poner (dueño del servidor o rol superior al bot)"

        ahora = discord.utils.utcnow()
        ts = int(ahora.timestamp())
        # Valores en bloque de código (```): Discord les pone un botón de copiar con un clic
        def bloque(texto) -> str:
            return f"```{str(texto).replace('`', '')}```"

        e = discord.Embed(description="# __**NUEVA SOLICITUD DE RANGO**__", color=BLANCO, timestamp=ahora)
        e.set_thumbnail(url=u.display_avatar.replace(size=256).url)
        e.add_field(name="Usuario", value=f"{u.mention}\n{bloque(u.name)}", inline=True)
        e.add_field(name="ID de Discord", value=bloque(u.id), inline=True)
        e.add_field(name="Apodo", value=apodo, inline=True)
        e.add_field(name="Nombre del personaje", value=bloque(personaje), inline=True)
        e.add_field(name="Placa", value=bloque(placa), inline=True)
        e.add_field(name="Rango solicitado", value=bloque(rango), inline=True)
        e.add_field(name="Fecha y hora", value=f"<t:{ts}:F> (<t:{ts}:R>)", inline=False)
        e.add_field(name="Estado", value="🕓 Pendiente de revisión", inline=False)
        e.set_footer(text="Solicitud de rango")
        vista = discord.ui.View(timeout=None)
        vista.add_item(Revisar("si", u.id, RANGOS.index(rango)))
        vista.add_item(Revisar("no", u.id, RANGOS.index(rango)))
        try:
            await canal.send(embed=e, view=vista, allowed_mentions=discord.AllowedMentions.none())
        except discord.HTTPException as err:
            log.warning("solicitudes: no se pudo mandar el log: %s", err)
            await interaction.response.send_message(
                "❌ No se ha podido registrar la solicitud. Avisa a jefatura.", ephemeral=True)
            return

        await interaction.response.send_message(
            f"✅ Solicitud enviada: **{rango}** · placa **{placa}**. Jefatura la revisará pronto y "
            f"te avisaremos por MD.", ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception):
        log.warning("solicitudes: error en el formulario: %s", error)
        if not interaction.response.is_done():
            await interaction.response.send_message("❌ Ha habido un error. Inténtalo de nuevo.", ephemeral=True)


class Revisar(discord.ui.DynamicItem[discord.ui.Button],
              template=r"aj:sol:(?P<accion>si|no):(?P<uid>\d+):(?P<rango>\d)"):
    """Botones Aceptar / Rechazar del log. Llevan en el custom_id a quién y qué rango, así que
    siguen funcionando tras reiniciar el bot."""

    def __init__(self, accion: str, uid: int, rango: int):
        self.accion, self.uid, self.rango = accion, uid, rango
        super().__init__(discord.ui.Button(
            label="Entregar roles" if accion == "si" else "Rechazar solicitud",
            emoji="✅" if accion == "si" else "✖️",
            style=discord.ButtonStyle.success if accion == "si" else discord.ButtonStyle.danger,
            custom_id=f"aj:sol:{accion}:{uid}:{rango}",
        ))

    @classmethod
    async def from_custom_id(cls, interaction: discord.Interaction, item: discord.ui.Button, match: re.Match):
        return cls(match["accion"], int(match["uid"]), int(match["rango"]))

    async def callback(self, interaction: discord.Interaction):
        g = interaction.guild
        revisor = interaction.user
        if not g or g.id not in SERVIDORES or not isinstance(revisor, discord.Member) or self.rango >= len(RANGOS):
            return
        if not revisor.guild_permissions.manage_roles:
            await interaction.response.send_message("❌ No tienes permiso para revisar solicitudes.", ephemeral=True)
            return
        rango = RANGOS[self.rango]
        roles_ids = SERVIDORES[g.id]["roles"]
        miembro = g.get_member(self.uid)
        if miembro is None:
            try:
                miembro = await g.fetch_member(self.uid)
            except discord.HTTPException:
                miembro = None

        ts = int(time.time())
        if self.accion == "si":
            if miembro is None:
                estado, color = "⚠️ La persona ya no está en el servidor", ROJO
            else:
                rol = g.get_role(roles_ids[rango])
                quitar = [r for r in miembro.roles if r.id in roles_ids.values() and r.id != roles_ids[rango]]
                try:
                    if rol is None:
                        raise LookupError(f"no existe el rol de {rango}")
                    if quitar:                      # un solo rango IAA a la vez (ascensos/descensos)
                        await miembro.remove_roles(*quitar, reason=f"Nuevo rango: {rango}")
                    await miembro.add_roles(rol, reason=f"Solicitud aceptada por {revisor}")
                except (discord.HTTPException, LookupError) as err:
                    log.warning("solicitudes: no se pudo dar el rol: %s", err)
                    await interaction.response.send_message(
                        "❌ No he podido dar el rol (¿existe y está por debajo del rol del bot?).", ephemeral=True)
                    return
                estado, color = f"✅ Aceptada por {revisor.mention} · <t:{ts}:f>", VERDE
                await _md(miembro, f"✅ Tu solicitud de **{rango}** en **{g.name}** ha sido **aceptada**. "
                                   f"Ya tienes tu rol.")
        else:
            estado, color = f"✖️ Rechazada por {revisor.mention} · <t:{ts}:f>", ROJO
            if miembro:
                await _md(miembro, f"✖️ Tu solicitud de **{rango}** en **{g.name}** ha sido **rechazada**. "
                                   f"Si crees que es un error, contacta con jefatura.")

        e = interaction.message.embeds[0] if interaction.message and interaction.message.embeds else None
        if e:
            e.color = color
            for i, campo in enumerate(e.fields):
                if campo.name == "Estado":
                    e.set_field_at(i, name="Estado", value=estado, inline=False)
        await interaction.response.edit_message(embed=e, view=None)


async def _md(m: discord.Member, texto: str) -> None:
    try:
        await m.send(texto)
    except discord.HTTPException:
        pass                                        # MD cerrados: no pasa nada


def registrar(cliente: discord.Client) -> None:
    """Hace que los botones (panel y Aceptar/Rechazar) funcionen siempre, también tras reiniciar."""
    cliente.add_view(Panel())
    cliente.add_dynamic_items(Revisar)
