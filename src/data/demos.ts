// ─────────────────────────────────────────────────────────────
//  Demos activas: webs en desarrollo que se pueden abrir y usar.
//  Aparecen en la home, en la sección «Demos activas».
//
//  - devUrl: dónde corre en tu PC (se usa con `npm run dev`).
//  - url:    dónde está publicada (se usa en la web real). Sin url,
//            el botón muestra «Publicación próximamente».
//  Para una web estática de /proyectos publicada con la integración
//  de demos, usa la misma ruta en las dos: "/demos/<carpeta>/".
//
//  changelog: lo que ve el cliente en «Últimas modificaciones».
//  Cada vez que se cambie algo en una demo, se añade ARRIBA una entrada
//  nueva (la más reciente primero). La fecha de «actualizada el…» sale
//  de la primera entrada. Redactado para el cliente, no como nota interna.
// ─────────────────────────────────────────────────────────────

export type DemoStatus = "en-desarrollo" | "en-pruebas" | "terminada";
export type ChangeType = "nuevo" | "mejora" | "ajuste" | "corrección";

export interface Change {
  type: ChangeType;
  text: string;
}

export interface Release {
  /** AAAA-MM-DD */
  date: string;
  version: string;
  title: string;
  changes: Change[];
}

export interface Demo {
  slug: string;
  title: string;
  client: string;
  status: DemoStatus;
  summary: string;
  features: string[];
  stack: string[];
  devUrl?: string;
  url?: string;
  /** Comando para arrancarla en local (se muestra si está apagada) */
  devCommand?: string;
  changelog: Release[];
}

