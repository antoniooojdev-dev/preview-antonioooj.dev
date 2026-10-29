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
   Rellena `.env` y los IDs de `src/config.js`.
4. Registra los comandos y arranca:
   ```bash
   npm run deploy
   npm start                 # o npm run dev para recargar al guardar
   ```

> El rol del bot tiene que estar **por encima** de los roles que va a dar (auto-rol, verificado, recompensas).

## Ejemplo de mensaje programado

```js
// src/config.js
scheduled: [
  { time: "09:00", days: [1, 2, 3, 4, 5], channel: "123…", message: "☀️ ¡Buenos días!" },
  { time: "20:00", days: [5], channel: "123…", message: "🎮 Noche de juegos en 1 hora" },
],
```

Requiere Node.js 20.6 o superior (usa `--env-file`, sin dependencia de dotenv).
