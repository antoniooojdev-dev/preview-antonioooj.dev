// ─────────────────────────────────────────────────────────────
//  Packs de scripts FiveM (/servicios/fivem/<id>). Se enseñan en
//  /servicios/fivem («Packs») y cada uno tiene su página con demos
//  jugables, vídeos y capturas de public/fivem/<id>/.
//  Las demos son la NUI real del script; ver tools/README-fivem-live.md.
// ─────────────────────────────────────────────────────────────

export interface PackShot {
  src: string;
  t: string;
}

export interface PackScript {
  id: string;
  nombre: string;
  recurso: string;
  icono: string;
  sub: string;
  resumen: string;
  /** Para la tarjeta de «qué incluye» */
  claves: string[];
  /** Lista completa en «desarrollo» */
  funciones: string[];
  desarrollo: string[];
  cifras: { v: string; l: string }[];
  /** vídeo del script; vacío = solo la captura (poster) */
  video: string;
  poster: string;
  galeria: PackShot[];
  /** demo jugable; sin ella el script no sale en «pruébalo tú» ni lleva botones de probar */
  demo?: { url: string; titulo: string; pasos: string[]; /** nota bajo los pasos; sin ella, la de las teclas */ nota?: string };
}

export interface Pack {
  id: string;
  titulo: string;
  icono: string;
  color: string;
  lead: string;
  resumen: string;
  chips: string[];
  scripts: PackScript[];
  /** vídeo grande de cabecera; sin él sale el reproductor «próximamente» */
  video?: string;
  /** texto junto a «scripts fivem» en la cabecera; sin él, «N recursos» */
  etiqueta?: string;
  /** id de un vídeo de YouTube para la cabecera (al darle al play se ve ahí mismo, entero); va antes que video */
  youtube?: string;
  /** portada del vídeo de YouTube antes de darle al play */
  youtubePortada?: string;
  encajan: { t: string; d: string; icono: string }[];
  tecnico: { t: string; d: string; icono: string }[];
  faq: { q: string; a: string }[];
  /** títulos de «qué incluye» y «cómo encajan»: [texto, parte resaltada] */
  incluyeTitulo?: [string, string];
  encajanTitulo?: [string, string];
  /** pie del vídeo grande, texto bajo «pruébalo tú» y fondo del botón «Cargar la demo» */
  videoTexto?: string;
  playSub?: string;
  portadaDemo?: string;
}

const M = "/fivem/pack-vehiculos/media";
const H = "/fivem/menu-handling/media";
const BD = "/fivem/sistema-bandas/media";

