export interface Service {
  id: string;
  title: string;
  description: string;
  features: string[];
  timeline: string;
}

/** Contenido de la página de cada servicio (/servicios/<id>). */
export interface ServiceDetail {
  /** Valor de projectTypes que se marca en /contacto?tipo=… */
  tipo: (typeof projectTypes)[number];
  /** Nombre del icono (src/components/servicios/Icono.astro) */
  icono: string;
  /** Color de acento de la página */
  color: string;
  lead: string;
  consiste: string[];
  /** demo: id de una demo propia (/servicios/<id>/<demo>), ver discordDemos */
  incluye: { t: string; d: string; icono: string; demo?: string }[];
  idealPara: string[];
  proceso: { t: string; d: string }[];
  demo: { titulo: string; texto: string };
  faq: { q: string; a: string }[];
}

export const services: Service[] = [
  {
    id: "web",
    title: "Web online",
    description:
      "Tu negocio en internet con una web rápida, bonita y fácil de encontrar en Google.",
    features: ["Diseño a medida", "Responsive", "SEO técnico", "Formulario de contacto"],
    timeline: "hasta 2 semanas",
  },
  {
    id: "app",
    title: "Aplicación web",
    description:
      "Paneles, reservas, CRMs o herramientas internas hechas exactamente para tu flujo de trabajo.",
    features: ["Login y roles", "Base de datos", "API REST", "Panel de administración"],
    timeline: "hasta 2 semanas",
  },
  {
    id: "mantenimiento",
    title: "Mantenimiento",
    description:
      "Me encargo de que tu web siga segura, actualizada y funcionando sin que tengas que pensar en ello.",
    features: ["Actualizaciones", "Copias de seguridad", "Cambios menores", "Soporte prioritario"],
    timeline: "continuo",
  },
  {
    id: "fivem",
    title: "Scripts FiveM",
    description:
      "Scripts a medida para tu servidor de rol: trabajos, garajes, tiendas, HUDs e interfaces NUI.",
    features: ["ESX y QBCore", "Validación anti-exploit", "Interfaces NUI", "0.00 ms en reposo"],
    timeline: "3–10 días",
  },
  {
    id: "discord",
    title: "Bots de Discord",
    description:
      "Automatiza tu comunidad: tickets, verificación, moderación, niveles, sorteos y avisos programados.",
    features: ["Comandos slash", "Automoderación", "Sistemas de tickets", "Integración con APIs"],
    timeline: "1–2 semanas",
  },
];

export const projectTypes = [
  "Web online",
  "Aplicación web",
  "Script FiveM",
  "Bot de Discord",
  "Mantenimiento",
  "Otro",
] as const;

export const budgets = [
  "< 1.000 €",
  "1.000 – 3.000 €",
  "3.000 – 6.000 €",
  "> 6.000 €",
  "Aún no lo sé",
] as const;

export const deadlines = [
  "Lo antes posible",
  "1 mes",
  "2–3 meses",
  "Sin prisa",
] as const;

