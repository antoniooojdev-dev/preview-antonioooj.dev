// Ficha de venta del sistema de bandas (antoniooojdev_bandas) para /pruebas-bandas.
// Textos y capturas del pack de /servicios/fivem/sistema-bandas (packs.ts); config, comandos,
// permisos y tablas sacados del recurso (Developer\SCRIPTS - FIVEM\ESX\antoniooojdev_bandas).
// Para poner el vídeo de un módulo: public/fivem/sistema-bandas/media/<id>.webm y rellena `video`.
import type { Ficha } from "./fichas";

const M = "/fivem/sistema-bandas/media";

export const bandas: Ficha = {
  id: "sistema-bandas",
  recurso: "antoniooojdev_bandas",
  titulo: "Sistema de bandas",
  lema: "Tablet encriptada, bases, territorios y golpes en un solo recurso",
  lead:
    "Todo lo de las organizaciones criminales: una tablet encriptada con rangos y permisos a medida, chat cifrado y territorios que se ganan con graffitis; bases en el mundo con almacén, caja fuerte, taquilla y garaje; misiones con NPCs armados para preparar los golpes, y un mercado negro con objetos y vehículos que no vende nadie más.",
  precio: 34.99,
  version: "1.0.0",
  frameworks: ["ESX Legacy", "QBCore", "Qbox"],
  cifras: [
    { v: 9, l: "apartados en la tablet" },
    { v: 7, l: "rangos por banda" },
    { v: 22, l: "permisos a medida" },
    { v: 4, l: "tipos de base" },
    { v: 3, l: "niveles de misión" },
    { v: 16, l: "tablas que crea solo" },
  ],
  modulosTitulo: ["Una tablet, ", "toda la banda"],
  modulosSub: "Todo va junto: el graffiti que pintas da un territorio, el territorio llena la caja fuerte y con ese dinero negro se paga el mercado.",
  youtube: { id: "SV2FrPFin5s", portada: `${M}/portada.webp`, t: "Recorrido completo en el juego" },
  modulos: [
    {
      id: "tablet",
      nombre: "Tablet encriptada",
      sub: "El centro de mando de la banda",
      resumen:
        "Se entra con una tarjeta codificada y un descifrado en la propia tablet. Desde ahí se lleva todo: miembros, rangos, chat cifrado, territorios, misiones, mercado negro y configuración.",
      funciones: [
        "Alta con la tarjeta de acceso: códigos y cables con tiempo; si fallas, la tarjeta se puede quemar.",
        "Inicio con el nombre, la etiqueta y los colores de la banda, sus miembros y sus territorios activos.",
        "El jefe crea hasta 7 rangos, les pone nombre y marca uno a uno lo que puede hacer cada uno.",
        "Chat cifrado de la banda y chats entre organizaciones que se abren compartiendo un código.",
        "Registro de todo lo que pasa en la banda, con buscador y filtros.",
        "Todo en tiempo real: si alguien cambia un rango o escribe, la tablet de los demás se actualiza sola.",
      ],
      video: "",
      galeria: [
        { src: `${M}/inicio.webp`, t: "Inicio de la tablet" },
        { src: `${M}/chat.webp`, t: "Chat cifrado de la banda" },
      ],
    },
    {
      id: "territorios",
      nombre: "Territorios y graffitis",
      sub: "La ciudad, zona a zona",
      resumen:
        "No hay zonas fijas: cada banda las gana pintando un graffiti con el spray. El círculo alrededor es suyo durante tres días y cada media hora deja dinero negro en la caja fuerte.",
      funciones: [
        "Mapa de la ciudad con las zonas de cada banda y su color.",
        "Pintar un graffiti da un territorio de 80 metros durante 3 días reales.",
        "El graffiti de otra banda se tapa con el tuyo y te quedas su zona; con el limpiador se borra.",
        "Cada territorio da dinero negro y reputación cada 30 minutos, directo a la caja fuerte.",
        "Máximo de territorios a la vez por banda, para que nadie se quede con toda la ciudad.",
      ],
      video: "",
      galeria: [
        { src: `${M}/territorios.webp`, t: "Mapa de territorios" },
        { src: `${M}/graffiti.webp`, t: "Graffiti para ganar una zona" },
        { src: `${M}/crew.webp`, t: "La banda en su barrio" },
      ],
    },
    {
      id: "bases",
      nombre: "Bases de la banda",
      sub: "Almacén, caja fuerte, taquilla y garaje",
      resumen:
        "Cada banda pone sus bases donde quiere: almacenes para objetos y armas, cajas fuertes con dinero negro, taquillas con la ropa de cada miembro y garajes para sus vehículos y los personales.",
      funciones: [
        "Se colocan en el mundo con el mueble en fantasma: mover, girar y confirmar con Enter.",
        "Almacén y caja fuerte con casillas como el inventario: arrastrar, pasar todo o la mitad.",
        "Cada almacén lo usa una sola persona a la vez, así nadie duplica objetos.",
        "Taquilla con los conjuntos de ropa de cada miembro.",
        "Garaje con los vehículos de la banda y los personales, con su estado.",
        "Permiso propio por base: el jefe decide qué rangos entran, meten o sacan.",
      ],
      video: "",
      galeria: [
        { src: `${M}/taquilla.webp`, t: "Taquilla de ropa" },
        { src: `${M}/almacen.webp`, t: "Almacén de la banda" },
        { src: `${M}/colocar.webp`, t: "Bases en Mi banda" },
        { src: `${M}/llegada.webp`, t: "Llegada al barrio" },
      ],
    },
    {
      id: "misiones",
      nombre: "Misiones de armamento",
      sub: "Robos medianos, grandes y finales",
      resumen:
        "Antes de cada golpe la banda consigue el equipo: una zona con NPCs armados, refuerzos que llegan en coche si salta la alarma y cajas que hay que hackear. El botín sale de cachear y abrir cajas.",
      funciones: [
        "Tres niveles (medianos, grandes y finales) con más guardias, mejores armas y más cajas.",
        "La zona sale aproximada en el mapa: hay que encontrarla.",
        "Minijuego de hackeo: encadenar la secuencia de códigos de la fila o columna marcada.",
        "Si fallas el hackeo salta la alarma y llegan refuerzos en coche.",
        "El servidor lleva la cuenta de guardias, cajas y botín: nadie repite ni abre lo que no le toca.",
        "Tiempo límite y espera entre misiones por banda.",
      ],
      video: "",
      galeria: [
        { src: `${M}/mision.webp`, t: "Zona de la misión" },
        { src: `${M}/hackeo.webp`, t: "Hackeo de una caja" },
        { src: `${M}/tiroteo.webp`, t: "Tiroteo con los guardias" },
      ],
    },
    {
      id: "mercado",
      nombre: "Mercado negro y atracos",
      sub: "Objetos, vehículos y solicitud de golpes",
      resumen:
        "Desde la tablet se compran objetos y vehículos que no vende nadie más, con entrega en mano en un punto de la ciudad, y se piden los atracos grandes: el contacto llama para confirmarlo.",
      funciones: [
        "Objetos por categorías con reputación mínima, pagados con dinero negro.",
        "Entrega en mano: una furgoneta, un contacto y dos de seguridad en un punto al azar.",
        "Vehículos ocultos de GTA con sus datos, mejoras y vista en 3D del coche de verdad.",
        "Solicitud de atraco con lo que hace falta para cada golpe y llamada del contacto.",
        "Catálogo, precios y reputación editables desde el panel de admin, sin tocar archivos.",
      ],
      video: "",
      galeria: [
        { src: `${M}/vehiculos.webp`, t: "Mercado negro · vehículos" },
        { src: `${M}/items.webp`, t: "Mercado negro · objetos" },
        { src: `${M}/atraco.webp`, t: "Solicitud de atraco" },
        { src: `${M}/llamada.webp`, t: "Llamada del contacto" },
      ],
    },
  ],
  docs: [
    {
      id: "requisitos",
      t: "Requisitos",
      intro: "Lo mínimo para que arranque.",
      tabla: {
        cols: ["Recurso", "Para qué", ""],
        filas: [
          ["ESX Legacy, QBCore o Qbox", "Jugadores, dinero negro, inventario y garajes", "Obligatorio"],
          ["oxmysql", "Base de datos", "Obligatorio"],
          ["Un inventario (ox, qb, ps, qs…)", "Tablet, tarjeta, spray y objetos del mercado", "Recomendado"],
        ],
      },
    },
    {
      id: "instalacion",
      t: "Instalación",
      pasos: [
        "Descarga el recurso desde tu cuenta de Cfx.re (portal.cfx.re › Assets) y copia la carpeta en resources.",
        "Añádelo al server.cfg después del framework y de oxmysql.",
        "Arranca el servidor: las 16 tablas y el catálogo del mercado se crean solos.",
        "Da de alta la primera banda con /crear-banda (nombre, jefe y colores).",
        "Dale al jefe la tablet y la tarjeta con /bandas-tarjeta y que entre al sistema.",
      ],
      codigo: { lang: "cfg", txt: "ensure oxmysql\nensure es_extended   # o qb-core / qbx_core\nensure antoniooojdev_bandas" },
    },
    {
      id: "configuracion",
      t: "Configuración",
      intro: "Lo que se puede cambiar queda abierto y comentado en español.",
      tabla: {
        cols: ["Archivo", "Qué se cambia"],
        filas: [
          ["config.lua", "Objetos, rangos y permisos de partida, colores, territorios, mercado, entregas, atracos y tecla F7"],
          ["kits.lua", "Equipo que sale en las misiones de armamento"],
          ["data/misiones.json", "Zonas de las misiones (se colocan con /misionpunto)"],
        ],
      },
      codigo: { lang: "lua", txt: "Config.Graffiti = {\n    radius   = 80.0,       -- metros del territorio\n    duration = 3 * 86400,  -- dura 3 días\n    max      = 5,          -- territorios a la vez\n    income   = 1500,       -- dinero negro por cobro\n}\nConfig.IncomeEvery = 30    -- minutos entre cobros" },
    },
    {
      id: "comandos",
      t: "Comandos y teclas",
      intro: "Las teclas se pueden cambiar en Ajustes › Teclas › FiveM.",
      tabla: {
        cols: ["Comando / tecla", "Qué hace", "Quién"],
        filas: [
          ["F7 · /menubanda", "Menú de la banda en la calle", "Miembros"],
          ["/crear-banda", "Dar de alta una banda: nombre, jefe y colores", "Staff"],
          ["/bandas-tarjeta [id]", "Dar la tablet y la tarjeta de acceso", "Staff"],
          ["/misionpunto", "Guardar zonas de misión donde estás", "Staff"],
        ],
      },
    },
    {
      id: "permisos",
      t: "Permisos por rango",
      intro: "Cada banda empieza con 5 rangos y estos mínimos; luego el jefe los cambia desde la tablet.",
      tabla: {
        cols: ["Acción", "Rango mínimo"],
        filas: [
          ["Mercado, almacén y entrar en las bases", "Novato (1)"],
          ["Pintar graffitis · sacar vehículos", "Miembro (2)"],
          ["Invitar · misiones · atracos · mensaje del día · registro", "Veterano (3)"],
          ["Expulsar · ascender · sacar dinero · chats con otras bandas", "Mano derecha (4)"],
          ["Cambiar el logo de la banda", "Jefe (5)"],
        ],
      },
    },
    {
      id: "actualizar",
      t: "Actualizaciones",
      pasos: [
        "Descarga la versión nueva desde Cfx.re.",
        "Guarda tu config.lua, tu kits.lua y la carpeta data.",
        "Sustituye el recurso y vuelve a ponerlos.",
        "Reinicia el servidor: la base de datos se actualiza sola.",
      ],
      nota: "El código del servidor y del cliente va cifrado con el escrow de FiveM; la configuración y los datos quedan abiertos.",
    },
  ],
  faq: [
    { q: "¿Funciona con mi framework?", a: "Sí: está disponible para ESX Legacy, QBCore y Qbox." },
    { q: "¿Cómo lo recibo?", a: "Al comprar, el recurso aparece en tu cuenta de Cfx.re (portal.cfx.re › Assets). Lo descargas de ahí y lo instalas en tu servidor." },
    { q: "¿Los jugadores pueden crear su propia banda?", a: "No: las da de alta el staff con /crear-banda o desde el panel de admin, para que las bandas sean parte del rol del servidor." },
    { q: "¿Se puede cambiar el catálogo del mercado negro?", a: "Sí, desde el panel de admin: objetos, vehículos, precios y reputación necesaria, sin tocar archivos." },
    { q: "¿Necesito un mapeado o un MLO?", a: "No. Las bases se colocan donde quiera cada banda, en cualquier interior o exterior del mapa." },
    { q: "¿Y si algo no funciona?", a: "Escríbeme por el chat de la web o por Discord con el error de la consola y lo miramos." },
  ],
};
