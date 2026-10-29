// /login, /cuenta, /gracias y 404.
import type { Trad } from "../dict";

export const cuenta: Record<string, Trad> = {
  // ── /login ──
  "Inicia sesión": { en: "Sign in", pt: "Entrar" },
  "Continuar con Discord": { en: "Continue with Discord", pt: "Continuar com Discord" },
  "Continuar con Google": { en: "Continue with Google", pt: "Continuar com Google" },
  "Continuar con GitHub": { en: "Continue with GitHub", pt: "Continuar com GitHub" },
  "La sesión se queda guardada en este navegador durante 30 días.": {
    en: "Your session stays saved in this browser for 30 days.",
    pt: "A sessão fica salva neste navegador por 30 dias.",
  },
  "Tus chats quedan ligados a la cuenta con la que entres.": {
    en: "Your chats are tied to the account you sign in with.",
    pt: "Seus chats ficam ligados à conta com que você entrar.",
  },
  "Solo vemos tu nombre y tu avatar: nada de tus mensajes ni servidores.": {
    en: "We only see your name and avatar: none of your messages or servers.",
    pt: "Só vemos seu nome e seu avatar: nada das suas mensagens nem servidores.",
  },
  "Entra con tu cuenta y hablamos de tu proyecto directamente, sin intermediarios.": {
    en: "Sign in and let's talk about your project directly, no middlemen.",
    pt: "Entre com sua conta e falamos do seu projeto diretamente, sem intermediários.",
  },
  "Para contactar conmigo, entra con Discord, Google o GitHub.": {
    en: "To contact me, sign in with Discord, Google or GitHub.",
    pt: "Para falar comigo, entre com Discord, Google ou GitHub.",
  },
  "Panel de administración.": { en: "Admin panel.", pt: "Painel de administração." },
  "Entra para ver tu cuenta y tus proyectos.": { en: "Sign in to see your account and projects.", pt: "Entre para ver sua conta e seus projetos." },
  "Entra con Discord, Google o GitHub.": { en: "Sign in with Discord, Google or GitHub.", pt: "Entre com Discord, Google ou GitHub." },
  "Tu sesión ha caducado. Vuelve a entrar con Discord.": { en: "Your session has expired. Sign in again with Discord.", pt: "Sua sessão expirou. Entre de novo com o Discord." },
  "El inicio de sesión no está disponible ahora mismo. Prueba en un rato.": {
    en: "Sign-in isn't available right now. Try again in a bit.",
    pt: "O login não está disponível agora. Tente daqui a pouco.",
  },
  "Por seguridad, vuelve a iniciar sesión con Discord para usar el panel": {
    en: "For security, sign in again with Discord to use the panel",
    pt: "Por segurança, entre de novo com o Discord para usar o painel",
  },

  // ── /cuenta ──
  "Tu cuenta, tus proyectos y tus chats.": { en: "Your account, your projects and your chats.", pt: "Sua conta, seus projetos e seus chats." },
  "No se puede cargar tu cuenta ahora mismo. Prueba en un rato.": {
    en: "Your account can't be loaded right now. Try again in a bit.",
    pt: "Não foi possível carregar sua conta agora. Tente daqui a pouco.",
  },
  "Abrir el chat": { en: "Open the chat", pt: "Abrir o chat" },
  "Panel de admin": { en: "Admin panel", pt: "Painel de admin" },
  proyectos: { en: "projects", pt: "projetos" },
  "chats abiertos": { en: "open chats", pt: "chats abertos" },
  "mensajes sin leer": { en: "unread messages", pt: "mensagens não lidas" },
  "Secciones de tu cuenta": { en: "Account sections", pt: "Seções da sua conta" },
  "Tus proyectos": { en: "Your projects", pt: "Seus projetos" },
  "Cómo va cada uno y sus últimas novedades. En el chat también puedes escribir": {
    en: "How each one is going and its latest updates. In the chat you can also type",
    pt: "Como está cada um e suas últimas novidades. No chat você também pode digitar",
  },
  "Qué proyectos ver": { en: "Which projects to show", pt: "Quais projetos ver" },
  "En marcha": { en: "In progress", pt: "Em andamento" },
  Entregados: { en: "Delivered", pt: "Entregues" },
  "Todavía no tienes proyectos": { en: "You don't have any projects yet", pt: "Você ainda não tem projetos" },
  "Cuando empecemos a trabajar en el tuyo aparecerá aquí con su estado y sus novedades.": {
    en: "Once we start working on yours, it'll show up here with its status and updates.",
    pt: "Quando começarmos a trabalhar no seu, ele aparecerá aqui com o status e as novidades.",
  },
  "Cuéntame tu idea": { en: "Tell me your idea", pt: "Conte sua ideia" },
  "Tus chats": { en: "Your chats", pt: "Seus chats" },
  "Cada conversación es un ticket. Pulsa uno para abrirlo.": { en: "Each conversation is a ticket. Click one to open it.", pt: "Cada conversa é um ticket. Clique em um para abri-lo." },
  "Qué chats ver": { en: "Which chats to show", pt: "Quais chats ver" },
  "+ Nuevo chat": { en: "+ New chat", pt: "+ Novo chat" },
  "Aún no has abierto ningún chat": { en: "You haven't opened any chats yet", pt: "Você ainda não abriu nenhum chat" },
  "Escríbeme por el chat y lo verás aquí, con su último mensaje.": {
    en: "Message me in the chat and you'll see it here, with its latest message.",
    pt: "Me escreva pelo chat e você o verá aqui, com a última mensagem.",
  },
  "Ningún proyecto con ese filtro": { en: "No projects match that filter", pt: "Nenhum projeto com esse filtro" },
  "Ningún chat con ese filtro": { en: "No chats match that filter", pt: "Nenhum chat com esse filtro" },
  "Prueba con «Todos» para verlos todos.": { en: "Try “All” to see them all.", pt: "Tente “Todos” para ver todos." },
  Cerrado: { en: "Closed", pt: "Fechado" },
  Abierto: { en: "Open", pt: "Aberto" },
  "Chats de tus clientes": { en: "Your clients' chats", pt: "Chats dos seus clientes" },
  "Todos los tickets abiertos por clientes. Pulsa uno para responder.": {
    en: "All tickets opened by clients. Click one to reply.",
    pt: "Todos os tickets abertos por clientes. Clique em um para responder.",
  },

  // ── /gracias ──
  "¡Gracias! He recibido tu mensaje.": { en: "Thanks! I've received your message.", pt: "Obrigado! Recebi sua mensagem." },
  "Lo reviso y te contesto en menos de 24 h. Si es urgente, escríbeme directamente a": {
    en: "I'll review it and reply in under 24 h. If it's urgent, email me directly at",
    pt: "Vou revisar e respondo em menos de 24 h. Se for urgente, me escreva diretamente em",
  },
  "← Volver al inicio": { en: "← Back to home", pt: "← Voltar ao início" },
  Gracias: { en: "Thank you", pt: "Obrigado" },

  // ── 404 ──
  "Esta página no existe.": { en: "This page doesn't exist.", pt: "Esta página não existe." },
  "Puede que el enlace esté mal o que la página se haya movido.": {
    en: "The link may be wrong or the page may have moved.",
    pt: "Pode ser que o link esteja errado ou que a página tenha mudado de lugar.",
  },
  "Ir al inicio": { en: "Go to homepage", pt: "Ir para o início" },
  "Página no encontrada": { en: "Page not found", pt: "Página não encontrada" },
};
