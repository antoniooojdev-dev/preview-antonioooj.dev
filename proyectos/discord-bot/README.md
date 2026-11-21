# AJ Bot — bot de Discord automatizado

Bot todo en uno para gestionar una comunidad sin intervención manual. Usa **Node.js** y **discord.js v14**, con comandos slash, botones, persistencia y un planificador de tareas.

## Funciones

### Automáticas (sin comandos)
| Función | Qué hace |
| --- | --- |
| 🛡️ **Automod** | Borra palabras prohibidas (detecta variantes como `p4l4br0t4`), invitaciones a otros servidores y spam de menciones. Aísla automáticamente a quien hace flood |
| ⭐ **Niveles** | XP por actividad con cooldown, subida de nivel anunciada y **roles de recompensa** automáticos |
| 👋 **Bienvenidas** | Mensaje con embed, **auto-rol** y aviso en logs si la cuenta es muy nueva (posible multicuenta o raid) |
| 📋 **Logs** | Entradas y salidas, mensajes borrados, tickets con transcripción, moderación y automod |
| ⏰ **Mensajes programados** | Mensajes a una hora y en unos días concretos (zona horaria configurable) |
| ♻️ **Persistente** | Encuestas, sorteos y recordatorios siguen funcionando aunque el bot se reinicie |

### Comandos
| Comando | Permiso | Descripción |
| --- | --- | --- |
| `/panel tickets` | Gestionar servidor | Panel con botón para abrir tickets privados |
| `/panel verificacion` | Gestionar servidor | Panel con botón que da el rol de verificado |
| `/sorteo` | Gestionar servidor | Sorteo con botón; elige ganadores al azar (`crypto.randomInt`) al terminar |
| `/encuesta` | Todos | Hasta 10 opciones con botones y barras de resultados en vivo |
| `/recordatorio crear·lista·borrar` | Todos | Recordatorios por mensaje privado (`10m`, `2h30m`, `3d`…) |
| `/nivel` · `/ranking` | Todos | Perfil de XP y top 10 |
| `/advertir` | Moderar miembros | Advertencias con **sanción escalonada**: aislamiento a las 3 y expulsión a las 5 |
| `/advertencias` | Moderar miembros | Historial y limpieza |
| `/limpiar` | Gestionar mensajes | Borrado masivo, opcionalmente filtrado por usuario |
| `/ping` · `/ayuda` | Todos | Latencia y lista de comandos (solo muestra los que puedes usar) |

### Tickets
Botón → canal privado (usuario + equipo de soporte) → botón «Cerrar» → **transcripción `.txt`** al canal de logs → el canal se borra.

## Estructura

```
discord-bot/
├── src/
│   ├── index.js              cliente, carga de comandos y eventos
│   ├── deploy-commands.js    registra los slash commands
│   ├── config.js             canales, roles, automod, niveles, mensajes programados
│   ├── commands/             un archivo por comando
│   ├── events/               ready, interactionCreate, messageCreate, guildMember*…
│   ├── features/             tickets, verificación, encuestas, sorteos, niveles, automod, planificador
│   └── lib/                  store (JSON atómico), logger, embeds, duraciones, loader
├── data/db.json              se crea solo
└── .env.example
```

Los botones usan `customId` con el formato `función:acción:argumento` (p. ej. `poll:vote:2`). `interactionCreate` los enruta al módulo correspondiente.

## Puesta en marcha

1. Crea una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications). En **Bot**, activa los intents **Server Members** y **Message Content**.
2. Invita el bot con los scopes `bot` y `applications.commands` y permisos de administrador (o al menos: gestionar canales, gestionar roles, gestionar mensajes, moderar miembros y expulsar).
3. Instala y configura:
   ```bash
   npm install
   cp .env.example .env      # en Windows: copy .env.example .env
   ```
   Rellena `.env`.
4. Monta el servidor, registra los comandos y arranca:
   ```bash
   npm run setup
   npm run deploy
   npm start                 # o npm run dev para recargar al guardar
   ```

> El rol del bot tiene que estar **por encima** de los roles que va a dar (auto-rol, verificado, recompensas).

## Montar el servidor entero (`npm run setup`)

`src/servidor/plan.js` describe el servidor completo y `npm run setup` lo aplica. Se puede ejecutar las veces que haga falta: **actualiza** lo que ya existe en vez de duplicarlo.

| Qué | Detalle |
| --- | --- |
| 🎭 **35 roles** | Staff (Fundador, Admin, Moderador, Soporte), especiales, 5 de nivel, Miembro, avisos e intereses, con divisores |
| 📁 **13 categorías** | Estadísticas, Inicio, Información, Contenido, Comunidad, Desarrollo, Proyectos AJ, Eventos, Voz, Soporte, Tickets, Staff y Registros |
| 🔐 **Permisos** | Quien no se verifica solo ve Inicio; el resto se desbloquea con el rol Miembro. Staff y registros son privados |
| 🌐 **Comunidad** | Activa la función Comunidad: canales de anuncios que otros servidores pueden seguir, normas oficiales y foros |
| 💬 **Foros** | Ayuda con el código, tus proyectos, sugerencias (votación 👍/👎) y bugs, con etiquetas |
| 🧾 **Paneles** | Guía, normas, verificación, auto-roles, redes, servicios, niveles, partners y tickets |
| 🛡️ **AutoMod de Discord** | Contenido sexual, insultos, spam y spam de menciones (además del automod del bot) |
| ⚙️ **Ajustes** | Icono, descripción, canal AFK, verificación media, notificaciones solo con menciones, apodo «AJ Bot» |

```bash
npm run revisar            # solo enseña lo que hay, no cambia nada
npm run setup              # monta/actualiza el servidor
npm run setup -- --limpiar # además borra canales y roles que no estén en el plano
```

Los IDs resultantes se guardan en `data/servidor.json` y el bot los usa solo (ya no hay que copiar IDs a mano en `config.js`).

### Funciones nuevas
- **Tickets con formulario**: tipos (soporte, presupuesto, reporte, partnership, otro), formulario, botón **Reclamar**, cierre con motivo, transcripción al canal de registros **y por privado** al usuario.
- **Auto-roles** con menús desplegables (avisos e intereses).
- **Avisos de redes**: YouTube (@antonioooj_dev) y GitHub por RSS/Atom; Instagram/TikTok con un feed de rss.app/RSSHub; directos de Twitch con su API. Mencionan al rol de avisos y se publican a los servidores que siguen el canal.
- **`/anuncio`**: formulario con título, mensaje, imagen y botón; elige canal, mención y estilo.
- **Salas de voz temporales**: entra en «➕ Crear sala» y tendrás una sala propia que se borra al vaciarse.
- **Contadores** de miembros y mejoras en canales de voz.
- **Foros**: votación automática en sugerencias, plantilla en bugs, recordatorio de «Resuelto» en ayuda.
- **Mensajes programados** (lunes y viernes) y **registros separados** (general, moderación, tickets).

## Ejemplo de mensaje programado

```js
// src/servidor/plan.js — el canal se indica por su clave del plano
export const scheduled = [
  { time: "09:00", days: [1, 2, 3, 4, 5], channel: "general", message: "☀️ ¡Buenos días!" },
  { time: "20:00", days: [5], channel: "gaming", message: "🎮 Noche de juegos en 1 hora" },
];
```

Requiere Node.js 20.6 o superior (usa `--env-file`, sin dependencia de dotenv).
