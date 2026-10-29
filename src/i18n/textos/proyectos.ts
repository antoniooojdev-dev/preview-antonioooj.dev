// Fichas de proyectos (/proyectos/<slug>, datos en src/data/projects.ts).
import type { Trad } from "../dict";

export const proyectos: Record<string, Trad> = {
  "← cd ../proyectos": { en: "← cd ../projects", pt: "← cd ../projetos" },
  sector: { en: "sector", pt: "setor" },
  año: { en: "year", pt: "ano" },
  tipo: { en: "type", pt: "tipo" },
  "// el problema": { en: "// the problem", pt: "// o problema" },
  "// la solución": { en: "// the solution", pt: "// a solução" },
  "// lo más destacado": { en: "// highlights", pt: "// destaques" },
  "// un vistazo al código": { en: "// a look at the code", pt: "// uma olhada no código" },
  "¿Necesitas algo parecido?": { en: "Need something similar?", pt: "Precisa de algo parecido?" },
  "// más proyectos": { en: "// more projects", pt: "// mais projetos" },
  Demo: { en: "Demo", pt: "Demo" },
  "Servidores de rol GTA V": { en: "GTA V roleplay servers", pt: "Servidores de RP GTA V" },
  Inmobiliaria: { en: "Real estate", pt: "Imobiliária" },
  Hostelería: { en: "Hospitality", pt: "Hotelaria" },

  // ── garajes FiveM ──
  "Muchos scripts de garaje confían en lo que envía el cliente, lo que permite a los tramposos duplicar coches, sacar vehículos ajenos o guardarlos desde cualquier punto del mapa. Además, cada uno funciona solo con un framework.": {
    en: "Many garage scripts trust what the client sends, which lets cheaters duplicate cars, take other people's vehicles or park them from anywhere on the map. On top of that, each one only works with one framework.",
    pt: "Muitos scripts de garagem confiam no que o cliente envia, o que permite a trapaceiros duplicar carros, tirar veículos alheios ou guardá-los de qualquer ponto do mapa. Além disso, cada um funciona com um só framework.",
  },
  "Recurso con una capa de compatibilidad que detecta ESX o QBCore y una arquitectura en la que el servidor valida todo: distancia real del jugador, propiedad del vehículo, matrícula y modelo leídos de la entidad y límite de peticiones. La interfaz NUI muestra el estado de cada vehículo y tiene buscador.": {
    en: "A resource with a compatibility layer that detects ESX or QBCore and an architecture where the server validates everything: the player's real distance, vehicle ownership, plate and model read from the entity, and rate limiting. The NUI shows each vehicle's status and has a search.",
    pt: "Recurso com uma camada de compatibilidade que detecta ESX ou QBCore e uma arquitetura em que o servidor valida tudo: distância real do jogador, propriedade do veículo, placa e modelo lidos da entidade e limite de requisições. A interface NUI mostra o estado de cada veículo e tem busca.",
  },
  "Validación anti-exploit completa en servidor": { en: "Full server-side anti-exploit validation", pt: "Validação anti-exploit completa no servidor" },
  "Compatible con ESX y QBCore (detección automática)": { en: "Compatible with ESX and QBCore (auto-detected)", pt: "Compatível com ESX e QBCore (detecção automática)" },
  "Depósito que recupera coches destruidos o perdidos": { en: "Impound that recovers destroyed or lost cars", pt: "Pátio que recupera carros destruídos ou perdidos" },
  "Export para scripts de policía y grúa": { en: "Export for police and tow scripts", pt: "Export para scripts de polícia e guincho" },

  // ── portal inmobiliario ──
  "Las inmobiliarias pequeñas dependen de los grandes portales y su web propia no capta clientes: no tiene un buscador útil, no se puede compartir una búsqueda ni ofrece nada que haga volver al usuario.": {
    en: "Small estate agencies depend on the big portals and their own website doesn't win clients: it has no useful search, you can't share a search and it offers nothing to bring users back.",
    pt: "As imobiliárias pequenas dependem dos grandes portais e o site próprio não capta clientes: não tem uma busca útil, não dá para compartilhar uma busca nem oferece nada que faça o usuário voltar.",
  },
  "Portal con filtros combinables que se guardan en la URL (para compartir búsquedas), favoritos persistentes, ficha de cada vivienda en un modal accesible con hipoteca estimada, calculadora de hipoteca completa y una herramienta de valoración que capta propietarios que quieren vender.": {
    en: "A portal with combinable filters saved in the URL (to share searches), persistent favourites, an accessible modal for each home with an estimated mortgage, a full mortgage calculator and a valuation tool that attracts owners who want to sell.",
    pt: "Portal com filtros combináveis que ficam na URL (para compartilhar buscas), favoritos persistentes, ficha de cada imóvel em um modal acessível com financiamento estimado, calculadora de financiamento completa e uma ferramenta de avaliação que capta proprietários que querem vender.",
  },
  "Filtros sincronizados con la URL": { en: "Filters synced with the URL", pt: "Filtros sincronizados com a URL" },
  "Calculadora de hipoteca con sistema francés": { en: "Mortgage calculator with French amortisation", pt: "Calculadora de financiamento com sistema francês" },
  "Valoración por mediana de €/m² de la zona": { en: "Valuation by the area's median €/m²", pt: "Avaliação pela mediana de €/m² da região" },
  "Imágenes SVG generadas por código: carga instantánea": { en: "Code-generated SVG images: instant loading", pt: "Imagens SVG geradas por código: carregamento instantâneo" },

  // ── restaurante ──
  "Un restaurante que gestiona las reservas por teléfono pierde llamadas en pleno servicio, sufre solapamientos y no tiene una carta online fácil de actualizar ni con información de alérgenos.": {
    en: "A restaurant handling bookings by phone misses calls mid-service, suffers double bookings and has no online menu that's easy to update or shows allergen info.",
    pt: "Um restaurante que gerencia reservas por telefone perde ligações em pleno serviço, sofre sobreposições e não tem um cardápio online fácil de atualizar nem com informação de alergênicos.",
  },
  "Web con carta por categorías y filtro de alérgenos, horario que indica en vivo si está abierto, y un sistema de reservas en PHP que calcula las horas libres según el aforo y la duración de cada mesa. Incluye una API REST y un panel de administración con login para ver y cancelar reservas.": {
    en: "A website with a menu by category and allergen filter, opening hours that show live whether it's open, and a PHP booking system that works out free slots from capacity and each table's duration. It includes a REST API and an admin panel with login to view and cancel bookings.",
    pt: "Site com cardápio por categorias e filtro de alergênicos, horário que mostra ao vivo se está aberto, e um sistema de reservas em PHP que calcula os horários livres conforme a lotação e a duração de cada mesa. Inclui uma API REST e um painel de administração com login para ver e cancelar reservas.",
  },
  "Aforo controlado por solapamiento de mesas": { en: "Capacity controlled by table overlap", pt: "Lotação controlada por sobreposição de mesas" },
  "Reservas atómicas: sin overbooking con peticiones simultáneas": { en: "Atomic bookings: no overbooking with simultaneous requests", pt: "Reservas atômicas: sem overbooking com requisições simultâneas" },
  "Panel de administración con CSRF y sesión segura": { en: "Admin panel with CSRF and a secure session", pt: "Painel de administração com CSRF e sessão segura" },
  "Sin base de datos ni dependencias": { en: "No database or dependencies", pt: "Sem banco de dados nem dependências" },
};
