// Textos con partes que cambian (números, nombres, fechas). La clave es una expresión regular
// (sin ^ ni $: se añaden solos) y $1, $2… son sus grupos, que también se traducen si son
// textos conocidos. Escapa los puntos y paréntesis con \\.
import type { Trad } from "../dict";

export const patrones: Record<string, Trad> = {
  // ── fechas y cantidades ──
  "en (\\d+) días": { en: "in $1 days", pt: "em $1 dias" },
  "(\\d+) días": { en: "$1 days", pt: "$1 dias" },
  "(\\d+) día (\\d+) h": { en: "$1 day $2 h", pt: "$1 dia $2 h" },
  "(\\d+) días (\\d+) h": { en: "$1 days $2 h", pt: "$1 dias $2 h" },
  "hoy a las (\\d\\d?:\\d\\d)": { en: "today at $1", pt: "hoje às $1" },
  "(\\d+) mensaje": { en: "$1 message", pt: "$1 mensagem" },
  "(\\d+) mensajes": { en: "$1 messages", pt: "$1 mensagens" },
  "(\\d+) sin leer": { en: "$1 unread", pt: "$1 não lidas" },
  "(\\d+) abierto": { en: "$1 open", pt: "$1 aberto" },
  "(\\d+) abiertos": { en: "$1 open", pt: "$1 abertos" },
  "(\\d+) proyecto": { en: "$1 project", pt: "$1 projeto" },
  "(\\d+) proyectos": { en: "$1 projects", pt: "$1 projetos" },
  "novedades \\((\\d+)\\)": { en: "updates ($1)", pt: "novidades ($1)" },
  "Nivel (\\d+)": { en: "Level $1", pt: "Nível $1" },
  "🔥 (\\d+) días": { en: "🔥 $1 days", pt: "🔥 $1 dias" },
  "hace (\\d+) (min|h|días?)": { en: "$1 $2 ago", pt: "há $1 $2" },

  // ── chat ──
  "¡Hola, (.+)! 👋": { en: "Hi, $1! 👋", pt: "Olá, $1! 👋" },
  "¡Hola! 👋": { en: "Hi! 👋", pt: "Olá! 👋" },
  "Abre un ticket para contarme qué necesitas\\. Puedes tener varios a la vez, uno por tema\\. Te respondo en (.+)\\.": {
    en: "Open a ticket to tell me what you need. You can have several at once, one per topic. I reply in $1.",
    pt: "Abra um ticket para me contar do que precisa. Você pode ter vários ao mesmo tempo, um por assunto. Respondo em $1.",
  },
  "Cuéntame qué necesitas\\. Te respondo en (.+)\\.": { en: "Tell me what you need. I reply in $1.", pt: "Conte do que você precisa. Respondo em $1." },
  "(.+) suele responder en (.+)": { en: "$1 usually replies in $2", pt: "$1 costuma responder em $2" },
  "(\\S+) abierto": { en: "$1 open", pt: "$1 aberto" },
  "(\\S+) cerrado": { en: "$1 closed", pt: "$1 fechado" },
  "Ticket (\\S+) abierto(.*)": { en: "Ticket $1 opened$2", pt: "Ticket $1 aberto$2" },
  "Ticket (\\S+) cerrado por (.+)": { en: "Ticket $1 closed by $2", pt: "Ticket $1 fechado por $2" },
  "Máximo (\\d+) caracteres": { en: "Maximum $1 characters", pt: "Máximo de $1 caracteres" },

  // ── tarjetas de proyectos ──
  "Entrega (.+)": { en: "Delivery $1", pt: "Entrega $1" },
  "Actualizado (.+)": { en: "Updated $1", pt: "Atualizado $1" },
  "Entró con (.+)": { en: "Signed in with $1", pt: "Entrou com $1" },
  "id de (.+)": { en: "$1 id", pt: "id do $1" },
  "Transcripción del ticket (\\S+) enviada por mensaje privado de Discord": {
    en: "Transcript of ticket $1 sent by Discord direct message",
    pt: "Transcrição do ticket $1 enviada por mensagem privada do Discord",
  },
  "No se pudo enviar la transcripción del ticket (\\S+) por MD \\(¿tienes los mensajes privados cerrados\\?\\)": {
    en: "Couldn't send the transcript of ticket $1 by DM (are your direct messages closed?)",
    pt: "Não foi possível enviar a transcrição do ticket $1 por DM (suas mensagens privadas estão fechadas?)",
  },

  // ── cuenta y login ──
  "Conectado con (.+)": { en: "Connected with $1", pt: "Conectado com $1" },
  "El inicio de sesión con (\\w+) aún no está configurado\\.": {
    en: "Sign-in with $1 isn't set up yet.",
    pt: "O login com $1 ainda não está configurado.",
  },
  "No se pudo iniciar sesión con (\\w+)\\. Inténtalo de nuevo\\.": {
    en: "Couldn't sign in with $1. Please try again.",
    pt: "Não foi possível entrar com $1. Tente de novo.",
  },

  // ── contacto ──
  "No se pudo enviar\\. Escríbeme directamente a (.+)\\.": {
    en: "Couldn't send it. Email me directly at $1.",
    pt: "Não foi possível enviar. Me escreva diretamente em $1.",
  },
};
