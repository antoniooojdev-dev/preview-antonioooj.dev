// ─────────────────────────────────────────────────────────────
//  Traducciones de la web (español → inglés y portugués).
//  La clave es el texto en español TAL CUAL se ve (los espacios y saltos de línea dan
//  igual: se comparan normalizados). src/scripts/i18n.ts busca cada texto de la página
//  en esta lista y lo cambia por el del idioma elegido.
//  Si cambias un texto en español en la web, cambia también su clave aquí o se quedará
//  sin traducir. Lo que no está aquí se ve en español.
// ─────────────────────────────────────────────────────────────

import { portada } from "./textos/portada";
import { servicios } from "./textos/servicios";
import { demos } from "./textos/demos";
import { proyectos } from "./textos/proyectos";
import { cuenta } from "./textos/cuenta";
import { chat } from "./textos/chat";
import { contacto } from "./textos/contacto";
import { legal } from "./textos/legal";
import { patrones } from "./textos/patrones";

export const IDIOMAS = [
  { id: "es", nombre: "Español", corto: "ES", locale: "es-ES" },
  { id: "en", nombre: "English", corto: "EN", locale: "en-GB" },
  { id: "pt", nombre: "Português", corto: "PT", locale: "pt-BR" },
] as const;

export type Idioma = (typeof IDIOMAS)[number]["id"];

export type Trad = { en: string; pt: string };

