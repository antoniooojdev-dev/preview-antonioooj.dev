// ─────────────────────────────────────────────────────────────
//  Catálogo de scripts FiveM de /servicios/fivem (sección «scripts»).
//  Cada script es una «carpeta» del explorador de recursos; al pulsarla
//  se abre su ficha en /servicios/fivem/<id>:
//    - disponibles   -> src/pages/servicios/fivem/[pack].astro (datos en packs.ts)
//    - en desarrollo -> su página «próximamente» (policia.astro, inventario.astro…)
//  Para añadir uno nuevo: una entrada aquí + su ficha.
// ─────────────────────────────────────────────────────────────

export type EstadoScript = "disponible" | "desarrollo";

export interface ScriptFivem {
  id: string;
  nombre: string;
  /** nombre de la carpeta del recurso en el servidor */
  recurso: string;
  icono: string;
  categoria: string;
  estado: EstadoScript;
  resumen: string;
  /** 3 cosas que lo definen, para la tarjeta */
  claves: string[];
  frameworks: string[];
  /** captura de cabecera de la tarjeta; sin ella sale la portada «compilando» */
  portada?: string;
  /** cifras pequeñas del pie de la tarjeta */
  datos: { v: string; l: string }[];
}

export const scriptsFivem: ScriptFivem[] = [
  {
    id: "sistema-bandas",
    nombre: "Sistema de bandas",
    recurso: "antoniooojdev_bandas",
    icono: "users",
    categoria: "Bandas",
    estado: "disponible",
    resumen: "Tablet encriptada para las organizaciones: rangos, bases, territorios, misiones de armamento, mercado negro y atracos.",
    claves: ["Rangos y permisos que decide el jefe", "Bases con almacén, caja fuerte y garaje", "Misiones con NPCs armados y hackeo"],
    frameworks: ["ESX Legacy"],
    portada: "/fivem/sistema-bandas/media/inicio.webp",
    datos: [
      { v: "4", l: "módulos" },
      { v: "9", l: "apartados" },
    ],
  },
  {
    id: "menu-handling",
    nombre: "Menú de handling",
    recurso: "antoniooojdev_admincar",
    icono: "sliders",
    categoria: "Staff",
    estado: "disponible",
    resumen: "Panel de admin para ajustar cualquier vehículo del servidor y aplicarlo a todos al momento. Para ESX Legacy, QBCore y Qbox.",
    claves: ["Plantillas de un clic o valor a valor", "Lo pruebas conduciendo con el panel abierto", "Se aplica a todos sin reiniciar"],
    frameworks: ["ESX Legacy", "QBCore", "Qbox"],
    portada: "/fivem/menu-handling/media/admincar-03.webp",
    datos: [
      { v: "63", l: "valores" },
      { v: "0", l: "reinicios" },
    ],
  },
  {
    id: "policia",
    nombre: "Policía",
    recurso: "antoniooojdev_police",
    icono: "siren",
    categoria: "Empleos",
    estado: "desarrollo",
    resumen: "Trabajo de policía completo: MDT, multas, cacheos, esposas, radar y gestión del cuerpo.",
    claves: ["MDT con fichas y antecedentes", "Rangos, servicio y divisiones", "Avisos y aviso de agente herido"],
    frameworks: ["ESX Legacy"],
    datos: [{ v: "MDT", l: "propio" }],
  },
  {
    id: "inventario",
    nombre: "Inventario",
    recurso: "antoniooojdev_inventory",
    icono: "bag",
    categoria: "Base",
    estado: "desarrollo",
    resumen: "Inventario por casillas con accesos rápidos, mochila, chaleco y objetos tirados en el suelo.",
    claves: ["Casillas con arrastrar y soltar", "Accesos rápidos del 1 al 5", "Mochila y chaleco antibalas"],
    frameworks: ["ESX Legacy"],
    datos: [{ v: "1-5", l: "accesos rápidos" }],
  },
  {
    id: "panel-admin",
    nombre: "Panel de admin",
    recurso: "antoniooojdev_admin",
    icono: "shield",
    categoria: "Staff",
    estado: "desarrollo",
    resumen: "Panel para el staff: jugadores, sanciones, vehículos, objetos, bandas, registro y herramientas.",
    claves: ["Fichas de jugadores con su historial", "Avisos, expulsiones y baneos", "Registro de todas las acciones"],
    frameworks: ["ESX Legacy"],
    datos: [{ v: "0", l: "comandos que memorizar" }],
  },
];