// ─────────────────────────────────────────────────────────────
//  Páginas de cada servicio (/servicios/<id>). La clave es el id
//  de `services`. El ejemplo interactivo de cada una está en
//  src/components/servicios/Demo*.astro.
// ─────────────────────────────────────────────────────────────
export const serviceDetails: Record<string, ServiceDetail> = {
  web: {
    tipo: "Web online",
    icono: "globe",
    color: "#6366f1",
    lead: "La web de tu negocio, diseñada desde cero para explicar bien lo que haces y convertir visitas en clientes.",
    consiste: [
      "Una web online es tu escaparate en internet: quién eres, qué ofreces, por qué elegirte y cómo contactarte. No uso plantillas: diseño cada sección a partir de tu marca y de lo que buscan tus clientes.",
      "La entrego rápida (menos de 1 s de carga), adaptada a móvil, tablet y ordenador, y preparada para que Google la entienda desde el primer día. Tú solo tienes que preocuparte de atender a los clientes que lleguen.",
    ],
    incluye: [
      { t: "Diseño a medida", icono: "palette", d: "Basado en tu logo, colores y tono. Te enseño una propuesta antes de programar nada." },
      { t: "Responsive de verdad", icono: "devices", d: "Probada en móviles, tablets y pantallas grandes, no solo «que se vea»." },
      { t: "SEO técnico", icono: "search", d: "Títulos, metadatos, sitemap, datos estructurados y velocidad: la base para posicionar." },
      { t: "Formulario de contacto", icono: "mail", d: "Con validación y avisos a tu email. Sin spam gracias a protección anti-bots." },
      { t: "Textos legales y cookies", icono: "file", d: "Aviso legal, privacidad y banner de cookies conforme al RGPD." },
      { t: "Publicación y dominio", icono: "rocket", d: "Te ayudo con el dominio, el hosting y el correo profesional, y la dejo publicada." },
    ],
    idealPara: ["Autónomos y profesionales", "Pymes y comercios locales", "Restaurantes, clínicas y academias", "Marcas personales y portfolios"],
    proceso: [
      { t: "Reunión inicial", d: "Hablamos de tu negocio, tus clientes y lo que quieres conseguir." },
      { t: "Diseño", d: "Te envío la propuesta visual y la ajustamos hasta que te encante." },
      { t: "Desarrollo", d: "Programo la web y te paso un enlace de prueba para que la revises." },
      { t: "Publicación", d: "La subimos a tu dominio y te enseño a actualizar lo básico." },
    ],
    demo: {
      titulo: "Pide una cita en una web real",
      texto: "Cambia el dispositivo, el color y la tipografía, pide una cita y mírala en «Mis citas» con sus notificaciones: así se comporta una web hecha a medida.",
    },
    faq: [
      { q: "¿Podré cambiar los textos yo mismo?", a: "Sí. Si lo necesitas, añado un pequeño panel para editar textos, fotos y noticias sin tocar código." },
      { q: "¿El hosting está incluido?", a: "Te recomiendo uno según tu caso y lo configuro yo. Suele costar entre 3 y 10 € al mes." },
      { q: "¿Y si ya tengo una web?", a: "La rediseño aprovechando lo que funcione y conservando tu posicionamiento en Google." },
    ],
  },
  app: {
    tipo: "Aplicación web",
    icono: "layout",
    color: "#14b8a6",
    lead: "Herramientas hechas a la medida de tu forma de trabajar: reservas, CRMs, paneles internos y más.",
    consiste: [
      "Cuando una hoja de Excel o un programa genérico se te queda corto, la solución es una aplicación web propia. Funciona desde el navegador, en cualquier dispositivo, y hace exactamente lo que tu equipo necesita.",
      "Diseño la base de datos, los permisos de cada usuario y las pantallas a partir de tus procesos reales. Así eliminas tareas repetitivas, errores y horas perdidas copiando datos de un sitio a otro.",
    ],
    incluye: [
      { t: "Login y roles", icono: "users", d: "Cada persona ve y puede hacer solo lo que le corresponde." },
      { t: "Base de datos", icono: "database", d: "Estructurada para crecer, con copias de seguridad automáticas." },
      { t: "API REST", icono: "plug", d: "Para conectar con otras herramientas: contabilidad, email, calendario…" },
      { t: "Panel de administración", icono: "layout", d: "Listados con filtros, búsqueda, exportación a Excel y estadísticas." },
      { t: "Notificaciones", icono: "bell", d: "Avisos por email, Discord o en la propia app cuando pasa algo importante." },
      { t: "Escalable y segura", icono: "lock", d: "Validación en servidor, contraseñas cifradas y registro de actividad." },
    ],
    idealPara: ["Sistemas de reservas y citas", "CRMs y gestión de clientes", "Paneles internos y dashboards", "Portales para clientes o socios"],
    proceso: [
      { t: "Análisis", d: "Estudio tu flujo de trabajo y defino qué debe hacer la aplicación." },
      { t: "Prototipo", d: "Te enseño las pantallas clave antes de programar para validarlas." },
      { t: "Desarrollo por fases", d: "Entregas cada semana para que la pruebes desde el principio." },
      { t: "Puesta en marcha", d: "Migramos tus datos, formamos al equipo y queda en producción." },
    ],
    demo: {
      titulo: "Usa un panel de reservas",
      texto: "Cambia de rol, alterna entre lista y agenda, crea reservas y mira cómo llegan las nuevas con sus notificaciones: así funciona un panel interno con permisos.",
    },
    faq: [
      { q: "¿Funciona en el móvil?", a: "Sí, todas las pantallas son responsive y puede instalarse como app (PWA)." },
      { q: "¿Los datos son míos?", a: "Siempre. El código y la base de datos son tuyos y puedes exportarlos cuando quieras." },
      { q: "¿Cómo se calcula el precio?", a: "Según pantallas y funciones. Tras la primera reunión te doy un presupuesto cerrado por fases." },
    ],
  },
  mantenimiento: {
    tipo: "Mantenimiento",
    icono: "shield",
    color: "#22c55e",
    lead: "Tu web segura, actualizada y vigilada cada día, sin que tengas que pensar en ello.",
    consiste: [
      "Una web sin mantenimiento acaba siendo lenta, vulnerable o, directamente, dejando de funcionar. Con el plan de mantenimiento me encargo de todo lo técnico mientras tú te centras en tu negocio.",
      "Vigilo que esté en línea las 24 h, hago copias de seguridad, aplico actualizaciones y hago los pequeños cambios que me pidas. Cada mes recibes un informe con lo que se ha hecho.",
    ],
    incluye: [
      { t: "Monitorización 24/7", icono: "pulse", d: "Si la web cae, me llega un aviso al momento y me pongo con ello." },
      { t: "Copias de seguridad", icono: "cloud", d: "Diarias, guardadas fuera del servidor y probadas para restaurar." },
      { t: "Actualizaciones", icono: "refresh", d: "Del sistema, plugins y dependencias, comprobando que nada se rompe." },
      { t: "Seguridad", icono: "shield", d: "Certificado SSL, cortafuegos y revisión de vulnerabilidades." },
      { t: "Cambios menores", icono: "edit", d: "Textos, fotos, precios o nuevas secciones pequeñas incluidas cada mes." },
      { t: "Soporte prioritario", icono: "headset", d: "Respuesta en menos de 24 h laborables, por chat o email." },
    ],
    idealPara: ["Webs que ya están publicadas", "Webs con reservas o formularios a diario", "Negocios sin equipo técnico", "Webs hechas por otros desarrolladores"],
    proceso: [
      { t: "Auditoría inicial", d: "Reviso el estado de tu web: velocidad, seguridad y copias." },
      { t: "Puesta a punto", d: "Corrijo lo urgente y dejo la monitorización configurada." },
      { t: "Mantenimiento mensual", d: "Actualizaciones, copias y cambios que me pidas." },
      { t: "Informe", d: "Cada mes, un resumen claro de lo hecho y del estado de la web." },
    ],
    demo: {
      titulo: "Echa un vistazo al panel de mantenimiento",
      texto: "Lanza una copia de seguridad, aplica actualizaciones y analiza la seguridad: es lo que hago por ti cada mes.",
    },
    faq: [
      { q: "¿Hay permanencia?", a: "No. Es mensual y puedes darte de baja cuando quieras." },
      { q: "¿Mantienes webs que no has hecho tú?", a: "Sí, tras una auditoría inicial para conocer cómo está montada." },
      { q: "¿Qué pasa si se cae la web?", a: "Me llega la alerta y la restauro; si hace falta, desde la última copia de seguridad." },
    ],
  },
  fivem: {
    tipo: "Script FiveM",
    icono: "gamepad",
    color: "#a855f7",
    lead: "Scripts a medida para tu servidor de rol: optimizados, seguros frente a exploits y con interfaces cuidadas.",
    consiste: [
      "Desarrollo recursos para FiveM adaptados a tu servidor: trabajos, garajes, tiendas, HUDs, sistemas de facturación, inventarios o lo que se te ocurra. Compatibles con ESX y QBCore.",
      "Todo lo importante se valida en el servidor para que nadie pueda hacer trampas, y el código se optimiza para que el resmon marque 0.00 ms en reposo. Las interfaces NUI se hacen en HTML/JS con el estilo de tu servidor.",
    ],
    incluye: [
      { t: "Pack vehículos", demo: "pack-vehiculos", icono: "car", d: "Concesionario con vendedor, gasolinera con manguera y velocímetro con cinturón. Con demos jugables y vídeos." },
      { t: "ESX y QBCore", icono: "layers", d: "O standalone. Se integra con tu framework, inventario y target." },
      { t: "Anti-exploit", icono: "shield", d: "Validación en servidor de cada acción: dinero, objetos y distancias." },
      { t: "Interfaces NUI", icono: "monitor", d: "Menús y HUDs en HTML/CSS/JS con animaciones y tu identidad visual." },
      { t: "Optimización", icono: "zap", d: "0.00 ms en reposo y sin bucles innecesarios en el cliente." },
      { t: "Configurable", icono: "sliders", d: "Archivo config.lua documentado para ajustar precios, zonas y textos." },
      { t: "Soporte tras la entrega", icono: "headset", d: "Corrección de errores y ayuda con la instalación." },
    ],
    idealPara: ["Servidores de rol nuevos", "Servidores que quieren scripts únicos", "Sustituir recursos de pago con problemas", "Interfaces NUI personalizadas"],
    proceso: [
      { t: "Idea y alcance", d: "Me cuentas qué quieres y defino las mecánicas y la configuración." },
      { t: "Desarrollo", d: "Programo cliente, servidor y NUI con pruebas en un servidor local." },
      { t: "Pruebas en tu servidor", d: "Lo instalamos y lo probamos con tu equipo de staff." },
      { t: "Entrega", d: "Código limpio, config documentada y soporte post-entrega." },
    ],
    demo: {
      titulo: "Prueba una interfaz NUI",
      texto: "Abre el garaje, saca un vehículo y mira el HUD reaccionar. Todo esto es HTML/JS como el que corre dentro del juego.",
    },
    faq: [
      { q: "¿El código está ofuscado?", a: "No, es tuyo y legible. Si quieres protegerlo para revenderlo, se puede usar escrow." },
      { q: "¿Funciona con mi inventario?", a: "Sí: ox_inventory, qb-inventory, qs-inventory u otros con exports." },
      { q: "¿Haces adaptaciones de scripts existentes?", a: "Sí, siempre que la licencia lo permita." },
    ],
  },
  discord: {
    tipo: "Bot de Discord",
    icono: "bot",
    color: "#5865f2",
    lead: "Un bot propio que automatiza tu comunidad: tickets, verificación, moderación, niveles y mucho más.",
    consiste: [
      "Un bot de Discord a medida hace el trabajo repetitivo de tu staff: recibe a los nuevos, abre tickets, modera el chat, reparte roles y avisa de eventos. Funciona 24/7 y responde al instante.",
      "Uso comandos slash, botones y formularios nativos de Discord para que sea cómodo de usar. Si lo necesitas, lo conecto con tu web, tu servidor de juego o cualquier API.",
    ],
    incluye: [
      { t: "Comandos slash", demo: "comandos", icono: "slash", d: "Con autocompletado, permisos por rol y respuestas con embeds." },
      { t: "Sistema de tickets", demo: "tickets", icono: "ticket", d: "Categorías, transcripciones y registro de quién atendió cada uno." },
      { t: "Automoderación", demo: "automod", icono: "shield", d: "Filtros de spam, enlaces e insultos, avisos y sanciones automáticas." },
      { t: "Verificación y roles", demo: "verificacion", icono: "badge", d: "Captcha, reglas aceptadas y roles por reacción o botón." },
      { t: "Niveles y economía", demo: "economia", icono: "trophy", d: "XP por actividad, rankings y recompensas." },
      { t: "Integraciones", icono: "plug", d: "Con tu web, tu servidor FiveM, Twitch, YouTube u otras APIs." },
    ],
    idealPara: ["Servidores de rol y gaming", "Comunidades de streamers", "Soporte a clientes por Discord", "Equipos y empresas"],
    proceso: [
      { t: "Funciones", d: "Definimos comandos, permisos y automatizaciones." },
      { t: "Desarrollo", d: "Lo programo y lo pruebo en un servidor de pruebas." },
      { t: "Instalación", d: "Lo invito a tu servidor y lo dejo alojado 24/7." },
      { t: "Ajustes", d: "Afinamos mensajes y permisos con el uso real." },
    ],
    demo: {
      titulo: "Habla con el bot",
      texto: "Escribe /ticket, /nivel, /sorteo o /ayuda, o prueba a mandar un enlace sospechoso para ver la automoderación.",
    },
    faq: [
      { q: "¿Dónde se aloja el bot?", a: "En un servidor 24/7; te recomiendo uno económico o lo alojo yo con el mantenimiento." },
      { q: "¿Puedo cambiar los mensajes?", a: "Sí, los textos y colores van en un archivo de configuración o en un panel web." },
      { q: "¿Se conecta con mi servidor FiveM?", a: "Sí: whitelist, estado del servidor, logs y más." },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
//  Demos propias de «Bots de Discord» (/servicios/discord/<id>).
//  Cada una tiene su componente en src/components/servicios/discord/.
// ─────────────────────────────────────────────────────────────
export interface DiscordDemo {
  id: string;
  titulo: string;
  icono: string;
  lead: string;
  pasos: string[];
}

export const discordDemos: DiscordDemo[] = [
  {
    id: "comandos",
    titulo: "Comandos slash",
    icono: "slash",
    lead: "Escribe «/» y aparecen todos los comandos del bot con su descripción, agrupados y con autocompletado. Elige uno y el bot responde al momento.",
    pasos: ["Pulsa en el chat y escribe /", "Muévete con ↑ ↓ y pulsa Enter", "Prueba /encuesta, /ping o /clear"],
  },
  {
    id: "tickets",
    titulo: "Sistema de tickets",
    icono: "ticket",
    lead: "Un panel de soporte con categorías: cada ticket abre un canal privado, el staff lo reclama y al cerrarlo se guarda la transcripción.",
    pasos: ["Elige una categoría y abre un ticket", "Escribe al staff en tu canal privado", "Ciérralo y mira la transcripción en #logs"],
  },
  {
    id: "automod",
    titulo: "Automoderación",
    icono: "shield",
    lead: "Simula un ataque de spam: el bot borra los mensajes al instante, banea a las cuentas que hacen flood y activa el modo anti-raid.",
    pasos: ["Pulsa «Simular raid»", "Mira cómo borra y banea en tiempo real", "Escribe un enlace de invitación tú mismo"],
  },
  {
    id: "verificacion",
    titulo: "Verificación y roles",
    icono: "badge",
    lead: "Los nuevos se verifican con un captcha, desbloquean los canales y eligen sus propios roles con botones.",
    pasos: ["Pulsa «Verificarme» y resuelve el captcha", "Mira cómo se desbloquean los canales", "Elige tus roles en #roles"],
  },
  {
    id: "economia",
    titulo: "Niveles y economía",
    icono: "trophy",
    lead: "Monedas, experiencia y niveles por participar: recompensa diaria, trabajos, tienda de roles y ranking del servidor.",
    pasos: ["Cobra tu /daily y haz /trabajar", "Sube de nivel escribiendo en el chat", "Compra un rol en la tienda"],
  },
];