const D: Record<string, Trad> = {
  // ── cabecera y pie ──
  "AntonioooJ — Desarrollador web full-stack": { en: "AntonioooJ — Full-stack web developer", pt: "AntonioooJ — Desenvolvedor web full-stack" },
  Servicios: { en: "Services", pt: "Serviços" },
  Trabajos: { en: "Work", pt: "Trabalhos" },
  "Cómo trabajo": { en: "How I work", pt: "Como trabalho" },
  Preguntas: { en: "FAQ", pt: "Perguntas" },
  Contactar: { en: "Contact", pt: "Contato" },
  "Mi cuenta": { en: "My account", pt: "Minha conta" },
  "Abrir menú": { en: "Open menu", pt: "Abrir menu" },
  Idioma: { en: "Language", pt: "Idioma" },
  "Desarrollo webs y aplicaciones a medida con HTML, JavaScript y PHP. Código limpio, rápido y pensado para que tu proyecto crezca.": {
    en: "I build custom websites and web apps with HTML, JavaScript and PHP. Clean, fast code designed so your project can grow.",
    pt: "Desenvolvo sites e aplicações sob medida com HTML, JavaScript e PHP. Código limpo, rápido e pensado para o seu projeto crescer.",
  },
  Contacto: { en: "Contact", pt: "Contato" },
  Redes: { en: "Social", pt: "Redes" },
  Legal: { en: "Legal", pt: "Legal" },
  "Formulario de proyecto": { en: "Project form", pt: "Formulário de projeto" },
  "España · Remoto": { en: "Spain · Remote", pt: "Espanha · Remoto" },
  // pantalla de entrada (SiteLoader): «hago webs / apps / …»
  hago: { en: "I build", pt: "faço" },
  webs: { en: "websites", pt: "sites" },
  "scripts FiveM": { en: "FiveM scripts", pt: "scripts FiveM" },
  "bots de Discord": { en: "Discord bots", pt: "bots de Discord" },
  "Aviso legal": { en: "Legal notice", pt: "Aviso legal" },
  Privacidad: { en: "Privacy", pt: "Privacidade" },
  "Saltar al contenido": { en: "Skip to content", pt: "Pular para o conteúdo" },

  // ── bento: presentación ──
  "Antonio J. · Desarrollador web full-stack": { en: "Antonio J. · Full-stack web developer", pt: "Antonio J. · Desenvolvedor web full-stack" },
  "Webs, apps, scripts de FiveM y bots de Discord.": {
    en: "Websites, apps, FiveM scripts and Discord bots.",
    pt: "Sites, apps, scripts de FiveM e bots de Discord.",
  },
  "Lo diseño, lo programo y lo mantengo yo. Hablas siempre con quien escribe el código y el precio queda cerrado por escrito antes de empezar.": {
    en: "I design it, build it and maintain it myself. You always talk to the person writing the code, and the price is fixed in writing before I start.",
    pt: "Eu mesmo desenho, programo e mantenho. Você fala sempre com quem escreve o código e o preço fica fechado por escrito antes de começar.",
  },
  Hablemos: { en: "Let's talk", pt: "Vamos conversar" },
  "Ver trabajos": { en: "See my work", pt: "Ver trabalhos" },

  // ── bento: estado ──
  "Ahora mismo": { en: "Right now", pt: "Agora mesmo" },
  "En directo": { en: "Live", pt: "Ao vivo" },
  "Disponible para nuevos proyectos": { en: "Available for new projects", pt: "Disponível para novos projetos" },
  Programando: { en: "Coding", pt: "Programando" },
  "Agenda llena": { en: "Fully booked", pt: "Agenda cheia" },
  "En una reunión": { en: "In a meeting", pt: "Em uma reunião" },
  "En descanso": { en: "On a break", pt: "Em pausa" },
  "Fuera de horario": { en: "Off hours", pt: "Fora do horário" },
  "De vacaciones": { en: "On holiday", pt: "De férias" },
  "Tengo hueco para empezar un proyecto nuevo.": { en: "I have room to start a new project.", pt: "Tenho espaço para começar um projeto novo." },
  "Con las manos en el código.": { en: "Hands on the code.", pt: "Com as mãos no código." },
  "Ahora mismo a tope; te respondo en cuanto pueda.": { en: "Swamped right now; I'll reply as soon as I can.", pt: "No limite agora; respondo assim que puder." },
  "Hablando con un cliente.": { en: "Talking to a client.", pt: "Falando com um cliente." },
  "Recargando pilas, vuelvo enseguida.": { en: "Recharging, back in a bit.", pt: "Recarregando as energias, já volto." },
  "Te contesto mañana a primera hora.": { en: "I'll reply first thing tomorrow.", pt: "Respondo amanhã logo cedo." },
  "Desconectado unos días.": { en: "Offline for a few days.", pt: "Desconectado por alguns dias." },
  "Ahora mismo estoy con las manos en el código. Si me escribes, te contesto en cuanto levante la vista.": {
    en: "I'm deep in the code right now. Message me and I'll reply as soon as I look up.",
    pt: "Agora estou com a mão no código. Se me escrever, respondo assim que levantar a cabeça.",
  },
  "Tengo hueco para un proyecto nuevo. Es buen momento para contarme el tuyo.": {
    en: "I have room for a new project. It's a good time to tell me about yours.",
    pt: "Tenho espaço para um projeto novo. É um bom momento para me contar o seu.",
  },
  "La agenda está llena, pero te contesto igualmente y buscamos fecha.": {
    en: "My schedule is full, but I'll still reply and we'll find a date.",
    pt: "A agenda está cheia, mas respondo mesmo assim e achamos uma data.",
  },
  "Estoy hablando con un cliente. En cuanto termine, reviso tus mensajes.": {
    en: "I'm on a call with a client. I'll check your messages as soon as I'm done.",
    pt: "Estou falando com um cliente. Assim que terminar, vejo suas mensagens.",
  },
  "Un descanso corto para recargar. Vuelvo enseguida.": { en: "A short break to recharge. Back shortly.", pt: "Uma pausa curta para recarregar. Já volto." },
  "Ya he cerrado por hoy. Déjame un mensaje y lo leo mañana a primera hora.": {
    en: "I'm done for today. Leave me a message and I'll read it first thing tomorrow.",
    pt: "Já encerrei por hoje. Deixe uma mensagem e leio amanhã logo cedo.",
  },
  "Estoy fuera unos días. Tu mensaje me espera a la vuelta.": {
    en: "I'm away for a few days. Your message will be waiting when I'm back.",
    pt: "Estou fora por alguns dias. Sua mensagem me espera na volta.",
  },
  "Nota:": { en: "Note:", pt: "Nota:" },
  "Escríbeme": { en: "Message me", pt: "Fale comigo" },
  "Cuéntame tu proyecto": { en: "Tell me about your project", pt: "Conte seu projeto" },
  "Déjame un mensaje": { en: "Leave me a message", pt: "Deixe uma mensagem" },
  "proyecto en marcha": { en: "project in progress", pt: "projeto em andamento" },
  "proyectos en marcha": { en: "projects in progress", pt: "projetos em andamento" },
  "hueco libre este mes": { en: "slot left this month", pt: "vaga livre este mês" },
  "huecos libres este mes": { en: "slots left this month", pt: "vagas livres este mês" },
  "sin huecos este mes": { en: "no slots left this month", pt: "sem vagas este mês" },
  Desde: { en: "Since", pt: "Desde" },
  "Respondo en menos de 24 h": { en: "I reply in under 24 h", pt: "Respondo em menos de 24 h" },

  // ── bento: hora ──
  "Mi hora": { en: "My time", pt: "Meu horário" },
  "Mi hora · España": { en: "My time · Spain", pt: "Meu horário · Espanha" },
  España: { en: "Spain", pt: "Espanha" },
  "Tu hora": { en: "Your time", pt: "Seu horário" },
  "Cambiar país": { en: "Change country", pt: "Mudar país" },
  "Elige tu país": { en: "Choose your country", pt: "Escolha seu país" },
  "Así ves la diferencia entre tu hora y la mía.": {
    en: "So you can see the difference between your time and mine.",
    pt: "Assim você vê a diferença entre o seu horário e o meu.",
  },
  "Buscar país o ciudad…": { en: "Search country or city…", pt: "Buscar país ou cidade…" },
  "Usar el de mi dispositivo": { en: "Use my device's", pt: "Usar o do meu dispositivo" },
  "Sin resultados": { en: "No results", pt: "Sem resultados" },
  Cerrar: { en: "Close", pt: "Fechar" },
  "Tenemos la misma hora": { en: "We're on the same time", pt: "Temos o mesmo horário" },
  "por delante de España": { en: "ahead of Spain", pt: "à frente da Espanha" },
  "por detrás de España": { en: "behind Spain", pt: "atrás da Espanha" },
  hoy: { en: "today", pt: "hoje" },
  mañana: { en: "tomorrow", pt: "amanhã" },
  ayer: { en: "yesterday", pt: "ontem" },

  // ── bento: Spotify ──
  Spotify: { en: "Spotify", pt: "Spotify" },
  "Trabajo con música": { en: "I work with music on", pt: "Trabalho com música" },
  "Aquí sale lo que suena en mi Spotify.": { en: "Whatever is playing on my Spotify shows up here.", pt: "Aqui aparece o que toca no meu Spotify." },
  "Sonando ahora": { en: "Playing now", pt: "Tocando agora" },
  "Lo último que escuché": { en: "Last played", pt: "Última que ouvi" },
  "Lo último": { en: "Last played", pt: "Última" },

  // ── bento: pack, servicios, contacto ──
  "Concesionario del pack de vehículos para FiveM": { en: "Car dealership from the FiveM vehicle pack", pt: "Concessionária do pack de veículos para FiveM" },
  "Nuevo · Script FiveM": { en: "New · FiveM script", pt: "Novo · Script FiveM" },
  "Pack de vehículos": { en: "Vehicle pack", pt: "Pack de veículos" },
  "Concesionario con vendedor, gasolineras y velocímetro con cinturón.": {
    en: "Dealership with a salesperson, gas stations and a speedometer with seatbelt.",
    pt: "Concessionária com vendedor, postos de gasolina e velocímetro com cinto.",
  },
  "Web online": { en: "Website", pt: "Site" },
  "Aplicación web": { en: "Web app", pt: "Aplicação web" },
  Mantenimiento: { en: "Maintenance", pt: "Manutenção" },
  "Scripts FiveM": { en: "FiveM scripts", pt: "Scripts FiveM" },
  "Bots de Discord": { en: "Discord bots", pt: "Bots de Discord" },
  "Tu negocio en internet con una web rápida, bonita y fácil de encontrar en Google.": {
    en: "Your business online with a fast, good-looking website that's easy to find on Google.",
    pt: "Seu negócio na internet com um site rápido, bonito e fácil de achar no Google.",
  },
  "Paneles, reservas, CRMs o herramientas internas hechas exactamente para tu flujo de trabajo.": {
    en: "Dashboards, bookings, CRMs or internal tools built exactly for the way you work.",
    pt: "Painéis, reservas, CRMs ou ferramentas internas feitas exatamente para o seu fluxo de trabalho.",
  },
  "Scripts a medida para tu servidor de rol: trabajos, garajes, tiendas, HUDs e interfaces NUI.": {
    en: "Custom scripts for your roleplay server: jobs, garages, shops, HUDs and NUI interfaces.",
    pt: "Scripts sob medida para o seu servidor de RP: empregos, garagens, lojas, HUDs e interfaces NUI.",
  },
  "Automatiza tu comunidad: tickets, verificación, moderación, niveles, sorteos y avisos programados.": {
    en: "Automate your community: tickets, verification, moderation, levels, giveaways and scheduled posts.",
    pt: "Automatize sua comunidade: tickets, verificação, moderação, níveis, sorteios e avisos programados.",
  },
  "¿Tienes alguna idea en mente? Hablemos": {
    en: "Got an idea in mind? Let's talk",
    pt: "Tem alguma ideia em mente? Vamos conversar",
  },

  // ── trabajos ──
  "Lo último que he hecho": { en: "Recent work", pt: "O que fiz por último" },
  "Webs de negocio, scripts de FiveM y automatización de Discord. En cada uno cuento qué problema había y cómo lo resolví.": {
    en: "Business websites, FiveM scripts and Discord automation. For each one I explain the problem and how I solved it.",
    pt: "Sites de negócio, scripts de FiveM e automação de Discord. Em cada um conto qual era o problema e como resolvi.",
  },
  Tecnologías: { en: "Technologies", pt: "Tecnologias" },
  "Web + backend PHP": { en: "Website + PHP backend", pt: "Site + backend PHP" },
  "Web de negocio": { en: "Business website", pt: "Site de negócio" },
  "Script FiveM": { en: "FiveM script", pt: "Script FiveM" },
  "Bot / automatización": { en: "Bot / automation", pt: "Bot / automação" },
  "Web de servidor de GTA - FiveM": { en: "GTA - FiveM server website", pt: "Site de servidor de GTA - FiveM" },
  "Web de restaurante con reservas": { en: "Restaurant website with bookings", pt: "Site de restaurante com reservas" },
  "Portal inmobiliario": { en: "Real estate portal", pt: "Portal imobiliário" },
  "Sistema de garajes para FiveM": { en: "Garage system for FiveM", pt: "Sistema de garagens para FiveM" },
  "Bot de Discord automatizado": { en: "Automated Discord bot", pt: "Bot de Discord automatizado" },
  "Web y panel de jugadores de un servidor de rol: login con Discord, sugerencias con votos, postulaciones y estado en vivo.": {
    en: "Website and player panel for a roleplay server: Discord login, voted suggestions, applications and live status.",
    pt: "Site e painel de jogadores de um servidor de RP: login com Discord, sugestões com votos, candidaturas e status ao vivo.",
  },
  "Carta dinámica, estado «abierto ahora» y reservas online con control de aforo real.": {
    en: "Dynamic menu, “open now” status and online bookings with real capacity control.",
    pt: "Cardápio dinâmico, status “aberto agora” e reservas online com controle real de lotação.",
  },
  "Buscador avanzado, favoritos, calculadora de hipoteca y valoración automática de viviendas.": {
    en: "Advanced search, favourites, mortgage calculator and automatic home valuation.",
    pt: "Busca avançada, favoritos, calculadora de financiamento e avaliação automática de imóveis.",
  },
  "Garajes y depósito con interfaz NUI propia, compatible con ESX y QBCore y validado en servidor.": {
    en: "Garages and impound with a custom NUI interface, compatible with ESX and QBCore and validated server-side.",
    pt: "Garagens e pátio com interface NUI própria, compatível com ESX e QBCore e validado no servidor.",
  },
  "Tickets, verificación, automod, niveles, sorteos, encuestas y mensajes programados en un solo bot.": {
    en: "Tickets, verification, automod, levels, giveaways, polls and scheduled messages in a single bot.",
    pt: "Tickets, verificação, automod, níveis, sorteios, enquetes e mensagens programadas em um só bot.",
  },

  // ── en marcha (demos) ──
  "Trabajando actualmente": { en: "Currently working on", pt: "Trabalhando atualmente" },
  "comprobando…": { en: "checking…", pt: "verificando…" },
  "en línea": { en: "online", pt: "online" },
  apagada: { en: "offline", pt: "desligada" },
  "sin publicar": { en: "not published", pt: "não publicada" },
  "en desarrollo": { en: "in development", pt: "em desenvolvimento" },
  "en pruebas": { en: "testing", pt: "em testes" },
  terminada: { en: "finished", pt: "concluída" },
  "Servidor de rol FiveM": { en: "FiveM roleplay server", pt: "Servidor de RP FiveM" },
  "Servidor FiveM": { en: "FiveM server", pt: "Servidor FiveM" },
  "Servidor de GTA - FiveM": { en: "GTA - FiveM server", pt: "Servidor de GTA - FiveM" },
  "actualizada el": { en: "updated", pt: "atualizada em" },
  "Últimas modificaciones": { en: "Latest changes", pt: "Últimas alterações" },
  "Abrir demo": { en: "Open demo", pt: "Abrir demo" },
  "Publicación próximamente": { en: "Coming soon", pt: "Publicação em breve" },
  "registro de cambios": { en: "changelog", pt: "registro de alterações" },
  "más reciente": { en: "latest", pt: "mais recente" },
  Nuevo: { en: "New", pt: "Novo" },
  Mejora: { en: "Improvement", pt: "Melhoria" },
  Ajuste: { en: "Tweak", pt: "Ajuste" },
  Corrección: { en: "Fix", pt: "Correção" },
  "Plataforma completa del servidor: web pública, login con Discord, panel de usuario y panel de administración conectado a un bot.": {
    en: "Full server platform: public website, Discord login, user panel and an admin panel connected to a bot.",
    pt: "Plataforma completa do servidor: site público, login com Discord, painel de usuário e painel de administração conectado a um bot.",
  },
  "Web y panel del servidor ClickSense RP: portada pública, login con Discord, panel de usuario, administración y bot de Discord integrado.": {
    en: "Website and panel for the ClickSense RP server: public homepage, Discord login, user panel, administration and a built-in Discord bot.",
    pt: "Site e painel do servidor ClickSense RP: página pública, login com Discord, painel de usuário, administração e bot de Discord integrado.",
  },
  "Login con Discord y perfil de usuario": { en: "Discord login and user profile", pt: "Login com Discord e perfil de usuário" },
  "Whitelist con test, postulaciones y sugerencias": { en: "Whitelist with a test, applications and suggestions", pt: "Whitelist com teste, candidaturas e sugestões" },
  "Tickets, sanciones, calendario y comercios": { en: "Tickets, sanctions, calendar and businesses", pt: "Tickets, punições, calendário e comércios" },
  "Panel de staff y avisos por MD con el bot": { en: "Staff panel and DM notifications from the bot", pt: "Painel de staff e avisos por DM com o bot" },
  "Whitelist, postulaciones y buzón de sugerencias": { en: "Whitelist, applications and suggestion box", pt: "Whitelist, candidaturas e caixa de sugestões" },
  "Facciones, normativas, código penal y academias LSPD/LSSD": { en: "Factions, rules, penal code and LSPD/LSSD academies", pt: "Facções, regras, código penal e academias LSPD/LSSD" },
  "Panel de staff con avisos por MD mediante el bot": { en: "Staff panel with DM notifications through the bot", pt: "Painel de staff com avisos por DM pelo bot" },

  // ── cómo trabajo ──
  "Una persona, no una agencia": { en: "One person, not an agency", pt: "Uma pessoa, não uma agência" },
  "Sobre mí": { en: "About me", pt: "Sobre mim" },
  Soy: { en: "I'm", pt: "Sou" },
  "Casi todo lo que hago va con HTML, JavaScript y PHP; para FiveM uso Lua y para Discord, discord.js.": {
    en: "Almost everything I build uses HTML, JavaScript and PHP; for FiveM I use Lua and for Discord, discord.js.",
    pt: "Quase tudo o que faço usa HTML, JavaScript e PHP; para FiveM uso Lua e para Discord, discord.js.",
  },
  "Si una herramienta nueva ahorra trabajo la uso, y si no, no. Lo que importa es que la web funcione, se entienda y te traiga clientes.": {
    en: "If a new tool saves work I use it; if not, I don't. What matters is that the site works, makes sense and brings you clients.",
    pt: "Se uma ferramenta nova economiza trabalho eu uso; se não, não. O que importa é que o site funcione, seja claro e traga clientes.",
  },
  Hablamos: { en: "We talk", pt: "Conversamos" },
  Presupuesto: { en: "Quote", pt: "Orçamento" },
  Desarrollo: { en: "Development", pt: "Desenvolvimento" },
  "Entrega y soporte": { en: "Delivery and support", pt: "Entrega e suporte" },
  "día 1": { en: "day 1", pt: "dia 1" },
  "hasta 2 semanas": { en: "up to 2 weeks", pt: "até 2 semanas" },
  "+30 días": { en: "+30 days", pt: "+30 dias" },
  "Me cuentas la idea en una llamada o videollamada de 30 minutos. Es gratis y no tienes que saber nada técnico.": {
    en: "You tell me the idea in a 30-minute call or video call. It's free and you don't need to know anything technical.",
    pt: "Você me conta a ideia em uma ligação ou videochamada de 30 minutos. É grátis e não precisa saber nada técnico.",
  },
  "Te mando por escrito qué voy a hacer, cuánto cuesta y cuándo lo tendrás. Ese precio no se mueve a mitad de camino.": {
    en: "I send you in writing what I'll do, what it costs and when you'll have it. That price doesn't change halfway through.",
    pt: "Mando por escrito o que vou fazer, quanto custa e quando você terá. Esse preço não muda no meio do caminho.",
  },
  "Voy por fases y cada semana te paso un enlace de prueba con lo hecho. Si algo no te convence, se cambia antes de seguir.": {
    en: "I work in stages and every week send you a preview link with progress. If something doesn't convince you, it changes before moving on.",
    pt: "Trabalho por fases e toda semana mando um link de teste com o que foi feito. Se algo não convencer, muda antes de seguir.",
  },
  "Lo publico, te enseño a manejarlo y durante 30 días cualquier ajuste va incluido.": {
    en: "I launch it, show you how to manage it, and any tweak for 30 days is included.",
    pt: "Publico, ensino você a usar e durante 30 dias qualquer ajuste está incluído.",
  },
  "Cómo lo hago": { en: "How I do it", pt: "Como faço" },
  "Hablas conmigo": { en: "You talk to me", pt: "Você fala comigo" },
  "Sin comerciales ni gestores de cuenta. Quien te contesta es quien lo programa.": {
    en: "No sales reps or account managers. The person who replies is the one who codes it.",
    pt: "Sem vendedores nem gerentes de conta. Quem responde é quem programa.",
  },
  "Código que otro pueda tocar": { en: "Code others can work on", pt: "Código que outro possa mexer" },
  "Ordenado y explicado, para que mañana lo amplíe yo o cualquier otra persona.": {
    en: "Tidy and documented, so tomorrow I or anyone else can extend it.",
    pt: "Organizado e explicado, para que amanhã eu ou qualquer outra pessoa possa ampliar.",
  },
  "Webs ligeras": { en: "Lightweight sites", pt: "Sites leves" },
  "Cargan rápido en el móvil, que es donde te va a ver la mayoría de la gente.": {
    en: "They load fast on mobile, which is where most people will see you.",
    pt: "Carregam rápido no celular, que é onde a maioria vai ver você.",
  },
  "Las cuentas claras": { en: "Clear numbers", pt: "Contas claras" },
  "Precio cerrado, avances cada semana y el código entero es tuyo al terminar.": {
    en: "Fixed price, weekly progress and the full code is yours at the end.",
    pt: "Preço fechado, avanços toda semana e o código inteiro é seu no final.",
  },
  "Con qué trabajo": { en: "What I work with", pt: "Com o que trabalho" },

  // ── preguntas ──
  "Lo que más me preguntan": { en: "What people ask me most", pt: "O que mais me perguntam" },

  // ── opinión (debajo de las preguntas) ──
  "¿Qué te ha parecido?": { en: "What did you think?", pt: "O que você achou?" },
  "Tu opinión sobre el servicio, la web o lo que quieras me ayuda a mejorar.": {
    en: "Your feedback on the service, the website or anything else helps me improve.",
    pt: "Sua opinião sobre o serviço, o site ou o que quiser me ajuda a melhorar.",
  },
  "Dar mi opinión": { en: "Give feedback", pt: "Dar minha opinião" },
  "Lo leo yo personalmente. Gracias por tomarte el tiempo.": {
    en: "I read it personally. Thanks for taking the time.",
    pt: "Eu mesmo leio. Obrigado por dedicar seu tempo.",
  },
  "¿Sobre qué es?": { en: "What is it about?", pt: "Sobre o que é?" },
  "El servicio": { en: "The service", pt: "O serviço" },
  "La web": { en: "The website", pt: "O site" },
  "Otra cosa": { en: "Something else", pt: "Outra coisa" },
  Puntuación: { en: "Rating", pt: "Nota" },
  "Tu opinión": { en: "Your feedback", pt: "Sua opinião" },
  "Qué te ha gustado, qué mejorarías…": { en: "What you liked, what you'd improve…", pt: "O que você gostou, o que melhoraria…" },
  Nombre: { en: "Name", pt: "Nome" },
  opcional: { en: "optional", pt: "opcional" },
  "opcional · por si quieres respuesta": { en: "optional · if you'd like a reply", pt: "opcional · caso queira resposta" },
  "email o @discord": { en: "email or @discord", pt: "email ou @discord" },
  Cancelar: { en: "Cancel", pt: "Cancelar" },
  "Enviar opinión": { en: "Send feedback", pt: "Enviar opinião" },
  "¡Gracias!": { en: "Thank you!", pt: "Obrigado!" },
  "He recibido tu opinión.": { en: "I've received your feedback.", pt: "Recebi sua opinião." },
  "Muy mal": { en: "Very bad", pt: "Muito ruim" },
  Mejorable: { en: "Could be better", pt: "Pode melhorar" },
  Bien: { en: "Good", pt: "Bom" },
  "Muy bien": { en: "Very good", pt: "Muito bom" },
  "¡Excelente!": { en: "Excellent!", pt: "Excelente!" },
  "Elige una puntuación de 1 a 5.": { en: "Pick a rating from 1 to 5.", pt: "Escolha uma nota de 1 a 5." },
  "Escribe un poco más sobre tu opinión.": { en: "Write a bit more about your feedback.", pt: "Escreva um pouco mais sobre sua opinião." },
  "¿No está la tuya? Escríbeme y te contesto en menos de 24 horas.": {
    en: "Not here? Message me and I'll reply in under 24 hours.",
    pt: "Não está aqui? Me escreva e respondo em menos de 24 horas.",
  },
  "¿Cuánto cuesta una web?": { en: "How much does a website cost?", pt: "Quanto custa um site?" },
  "Depende del alcance: cada web o aplicación se presupuesta según lo que necesites. Tras una primera llamada te doy un presupuesto cerrado, sin costes ocultos.": {
    en: "It depends on the scope: every website or app is quoted based on what you need. After a first call I give you a fixed quote, with no hidden costs.",
    pt: "Depende do escopo: cada site ou aplicação é orçado conforme o que você precisa. Depois de uma primeira conversa passo um orçamento fechado, sem custos ocultos.",
  },
  "¿Cómo se paga?": { en: "How do payments work?", pt: "Como é o pagamento?" },
  "Normalmente 40 % al empezar, 30 % a mitad del proyecto y 30 % en la entrega. Emito factura con IVA. Acepto transferencia y Bizum.": {
    en: "Usually 40% to start, 30% halfway through and 30% on delivery. I issue invoices with VAT. I accept bank transfer and Bizum.",
    pt: "Normalmente 40% no início, 30% na metade do projeto e 30% na entrega. Emito fatura com IVA. Aceito transferência e Bizum.",
  },
  "¿Cuánto tarda?": { en: "How long does it take?", pt: "Quanto tempo leva?" },
  "Como mucho 2 semanas, sea una web, una aplicación, un script o un bot. Solo un proyecto excepcionalmente grande puede tardar más, y en ese caso te lo digo antes de empezar y el plazo va por escrito en el presupuesto.": {
    en: "Two weeks at most, whether it's a website, an app, a script or a bot. Only an exceptionally large project can take longer, and if so I'll tell you before we start and the deadline goes in writing in the quote.",
    pt: "No máximo 2 semanas, seja um site, uma aplicação, um script ou um bot. Só um projeto excepcionalmente grande pode levar mais, e nesse caso aviso antes de começar e o prazo vai por escrito no orçamento.",
  },
  "¿El código y la web son míos?": { en: "Do I own the code and the website?", pt: "O código e o site são meus?" },
  "Sí. Al terminar el pago la web, el dominio y todo el código fuente son tuyos. No hay dependencias conmigo ni licencias raras.": {
    en: "Yes. Once paid, the website, the domain and all the source code are yours. No lock-in with me and no strange licences.",
    pt: "Sim. Ao concluir o pagamento, o site, o domínio e todo o código-fonte são seus. Sem dependência de mim nem licenças estranhas.",
  },
  "¿Podré editar los contenidos yo mismo?": { en: "Will I be able to edit the content myself?", pt: "Vou poder editar o conteúdo sozinho?" },
  "Sí, si lo necesitas incluyo un panel de administración sencillo y te enseño a usarlo. También puedo encargarme yo con un plan de mantenimiento.": {
    en: "Yes. If you need it I include a simple admin panel and show you how to use it. I can also take care of it with a maintenance plan.",
    pt: "Sim, se precisar incluo um painel de administração simples e ensino a usar. Também posso cuidar disso com um plano de manutenção.",
  },
  "¿Te encargas del dominio y el hosting?": { en: "Do you handle the domain and hosting?", pt: "Você cuida do domínio e da hospedagem?" },
  "Sí. Te ayudo a elegirlos, los dejo configurados a tu nombre (con SSL y correo si lo necesitas) y te explico los costes anuales.": {
    en: "Yes. I help you choose them, set them up in your name (with SSL and email if you need it) and explain the yearly costs.",
    pt: "Sim. Ajudo a escolher, deixo tudo configurado no seu nome (com SSL e e-mail se precisar) e explico os custos anuais.",
  },
  "Ya tengo una web, ¿puedes mejorarla?": { en: "I already have a website, can you improve it?", pt: "Já tenho um site, você pode melhorar?" },
  "Claro. Hago auditorías de velocidad, SEO y seguridad, y puedo rediseñarla o arreglar lo que no funcione sin empezar de cero.": {
    en: "Of course. I run speed, SEO and security audits, and I can redesign it or fix what doesn't work without starting from scratch.",
    pt: "Claro. Faço auditorias de velocidade, SEO e segurança, e posso redesenhar ou consertar o que não funciona sem começar do zero.",
  },
};

