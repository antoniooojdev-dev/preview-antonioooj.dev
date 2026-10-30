// ─────────────────────────────────────────────────────────────
//  Datos generales de la web. Edita aquí y se actualiza todo.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: "AntonioooJ",
  fullName: "Antonio J.",
  role: "Desarrollador web full-stack",
  url: "https://antonioooj.dev",
  email: "antonioooj.dev@gmail.com",
  location: "España · Remoto",
  available: true,
  responseTime: "menos de 24 h",
  // Horario de trabajo (lo usa «Ahora mismo» en Sobre mí). dias: 1 = lunes … 7 = domingo.
  horario: { zona: "Europe/Madrid", ciudad: "España", dias: [1, 2, 3, 4, 5], inicio: 9, fin: 19 },
  description:
    "Desarrollo webs y aplicaciones a medida con HTML, JavaScript y PHP. Código limpio, rápido y pensado para que tu proyecto crezca.",
  // Clave gratuita de https://web3forms.com (los mensajes llegan a tu email).
  // Si la dejas vacía, el formulario abre el cliente de correo del usuario.
  web3formsKey: "",
  // Dirección de la API del chat (/chat). Vacía = misma web (/api la reenvía el servidor).
  // Solo hay que ponerla si la API va en otro dominio, p. ej. "https://api.antonioooj.dev".
  chatApi: "",
  // Aviso legal: solo el nombre comercial. Nombre completo, NIF y domicilio se dan por email a
  // quien los pida (el aviso lo explica).
  legal: {
    owner: "AntonioooJ Dev",
  },
} as const;

export interface Social {
  label: string;
  href: string;
  handle: string;
}

export const socials: Social[] = [
  { label: "GitHub", href: "https://github.com/antonioooj", handle: "@antonioooj" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/antonioooj", handle: "in/antonioooj" },
  { label: "Instagram", href: "https://instagram.com/antonioooj.dev", handle: "@antonioooj.dev" },
];

export const nav = [
  { label: "Servicios", href: "/#servicios" },
  { label: "Trabajos", href: "/#proyectos" },
  { label: "Cómo trabajo", href: "/#proceso" },
  { label: "Contacto", href: "/#contacto" },
] as const;
