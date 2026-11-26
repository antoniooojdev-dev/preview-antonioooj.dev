// Ficha de venta del script de policía (antoniooojdev_police) para /servicios/fivem/policia y /pruebas-fivem (FichaScript.astro).
// Los datos salen de la copia de venta (Developer\tebex\antoniooojdev_police): config, comandos,
// permisos y tablas. Vídeo y capturas de la app SAPD grabados de sapd.html?demo=1; los módulos
// sin vídeo todavía llevan video: "" y la página enseña el hueco «vídeo en grabación».
// Para poner un vídeo: guárdalo en public/fivem/policia/media/<id>.webm y rellena `video`.

const M = "/fivem/policia/media";

import type { Ficha, FichaModulo, DocSeccion } from "./fichas";

export const policia: Ficha = {
  id: "policia-sapd",
  recurso: "antoniooojdev_police",
  titulo: "Sistema de Policía SAPD",
  lema: "MDT, central, calle y comisaría en un solo recurso",
  lead:
    "Todo lo que necesita una policía de rol: una tablet MDT con fichas, informes, multas y órdenes; la central con mapa en vivo, radio y avisos; un menú F7 para la calle; comisarías con recepción, armería y prisión; y una app SAPD para que los ciudadanos paguen multas y vean sus documentos.",
  // oferta de lanzamiento: -30 % sobre el precio de antes (sale tachado)
  precio: 50,
  precioAntes: 71.43,
  descuento: 30,
  nuevo: true,
  version: "2.0.4",
  frameworks: ["ESX Legacy", "QBCore", "Qbox"],
  fuertes: ["Tablet MDT completa", "17 rangos y 10 divisiones", "Central con mapa en vivo", "App SAPD para ciudadanos"],
  modulosTitulo: ["Cinco partes, ", "un solo recurso"],
  modulosSub: "Todo comparte datos: la multa que pones en la calle aparece en la tablet y en el móvil del ciudadano.",
  cifras: [
    { v: 17, l: "rangos de serie" },
    { v: 10, l: "divisiones" },
    { v: 28, l: "permisos por rango" },
    { v: 27, l: "cámaras de seguridad" },
    { v: 62, l: "objetos para la calle" },
    { v: 30, l: "tablas que crea solo" },
  ],
  modulos: [
    {
      id: "mdt",
      nombre: "Tablet MDT",
      sub: "El centro de trabajo del agente",
      resumen:
        "Se abre con el objeto tablet y solo funciona de servicio. Desde ahí se busca a cualquier ciudadano o vehículo, se escriben informes, se ponen multas y órdenes de búsqueda y se gestiona el cuerpo entero.",
      funciones: [
        "Fichas de ciudadanos con foto, licencias, multas, antecedentes y notas.",
        "Búsqueda de vehículos por matrícula, con marcas de robado o buscado.",
        "Informes con agentes implicados, personas, pruebas y texto que se guarda solo; se pueden proteger por rango o por agente.",
        "Multas con el código penal editable: artículos, capítulos y cuantías.",
        "Órdenes de búsqueda, deudores y retirada o concesión de licencias.",
        "Gestión del SAPD: rangos, divisiones, condecoraciones, plantilla y registro de acciones.",
        "Entrada con placa y contraseña y pantallas de entrar y salir de servicio.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "central",
      nombre: "Central y radio",
      sub: "Mapa en vivo, avisos y comunicación",
      resumen:
        "La central enseña a cada agente en el mapa con su indicativo y su estado. Los avisos del 911 y los disparos entran solos, se asignan a unidades y la radio va por grupos y códigos.",
      funciones: [
        "Mapa con las unidades en tiempo real, indicativo (ADAM, LINCOLN, MARY…), color e icono.",
        "Estados del agente: disponible, ocupado, en camino, en escena…",
        "Avisos del 911 y alertas automáticas de disparos con su zona en el mapa.",
        "Grupos de radio, frecuencias y códigos rápidos sin esperas.",
        "Comunicados internos a todo el cuerpo y nivel de alerta DEFCON de la ciudad.",
        "Cámaras de seguridad de bancos, joyería y comercios, y bodycams de los agentes en directo.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "calle",
      nombre: "Menú F7 y calle",
      sub: "Todo lo que se hace fuera de la comisaría",
      resumen:
        "Con F7 el agente tiene a mano las acciones con ciudadanos y vehículos, los objetos para cortar calles y el control del tráfico. Las pruebas que quedan en la escena se recogen y se analizan.",
      funciones: [
        "Esposar, cachear, escoltar, meter en el coche, identificar y multar en el sitio.",
        "Incautar vehículos y controlar el tráfico de la zona (parar o desviar NPCs).",
        "62 objetos para colocar: conos, vallas, focos, controles… con su posición a mano.",
        "Radar de tráfico en el coche: velocidad, matrícula, límite propio y bloqueo automático.",
        "Pruebas en la escena: casquillos y sangre que se ven con la linterna y se analizan en la tablet.",
        "Bean bag, gas y sirenas propias.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "comisaria",
      nombre: "Comisarías",
      sub: "Recepción, armería, garaje y prisión",
      resumen:
        "Cada comisaría tiene una recepción con un agente NPC que atiende a los ciudadanos, armería por rangos, garaje con la flota y traslado a la prisión con su condena.",
      funciones: [
        "Agente de recepción que habla con los ciudadanos y les da copias del DNI y del carnet.",
        "Armería con equipos por rango mínimo: patrulla, chaleco, escopeta…",
        "Garaje con la flota del cuerpo y fotos de cada patrulla hechas en el juego.",
        "Prisión con condena en meses, traslado en autobús y recinto del que no se puede salir.",
        "Comisarías, puntos y estaciones gestionados desde la tablet, sin tocar archivos.",
      ],
      video: "",
      galeria: [],
    },
    {
      id: "sapd",
      nombre: "App SAPD",
      sub: "La policía vista por el ciudadano",
      resumen:
        "Una app para el móvil del jugador: ve el nivel de alerta de la ciudad, paga sus multas desde el banco, consulta sus documentos, lee el código penal y encuentra la comisaría más cercana.",
      funciones: [
        "Inicio con el nivel DEFCON, multas pendientes, licencias en vigor y últimos avisos.",
        "Multas pendientes y pagadas, con pago desde la cuenta del banco.",
        "Documentos y licencias del jugador, y códigos que da el agente para tramitarlos.",
        "Código penal con buscador por artículo o delito.",
        "Comisarías con ruta en el mapa.",
      ],
      video: `${M}/sapd.webm`,
      poster: `${M}/sapd-poster.webp`,
      galeria: [
        { src: `${M}/sapd-home.webp`, t: "Inicio: nivel de alerta, multas, licencias y avisos" },
        { src: `${M}/sapd-fines.webp`, t: "Multas pendientes con pago desde el banco" },
        { src: `${M}/sapd-licenses.webp`, t: "Documentos y licencias del jugador" },
        { src: `${M}/sapd-defcon.webp`, t: "Nivel de alerta DEFCON de la ciudad" },
        { src: `${M}/sapd-stations.webp`, t: "Comisarías con ruta en el mapa" },
        { src: `${M}/sapd-notifs.webp`, t: "Avisos de la policía al ciudadano" },
      ],
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
          ["ESX Legacy, QBCore o Qbox", "Trabajo, dinero, inventario y jugadores", "Obligatorio"],
          ["oxmysql", "Base de datos", "Obligatorio"],
          ["Un inventario (ox, qb, ps, qs…)", "Objeto tablet y equipo de la armería", "Recomendado"],
          ["Un móvil con apps", "App SAPD para los ciudadanos", "Opcional"],
        ],
      },
    },
    {
      id: "instalacion",
      t: "Instalación",
      pasos: [
        "Descarga el recurso desde tu cuenta de Cfx.re (portal.cfx.re › Assets) y copia la carpeta en resources.",
        "Añádelo al server.cfg después del framework y de oxmysql.",
        "Arranca el servidor: las 30 tablas se crean solas y se ajustan a la codificación de tu base de datos.",
        "Si el trabajo police tiene los 5 rangos de serie, se cambian solos por los 17 del SAPD.",
        "El objeto tablet se registra solo. Dáselo a un agente y ábrelo estando de servicio.",
      ],
      codigo: { lang: "cfg", txt: "ensure oxmysql\nensure es_extended   # o qb-core / qbx_core\nensure antoniooojdev_police" },
    },
    {
      id: "configuracion",
      t: "Configuración",
      intro: "Todo lo que se puede cambiar está en la carpeta shared, sin cifrar y comentado en español.",
      tabla: {
        cols: ["Archivo", "Qué se cambia"],
        filas: [
          ["shared/config.lua", "Trabajo, divisiones, permisos, radio, avisos, objetos, tráfico y licencias"],
          ["shared/config_extras.lua", "Cámaras, pruebas, prisión, armería y radar"],
          ["shared/config_reception.lua", "Agente de recepción: modelo, nombre, saludo y puntos"],
          ["shared/config_stations.lua", "Comisarías, garajes y flota"],
          ["shared/sapd_config.lua", "Niveles DEFCON y comisarías de la app SAPD"],
          ["web/config.js", "Mapa de la central e imágenes del inventario"],
        ],
      },
    },
    {
      id: "comandos",
      t: "Comandos y teclas",
      intro: "Las teclas se pueden cambiar en Ajustes › Teclas › FiveM.",
      tabla: {
        cols: ["Comando / tecla", "Qué hace", "Quién"],
        filas: [
          ["F7 · /policemenu", "Menú policial de calle", "Agentes"],
          ["/disponible", "Marcarse disponible en la central", "Agentes"],
          ["F9 · /radarpolicial", "Encender y apagar el radar del coche", "Agentes"],
          ["F5 · /radarbloquear", "Congelar o soltar la lectura del radar", "Agentes"],
          ["/radarlimite 20-250", "Cambiar el límite del radar", "Agentes"],
          ["/colocarrecepcion", "Colocar el agente de recepción donde estás", "Staff"],
          ["/prisionpos", "Guardar la posición de la prisión", "Staff"],
        ],
      },
    },
    {
      id: "permisos",
      t: "Permisos por rango",
      intro: "Cada acción pide un rango mínimo. Se cambian en Config.Permissions.",
      tabla: {
        cols: ["Acción", "Rango mínimo"],
        filas: [
          ["Crear informes, multas y órdenes", "Cadete (0)"],
          ["Cerrar órdenes · analizar ADN", "Oficial I (1)"],
          ["Retirar y conceder licencias · comunicados", "Sargento I (5)"],
          ["Borrar informes · gestionar agentes · condecoraciones", "Teniente I (10)"],
          ["Editar código penal · rangos · divisiones · DEFCON", "Capitán I (12)"],
        ],
      },
      codigo: { lang: "lua", txt: "Config.Permissions = {\n    ['reports.create'] = 0,\n    ['licenses.revoke'] = 5,\n    ['penal.edit']     = 12,\n}" },
    },
    {
      id: "actualizar",
      t: "Actualizaciones",
      pasos: [
        "Descarga la versión nueva desde Cfx.re.",
        "Guarda tu carpeta shared y tu carpeta data.",
        "Sustituye el recurso y vuelve a poner esas dos carpetas.",
        "Reinicia el servidor: la base de datos se actualiza sola.",
      ],
      nota: "El código del servidor y del cliente va cifrado con el escrow de FiveM; la configuración y los datos quedan abiertos.",
    },
  ] as DocSeccion[],
  faq: [
    { q: "¿Funciona con mi framework?", a: "Sí: está disponible para ESX Legacy, QBCore y Qbox." },
    { q: "¿Cómo lo recibo?", a: "Al comprar, el recurso aparece en tu cuenta de Cfx.re (portal.cfx.re › Assets). Lo descargas de ahí y lo instalas en tu servidor." },
    { q: "¿Puedo cambiar textos, rangos y precios?", a: "Sí. La configuración está abierta y comentada, y rangos, divisiones, código penal y comisarías se cambian desde la propia tablet." },
    { q: "¿Viene con mapeado? ¿Es solo para Mission Row?", a: "No trae mapeado ni está atado a Mission Row: se adapta a cualquier comisaría de tu servidor, sea del juego base o un MLO. Colocas recepción, armería, vestuario y celdas desde la tablet, sin tocar código." },
    { q: "¿Y si algo no funciona?", a: "Escríbeme por el chat de la web o por Discord con el error de la consola y lo miramos." },
  ],
};
