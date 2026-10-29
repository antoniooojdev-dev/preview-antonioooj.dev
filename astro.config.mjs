// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import demos from "./integrations/demos.mjs";
import demoBackends from "./integrations/backends.mjs";

// Cambia esta URL por tu dominio definitivo (se usa para el sitemap y las meta OG)
export default defineConfig({
  site: "https://antonioooj.dev",
  integrations: [
    sitemap(),
    // Webs ESTÁTICAS de /proyectos que se publican en /demos/<carpeta>/.
    // nyx-community no va aquí: tiene backend Python (FastAPI) y su .env, así que se aloja aparte.
    demos([]),
    // Backends que arrancan solos con `npm run dev`: el del chat y los de las demos (ver src/data/demos.ts)
    demoBackends([
      {
        // API del chat (/chat). Astro le reenvía /api (ver `vite.server.proxy` más abajo)
        name: "chat-api",
        cwd: "api",
        command: ".venv/Scripts/python.exe",
        // --reload-include .env: al cambiar el .env (claves de Discord...) se reinicia sola.
        // Sin vigilar .venv ni data: instalar paquetes o escribir en la base de datos no la reinicia.
        args: [
          "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8002",
          // carpetas sin comodines: en Windows "*" se expande y uvicorn falla al arrancar
          "--reload", "--reload-include", ".env", "--reload-exclude", ".venv", "--reload-exclude", "data",
          // al recargar no espera más de 3 s a que el proxy de Astro suelte sus conexiones
          "--timeout-graceful-shutdown", "3",
        ],
        port: 8002,
      },
      {
        name: "nyx-community",
        cwd: "proyectos/nyx-community",
        command: ".venv/Scripts/python.exe",
        args: ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8001"],
        port: 8001,
      },
      {
        // Proyecto fuera del portfolio. Solo la web: el bot de Discord se arranca aparte con run.py
        name: "clicksense-rp",
        cwd: "../ClickSense RP WEB",
        command: ".venv/Scripts/python.exe",
        args: ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        port: 8000,
      },
    ]),
  ],
  // Sin la barra de herramientas de Astro que sale abajo al pasar el ratón en `npm run dev`
  devToolbar: { enabled: false },
  trailingSlash: "ignore",
  build: {
    inlineStylesheets: "auto",
  },
  prefetch: {
    prefetchAll: true,
  },
  // En local, /api va a la API del chat: así web y API comparten origen y cookie de sesión.
  // En producción hace lo mismo el servidor web (ver api/README.md).
  vite: {
    // Al publicar (npm run build): sin mapas de código (permiten reconstruir el original desde
    // «Inspeccionar»), sin comentarios y sin console.log/debugger, que suelen dejar pistas internas.
    // En desarrollo no se toca nada para poder depurar.
    build: { sourcemap: false, minify: "esbuild" },
    esbuild: process.argv.includes("build") ? { drop: ["console", "debugger"], legalComments: "none" } : {},
    server: {
      proxy: {
        "/api": { target: "http://127.0.0.1:8002", xfwd: true },
      },
    },
  },
});
