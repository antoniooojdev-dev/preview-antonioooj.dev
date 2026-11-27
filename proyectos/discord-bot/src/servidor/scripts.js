// Scripts de FiveM a la venta (los «disponibles» de la web), para /script.
// Los datos son los de sus fichas en la web (src/data/policia.ts, bandas.ts, handling.ts y
// scripts-fivem.ts): si cambia un precio o una versión allí, cámbialo también aquí.

import { SITE } from "./plan.js";

export const scripts = [
  {
    id: "policia",
    nombre: "Sistema de Policía SAPD",
    emoji: "🚓",
    recurso: "antoniooojdev_police",
    version: "2.0.4",
    precio: 50,
    precioAntes: 71.43,
    lema: "MDT, central, calle y comisaría en un solo recurso",
    resumen: "Trabajo de policía completo: MDT, multas, cacheos, esposas, radar y gestión del cuerpo.",
    claves: ["Tablet MDT completa", "17 rangos y 10 divisiones", "Central con mapa en vivo", "App SAPD para ciudadanos"],
    cifras: [
      [17, "rangos de serie"],
      [10, "divisiones"],
      [30, "tablas que crea solo"],
    ],
    portada: `${SITE}/fivem/policia/media/sapd-home.webp`,
  },
  {
    id: "sistema-bandas",
    nombre: "Sistema de bandas",
    emoji: "🔫",
    recurso: "antoniooojdev_bandas",
    version: "1.0.0",
    precio: 40,
    precioAntes: 60,
    lema: "Tablet encriptada, bases, territorios y golpes en un solo recurso",
    resumen: "Tablet encriptada para las organizaciones: rangos, bases, territorios, misiones de armamento, mercado negro y atracos.",
    claves: ["Rangos y permisos que decide el jefe", "Bases con almacén, caja fuerte y garaje", "Misiones con NPCs armados y hackeo"],
    cifras: [
      [9, "apartados en la tablet"],
      [22, "permisos a medida"],
      [16, "tablas que crea solo"],
    ],
    portada: `${SITE}/fivem/sistema-bandas/media/inicio.webp`,
  },
  {
    id: "menu-handling",
    nombre: "Menú de handling",
    emoji: "🏎️",
    recurso: "antoniooojdev_admincar",
    version: "2.0.0",
    precio: 15,
    precioAntes: 25,
    lema: "Cualquier vehículo, ajustado y probado sin salir del juego",
    resumen: "Panel de admin para ajustar cualquier vehículo del servidor y aplicarlo a todos al momento.",
    claves: ["Plantillas de un clic o valor a valor", "Lo pruebas conduciendo con el panel abierto", "Se aplica a todos sin reiniciar"],
    cifras: [
      [63, "valores del handling"],
      [6, "plantillas de un clic"],
      [4, "tablas que crea solo"],
    ],
    portada: `${SITE}/fivem/menu-handling/media/admincar-03.webp`,
  },
];

export const FRAMEWORKS = ["ESX Legacy", "QBCore", "Qbox"];
