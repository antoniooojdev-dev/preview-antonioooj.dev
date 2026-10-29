// ─────────────────────────────────────────────────────────────
//  Ficha de cada herramienta de «Con qué trabajo» (/pruebas):
//  se abre al pulsar su etiqueta. La clave es el nombre tal cual
//  aparece en src/data/stack.ts.
// ─────────────────────────────────────────────────────────────

export interface Tecnologia {
  /** Qué es, en dos palabras */
  tipo: string;
  /** Explicación corta y sin tecnicismos */
  resumen: string;
  /** Qué se puede hacer con ella */
  sirve: string[];
  /** Ejemplos conocidos para hacerse una idea */
  ejemplos: string[];
}

export const tecnologias: Record<string, Tecnologia> = {
  HTML5: {
    tipo: "Lenguaje de marcado",
    resumen:
      "Es el esqueleto de cualquier página web: dice qué es un título, un párrafo, una imagen, un botón o un formulario. Sin HTML no hay web.",
    sirve: [
      "Estructurar el contenido de cualquier página",
      "Formularios de contacto, reservas o registro",
      "Vídeo y audio sin plugins",
      "Que Google y los lectores de pantalla entiendan la página",
    ],
    ejemplos: ["Wikipedia", "Google", "Amazon", "Todas las webs que visitas"],
  },
  CSS3: {
    tipo: "Lenguaje de estilos",
    resumen:
      "Es la ropa de la web: colores, tipografías, tamaños, posiciones y animaciones. El mismo HTML puede verse de mil formas distintas según su CSS.",
    sirve: [
      "Diseño visual a medida, igual que en el boceto",
      "Adaptar la web a móvil, tablet y ordenador",
      "Animaciones y transiciones suaves",
      "Tema claro y oscuro",
    ],
    ejemplos: ["Las animaciones de apple.com", "El diseño de Stripe", "El tema oscuro de YouTube"],
  },
  JavaScript: {
    tipo: "Lenguaje de programación",
    resumen:
      "Es lo que da vida a la web: hace que las cosas pasen cuando pulsas, escribes o haces scroll, sin recargar la página. Funciona en todos los navegadores.",
    sirve: [
      "Menús, pestañas, buscadores y filtros al instante",
      "Validar formularios antes de enviarlos",
      "Cargar datos en vivo (chats, precios, estados)",
      "Juegos y experiencias interactivas",
    ],
    ejemplos: ["Google Maps", "Gmail", "El reproductor de YouTube", "La interfaz de Netflix"],
  },
  TypeScript: {
    tipo: "Lenguaje de programación",
    resumen:
      "Es JavaScript con «tipos»: el editor avisa de muchos errores antes de que lleguen a tu web. Ideal cuando un proyecto crece y hay mucho código.",
    sirve: [
      "Aplicaciones grandes que no se rompen al cambiarlas",
      "Detectar fallos mientras se escribe el código",
      "Código más fácil de mantener a largo plazo",
    ],
    ejemplos: ["Visual Studio Code", "Slack", "Airbnb"],
  },
  Astro: {
    tipo: "Framework web",
    resumen:
      "Una herramienta para crear webs muy rápidas: genera páginas ya hechas y solo envía JavaScript donde de verdad hace falta. Perfecta para webs de negocio, portfolios y blogs.",
    sirve: [
      "Webs que cargan en menos de un segundo",
      "Muy buen posicionamiento en Google",
      "Blogs y documentación fáciles de ampliar",
      "Mezclar piezas de React u otras librerías",
    ],
    ejemplos: ["Esta misma web", "La documentación de Cloudflare", "Miles de webs de documentación con Starlight"],
  },
  React: {
    tipo: "Librería de interfaces",
    resumen:
      "Creada por Meta para construir interfaces que cambian constantemente. Divide la pantalla en piezas reutilizables (botones, tarjetas, listas) que se actualizan solas.",
    sirve: [
      "Paneles de control y aplicaciones web complejas",
      "Interfaces que se actualizan en tiempo real",
      "Piezas reutilizables en toda la aplicación",
      "Apps móviles con React Native",
    ],
    ejemplos: ["Facebook", "Instagram", "WhatsApp Web", "Netflix"],
  },
  PHP: {
    tipo: "Lenguaje de servidor",
    resumen:
      "Se ejecuta en el servidor, no en tu navegador: guarda y lee datos, gestiona usuarios y prepara la página antes de enviártela. Funciona en casi cualquier hosting.",
    sirve: [
      "Login de usuarios y zonas privadas",
      "Tiendas, reservas y formularios que guardan datos",
      "Paneles de administración",
      "Enviar emails automáticos",
    ],
    ejemplos: ["WordPress", "Wikipedia", "Facebook en sus inicios"],
  },
  Laravel: {
    tipo: "Framework de PHP",
    resumen:
      "Un conjunto de herramientas sobre PHP que trae resueltas las partes de siempre: usuarios, permisos, base de datos, emails y seguridad. Se avanza mucho más rápido y con menos fallos.",
    sirve: [
      "Aplicaciones web con roles y permisos",
      "APIs para apps móviles",
      "Tiendas y plataformas de suscripción",
      "Tareas programadas y colas de trabajo",
    ],
    ejemplos: ["Laracasts", "Laravel Forge", "Miles de plataformas SaaS y paneles de gestión"],
  },
  "Node.js": {
    tipo: "Entorno de servidor",
    resumen:
      "Permite usar JavaScript también en el servidor. Muy bueno para muchas conexiones a la vez, como chats o datos en tiempo real.",
    sirve: [
      "Chats y notificaciones en tiempo real",
      "APIs rápidas",
      "Bots de Discord",
      "Herramientas y automatizaciones",
    ],
    ejemplos: ["Netflix", "PayPal", "LinkedIn"],
  },
  "API REST": {
    tipo: "Forma de comunicar sistemas",
    resumen:
      "Es el «idioma» con el que dos programas se piden datos por internet. Tu web pide algo, el servidor responde, y así se conectan webs, apps y servicios externos.",
    sirve: [
      "Conectar tu web con pagos, mapas o redes sociales",
      "Que una app móvil y una web compartan datos",
      "Iniciar sesión con Google o Discord",
      "Mostrar datos en vivo de otros servicios",
    ],
    ejemplos: ["Pagar con Stripe o PayPal", "Entrar con Google", "La canción de Spotify que sale en esta web"],
  },
  MySQL: {
    tipo: "Base de datos",
    resumen:
      "Guarda la información de forma ordenada en tablas (usuarios, pedidos, reservas…) y la encuentra en milisegundos aunque haya millones de filas.",
    sirve: [
      "Guardar usuarios, pedidos y reservas",
      "Buscar y filtrar datos al instante",
      "Informes y estadísticas",
    ],
    ejemplos: ["Facebook", "YouTube", "WordPress"],
  },
  MariaDB: {
    tipo: "Base de datos",
    resumen:
      "Hermana libre de MySQL, creada por sus mismos fundadores. Es compatible con ella y es la base de datos habitual de los servidores de FiveM.",
    sirve: [
      "Lo mismo que MySQL, con licencia totalmente libre",
      "Inventarios, garajes y cuentas de jugadores en FiveM",
      "Webs y paneles con mucho tráfico",
    ],
    ejemplos: ["Wikipedia", "La mayoría de servidores de FiveM", "Muchas distribuciones de Linux"],
  },
  SQLite: {
    tipo: "Base de datos",
    resumen:
      "Una base de datos entera en un solo archivo, sin servidor aparte. Ligera y rapidísima: probablemente es la base de datos más usada del mundo.",
    sirve: [
      "Apps y webs pequeñas o medianas",
      "Guardar datos dentro de una app de móvil",
      "Prototipos que luego pueden crecer",
    ],
    ejemplos: ["Todos los móviles Android e iPhone", "El historial de Chrome y Firefox", "El chat de esta web"],
  },
  Lua: {
    tipo: "Lenguaje de programación",
    resumen:
      "Un lenguaje pequeño y rápido pensado para meterse dentro de otros programas. Por eso es el favorito de muchos videojuegos para crear mods y sistemas.",
    sirve: [
      "Scripts de FiveM (trabajos, garajes, tiendas…)",
      "Mods y addons de videojuegos",
      "Automatizar programas que lo admiten",
    ],
    ejemplos: ["Roblox", "Los addons de World of Warcraft", "Los servidores de rol de GTA V"],
  },
  FiveM: {
    tipo: "Plataforma de servidores de GTA V",
    resumen:
      "Permite crear servidores propios de GTA V con sus propias reglas, trabajos, economía y mapas. Es la base de casi todos los servidores de rol.",
    sirve: [
      "Servidores de rol con trabajos y economía propia",
      "Scripts a medida: policía, mecánicos, negocios…",
      "Interfaces dentro del juego (móvil, HUD, menús)",
    ],
    ejemplos: ["NoPixel", "Marbella Vice", "Miles de servidores de rol en español"],
  },
  ox_lib: {
    tipo: "Librería para FiveM",
    resumen:
      "Una caja de herramientas para scripts de FiveM: menús, notificaciones, barras de progreso y diálogos ya hechos, rápidos y con buen aspecto.",
    sirve: [
      "Menús y menús contextuales",
      "Notificaciones y barras de progreso",
      "Diálogos para escribir datos",
      "Scripts más optimizados (menos ms)",
    ],
    ejemplos: ["ox_inventory", "ox_target", "Gran parte de los scripts modernos de FiveM"],
  },
  "discord.js": {
    tipo: "Librería para bots de Discord",
    resumen:
      "La forma más usada de programar bots de Discord con JavaScript: comandos, botones, menús y todo lo que pasa en un servidor.",
    sirve: [
      "Comandos con / y botones",
      "Tickets, verificación y roles automáticos",
      "Moderación automática",
      "Avisos programados y conexión con otras webs",
    ],
    ejemplos: ["Bots del estilo de MEE6", "Carl-bot", "Ticket Tool"],
  },
  Git: {
    tipo: "Control de versiones",
    resumen:
      "Guarda cada cambio del código con su fecha y su motivo. Si algo falla, se vuelve atrás en segundos; y nunca se pierde trabajo.",
    sirve: [
      "Historial completo de cada cambio",
      "Volver a una versión anterior si algo falla",
      "Trabajar en mejoras sin tocar la versión publicada",
    ],
    ejemplos: ["GitHub", "El núcleo de Linux, para el que se creó", "Prácticamente todas las empresas de software"],
  },
  Docker: {
    tipo: "Contenedores",
    resumen:
      "Empaqueta una aplicación con todo lo que necesita para funcionar. Así funciona exactamente igual en mi ordenador que en el servidor.",
    sirve: [
      "Publicar aplicaciones sin sorpresas",
      "Varios servicios en el mismo servidor sin que choquen",
      "Montar entornos de prueba en minutos",
    ],
    ejemplos: ["Spotify", "PayPal", "La mayoría de servicios en la nube"],
  },
  Linux: {
    tipo: "Sistema operativo",
    resumen:
      "El sistema operativo de los servidores: estable, seguro y gratuito. La gran mayoría de webs del mundo funcionan sobre Linux.",
    sirve: [
      "Servidores para webs, APIs y bots",
      "Servidores de FiveM",
      "Automatizar copias de seguridad y tareas",
    ],
    ejemplos: ["Android", "Los servidores de Google y Amazon", "Todos los superordenadores del Top 500"],
  },
  Vercel: {
    tipo: "Plataforma de alojamiento",
    resumen:
      "Publica webs en internet en segundos y las sirve desde servidores repartidos por todo el mundo, así cargan rápido estés donde estés.",
    sirve: [
      "Publicar una web con cada cambio, automáticamente",
      "Enlaces de prueba para revisar antes de publicar",
      "Webs rápidas en cualquier país",
    ],
    ejemplos: ["Los creadores de Next.js", "Landings de lanzamiento", "Portfolios y webs de producto"],
  },
  Figma: {
    tipo: "Herramienta de diseño",
    resumen:
      "Donde se diseña la web antes de programarla: ves cómo quedará cada pantalla y das tu opinión antes de escribir una sola línea de código.",
    sirve: [
      "Bocetos y diseño de cada pantalla",
      "Prototipos navegables para probar la idea",
      "Comentar cambios sobre el diseño",
    ],
    ejemplos: ["Airbnb", "Uber", "Microsoft"],
  },
};
