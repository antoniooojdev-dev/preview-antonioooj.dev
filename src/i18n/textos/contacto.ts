// /contacto: página, formulario (src/components/ContactForm.astro) y sus mensajes
// (src/scripts/contact.ts). Los valores que se envían siguen en español: solo cambia lo que se ve.
import type { Trad } from "../dict";

export const contacto: Record<string, Trad> = {
  "Cuéntame tu proyecto web y te respondo en menos de 24 horas con una propuesta sin compromiso.": {
    en: "Tell me about your web project and I'll reply in under 24 hours with a no-obligation proposal.",
    pt: "Conte seu projeto web e respondo em menos de 24 horas com uma proposta sem compromisso.",
  },
  "Hablemos de tu proyecto": { en: "Let's talk about your project", pt: "Vamos falar do seu projeto" },
  "Rellena el formulario con lo que sepas: no hace falta tenerlo todo claro. Te respondo en menos de 24 h y, si encaja, agendamos una llamada gratuita.": {
    en: "Fill in the form with whatever you know: you don't need to have it all figured out. I'll reply in under 24 h and, if it's a fit, we'll book a free call.",
    pt: "Preencha o formulário com o que souber: não precisa ter tudo claro. Respondo em menos de 24 h e, se fizer sentido, marcamos uma ligação gratuita.",
  },
  "// qué pasa después": { en: "// what happens next", pt: "// o que acontece depois" },
  "// chat directo": { en: "// live chat", pt: "// chat direto" },
  "// prefieres email": { en: "// prefer email", pt: "// prefere e-mail" },
  "// redes": { en: "// social", pt: "// redes" },
  "Entra con Discord y escríbeme por el chat: la conversación queda guardada.": {
    en: "Sign in with Discord and message me in the chat: the conversation is saved.",
    pt: "Entre com o Discord e me escreva pelo chat: a conversa fica salva.",
  },

  // ── formulario ──
  "Empresa o proyecto": { en: "Company or project", pt: "Empresa ou projeto" },
  "(opcional)": { en: "(optional)", pt: "(opcional)" },
  "¿Qué necesitas?": { en: "What do you need?", pt: "Do que você precisa?" },
  "Bot de Discord": { en: "Discord bot", pt: "Bot de Discord" },
  Otro: { en: "Other", pt: "Outro" },
  "Presupuesto aproximado": { en: "Approximate budget", pt: "Orçamento aproximado" },
  "Selecciona…": { en: "Select…", pt: "Selecione…" },
  "Aún no lo sé": { en: "Not sure yet", pt: "Ainda não sei" },
  "¿Para cuándo?": { en: "By when?", pt: "Para quando?" },
  "Lo antes posible": { en: "As soon as possible", pt: "O quanto antes" },
  "1 mes": { en: "1 month", pt: "1 mês" },
  "2–3 meses": { en: "2–3 months", pt: "2–3 meses" },
  "Sin prisa": { en: "No rush", pt: "Sem pressa" },
  "Qué hace tu negocio, qué quieres conseguir, si tienes web actual, ejemplos que te gusten…": {
    en: "What your business does, what you want to achieve, whether you have a website now, examples you like…",
    pt: "O que seu negócio faz, o que você quer alcançar, se já tem site, exemplos de que gosta…",
  },
  "He leído y acepto la": { en: "I have read and accept the", pt: "Li e aceito a" },
  "política de privacidad": { en: "privacy policy", pt: "política de privacidade" },
  "Enviar proyecto": { en: "Send project", pt: "Enviar projeto" },
  "Dime tu nombre.": { en: "Tell me your name.", pt: "Diga seu nome." },
  "Revisa el email.": { en: "Check your email address.", pt: "Confira o e-mail." },
  "Elige un tipo de proyecto.": { en: "Choose a project type.", pt: "Escolha um tipo de projeto." },
  "Cuéntame un poco más (mín. 20 caracteres).": { en: "Tell me a bit more (min. 20 characters).", pt: "Conte um pouco mais (mín. 20 caracteres)." },
  "Necesito tu consentimiento.": { en: "I need your consent.", pt: "Preciso do seu consentimento." },
  "Se ha abierto tu cliente de correo con el mensaje listo para enviar.": {
    en: "Your email app has opened with the message ready to send.",
    pt: "Seu aplicativo de e-mail foi aberto com a mensagem pronta para enviar.",
  },
  "Enviando…": { en: "Sending…", pt: "Enviando…" },
};