export const demos: Demo[] = [
  {
    slug: "nyx-community",
    title: "Nyx Community",
    client: "Servidor de rol FiveM",
    status: "en-desarrollo",
    summary:
      "Plataforma completa del servidor: web pública, login con Discord, panel de usuario y panel de administración conectado a un bot.",
    features: [
      "Login con Discord y perfil de usuario",
      "Whitelist con test, postulaciones y sugerencias",
      "Tickets, sanciones, calendario y comercios",
      "Panel de staff y avisos por MD con el bot",
    ],
    stack: ["Python", "FastAPI", "SQLite", "discord.py", "JavaScript"],
    // Portada de la web (public/index.html). El backend arranca solo con `npm run dev`.
    // Con "localhost" y no "127.0.0.1": imgur bloquea las imágenes si se piden desde 127.0.0.1
    devUrl: "http://localhost:8001/index.html",
    devCommand: "npm run dev (se arranca sola) o npm run demo:nyx",
    changelog: [
      {
        date: "2026-10-13",
        version: "v0.8.0",
        title: "Protección reforzada del panel",
        changes: [
          {
            type: "mejora",
            text: "Todo lo que escriben los usuarios (tickets, sugerencias, postulaciones y opiniones) se guarda de forma segura y se muestra siempre como texto.",
          },
          { type: "mejora", text: "Las postulaciones muestran siempre el nombre real de la cuenta de Discord de quien las envía." },
          { type: "nuevo", text: "El administrador principal recibe un aviso por mensaje privado cada vez que alguien entra o sale del staff." },
          { type: "corrección", text: "El mensaje automático de «Soporte Administrativo» en los tickets se muestra limpio, con su icono de información." },
        ],
      },
      {
        date: "2026-10-12",
        version: "v0.7.0",
        title: "Más estabilidad y seguridad",
        changes: [
          { type: "mejora", text: "Al cerrar sesión, tu cuenta se cierra en todos los dispositivos donde estuviera abierta." },
          { type: "mejora", text: "El test de whitelist tiene un número máximo de intentos al día y una breve espera entre uno y otro." },
          { type: "mejora", text: "En el chat de los tickets, la etiqueta de «Staff» solo aparece en los mensajes del equipo." },
          { type: "mejora", text: "La web aguanta mejor los picos de visitas y las peticiones abusivas sin dejar de funcionar." },
        ],
      },
      {
        date: "2026-10-07",
        version: "v0.6.0",
        title: "Cuentas más protegidas",
        changes: [
          { type: "mejora", text: "Inicio de sesión con Discord reforzado: tu sesión queda protegida y solo tú puedes usarla." },
          { type: "mejora", text: "Tus tickets y sanciones solo los ves tú y el equipo de staff." },
          { type: "mejora", text: "Las sugerencias y los votos de cada usuario quedan a salvo de cambios ajenos." },
          { type: "ajuste", text: "Las acciones del panel de staff exigen ahora permisos de staff en todos los casos." },
        ],
      },
      {
        date: "2026-10-07",
        version: "v0.5.0",
        title: "Diseño unificado y nuevo acceso a postulaciones",
        changes: [
          { type: "mejora", text: "Fondo común en todas las páginas del panel y de las facciones, para una experiencia más coherente." },
          {
            type: "nuevo",
            text: "Nueva sección «Postulaciones» en el pie de página: acceso directo a STAFF, Playmaker, Crew y banda.",
          },
          { type: "ajuste", text: "Las categorías del pie de página quedan alineadas a la misma altura." },
          { type: "ajuste", text: "La moneda de la tienda pasa a llamarse NyxPoints." },
        ],
      },
      {
        date: "2026-10-07",
        version: "v0.4.0",
        title: "Panel de usuario con la identidad de Nyx",
        changes: [
          {
            type: "mejora",
            text: "Home, calendario y resto de páginas del panel con el logo, el nombre y el pie de página de Nyx Community.",
          },
          { type: "mejora", text: "El inicio de sesión lleva siempre al panel de Nyx Community." },
          { type: "nuevo", text: "Modo demo para recorrer el panel completo sin iniciar sesión con Discord." },
          { type: "ajuste", text: "Los avisos enviados por Discord enlazan directamente a la web de Nyx Community." },
          { type: "corrección", text: "El calendario vuelve a sincronizar los eventos correctamente." },
        ],
      },
      {
        date: "2026-10-07",
        version: "v0.3.0",
        title: "Pulido de la portada",
        changes: [
          {
            type: "nuevo",
            text: "Pantalla de carga con mensajes de estado mientras se prepara la web: inicio de sesión, verificación de datos y carga de la ciudad.",
          },
          {
            type: "mejora",
            text: "Galería «Nuestra comunidad»: las imágenes se abren con un zoom desde la miniatura, se deslizan al pasar de una a otra y se cierran con una transición suave.",
          },
          { type: "mejora", text: "En móvil, la galería se recorre deslizando el dedo." },
          {
            type: "ajuste",
            text: "Encabezados de Facciones, La ciudad y Comunidad centrados para una lectura más equilibrada.",
          },
          {
            type: "ajuste",
            text: "Actualización de la barra de desplazamiento y de los accesos flotantes: interfaz más limpia y sin elementos que distraigan.",
          },
          { type: "ajuste", text: "Nuevo diseño del botón «Volver arriba», a juego con el resto de la web." },
        ],
      },
      {
        date: "2026-10-07",
        version: "v0.2.0",
        title: "Nueva identidad: Nyx Community",
        changes: [
          { type: "nuevo", text: "Logo de Nyx Community en la portada, el menú lateral, el panel de administración y los avisos del bot." },
          { type: "mejora", text: "Nombre de la comunidad actualizado en todas las páginas, formularios y mensajes." },
          { type: "corrección", text: "Las imágenes vuelven a cargar correctamente al abrir la demo." },
        ],
      },
      {
        date: "2026-10-07",
        version: "v0.1.0",
        title: "Primera versión de la plataforma",
        changes: [
          { type: "nuevo", text: "Web pública del servidor con facciones, normativa, tienda y guía para empezar." },
          { type: "nuevo", text: "Inicio de sesión con Discord y perfil de usuario." },
          { type: "nuevo", text: "Whitelist con test, postulaciones a facciones y staff, y buzón de sugerencias." },
          { type: "nuevo", text: "Tickets de soporte, sanciones, calendario de eventos y directorio de comercios." },
          { type: "nuevo", text: "Panel de administración con permisos por rango y avisos por mensaje privado mediante el bot." },
        ],
      },
    ],
  },
  {
    slug: "clicksense-rp",
    title: "ClickSense RP",
    client: "Servidor de rol FiveM",
    status: "en-desarrollo",
    summary:
      "Web y panel del servidor ClickSense RP: portada pública, login con Discord, panel de usuario, administración y bot de Discord integrado.",
    features: [
      "Login con Discord y perfil de usuario",
      "Whitelist, postulaciones y buzón de sugerencias",
      "Facciones, normativas, código penal y academias LSPD/LSSD",
      "Panel de staff con avisos por MD mediante el bot",
    ],
    stack: ["Python", "FastAPI", "SQLite", "discord.py", "JavaScript"],
    // Proyecto en Developer\ClickSense RP WEB. La web arranca sola con `npm run dev`; el bot, con run.py
    devUrl: "http://localhost:8000/index.html",
    devCommand: "npm run dev (se arranca sola) o python run.py en ClickSense RP WEB",
    changelog: [
      {
        date: "2026-10-13",
        version: "v1.5.0",
        title: "Protección reforzada del panel",
        changes: [
          {
            type: "mejora",
            text: "Todo lo que escriben los usuarios (tickets, sugerencias, postulaciones y opiniones) se guarda de forma segura y se muestra siempre como texto.",
          },
          { type: "mejora", text: "Las postulaciones muestran siempre el nombre real de la cuenta de Discord de quien las envía." },
          { type: "nuevo", text: "El administrador principal recibe un aviso por mensaje privado cada vez que alguien entra o sale del staff." },
          { type: "corrección", text: "El mensaje automático de «Soporte Administrativo» en los tickets se muestra limpio, con su icono de información." },
        ],
      },
      {
        date: "2026-10-12",
        version: "v1.4.1",
        title: "Más estabilidad y seguridad",
        changes: [
          { type: "mejora", text: "Al cerrar sesión, tu cuenta se cierra en todos los dispositivos donde estuviera abierta." },
          { type: "mejora", text: "El test de whitelist tiene un número máximo de intentos al día y una breve espera entre uno y otro." },
          { type: "mejora", text: "En el chat de los tickets, la etiqueta de «Staff» solo aparece en los mensajes del equipo." },
          { type: "mejora", text: "La web aguanta mejor los picos de visitas y las peticiones abusivas sin dejar de funcionar." },
        ],
      },
      {
        date: "2026-10-12",
        version: "v1.4.0",
        title: "Nueva web del Sheriff's Department (LSSD)",
        changes: [
          {
            type: "mejora",
            text: "El menú lateral luce el mismo diseño en todas las secciones de la web, incluido el panel de staff: mismos botones, categorías y resaltado de la página en la que estás.",
          },
          {
            type: "corrección",
            text: "Los colores de la web se mantienen fieles al diseño original aunque el navegador tenga activada una extensión de modo oscuro, y el menú se ve igual en cada carga.",
          },
          {
            type: "mejora",
            text: "Los términos y condiciones estrenan diseño: cabecera renovada, aviso de aceptación destacado, tarjetas ilustradas para cada normativa y normas de Discord y FiveM en fichas numeradas.",
          },
          {
            type: "nuevo",
            text: "Nuevo acceso a «Información legal» desde cualquier documento legal, para consultar el resto de textos del servidor en un clic.",
          },
          { type: "ajuste", text: "Los documentos legales van directos al contenido, sin el bloque de resumen inicial." },
          { type: "ajuste", text: "El aviso de marcas al pie de los términos y de la información legal aparece centrado." },
          {
            type: "nuevo",
            text: "Nueva política de cookies: qué guarda la web, para qué y cuánto dura, con un panel para ver y borrar los datos guardados en tu navegador.",
          },
          {
            type: "mejora",
            text: "Los textos legales (privacidad, cookies, términos y donaciones) se agrupan en una misma sección y todos los enlaces del pie de página llevan a ellos.",
          },
          { type: "ajuste", text: "Los iconos de las preguntas frecuentes de la portada quedan perfectamente centrados." },
          { type: "mejora", text: "Botones renovados en los textos legales, con un diseño más moderno y unificado y un tono más formal." },
          {
            type: "mejora",
            text: "La web del LSSD estrena diseño propio: menús desplegables con iconos, historia en línea temporal, fichas de división en panel lateral, escala de rangos desplegable y animaciones al abrir cada sección y al desplazarse.",
          },
          {
            type: "mejora",
            text: "La página del SASP presenta los dos cuerpos de seguridad del estado, con organigrama, divisiones y rangos del LSPD y del LSSD, y las condecoraciones oficiales.",
          },
          {
            type: "mejora",
            text: "Nuevo selector animado para elegir entre la web del LSPD y la del LSSD, y logos oficiales de ambos departamentos.",
          },
          {
            type: "nuevo",
            text: "La web del LSSD se ha rediseñado con la misma estructura que la del LSPD, en negro y dorado: portada, historia, divisiones con ficha propia, rangos, código penal, los más buscados, ingreso y contacto.",
          },
          {
            type: "nuevo",
            text: "Nueva sección de condecoraciones del LSSD con sus diez medallas y premios, por orden de precedencia.",
          },
          {
            type: "nuevo",
            text: "En la página del SASP, el botón de entrada abre un selector para elegir entre la web del LSPD y la del Sheriff's Department (LSSD).",
          },
          {
            type: "mejora",
            text: "La web del LSSD muestra la escala de rangos oficial del departamento, desde Deputy Sheriff Trainee hasta Sheriff.",
          },
        ],
      },
      {
        date: "2026-10-10",
        version: "v1.3.0",
        title: "Galería animada y soporte por tickets en la portada",
        changes: [
          {
            type: "nuevo",
            text: "La galería de «Nuestra comunidad» se abre, pasa y cierra las imágenes con animaciones fluidas: cada foto se amplía desde su miniatura y vuelve a ella al cerrar.",
          },
          {
            type: "mejora",
            text: "Las preguntas frecuentes llevan ahora a «Crear un ticket» en la propia web (si aún no has iniciado sesión, te lleva primero al acceso con Discord).",
          },
          { type: "ajuste", text: "Textos de la portada revisados y sección de whitelist más limpia." },
          { type: "ajuste", text: "La sección de comunidad se centra en la galería de imágenes." },
        ],
      },
      {
        date: "2026-10-08",
        version: "v1.2.0",
        title: "Nueva barra de desplazamiento",
        changes: [
          {
            type: "mejora",
            text: "Barra de desplazamiento renovada en el panel y el resto de páginas: más fina y discreta, se ensancha al pasar el ratón para usarla con comodidad.",
          },
          { type: "ajuste", text: "Mismo estilo de barra en menús, ventanas y listas de toda la web." },
        ],
      },
      {
        date: "2026-10-08",
        version: "v1.1.0",
        title: "Acceso directo al panel desde la portada",
        changes: [
          {
            type: "mejora",
            text: "Con la sesión de Discord iniciada, el menú del avatar lleva directamente a tu panel y a tu perfil.",
          },
          { type: "mejora", text: "La portada reconoce al instante si tu sesión sigue activa y muestra tu avatar actualizado." },
          { type: "ajuste", text: "Portada más directa: se retira el bloque final «Empieza hoy»." },
        ],
      },
      {
        date: "2026-10-08",
        version: "v1.0.0",
        title: "ClickSense RP, disponible como demo",
        changes: [
          { type: "nuevo", text: "Web pública del servidor con facciones, normativas, código penal y organigrama." },
          { type: "nuevo", text: "Inicio de sesión con Discord, perfil de usuario y panel personal." },
          { type: "nuevo", text: "Whitelist, postulaciones a facciones y staff, y buzón de sugerencias." },
          { type: "nuevo", text: "Tickets, sanciones, calendario de eventos y directorio de comercios." },
          { type: "nuevo", text: "Panel de administración con permisos por rango y avisos por mensaje privado mediante el bot." },
        ],
      },
    ],
  },
];

/** Fecha de la última modificación de una demo (la de su entrada más reciente) */
export const lastUpdate = (demo: Demo) => demo.changelog[0]?.date;
