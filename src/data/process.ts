export interface Step {
  title: string;
  description: string;
  duration: string;
}

export const process: Step[] = [
  {
    title: "Hablamos",
    description:
      "Me cuentas la idea en una llamada o videollamada de 30 minutos. Es gratis y no tienes que saber nada técnico.",
    duration: "día 1",
  },
  {
    title: "Presupuesto",
    description:
      "Te mando por escrito qué voy a hacer, cuánto cuesta y cuándo lo tendrás. Ese precio no se mueve a mitad de camino.",
    duration: "48 h",
  },
  {
    title: "Desarrollo",
    description:
      "Voy por fases y cada semana te paso un enlace de prueba con lo hecho. Si algo no te convence, se cambia antes de seguir.",
    duration: "hasta 2 semanas",
  },
  {
    title: "Entrega y soporte",
    description:
      "Lo publico, te enseño a manejarlo y durante 30 días cualquier ajuste va incluido.",
    duration: "+30 días",
  },
];
