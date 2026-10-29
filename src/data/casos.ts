// ─────────────────────────────────────────────────────────────
//  Casos de ejemplo de «Web online» y «Aplicación web»: webs y apps
//  completas inventadas (marcas ficticias) que se recorren en
//  /servicios/web/<id> y /servicios/app/<id>. Cada una es un
//  componente de src/components/casos/.
// ─────────────────────────────────────────────────────────────

export interface Caso {
  id: string;
  servicio: "web" | "app";
  nombre: string;
  sector: string;
  resumen: string;
  /** Lo que se puede probar dentro */
  funciones: string[];
  /** Colores de la marca del caso (para su tarjeta) */
  color: string;
  fondo: string;
  /** Icono de Font Awesome (estilo sólido) */
  icono: string;
}

export const casos: Caso[] = [
  // ── webs online ──
  {
    id: "brasa",
    servicio: "web",
    nombre: "Brasa & Olivo",
    sector: "Restaurante mediterráneo",
    resumen: "Web de restaurante con carta filtrable por alérgenos, ficha de cada plato con maridaje y reservas con disponibilidad por horas.",
    funciones: ["Carta con filtros", "Ficha de cada plato", "Reserva en 3 pasos", "Menú del día", "Reseñas"],
    color: "#c2410c",
    fondo: "#faf3e8",
    icono: "fire-flame-curved",
  },
  {
    id: "clinica",
    servicio: "web",
    nombre: "Clínica Alba",
    sector: "Fisioterapia y salud",
    resumen: "Web de clínica con cita online paso a paso, test para saber qué tratamiento necesitas, equipo, tarifas y mutuas.",
    funciones: ["Cita online", "Mis citas", "Test de síntomas", "Equipo", "Comprobador de mutuas"],
    color: "#0f766e",
    fondo: "#ecf7f5",
    icono: "hand-holding-medical",
  },
  {
    id: "gym",
    servicio: "web",
    nombre: "Forja Training Club",
    sector: "Gimnasio y entrenamiento",
    resumen: "Web de gimnasio con horario de clases filtrable, tarifas mensual/anual, calculadoras y reserva de clase de prueba.",
    funciones: ["Horario de clases", "Tarifas", "Calculadora IMC y calorías", "Entrenadores", "Clase de prueba"],
    color: "#84cc16",
    fondo: "#0c0f0a",
    icono: "dumbbell",
  },
  // ── aplicaciones web ──
  {
    id: "agendo",
    servicio: "app",
    nombre: "Agendo",
    sector: "Agenda de citas · barbería",
    resumen: "Web de barbería con reserva online según el horario de cada barbero, «Mis citas» para el cliente y panel del equipo con la agenda de cada profesional.",
    funciones: ["Web con reserva online", "Mis citas", "Agenda por profesional", "Horarios del equipo", "Panel con roles", "Ingresos y ocupación"],
    color: "#6366f1",
    fondo: "#f5f5ff",
    icono: "calendar-check",
  },
];

export const casosDe = (servicio: Caso["servicio"]) => casos.filter((c) => c.servicio === servicio);
