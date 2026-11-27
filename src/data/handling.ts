// Ficha de venta del menú de handling (antoniooojdev_admincar) para /pruebas-handling (FichaScript.astro).
// Textos del pack «menu-handling» (packs.ts); config, comandos, permisos y tablas sacados del recurso
// (Developer\SCRIPTS - FIVEM\ESX\antoniooojdev_admincar, README y config.lua).
// Para poner el vídeo de un apartado: public/fivem/menu-handling/media/<id>.webm y rellena `video`.
import type { Ficha, FichaModulo, DocSeccion } from "./fichas";

const M = "/fivem/menu-handling/media";

export const handling: Ficha = {
  id: "menu-handling",
  recurso: "antoniooojdev_admincar",
  titulo: "Menú de handling",
  lema: "Cualquier vehículo, ajustado y probado sin salir del juego",
  lead:
    "Un panel de admin para cambiar cómo va cualquier vehículo del servidor sin tocar un handling.meta: potencia, frenos, agarre o suspensión con barras o plantillas, lo pruebas conduciendo con el panel abierto y, al guardar, todos los coches de ese modelo van igual, sin reiniciar nada.",
  // oferta: 25 € tachado → 15 € (-40 %)
  precio: 15,
  precioAntes: 25,
  descuento: 40,
  version: "2.0.0",
  frameworks: ["ESX Legacy", "QBCore", "Qbox"],
  fuertes: ["63 valores del handling", "6 plantillas de un clic", "Se aplica a todos sin reiniciar", "En español e inglés"],
  // contadas en el recurso: shared/handling.lua (63 campos, 9 apartados), web/app.js (6 plantillas),
  // web/themes.css + el de por defecto (9 estilos), config.lua (6 diseños de tarjetas), server/main.lua (4 tablas)
  cifras: [
    { v: 63, l: "valores del handling" },
    { v: 6, l: "plantillas de un clic" },
    { v: 9, l: "apartados del modo avanzado" },
    { v: 9, l: "estilos de panel" },
    { v: 6, l: "diseños de tarjetas" },
    { v: 4, l: "tablas que crea solo" },
  ],
  modulosTitulo: ["Un panel, ", "cualquier vehículo"],
  modulosSub: "Cambias un valor y lo notas al momento en el coche que conduces; cuando te convence, lo guardas para todo el servidor.",
  modulos: [
    {
      id: "ajuste",
      nombre: "Ajuste rápido",
      sub: "Barras y plantillas sobre el de fábrica",
      resumen:
        "Con /admincar se abre el panel sobre el coche en el que vas. Lo básico se ajusta con barras en porcentaje sobre el handling de fábrica, sin saber qué es fTractionCurveMax, o con una plantilla de un clic.",
      funciones: [
        "Barras de potencia, velocidad punta, frenos, agarre, giro, dureza, estabilidad, peso, daño y altura.",
        "Cada barra en porcentaje sobre el de fábrica: 100 % es como sale el coche del juego.",
        "Plantillas de un clic: Confort, Deportivo, Drift, Rally, Todoterreno y Blindado.",
        "Tus propios presets: guardas unos ajustes y los aplicas a otros coches.",
      ],
      video: `${M}/admincar.webm`,
      poster: `${M}/admincar-03.webp`,
      galeria: [{ src: `${M}/admincar-03.webp`, t: "El panel de ajuste rápido abierto sobre el coche" }],
    },
    {
      id: "avanzado",
      nombre: "Modo avanzado",
      sub: "Los 63 valores, uno a uno",
      resumen:
        "Para quien quiere afinar: todos los valores internos del handling, leídos del propio vehículo, ordenados por apartados y con una explicación de qué hace cada uno.",
      funciones: [
        "Apartados: motor, frenos, agarre, suspensión, física, daños, vuelo y barcos.",
        "Buscador por nombre del valor.",
        "Cada valor con su nombre legible y una explicación corta.",
        "Lista de cambios contra el de fábrica, para ver de un vistazo qué has tocado.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "prueba",
      nombre: "Prueba en marcha",
      sub: "Conduces con el panel abierto",
      resumen:
        "Sueltas el ratón y conduces con el panel a la vista. Una tecla vuelve al panel y otra alterna entre tus valores y los de fábrica, para notar la diferencia en la misma curva.",
      funciones: [
        "Conducir con el panel abierto (RePág) y volver a él cuando quieras.",
        "Alternar entre tus cambios y el de fábrica (AvPág).",
        "Telemetría en directo: velocidad, marcha, revoluciones, punta máxima y 0-100 cronometrado.",
        "A pie: eliges cualquier vehículo de la lista y sale uno de prueba con el depósito lleno.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "guardado",
      nombre: "Guardado y reparto",
      sub: "Para todos, sin reiniciar",
      resumen:
        "Lo que tocas es un borrador que solo notas tú. Al guardar, el servidor valida cada valor y el handling nuevo llega en menos de un segundo a cualquiera que conduzca ese modelo.",
      funciones: [
        "Guardado por modelo: si ajustas un sultan, cambian todos los sultan del servidor.",
        "Se mantiene tras reiniciar el servidor, porque queda en la base de datos.",
        "Historial de versiones por modelo: quién guardó qué y cuándo, con un clic para recuperarla.",
        "Deshacer y rehacer (Ctrl+Z / Ctrl+Y) y vuelta a fábrica con confirmación.",
        "Si otro admin guarda el mismo modelo mientras lo editas, te avisa y no te pisa el borrador.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "staff",
      nombre: "Fundadores y staff",
      sub: "Quién puede abrirlo",
      resumen:
        "Dos niveles: los fundadores abren el panel y deciden quién más entra; el staff ajusta y guarda. Se gestiona desde el propio panel o desde la consola, y cada guardado queda registrado.",
      funciones: [
        "Fundadores y staff desde el botón del escudo del panel, por ID o license.",
        "También por consola, por ACE o con los grupos de tu framework.",
        "Registro de acciones de admin con cada guardado.",
        "Sincronizar: vuelve a leer todos los vehículos del servidor, también los addons nuevos.",
      ],
      video: "",
      galeria: [],
    },
  ] as FichaModulo[],
  docs: [
    {
      id: "requisitos",
      t: "Requisitos",
      intro: "Lo mínimo para que arranque. Todo lo demás es opcional.",
      tabla: {
        cols: ["Recurso", "Para qué", ""],
        filas: [
          ["ESX Legacy, QBCore o Qbox", "Jugadores y permisos de admin", "Obligatorio"],
          ["oxmysql", "Base de datos", "Obligatorio"],
          ["Un script de gasolina con SetFuel", "Coches de prueba con el depósito lleno", "Opcional"],
        ],
      },
    },
    {
      id: "instalacion",
      t: "Instalación",
      pasos: [
        "Descarga el recurso desde tu cuenta de Cfx.re (portal.cfx.re › Assets) y copia la carpeta antoniooojdev_admincar en resources. No le cambies el nombre.",
        "Añádelo al server.cfg después del framework y de oxmysql.",
        "Arranca el servidor: las 4 tablas se crean solas, sin importar ningún .sql.",
        "Pon al primer fundador desde la consola con admincar_owner y su ID.",
      ],
      codigo: { lang: "cfg", txt: "ensure oxmysql\nensure es_extended   # o qb-core / qbx_core\nensure antoniooojdev_admincar" },
    },
    {
      id: "permisos",
      t: "Permisos",
      intro: "Los fundadores meten y quitan staff desde el panel (botón del escudo) o desde la consola.",
      tabla: {
        cols: ["Comando de consola", "Qué hace"],
        filas: [
          ["admincar_owner <id o license>", "Lo hace fundador"],
          ["admincar_staff <id o license>", "Lo hace staff"],
          ["admincar_remove <id o license>", "Le quita el acceso"],
          ["admincar_list", "Lista quién tiene acceso"],
        ],
      },
      codigo: { lang: "cfg", txt: "# también por ACE\nadd_ace identifier.license:xxxx admincar.owner allow" },
    },
    {
      id: "teclas",
      t: "Comandos y teclas",
      intro: "Las teclas se cambian en config.lua.",
      tabla: {
        cols: ["Comando / tecla", "Qué hace"],
        filas: [
          ["/admincar", "Abre el panel con tu coche o, a pie, la lista de vehículos"],
          ["RePág", "Volver al panel y recuperar el ratón"],
          ["AvPág", "Alternar entre tus valores y los de fábrica"],
          ["Ctrl+Z · Ctrl+Y", "Deshacer y rehacer"],
          ["ESC", "Cerrar el panel"],
        ],
      },
    },
    {
      id: "configuracion",
      t: "Configuración",
      intro: "Todo está en config.lua, comentado.",
      tabla: {
        cols: ["Opción", "Para qué sirve"],
        filas: [
          ["Config.Command", "Nombre del comando (admincar por defecto)"],
          ["Config.Owners · Config.Groups", "Fundadores por license y grupos que entran sin estar en la lista"],
          ["Config.FocusKey · Config.CompareKey", "Teclas mientras conduces"],
          ["Config.NearDistance", "A pie, distancia para coger el coche más cercano"],
          ["Config.Theme", "Estilo del panel: pista, neón, claro, carbono, esmeralda, oro, synth o cristal"],
          ["Config.Cards", "Diseño de las tarjetas de plantillas"],
          ["Config.CarsFolder", "Carpeta de coches addon que Sincronizar arranca si están parados"],
          ["Config.FuelResource", "Script de gasolina para los coches de prueba"],
        ],
      },
    },
    {
      id: "actualizar",
      t: "Actualizaciones",
      pasos: [
        "Descarga la versión nueva desde Cfx.re.",
        "Guarda tu config.lua y data/presets.json (tus presets).",
        "Sustituye el recurso y vuelve a poner esos dos archivos.",
        "Reinicia el servidor.",
      ],
      nota: "Los handlings guardados, el historial de versiones y los permisos están en la base de datos, así que no se pierden al actualizar.",
    },
    {
      id: "problemas",
      t: "Problemas típicos",
      pasos: [
        "No me deja abrirlo: tienes que ser fundador o staff; compruébalo con admincar_list.",
        "Los demás no notan el cambio: hay que darle a Guardar cambios; el borrador solo lo notas tú.",
        "Un addon no sale en la lista: arráncalo en el servidor y dale a Sincronizar.",
        "Al parar el recurso los coches vuelven a fábrica: es normal; al arrancarlo se aplica otra vez lo guardado.",
      ],
    },
  ] as DocSeccion[],
  faq: [
    { q: "¿Funciona con coches addon?", a: "Sí. El selector lee todos los vehículos que tiene el servidor, también los que has añadido tú, y «Sincronizar» vuelve a leerlos si metes uno nuevo." },
    { q: "¿Hay que reiniciar el servidor al guardar?", a: "No. El cambio llega al momento a todos los jugadores y se mantiene después de reiniciar, porque queda en la base de datos." },
    { q: "¿Puedo volver al handling de fábrica?", a: "Sí, con «Reiniciar ajustes», o recuperando cualquier versión anterior del historial." },
    { q: "¿Funciona con mi framework?", a: "Sí: está disponible para ESX Legacy, QBCore y Qbox, y usa los permisos de admin de cada uno." },
    { q: "¿En qué idioma viene?", a: "En español y en inglés: el panel, los nombres de cada valor y sus explicaciones." },
    { q: "¿Y si algo no funciona?", a: "Escríbeme por el chat de la web o por Discord con el error de la consola y lo miramos." },
  ],
};

// ── Centro propio de la ficha (FichaHandling.astro) ──
// Barras del ajuste rápido y plantillas con los mismos multiplicadores que web/app.js del recurso
// (MACROS.car y TEMPLATES). La altura va en cm (fSuspensionRaise 0.01 = 1 cm, rango ±15 cm).
export type HBarra = { id: string; l: string; d: string; abs?: boolean };
export const handlingBarras: HBarra[] = [
  { id: "power", l: "Potencia", d: "Aceleración" },
  { id: "top", l: "Velocidad punta", d: "Hasta dónde llega en llano" },
  { id: "brake", l: "Frenos", d: "Frena en menos metros" },
  { id: "grip", l: "Agarre", d: "En curva y al acelerar" },
  { id: "steer", l: "Giro del volante", d: "Ángulo de las ruedas" },
  { id: "stiff", l: "Dureza", d: "Muelles y amortiguadores" },
  { id: "roll", l: "Estabilidad", d: "Se inclina menos al girar" },
  { id: "mass", l: "Peso", d: "Gana en choques, acelera peor" },
  { id: "dmg", l: "Daño por choque", d: "Menos = aguanta más" },
  { id: "height", l: "Altura", d: "Negativo = más bajo", abs: true },
];
export type HPlantilla = { id: string; l: string; d: string; v: Record<string, number> };
export const handlingPlantillas: HPlantilla[] = [
  { id: "fabrica", l: "Fábrica", d: "Como sale del juego", v: {} },
  { id: "confort", l: "Confort", d: "Blando y tranquilo", v: { stiff: 0.8, roll: 0.75, brake: 0.95, height: 1 } },
  { id: "sport", l: "Deportivo", d: "Más motor, más agarre", v: { power: 1.2, top: 1.06, brake: 1.2, grip: 1.1, stiff: 1.25, roll: 1.5, height: -3 } },
  { id: "drift", l: "Drift", d: "Suelta la trasera", v: { power: 1.25, grip: 0.8, steer: 1.35 } },
  { id: "rally", l: "Rally", d: "Tierra y saltos", v: { power: 1.1, stiff: 0.8, height: 4 } },
  { id: "offroad", l: "Todoterreno", d: "No pierde fuera del asfalto", v: { power: 1.1, stiff: 0.75, height: 7 } },
  { id: "armored", l: "Blindado", d: "Pesado y duro", v: { mass: 1.8, dmg: 0.35, power: 1.25, brake: 1.15 } },
];
// Una muestra de los 63 valores del modo avanzado (shared/handling.lua: nombre, apartado y explicación).
export const handlingValores: { k: string; g: string; l: string; d: string; cambio?: string }[] = [
  { k: "fInitialDriveForce", g: "Motor", l: "Potencia del motor", d: "Fuerza que empuja el coche. Más alto = acelera más.", cambio: "+20 %" },
  { k: "fInitialDriveMaxFlatVel", g: "Motor", l: "Velocidad punta", d: "Velocidad máxima en llano." },
  { k: "fDriveInertia", g: "Motor", l: "Respuesta del motor", d: "Lo rápido que sube de vueltas." },
  { k: "fClutchChangeRateScaleUpShift", g: "Motor", l: "Rapidez al subir marcha", d: "Más alto = cambios más rápidos." },
  { k: "fBrakeForce", g: "Frenos", l: "Fuerza de frenado", d: "Más alto = frena antes.", cambio: "+20 %" },
  { k: "fHandBrakeForce", g: "Frenos", l: "Freno de mano", d: "Fuerza del freno de mano (derrapes)." },
  { k: "fSteeringLock", g: "Agarre", l: "Giro del volante", d: "Ángulo máximo de las ruedas." },
  { k: "fTractionCurveMax", g: "Agarre", l: "Agarre en curva", d: "Agarre máximo de las ruedas.", cambio: "+10 %" },
  { k: "fLowSpeedTractionLossMult", g: "Agarre", l: "Patinar al arrancar", d: "Más alto = quema más rueda al salir." },
  { k: "fTractionLossMult", g: "Agarre", l: "Pérdida fuera del asfalto", d: "Cuánto agarre pierde en tierra o hierba." },
  { k: "fSuspensionForce", g: "Suspensión", l: "Dureza", d: "Fuerza de los muelles." },
  { k: "fSuspensionRaise", g: "Suspensión", l: "Altura", d: "Negativo = más bajo · positivo = más alto.", cambio: "−3 cm" },
  { k: "fAntiRollBarForce", g: "Suspensión", l: "Barra estabilizadora", d: "Más alto = se inclina menos en curva." },
  { k: "fMass", g: "Física", l: "Masa (kg)", d: "Peso del coche. Afecta a choques y aceleración." },
  { k: "fInitialDragCoeff", g: "Física", l: "Resistencia al aire", d: "Más alto = menos velocidad punta." },
  { k: "fCollisionDamageMult", g: "Daños", l: "Daño por choque", d: "Multiplicador del daño al chocar." },
];
