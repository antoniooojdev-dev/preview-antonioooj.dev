// Página /documentacion (enlace en el pie, en «Legal»): la guía común de instalación y la
// documentación de cada script de la tienda. La de cada script sale de su ficha (docs de
// policia.ts, bandas.ts, handling.ts), así que se cambia en un solo sitio.
// Para añadir un script: que esté «disponible» en scripts-fivem.ts y meterlo en `fichasDocs`.
import type { DocSeccion, Ficha } from "./fichas";
import { policia } from "./policia";
import { bandas } from "./bandas";
import { handling } from "./handling";

/** id del catálogo (scripts-fivem.ts) → su ficha */
export const fichasDocs: Record<string, Ficha> = {
  policia,
  "sistema-bandas": bandas,
  "menu-handling": handling,
};

export const guiaGeneral: DocSeccion[] = [
  {
    id: "recibirlo",
    t: "Recibir el script",
    pasos: [
      "Compra el script en la tienda con la misma cuenta de Cfx.re que usa tu servidor.",
      "Al pagar, el recurso aparece en tu cuenta de Cfx.re: portal.cfx.re › Assets.",
      "Descárgalo de ahí. Cada actualización sale en ese mismo sitio.",
    ],
    nota: "El recurso queda ligado a tu cuenta de Cfx.re: solo arranca en servidores cuya clave de licencia (sv_licenseKey) sea de esa cuenta.",
  },
  {
    id: "requisitos",
    t: "Requisitos comunes",
    intro: "Todos los scripts piden lo mismo de base. Lo que necesite cada uno aparte viene en su documentación.",
    tabla: {
      cols: ["Recurso", "Para qué", ""],
      filas: [
        ["ESX Legacy, QBCore o Qbox", "Jugadores, trabajos, dinero y permisos", "Obligatorio"],
        ["oxmysql", "Base de datos", "Obligatorio"],
      ],
    },
  },
  {
    id: "instalar",
    t: "Instalación",
    pasos: [
      "Descomprime el recurso y copia la carpeta en resources. No le cambies el nombre.",
      "Añádelo al server.cfg después del framework y de oxmysql.",
      "Arranca el servidor: las tablas de la base de datos se crean solas, sin importar ningún .sql.",
      "Repasa la configuración (config.lua o la carpeta shared): está abierta y comentada en español.",
    ],
    codigo: { lang: "cfg", txt: "ensure oxmysql\nensure es_extended   # o qb-core / qbx_core\nensure antoniooojdev_<script>" },
  },
  {
    id: "actualizar",
    t: "Actualizaciones",
    pasos: [
      "Descarga la versión nueva desde portal.cfx.re › Assets.",
      "Guarda tus archivos de configuración (cada script dice cuáles en su documentación).",
      "Sustituye la carpeta del recurso y vuelve a poner tu configuración.",
      "Reinicia el servidor entero.",
    ],
  },
  {
    id: "problemas",
    t: "Problemas típicos",
    tabla: {
      cols: ["Lo que pasa", "Qué hacer"],
      filas: [
        ["You lack the required entitlement", "La clave de licencia del servidor es de otra cuenta de Cfx.re. Usa una de la cuenta que compró el script."],
        ["No arranca o da errores de framework", "Revisa el orden del server.cfg: primero oxmysql y el framework, luego el script."],
        ["Errores de base de datos", "Comprueba que oxmysql conecta (mysql_connection_string) y que el usuario puede crear tablas."],
        ["Le cambié el nombre a la carpeta", "Vuelve a ponerle el nombre original (antoniooojdev_…) y añádelo así al server.cfg."],
      ],
    },
    nota: "¿Sigue sin ir? Escríbeme por el chat de la web o por Discord con el error de la consola y lo miramos.",
  },
];
