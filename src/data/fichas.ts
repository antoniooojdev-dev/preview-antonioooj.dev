// Tipos de las fichas de venta de scripts FiveM (FichaScript.astro).
// Datos de cada una: src/data/policia.ts, src/data/bandas.ts, src/data/handling.ts.

export interface FichaModulo {
  id: string;
  nombre: string;
  sub: string;
  resumen: string;
  funciones: string[];
  /** vídeo del módulo (.webm en public/); vacío = hueco «vídeo en grabación» */
  video: string;
  poster?: string;
  galeria: { src: string; t: string }[];
}

export interface DocSeccion {
  id: string;
  t: string;
  intro?: string;
  pasos?: string[];
  tabla?: { cols: string[]; filas: string[][] };
  codigo?: { lang: string; txt: string };
  nota?: string;
}

export interface Ficha {
  id: string;
  recurso: string;
  titulo: string;
  lema: string;
  lead: string;
  precio: number;
  /** con estos dos, el precio sale como oferta (el de antes tachado) */
  precioAntes?: number;
  descuento?: number;
  /** aviso «Nuevo» arriba y etiqueta junto al título */
  nuevo?: boolean;
  version: string;
  frameworks: string[];
  /** puntos fuertes (para tarjetas o la tienda) */
  fuertes?: string[];
  cifras: { v: number; l: string }[];
  /** título de la sección de módulos: [texto, parte en gris] */
  modulosTitulo: [string, string];
  modulosSub: string;
  /** recorrido completo en YouTube: primero en el visor (portada + play) */
  youtube?: { id: string; portada: string; t: string };
  modulos: FichaModulo[];
  docs: DocSeccion[];
  faq: { q: string; a: string }[];
}
