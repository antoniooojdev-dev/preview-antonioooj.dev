# AntonioooJ.dev

Web personal de desarrollador para captar clientes. Hecha con [Astro](https://astro.build), TypeScript y CSS propio: estática, rápida y sin dependencias de UI.

## Empezar

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera /dist
npm run preview   # sirve /dist en local
```

## Dónde se edita cada cosa

Todo el contenido está en `src/data/`, así que no hace falta tocar HTML:

| Archivo | Contenido |
| --- | --- |
| `site.ts` | nombre, email, redes, disponibilidad, datos legales, clave del formulario |
| `services.ts` | servicios, precios, opciones del formulario |
| `projects.ts` | proyectos (cada uno genera `/proyectos/<slug>`) |
| `stack.ts` | tecnologías |
| `process.ts` | pasos de trabajo |
| `faq.ts` | preguntas frecuentes |
| `testimonials.ts` | opiniones (la sección se oculta si está vacía) |

Los colores y la tipografía están en `src/styles/tokens.css`.

## Formulario de contacto

1. Crea una clave gratuita en <https://web3forms.com> con tu email.
2. Pégala en `site.web3formsKey` (`src/data/site.ts`).

Sin clave, el formulario abre el cliente de correo del visitante con el mensaje ya redactado.

## Webs de clientes en /demos

Las webs estáticas de `proyectos/` se publican en `/demos/<carpeta>/` mediante `integrations/demos.mjs`:

- En `npm run dev` se sirven directamente desde `proyectos/`, así que los cambios se ven al recargar.
- En `npm run build` se copian a `dist/demos/`.

Para publicar una nueva, añade su carpeta en `demos([...])` en `astro.config.mjs` y su ficha en `src/data/projects.ts` con `url: "/demos/<carpeta>/"`.

## Estructura

```
src/
├── components/   secciones y piezas reutilizables
├── data/         contenido editable
├── layouts/      BaseLayout (SEO, meta OG, JSON-LD, tema)
├── pages/        rutas: /, /contacto, /proyectos/[slug], /gracias, legales, 404
├── scripts/      tema, animaciones, formulario
└── styles/       reset, tokens y estilos globales
```

## Publicar

Funciona en cualquier hosting estático. Por ejemplo, en Vercel, Netlify o Cloudflare Pages:

- Comando de build: `npm run build`
- Carpeta de salida: `dist`

Antes de publicar, cambia `site` en `astro.config.mjs` y la URL de `public/robots.txt` por tu dominio.
