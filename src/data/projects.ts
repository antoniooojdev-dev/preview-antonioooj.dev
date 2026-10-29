// ─────────────────────────────────────────────────────────────
//  Proyectos del portfolio. El código completo está en /proyectos.
//  Cada proyecto genera automáticamente /proyectos/<slug>
// ─────────────────────────────────────────────────────────────

export interface Snippet {
  code: string;
  lang: "ts" | "js" | "php" | "lua";
  filename: string;
}

export interface Project {
  slug: string;
  title: string;
  client: string;
  year: number;
  type: string;
  summary: string;
  problem: string;
  solution: string;
  highlights: string[];
  stack: string[];
  snippet?: Snippet;
  url?: string;
  repo?: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: "nyx-community",
    title: "Web del servidor de rol Nyx Community",
    client: "Nyx Community · Servidor FiveM",
    year: 2026,
    type: "Web de comunidad · En desarrollo",
    summary: "Web y panel de jugadores de un servidor de rol: login con Discord, sugerencias con votos, postulaciones y estado en vivo.",
    problem:
      "Los servidores de rol reparten su información entre canales de Discord y documentos sueltos: el jugador nuevo no sabe cómo entrar, la normativa es difícil de consultar y no hay forma de ver si el servidor está activo antes de abrir el juego.",
    solution:
      "Web pública con jugadores conectados en tiempo real desde la API de FiveM, conexión con un clic, facciones y una normativa con buscador y enlaces por norma. Detrás, un panel con login de Discord donde los jugadores envían y votan sugerencias y se postulan a la whitelist o a facciones, y el staff las revisa y responde.",
    highlights: [
      "Login con Discord (OAuth2) y roles de jugador y staff",
      "Sugerencias con votos y postulaciones con requisitos",
      "Jugadores online en vivo con la API de FiveM",
      "Todo el contenido editable desde un solo archivo",
    ],
    stack: ["HTML", "CSS", "JavaScript", "FiveM API"],
    snippet: {
      lang: "js",
      filename: "js/main.js",
      code: `
async function loadStatus() {
  const res = await fetch(\`https://servers-frontend.fivem.net/api/servers/single/\${code}\`);
  if (res.status === 404) return setStatus("offline", "Servidor offline", 0);
  const { Data: info } = await res.json();
  const players = info.clients ?? info.players?.length ?? 0;
  const max = Number(info.sv_maxclients) || server.maxPlayers;
  setStatus("online", "Servidor online", players, max);
}`,
    },
    featured: true,
  },
  {
    slug: "restaurante-reservas",
    title: "Web de restaurante con reservas",
    client: "Demo · Hostelería",
    year: 2026,
    type: "Web + backend PHP",
    summary: "Carta dinámica, estado «abierto ahora» y reservas online con control de aforo real.",
    problem:
      "Un restaurante que gestiona las reservas por teléfono pierde llamadas en pleno servicio, sufre solapamientos y no tiene una carta online fácil de actualizar ni con información de alérgenos.",
    solution:
      "Web con carta por categorías y filtro de alérgenos, horario que indica en vivo si está abierto, y un sistema de reservas en PHP que calcula las horas libres según el aforo y la duración de cada mesa. Incluye una API REST y un panel de administración con login para ver y cancelar reservas.",
    highlights: [
      "Aforo controlado por solapamiento de mesas",
      "Reservas atómicas: sin overbooking con peticiones simultáneas",
      "Panel de administración con CSRF y sesión segura",
      "Sin base de datos ni dependencias",
    ],
    stack: ["HTML", "CSS", "JavaScript", "PHP"],
    snippet: {
      lang: "php",
      filename: "api/lib.php",
      code: `
/** Comensales que ocupan el local a una hora concreta de un día. */
function ocupacion(array $reservas, string $fecha, int $minuto, int $duracion): int
{
    $total = 0;
    foreach ($reservas as $r) {
        if ($r['fecha'] !== $fecha || ($r['estado'] ?? '') === 'cancelada') {
            continue;
        }
        if (abs(aMinutos($r['hora']) - $minuto) < $duracion) {
            $total += (int) $r['personas'];
        }
    }
    return $total;
}`,
    },
    featured: true,
  },
  {
    slug: "portal-inmobiliario",
    title: "Portal inmobiliario",
    client: "Demo · Inmobiliaria",
    year: 2026,
    type: "Web de negocio",
    summary: "Buscador avanzado, favoritos, calculadora de hipoteca y valoración automática de viviendas.",
    problem:
      "Las inmobiliarias pequeñas dependen de los grandes portales y su web propia no capta clientes: no tiene un buscador útil, no se puede compartir una búsqueda ni ofrece nada que haga volver al usuario.",
    solution:
      "Portal con filtros combinables que se guardan en la URL (para compartir búsquedas), favoritos persistentes, ficha de cada vivienda en un modal accesible con hipoteca estimada, calculadora de hipoteca completa y una herramienta de valoración que capta propietarios que quieren vender.",
    highlights: [
      "Filtros sincronizados con la URL",
      "Calculadora de hipoteca con sistema francés",
      "Valoración por mediana de €/m² de la zona",
      "Imágenes SVG generadas por código: carga instantánea",
    ],
    stack: ["HTML", "CSS", "JavaScript"],
    snippet: {
      lang: "js",
      filename: "js/app.js",
      code: `
function hipoteca(precio, entradaPct, anios, tin) {
  const prestamo = precio * (1 - entradaPct / 100);
  const n = anios * 12;
  const r = tin / 100 / 12;
  const cuota = r === 0 ? prestamo / n : (prestamo * r) / (1 - (1 + r) ** -n);
  return {
    prestamo,
    cuota,
    intereses: cuota * n - prestamo,
    ahorro: precio * (entradaPct / 100) + precio * GASTOS_COMPRA,
  };
}`,
    },
    featured: true,
  },
  {
    slug: "fivem-garajes",
    title: "Sistema de garajes para FiveM",
    client: "Demo · Servidores de rol GTA V",
    year: 2026,
    type: "Script FiveM",
    summary: "Garajes y depósito con interfaz NUI propia, compatible con ESX y QBCore y validado en servidor.",
    problem:
      "Muchos scripts de garaje confían en lo que envía el cliente, lo que permite a los tramposos duplicar coches, sacar vehículos ajenos o guardarlos desde cualquier punto del mapa. Además, cada uno funciona solo con un framework.",
    solution:
      "Recurso con una capa de compatibilidad que detecta ESX o QBCore y una arquitectura en la que el servidor valida todo: distancia real del jugador, propiedad del vehículo, matrícula y modelo leídos de la entidad y límite de peticiones. La interfaz NUI muestra el estado de cada vehículo y tiene buscador.",
    highlights: [
      "Validación anti-exploit completa en servidor",
      "Compatible con ESX y QBCore (detección automática)",
      "Depósito que recupera coches destruidos o perdidos",
      "Export para scripts de policía y grúa",
    ],
    stack: ["Lua", "ox_lib", "oxmysql", "HTML", "CSS", "JavaScript"],
    snippet: {
      lang: "lua",
      filename: "server/main.lua",
      code: `
lib.callback.register('aj_garage:store', function(src, id, netId, props)
    local location = Config.Garages[id]
    if not location or not isNear(src, location) then return false end

    local entity = NetworkGetEntityFromNetworkId(netId)
    if GetPedInVehicleSeat(entity, -1) ~= GetPlayerPed(src) then
        return false, L.not_driver
    end

    -- la matrícula se lee del servidor, no de lo que mande el cliente
    local plate = trim(GetVehicleNumberPlateText(entity))
    local vehicle = findVehicle(Bridge.getIdentifier(src), plate)
    if not vehicle then return false, L.not_owner end
    -- …
end)`,
    },
    featured: true,
  },
  {
    slug: "discord-bot",
    title: "Bot de Discord automatizado",
    client: "Demo · Comunidades",
    year: 2026,
    type: "Bot / automatización",
    summary: "Tickets, verificación, automod, niveles, sorteos, encuestas y mensajes programados en un solo bot.",
    problem:
      "Las comunidades de Discord necesitan varios bots distintos para moderar, dar soporte y dinamizar, y aun así el equipo dedica horas a tareas repetitivas como verificar usuarios, responder dudas o lanzar avisos.",
    solution:
      "Bot modular en Node.js con 11 comandos slash y funciones automáticas: automod que detecta variantes de palabras prohibidas y flood, niveles con roles de recompensa, tickets con transcripción, sanciones escalonadas y un planificador que mantiene sorteos, encuestas y recordatorios aunque el bot se reinicie.",
    highlights: [
      "Tickets privados con transcripción automática",
      "Automod con detección de leetspeak y anti-flood",
      "Planificador persistente (sobrevive a reinicios)",
      "Sorteos con aleatoriedad criptográfica",
    ],
    stack: ["Node.js", "JavaScript", "discord.js"],
    snippet: {
      lang: "js",
      filename: "src/features/giveaways.js",
      code: `
/** Elige N ganadores distintos de forma criptográficamente aleatoria (Fisher–Yates) */
function pickWinners(entrants, n) {
  const pool = [...entrants];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}`,
    },
    featured: true,
  },
];