export const fivemPacks: Pack[] = [
  {
    id: "pack-vehiculos",
    titulo: "Pack vehículos",
    icono: "car",
    color: "#a855f7",
    lead: "Todo lo que pasa alrededor de un coche en un servidor de rol: comprarlo hablando con un vendedor, repostarlo en cualquier gasolinera y conducirlo con un velocímetro propio y cinturón de seguridad.",
    resumen: "Concesionario con vendedor, gasolinera con manguera de verdad y velocímetro con cinturón. Tres scripts con interfaz propia que se entienden entre ellos.",
    chips: ["3 scripts", "ESX Legacy", "Interfaces NUI propias", "Validado en servidor", "En español"],
    scripts: [
      {
        id: "dealer",
        nombre: "Concesionario",
        recurso: "my_dealership",
        icono: "car",
        sub: "Premium Deluxe Motorsport, con vendedor",
        resumen:
          "Hablas con Marcos, el vendedor, que te aconseja según lo que buscas y lo que te puedes permitir. Luego eliges en la exposición: el coche aparece en la plataforma, lo giras, le cambias el color y lo compras.",
        claves: ["Vendedor que aconseja con datos reales", "Exposición con giro, zoom y 12 colores", "Compra validada en el servidor", "Contrato de compraventa en el inventario"],
        funciones: [
          "Vendedor con conversación escrita a máquina y respuestas con las teclas 1-4.",
          "Consejos por lo que buscas (velocidad, curvas, aceleración, frenada, campo, motos o plazas) y por presupuesto, con un top 5 comparado.",
          "Catálogo por categorías con el precio «desde», buscador y orden por precio, velocidad, aceleración, manejo o frenada.",
          "El coche se ve en la exposición: gira con A/D o arrastrando, zoom con la rueda y cambio de color al momento.",
          "Estadísticas leídas del propio juego y comparadas con todo el catálogo, con un comentario del vendedor para cada coche.",
          "Comprar es un clic para armar la compra y mantener pulsado para confirmar: nadie compra un superdeportivo sin querer.",
          "El servidor cobra del banco y, si no llega, en efectivo; asigna matrícula única y número de bastidor, y el coche queda registrado para los garajes.",
          "Contrato de compraventa en el inventario, con firma, sello y código de barras, que se puede enseñar a otro jugador.",
        ],
        desarrollo: [
          "El concesionario que trae ESX es una lista de menús: eliges un coche de un texto y aparece. Lo cambié por una experiencia de rol: entras, hablas con un vendedor y miras los coches en una exposición, como en un concesionario de verdad.",
          "Las estadísticas no están escritas a mano: el juego da la velocidad, aceleración, frenada y manejo de cada modelo, y la interfaz las compara con todo el catálogo para que las barras signifiquen algo. Con esos mismos datos el vendedor te recomienda coches y comenta el que estás mirando.",
          "Todo lo importante pasa en el servidor: el precio sale de su propia lista (el cliente no puede tocarlo), se comprueba que estés en el concesionario, que tengas saldo y que la matrícula esté libre. Si algo falla por el camino, el dinero vuelve a tu cuenta.",
        ],
        cifras: [
          { v: "554", l: "vehículos en el catálogo" },
          { v: "7", l: "tipos de consejo" },
          { v: "12", l: "colores de serie" },
        ],
        video: `${M}/dealer.webm`,
        poster: `${M}/dealer-05-detalle.webp`,
        galeria: [
          { src: `${M}/dealer-02-chat.webp`, t: "Marcos te recibe por tu nombre y según la hora del día" },
          { src: `${M}/dealer-03-consejo.webp`, t: "Consejo por velocidad punta: top 5 con sus datos" },
          { src: `${M}/dealer-04-categorias.webp`, t: "Catálogo por categorías con el precio de partida" },
          { src: `${M}/dealer-05-detalle.webp`, t: "Ficha del coche, estadísticas y color en la exposición" },
          { src: `${M}/dealer-06-confirmar.webp`, t: "Compra en dos pasos: clic y mantener para confirmar" },
          { src: `${M}/dealer-07-comprado.webp`, t: "Aviso de compra con la matrícula asignada" },
        ],
        demo: {
          url: "/fivem/pack-vehiculos/live/dealer/",
          titulo: "Compra un coche",
          pasos: ["Pulsa E para hablar con Marcos", "Pídele un consejo o abre el catálogo", "Gira el coche, cambia el color y mantén «Comprar»"],
        },
      },
      {
        id: "fuel",
        nombre: "Gasolinera",
        recurso: "my_fuel",
        icono: "fuel",
        sub: "Repostaje con manguera en cualquier surtidor",
        resumen:
          "Coges la manguera del surtidor, la llevas hasta el depósito y eliges cuánto echar y cómo pagar. El repostaje va en tiempo real y al terminar te dan el ticket.",
        claves: ["Funciona en todos los surtidores del mapa", "Manguera que se suelta si te alejas", "Pago por adelantado con devolución", "Consumo realista y sincronizado"],
        funciones: [
          "Funciona en todos los surtidores del mapa: se detectan por su modelo, sin coordenadas que mantener.",
          "Manguera física: la coges, la llevas hasta el depósito y queda unida al surtidor con un cable. Si te alejas o arrancas el coche, se suelta.",
          "Menú del surtidor con el depósito de ahora y cómo quedará, litros con botones (mantén para ir más rápido), atajos de 10, 20, 30 o lleno, o escribiéndolos.",
          "Pago en efectivo o con tarjeta. Se cobra por adelantado y el servidor devuelve lo que no entre.",
          "Repostaje en tiempo real con barra de progreso; con X paras cuando quieras y pagas solo lo echado.",
          "Consumo según revoluciones y tipo de vehículo; con el depósito vacío el motor se apaga.",
          "La gasolina se sincroniza para todos los jugadores y se guarda con el coche en el garaje.",
        ],
        desarrollo: [
          "La mayoría de scripts de gasolina son una barra que sube mientras mantienes una tecla. Quería que repostar fuese una pequeña escena: la manguera se coge, se lleva y se enchufa, y el coche se queda conectado al surtidor mientras echas gasolina.",
          "El dinero nunca se calcula en el cliente. Al confirmar, el servidor cobra los litros pedidos al precio configurado; al terminar, el cliente le dice cuánto ha entrado de verdad y el servidor devuelve la diferencia, con un tope para que no se pueda pedir más de lo pagado.",
          "El nivel de gasolina se guarda en el propio vehículo y se comparte con todos los jugadores, así que el velocímetro, los garajes y cualquier otro script leen siempre el mismo valor.",
        ],
        cifras: [
          { v: "$2/L", l: "precio, configurable" },
          { v: "3,5 L/s", l: "caudal del surtidor" },
          { v: "7,5 m", l: "largo de la manguera" },
        ],
        video: `${M}/fuel.webm`,
        poster: `${M}/fuel-03-surtidor.webp`,
        galeria: [
          { src: `${M}/fuel-01-coger.webp`, t: "Al acercarte al surtidor, aviso arriba para coger la manguera" },
          { src: `${M}/fuel-02-manguera.webp`, t: "Con la manguera en la mano, la llevas al depósito" },
          { src: `${M}/fuel-03-surtidor.webp`, t: "Menú del surtidor: litros, depósito antes y después y forma de pago" },
          { src: `${M}/fuel-04-repostando.webp`, t: "Repostaje en tiempo real (X para parar)" },
          { src: `${M}/fuel-05-ticket.webp`, t: "Ticket final con litros, forma de pago e importe" },
        ],
        demo: {
          url: "/fivem/pack-vehiculos/live/fuel/",
          titulo: "Llena el depósito",
          pasos: ["Pulsa E para coger la manguera y otra vez para enchufarla", "Elige los litros y cómo pagar", "Mira cómo se llena (X para parar) y deja la manguera"],
        },
      },
      {
        id: "speedo",
        nombre: "Velocímetro y cinturón",
        recurso: "my_speedo",
        icono: "gauge",
        sub: "Velocímetro propio con cinturón de seguridad",
        resumen:
          "Un velocímetro limpio con velocidad, marcha, gasolina y estado del motor, y un cinturón de seguridad que sirve para algo: sin él, un choque fuerte te saca por el parabrisas.",
        claves: ["Velocidad, marcha, gasolina y motor", "Cinturón con la tecla B", "Sales despedido sin cinturón", "Avisos que se ven sin estorbar"],
        funciones: [
          "Velocidad animada con suavidad, línea de velocidad y aviso de alta velocidad.",
          "Marcha actual con indicador de marchas; la marcha atrás se distingue al momento.",
          "Gasolina en litros (lee la gasolinera del pack, y también LegacyFuel u ox_fuel) y aviso en rojo cuando entras en reserva.",
          "Estado del motor por colores (bien, regular, averiado) con su porcentaje.",
          "Cinturón con la tecla B: el aviso se pone en rojo si vas rápido sin él y se pliega con una animación al abrochártelo.",
          "Con el cinturón puesto no puedes bajarte del coche; el velocímetro te lo recuerda.",
          "Sin cinturón y a más de 55 km/h, un choque te saca por el parabrisas.",
          "Solo lo ve quien conduce y se esconde fuera del vehículo o con el menú de pausa abierto.",
        ],
        desarrollo: [
          "El velocímetro redondo del HUD de ESX ocupaba mucho y no decía nada de la gasolina ni del motor. Lo sustituí por una tarjeta compacta en la esquina, con la información que de verdad miras mientras conduces.",
          "El servidor no tenía cinturón, así que lo añadí en este mismo script: se pone con B, bloquea la salida del coche mientras lo llevas y, si chocas fuerte sin él, sales despedido. El aviso cambia según la situación para que se entienda sin leerlo.",
          "El choque se detecta por la caída brusca de velocidad al colisionar, no con un temporizador. Y el juego manda los datos a la interfaz cada 80 ms: ella anima la velocidad por su cuenta, así que se ve fluida sin cargar el cliente en cada fotograma.",
        ],
        cifras: [
          { v: "B", l: "tecla del cinturón" },
          { v: "55 km/h", l: "para salir despedido" },
          { v: "3", l: "estados del motor" },
        ],
        video: `${M}/speedo.webm`,
        poster: `${M}/speedo-03-velocidad.webp`,
        galeria: [
          { src: `${M}/speedo-01-sin-cinturon.webp`, t: "Sin cinturón a más de 30 km/h, el aviso se pone en rojo" },
          { src: `${M}/speedo-02-cinturon.webp`, t: "Al abrochártelo, la correa se anima y el aviso se pliega" },
          { src: `${M}/speedo-03-velocidad.webp`, t: "Velocidad, marcha, gasolina y estado del motor" },
          { src: `${M}/speedo-04-no-bajar.webp`, t: "Con el cinturón puesto no te puedes bajar" },
          { src: `${M}/speedo-05-despedido.webp`, t: "Choque sin cinturón: sales por el parabrisas" },
          { src: `${M}/speedo-06-averiado.webp`, t: "Motor averiado y depósito en reserva" },
        ],
        demo: {
          url: "/fivem/pack-vehiculos/live/speedo/",
          titulo: "Conduce",
          pasos: ["Mantén W para acelerar y S para frenar", "Pulsa B para el cinturón y F para intentar bajarte", "Pulsa C para chocar, con y sin cinturón"],
        },
      },
    ],
    encajan: [
      { t: "Del concesionario al garaje", icono: "key", d: "El coche comprado queda registrado a tu nombre con su matrícula: lo guardas y lo sacas en cualquier garaje." },
      { t: "Una sola gasolina", icono: "fuel", d: "La gasolinera guarda el nivel en el vehículo y el velocímetro lo lee de ahí: lo que echas es lo que ves." },
      { t: "Cinturón en el velocímetro", icono: "belt", d: "El cinturón vive en el velocímetro: el aviso, la tecla y salir despedido van juntos." },
      { t: "Papeles en regla", icono: "document", d: "El contrato de compraventa va al inventario y se puede guardar en la carpeta de documentos del jugador." },
    ],
    tecnico: [
      { t: "ESX Legacy + oxmysql", icono: "layers", d: "Usan el framework, las cuentas y el inventario de ESX. Sin dependencias de pago." },
      { t: "Validación en servidor", icono: "shield", d: "Precios, saldos, distancias y devoluciones se calculan en el servidor, nunca en el cliente." },
      { t: "Interfaces NUI propias", icono: "monitor", d: "HTML, CSS y JavaScript sin librerías: ligeras, animadas y fáciles de cambiar de estilo." },
      { t: "Configurable", icono: "sliders", d: "Precios, catálogo, colores, teclas, caudal y umbrales en archivos config.lua comentados." },
      { t: "En español", icono: "message", d: "Textos, avisos y documentos escritos para jugadores hispanohablantes." },
      { t: "Hechos sobre un servidor real", icono: "server", d: "Desarrollados sobre un servidor ESX Legacy de pruebas, con sus garajes, inventario y HUD." },
    ],
    faq: [
      { q: "¿Lo que pruebo en la web es el script de verdad?", a: "La interfaz sí: es la misma del juego, copiada tal cual. Lo que está simulado en el navegador es el «juego» de alrededor (el coche, el surtidor, la carretera) y las respuestas del servidor." },
      { q: "¿Se pueden instalar por separado?", a: "Sí. Cada script funciona solo; juntos se integran (la gasolina se ve en el velocímetro y el coche comprado aparece en los garajes)." },
      { q: "¿Funciona con QBCore?", a: "Están hechos para ESX Legacy. La adaptación a QBCore u otro framework se presupuesta aparte." },
      { q: "¿Puedo cambiar el estilo y los textos?", a: "Sí: la interfaz es HTML y CSS, y los precios, colores, teclas y textos están en la configuración." },
    ],
  },
  {
    id: "menu-handling",
    titulo: "Menú de handling",
    icono: "sliders",
    color: "#a855f7",
    lead: "Un panel de admin para cambiar cómo va cualquier vehículo del servidor sin tocar un handling.meta: potencia, frenos, agarre o suspensión con barras, lo pruebas conduciendo y lo guardas para todos los coches de ese modelo.",
    resumen: "/admincar abre un editor de handling dentro del juego: eliges el vehículo, lo ajustas con plantillas o valor a valor, lo pruebas al momento y, al guardar, se aplica a todos sin reiniciar el servidor.",
    chips: ["/admincar", "ESX Legacy", "QBCore", "Qbox", "Interfaz NUI propia", "Sin reiniciar el servidor", "En español"],
    incluyeTitulo: ["Un panel, ", "cualquier vehículo"],
    encajanTitulo: ["Pensado para ", "el staff"],
    videoTexto: "Admincar · Panel de admin, grabado en el juego.",
    video: `${H}/admincar.webm`,
    scripts: [
      {
        id: "admincar",
        nombre: "Admincar",
        recurso: "antoniooojdev_admincar",
        icono: "sliders",
        sub: "Editor de handling para el staff",
        resumen:
          "Con /admincar se abre el panel sobre el coche en el que vas (o el más cercano). Lo ajustas con barras en porcentaje sobre el de fábrica, sueltas el ratón para conducirlo con el panel abierto y, al guardar, todos los coches de ese modelo van igual.",
        claves: ["Cualquier vehículo del servidor, también addons", "Ajuste rápido con plantillas o valor a valor", "Lo pruebas conduciendo y comparas con fábrica", "Guardado por modelo, con historial de versiones"],
        funciones: [
          "Selector con todos los vehículos del servidor, incluidos los addons: buscador por nombre o ID de spawneo y filtros por tipo (coches, motos, barcos, helicópteros, trabajo…).",
          "Ajuste rápido con barras en porcentaje sobre el de fábrica: potencia, velocidad punta, frenos, agarre, giro, dureza, estabilidad, peso, daño y altura.",
          "Plantillas de un clic: Confort, Deportivo, Drift, Rally, Todoterreno y Blindado.",
          "Modo avanzado con los 63 valores del handling por apartados (motor, frenos, agarre, suspensión, física, daños, vuelo y barcos), con buscador y explicación de cada uno.",
          "Telemetría en directo: velocidad, marcha, revoluciones, punta máxima y 0-100 cronometrado.",
          "Conducir con el panel abierto (RePág) y alternar entre tus cambios y el de fábrica (AvPág) para notar la diferencia.",
          "Deshacer y rehacer (Ctrl+Z / Ctrl+Y), lista de cambios contra el de fábrica y reinicio de fábrica con confirmación.",
          "Registro de versiones: quién guardó qué y cuándo, con un clic para recuperar cualquiera.",
        ],
        desarrollo: [
          "Ajustar el handling en un servidor suele ser editar un handling.meta, reiniciar el recurso, entrar al coche y repetir. El panel lleva todo eso al juego: cambias un valor y lo notas al momento en el coche que conduces.",
          "Los valores son los internos del juego, leídos del propio vehículo, así que lo que ves es lo que hay (la dirección en radianes, los repartos como los guarda el motor del juego). El ajuste rápido junta varios valores en una sola barra en porcentaje, para que no haga falta saber qué es fTractionCurveMax.",
          "Al guardar, el servidor valida cada valor y lo guarda en la base de datos. Desde ahí se reparte a todos los jugadores: cualquiera que conduzca ese modelo recibe el handling nuevo en menos de un segundo, sin reiniciar nada. Cada guardado queda en el historial y en el registro de acciones de admin.",
        ],
        cifras: [
          { v: "63", l: "valores del handling" },
          { v: "6", l: "plantillas de un clic" },
          { v: "0", l: "reinicios para aplicarlo" },
        ],
        video: `${H}/admincar.webm`,
        poster: `${H}/admincar-03.webp`,
        galeria: [],
      },
    ],
    encajan: [
      { t: "Solo para el staff", icono: "lock", d: "Lo abren los grupos de admin que configures en tu framework (admin, superadmin…) o quien tenga el permiso ACE del recurso." },
      { t: "Para todos los jugadores", icono: "users", d: "El handling guardado se aplica a cualquiera que conduzca ese modelo, aunque ya estuviera dentro del coche." },
      { t: "Varios admins a la vez", icono: "refresh", d: "Si otro admin guarda el mismo modelo mientras lo editas, te avisa y no te pisa el borrador." },
      { t: "Todo queda registrado", icono: "document", d: "Cada guardado va al historial del modelo y al registro de acciones de admin, con quién lo hizo." },
    ],
    tecnico: [
      { t: "ESX Legacy, QBCore y Qbox", icono: "layers", d: "Funciona con los tres frameworks: usa sus grupos de admin para los permisos y guarda en MySQL con oxmysql. Crea sus tablas solo al arrancar." },
      { t: "Validación en servidor", icono: "shield", d: "Solo se aceptan los campos conocidos y dentro de rango; el cliente no puede colar valores raros." },
      { t: "Reparto con GlobalState", icono: "server", d: "El servidor publica el handling de cada modelo y los clientes lo aplican al subir de versión." },
      { t: "Interfaz NUI propia", icono: "monitor", d: "HTML, CSS y JavaScript sin librerías, con varios estilos para elegir y modo prueba (/prueba)." },
      { t: "Configurable", icono: "sliders", d: "Comando, grupos, teclas, distancia al coche y frecuencia de comprobación en config.lua." },
      { t: "En español", icono: "message", d: "Cada valor con su nombre y una explicación de qué hace, para que lo entienda cualquier admin." },
    ],
    faq: [
      { q: "¿Funciona con coches addon?", a: "Sí. El selector lee los vehículos que tiene el servidor, también los que has añadido tú, y el botón «Sincronizar» vuelve a leerlos si metes uno nuevo." },
      { q: "¿Hay que reiniciar el servidor al guardar?", a: "No. El cambio se reparte al momento a todos los jugadores y se mantiene después de reiniciar, porque queda en la base de datos." },
      { q: "¿Puedo volver al handling de fábrica?", a: "Sí, con «Reiniciar ajustes», o recuperando cualquier versión anterior del historial." },
      { q: "¿Funciona con QBCore o Qbox?", a: "Sí. Está para ESX Legacy, QBCore y Qbox, y usa los permisos de admin de cada uno." },
    ],
  },
  {
    id: "sistema-bandas",
    titulo: "Sistema de bandas",
    icono: "users",
    color: "#9b6bff",
    lead: "Todo lo de las organizaciones criminales en un solo script: una tablet encriptada desde la que se gestiona la banda, sus bases, sus territorios, las misiones de armamento, el mercado negro y la solicitud de atracos.",
    resumen: "Cada banda tiene su tablet encriptada: miembros con rangos y permisos a medida, chat cifrado, territorios, bases en el mundo (almacén, caja fuerte, taquilla y garaje), misiones con NPCs armados para preparar los golpes y un mercado negro con objetos y vehículos exclusivos.",
    chips: ["Tablet encriptada", "ESX Legacy", "Rangos y permisos", "Misiones con NPCs", "Mercado negro", "Interfaz NUI propia", "En español"],
    incluyeTitulo: ["Una tablet, ", "toda la banda"],
    encajanTitulo: ["Pensado para ", "el rol de bandas"],
    etiqueta: "1 recurso · 4 módulos",
    youtube: "",
    youtubePortada: `${BD}/portada.webp`,
    videoTexto: "Sistema de bandas · recorrido completo, grabado en el juego.",
    scripts: [
      {
        id: "tablet",
        nombre: "Tablet encriptada",
        recurso: "antoniooojdev_bandas",
        icono: "monitor",
        sub: "El centro de mando de la banda",
        resumen:
          "Se abre con una tarjeta codificada y desde ella se gestiona todo: el inicio con los datos de la banda, los miembros, el chat cifrado, los territorios, las misiones, el mercado negro y la configuración.",
        claves: ["Acceso con tarjeta codificada", "Rangos y permisos que decide el jefe", "Chat cifrado de la banda y entre bandas", "Territorios con graffitis que dan ingresos"],
        funciones: [
          "Inicio con el nombre, la etiqueta y los colores de la banda, sus miembros y sus territorios activos, con accesos directos a cada apartado.",
          "Mi banda: miembros conectados, su rango y las bases de la banda, con el mensaje del día.",
          "Configuración: el jefe crea los rangos, les pone nombre y decide qué puede hacer cada uno (invitar, expulsar, entrar en cada base, sacar dinero o vehículos…). Todo queda en un registro con buscador.",
          "Chat cifrado de la banda y chats entre organizaciones, que se abren compartiendo un código.",
          "Territorios: mapa de la ciudad con las zonas de cada banda. Se ganan pintando graffitis y dan dinero negro cada cierto tiempo.",
          "Sin banda, la tablet solo enseña las invitaciones: las organizaciones las da de alta el staff con /crear-banda (nombre, jefe y colores).",
        ],
        desarrollo: [
          "La tablet es una NUI propia en HTML, CSS y JavaScript, con el color de cada banda en toda la interfaz. Cada pantalla pide al servidor solo lo que necesita y el servidor comprueba el rango y los permisos de quien lo pide antes de responder.",
          "Los permisos no son fijos: el jefe crea los rangos que quiera y marca uno a uno lo que puede hacer cada uno. Así cada banda se organiza a su manera sin tocar la configuración del servidor.",
        ],
        cifras: [
          { v: "9", l: "apartados en la tablet" },
          { v: "∞", l: "rangos a medida" },
          { v: "1", l: "tarjeta para entrar" },
        ],
        video: "",
        poster: `${BD}/inicio.webp`,
        galeria: [
          { src: `${BD}/chat.webp`, t: "Chat cifrado" },
          { src: `${BD}/territorios.webp`, t: "Territorios" },
          { src: `${BD}/graffiti.webp`, t: "Graffiti para ganar una zona" },
          { src: `${BD}/crew.webp`, t: "La banda en el barrio" },
        ],
      },
      {
        id: "bases",
        nombre: "Bases de la banda",
        recurso: "antoniooojdev_bandas",
        icono: "key",
        sub: "Almacén, caja fuerte, taquilla y garaje",
        resumen:
          "Cada banda pone sus bases en el mundo: almacenes para objetos y armas, cajas fuertes con dinero negro, taquillas con los conjuntos de ropa de cada miembro y garajes para sus vehículos (también los personales).",
        claves: ["Se colocan en el mundo con vista previa", "Inventario igual que el del jugador", "Caja fuerte con dinero negro", "Garaje para vehículos de la banda y personales"],
        funciones: [
          "El jefe coloca cada base donde quiere: el mueble sale en fantasma (sin chocar con nada), se mueve con la cámara, se gira y se confirma con Enter.",
          "Almacén y caja fuerte con casillas como el inventario del jugador: arrastrar, pasar todo o la mitad, y cada objeto en su sitio.",
          "La caja fuerte guarda también el dinero limpio y el negro; los ingresos de los territorios llegan solos a ella.",
          "Taquilla de ropa: cada miembro guarda sus conjuntos y se los pone con su animación.",
          "Garaje con los vehículos de la banda y los personales de cada miembro, con su estado (motor y carrocería).",
          "Cada base tiene su permiso: el jefe decide qué rangos pueden entrar, meter o sacar.",
        ],
        desarrollo: [
          "Los muebles son locales y solo aparecen cuando estás cerca, así que no cargan al servidor. Lo que hay dentro se guarda en la base de datos y cada movimiento se comprueba en el servidor: distancia, permiso, peso y que lo tengas de verdad.",
          "Los vehículos personales que se guardan en la banda salen de tu garaje normal mientras están ahí, para que no se puedan duplicar, y vuelven solos a él si dejas la banda.",
        ],
        cifras: [
          { v: "4", l: "tipos de base" },
          { v: "1", l: "jugador a la vez en cada almacén" },
          { v: "0", l: "duplicados de vehículos" },
        ],
        video: "",
        poster: `${BD}/taquilla.webp`,
        galeria: [
          { src: `${BD}/almacen.webp`, t: "Almacén" },
          { src: `${BD}/colocar.webp`, t: "Bases en Mi banda" },
          { src: `${BD}/llegada.webp`, t: "Llegada al barrio" },
        ],
      },
      {
        id: "misiones",
        nombre: "Misiones de armamento",
        recurso: "antoniooojdev_bandas",
        icono: "gamepad",
        sub: "Robos medianos, grandes y finales",
        resumen:
          "Antes de cada golpe, la banda consigue el equipo en una misión: una zona con NPCs armados, refuerzos que llegan en coche y cajas que hay que hackear. El botín sale de cachear los cuerpos y abrir las cajas.",
        claves: ["Tres niveles de dificultad", "NPCs armados y refuerzos en coche", "Hackeo de cajas con un minijuego", "Toda la banda participa a la vez"],
        funciones: [
          "Misiones por tipo de robo (medianos, grandes y finales), cada una con más guardias, mejores armas y más cajas.",
          "La zona sale aproximada en el mapa: hay que encontrarla y acabar con los guardias.",
          "Al fallar un hackeo salta la alarma y llegan refuerzos en coche, que se bajan y abren fuego.",
          "Minijuego de hackeo: encadenar la secuencia eligiendo códigos de la fila o columna marcada, con tiempo.",
          "El equipo del robo sale por probabilidad al cachear y al hackear; la última caja da lo que falte.",
          "Tiempo límite y espera entre misiones por banda.",
        ],
        desarrollo: [
          "Los NPCs los crea uno de los jugadores y el servidor lleva la cuenta de cuáles quedan vivos, de las cajas y del botín, así que nadie puede abrir una caja que no le toca ni repetir el botín.",
          "Cada NPC va a por el miembro de la banda más cercano; el resto de jugadores no son su objetivo.",
        ],
        cifras: [
          { v: "3", l: "niveles de misión" },
          { v: "12", l: "guardias en las finales" },
          { v: "5", l: "cajas que hackear" },
        ],
        video: "",
        poster: `${BD}/mision.webp`,
        galeria: [
          { src: `${BD}/hackeo.webp`, t: "Hackeo de una caja" },
          { src: `${BD}/tiroteo.webp`, t: "Tiroteo con los guardias" },
        ],
      },
      {
        id: "mercado",
        nombre: "Mercado negro y atracos",
        recurso: "antoniooojdev_bandas",
        icono: "cart",
        sub: "Objetos, vehículos y solicitud de golpes",
        resumen:
          "Desde la tablet se compran objetos y vehículos que no vende nadie más, con entrega en mano, y se piden los atracos grandes: el contacto llama para confirmarlo.",
        claves: ["Objetos con entrega en mano", "Vehículos con mejoras y vista en 3D", "Solicitud de atraco con llamada", "Todo con dinero negro"],
        funciones: [
          "Mercado de objetos por categorías: se paga con dinero negro y un contacto lo entrega en un punto de la ciudad.",
          "Mercado de vehículos con sus datos (velocidad, aceleración, frenada, agarre y plazas), mejoras de motor, frenos, transmisión, alerón y colores, y vista en 3D del coche de verdad.",
          "Los vehículos comprados llegan al garaje de la banda.",
          "Solicitud de atraco: cada golpe con lo que hace falta para hacerlo; al pedirlo, el contacto llama para confirmarlo.",
          "El catálogo y los precios se cambian desde el panel de admin, sin tocar archivos.",
        ],
        desarrollo: [
          "Los precios y el dinero se calculan en el servidor: el cliente solo dice qué quiere comprar. Las mejoras de los vehículos suman su porcentaje al precio igual en la tablet que en el servidor.",
          "La vista 3D saca el coche de verdad solo para ti, dentro de un hangar, con una cámara que gira con el ratón.",
        ],
        cifras: [
          { v: "2", l: "mercados" },
          { v: "3D", l: "vista de cada vehículo" },
          { v: "1", l: "llamada para confirmar" },
        ],
        video: "",
        poster: `${BD}/vehiculos.webp`,
        galeria: [
          { src: `${BD}/items.webp`, t: "Mercado negro · objetos" },
          { src: `${BD}/atraco.webp`, t: "Solicitud de atraco" },
          { src: `${BD}/llamada.webp`, t: "Llamada del contacto" },
        ],
      },
    ],
    encajan: [
      { t: "Las bandas las da de alta el staff", icono: "lock", d: "Con /crear-banda (nombre, jefe y colores principal y secundario) o desde el panel de admin. Los jugadores no pueden fundarlas por su cuenta." },
      { t: "El jefe organiza la banda", icono: "users", d: "Invita, asciende, degrada y expulsa, crea rangos y reparte permisos. Para pasar el mando basta con ascender a otro." },
      { t: "Todo deja rastro", icono: "document", d: "Cada movimiento de dinero, objetos, vehículos y miembros queda en el registro de la banda, con buscador y filtros." },
      { t: "Se integra con el servidor", icono: "plug", d: "Usa el inventario, el dinero negro, los garajes y los vehículos de ESX, y los avisos del propio servidor." },
    ],
    tecnico: [
      { t: "ESX Legacy + oxmysql", icono: "layers", d: "Usa el framework, las cuentas y el inventario de ESX. Crea sus tablas solo al arrancar." },
      { t: "Validación en servidor", icono: "shield", d: "Permisos, distancias, dinero, objetos y botín se comprueban en el servidor, nunca en el cliente." },
      { t: "Interfaz NUI propia", icono: "monitor", d: "HTML, CSS y JavaScript sin librerías, con el color de cada banda en toda la tablet." },
      { t: "Ligero", icono: "zap", d: "Los muebles y los NPCs de ambiente solo existen cerca de ti; en reposo no gasta casi nada." },
      { t: "Configurable", icono: "sliders", d: "Precios, bases, misiones, territorios, permisos, armas y textos en config.lua comentado." },
      { t: "En español", icono: "message", d: "Textos, avisos y llamadas escritos para servidores de rol hispanohablantes." },
    ],
    faq: [
      { q: "¿Funciona con QBCore?", a: "Está hecho para ESX Legacy. La adaptación a QBCore u otro framework se presupuesta aparte." },
      { q: "¿Los jugadores pueden crear su propia banda?", a: "No: las da de alta el staff con /crear-banda o desde el panel de admin, para que las bandas sean parte del rol del servidor." },
      { q: "¿Se puede cambiar el catálogo del mercado negro?", a: "Sí, desde el panel de admin: objetos, vehículos, precios y reputación necesaria, sin tocar archivos." },
      { q: "¿Puedo cambiar el estilo de la tablet?", a: "Sí: la interfaz es HTML y CSS, y cada banda ya sale con sus colores." },
    ],
  },
];
