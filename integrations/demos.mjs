// @ts-check
// ─────────────────────────────────────────────────────────────
//  Publica webs estáticas de /proyectos en /demos/<carpeta>/
//  - En `npm run dev` las sirve directamente desde /proyectos (cambios en vivo).
//  - En `npm run build` las copia a dist/demos/.
// ─────────────────────────────────────────────────────────────
import { cp, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {Record<string, string>} */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// Lo que NUNCA se sirve ni se publica de una demo: configuración con claves, datos,
// bases de datos, entornos virtuales, código de servidor y control de versiones.
const PRIVADO = /(^|[\\/])(\.env(\..*)?|\.git|\.venv[^\\/]*|node_modules|__pycache__|data|README\.md|[^\\/]*\.(py|pyc|php|sql|db|sqlite|sqlite3|db-wal|db-shm|log|bak|ini|pem|key))($|[\\/])/i;

/**
 * @param {string[]} folders Carpetas de /proyectos que se publican
 * @returns {import("astro").AstroIntegration}
 */
export default function demos(folders) {
  let projectsDir = "";

  return {
    name: "demos",
    hooks: {
      "astro:config:setup": ({ config }) => {
        projectsDir = path.join(fileURLToPath(config.root), "proyectos");
      },

      "astro:server:setup": ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url ?? "/", "http://localhost");
          const match = url.pathname.match(/^\/demos\/([^/]+)(\/.*)?$/);
          if (!match || !folders.includes(match[1])) return next();

          // Sin barra final las rutas relativas (css/, js/) apuntarían a /demos/
          if (!match[2]) {
            res.writeHead(301, { Location: `/demos/${match[1]}/${url.search}` });
            return res.end();
          }

          const base = path.join(projectsDir, match[1]);
          let file;
          try {
            file = path.join(base, decodeURIComponent(match[2]));
          } catch {
            return next();
          }
          // Con el separador al final: "proyectos/servidor" no debe dejar leer "proyectos/servidor-gta/..."
          if (!(file + path.sep).startsWith(base + path.sep)) return next();
          if (PRIVADO.test(path.relative(base, file))) return next();

          try {
            if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
            const body = await readFile(file);
            res.writeHead(200, {
              "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
              "Cache-Control": "no-cache",
            });
            res.end(body);
          } catch {
            next();
          }
        });
      },

      "astro:build:done": async ({ dir, logger }) => {
        const out = path.join(fileURLToPath(dir), "demos");
        for (const folder of folders) {
          const origen = path.join(projectsDir, folder);
          await cp(origen, path.join(out, folder), {
            recursive: true,
            filter: (src) => !PRIVADO.test(path.relative(origen, src)),
          });
          logger.info(`/demos/${folder}/ publicado`);
        }
      },
    },
  };
}
