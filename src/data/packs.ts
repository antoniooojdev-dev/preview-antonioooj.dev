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
  video: string;
  poster: string;
  galeria: PackShot[];
  demo: { url: string; titulo: string; pasos: string[] };
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
  encajan: { t: string; d: string; icono: string }[];
  tecnico: { t: string; d: string; icono: string }[];
  faq: { q: string; a: string }[];
}

const M = "/fivem/pack-vehiculos/media";

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
];
