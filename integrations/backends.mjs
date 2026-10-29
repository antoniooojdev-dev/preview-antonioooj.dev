// @ts-check
// ─────────────────────────────────────────────────────────────
//  Arranca los backends de las demos (p. ej. Python/FastAPI) junto a
//  `npm run dev`, para que «Abrir demo» funcione sin abrir otra terminal.
//  Solo en desarrollo: en el build no hace nada. Se apagan al cerrar Astro.
// ─────────────────────────────────────────────────────────────
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} Backend
 * @property {string} name     Nombre para los mensajes de la consola
 * @property {string} cwd      Carpeta del proyecto, relativa a la raíz del portfolio
 * @property {string} command  Ejecutable, relativo a `cwd` o en el PATH
 * @property {string[]} args
 * @property {number} port     Puerto en el que escucha (si ya está ocupado, no se arranca otra vez)
 */

/** @type {Map<string, import("node:child_process").ChildProcess>} */
const running = new Map();

/** @param {number} port */
const portInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });

/**
 * @param {Backend[]} backends
 * @returns {import("astro").AstroIntegration}
 */
export default function demoBackends(backends) {
  let root = "";

  return {
    name: "demo-backends",
    hooks: {
      "astro:config:setup": ({ config }) => {
        root = fileURLToPath(config.root);
      },

      "astro:server:setup": async ({ logger }) => {
        for (const b of backends) {
          if (running.has(b.name)) continue;
          if (await portInUse(b.port)) {
            logger.info(`${b.name}: ya está en marcha en el puerto ${b.port}`);
            continue;
          }

          const cwd = path.join(root, b.cwd);
          if (!existsSync(cwd)) {
            logger.warn(`${b.name}: no existe la carpeta ${b.cwd}`);
            continue;
          }
          const local = path.join(cwd, b.command);
          const command = existsSync(local) ? local : b.command;

          const child = spawn(command, b.args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
          running.set(b.name, child);

          // Solo se muestran avisos y errores, no cada petición
          const relay = (/** @type {Buffer} */ chunk) =>
            String(chunk)
              .split(/\r?\n/)
              .filter((line) => line.trim() && !/^INFO:/.test(line))
              .forEach((line) => logger.info(`${b.name} │ ${line}`));
          child.stdout?.on("data", relay);
          child.stderr?.on("data", relay);

          child.on("error", (err) => {
            logger.error(`${b.name}: no se pudo arrancar (${err.message}). ¿Está creado el entorno .venv?`);
            running.delete(b.name);
          });
          child.on("exit", (code) => {
            if (code) logger.warn(`${b.name}: se ha detenido (código ${code})`);
            running.delete(b.name);
          });

          logger.info(`${b.name}: arrancando en http://127.0.0.1:${b.port}`);
        }
      },
    },
  };
}

// Al cerrar `npm run dev`, se apagan los backends que arrancó
const stopAll = () => running.forEach((child) => child.kill());
process.once("exit", stopAll);
process.once("SIGINT", () => (stopAll(), process.exit(0)));
process.once("SIGTERM", () => (stopAll(), process.exit(0)));