/** Normaliza espacios para comparar textos. */
export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// el resto de la web va por zonas en src/i18n/textos/
const TABLA = new Map<string, Trad>();
for (const lista of [D, portada, servicios, demos, proyectos, cuenta, chat, contacto, legal]) {
  for (const [es, tr] of Object.entries(lista)) TABLA.set(norm(es), tr);
}

// Textos con partes variables (números, nombres…). $1, $2… son los grupos de la expresión.
const PATRONES: [RegExp, Trad][] = Object.entries(patrones).map(([re, tr]) => [new RegExp(`^${re}$`), tr]);

// del inglés/portugués al español: si un script vuelve a escribir un texto ya traducido,
// así se sabe cuál era el original y se puede cambiar otra vez de idioma
const INVERSA = new Map<string, string>();
for (const [es, tr] of TABLA) {
  for (const x of [norm(tr.en), norm(tr.pt)]) if (x !== es && !INVERSA.has(x)) INVERSA.set(x, es);
}

const SEP = " · ";

function traducir(es: string, idioma: "en" | "pt"): string | undefined {
  const fijo = TABLA.get(es);
  if (fijo) return fijo[idioma];
  for (const [re, tr] of PATRONES) {
    const m = es.match(re);
    // los grupos también se traducen si son textos conocidos («hace 3 días · Abierto»)
    if (m) return tr[idioma].replace(/\$(\d)/g, (_, i) => t(m[+i] ?? "", idioma));
  }
  // «Plazo · hasta 2 semanas», «Web de negocio · 2026»: cada trozo por separado
  if (es.includes(SEP)) {
    const partes = es.split(SEP);
    const trad = partes.map((p) => traducir(p, idioma));
    if (trad.some((x) => x !== undefined)) return trad.map((x, i) => x ?? partes[i]).join(SEP);
  }
  return undefined;
}

/** Traduce un texto en español; si no está en la lista, lo devuelve tal cual. */
export function t(es: string, idioma: Idioma): string {
  if (idioma === "es") return es;
  return traducir(norm(es), idioma) ?? es;
}

/** ¿Hay traducción para este texto? */
export const tieneTraduccion = (es: string) => {
  const n = norm(es);
  return n !== "" && traducir(n, "en") !== undefined;
};

/** Si el texto es una traducción conocida, su original en español. */
export const original = (texto: string) => INVERSA.get(norm(texto));
