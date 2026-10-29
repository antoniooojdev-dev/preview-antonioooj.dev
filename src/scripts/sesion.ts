// Sesión con Discord compartida por la cabecera, /login y /cuenta.
// La sesión real es la cookie de la API; aquí solo se pregunta quién eres (/api/me)
// y se guarda una copia breve en sessionStorage para pintar la cabecera sin parpadeo.

import { site } from "@/data/site";

export interface Yo {
  id: string;
  usuario: string;
  nombre: string;
  avatar: string | null;
  admin: boolean;
}

export const API = site.chatApi;
const CLAVE = "aj-me";

/** Páginas a las que se puede volver tras iniciar sesión (las mismas que acepta la API). */
const VOLVER = ["/", "/chat", "/admin", "/contacto", "/cuenta"];

export function volverValido(v: string | null | undefined): string {
  return v && VOLVER.includes(v) ? v : "/cuenta";
}

export function urlLogin(volver: string): string {
  return `/login?volver=${encodeURIComponent(volverValido(volver))}`;
}

export function copiaLocal(): Yo | null {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
  } catch {
    return null;
  }
}

function guardar(yo: Yo | null) {
  try {
    if (yo) sessionStorage.setItem(CLAVE, JSON.stringify(yo));
    else sessionStorage.removeItem(CLAVE);
  } catch {}
}

let pendiente: Promise<Yo | null> | null = null;

/** Quién ha iniciado sesión (null si nadie). Lanza error si la API no responde. */
export function quienSoy(): Promise<Yo | null> {
  pendiente ??= fetch(`${API}/api/me`, { credentials: "include", cache: "no-store" }).then(async (r) => {
    if (r.status === 401) {
      guardar(null);
      return null;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const yo = (await r.json()) as Yo;
    guardar(yo);
    return yo;
  });
  return pendiente;
}

export async function cerrarSesion(): Promise<void> {
  try {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch {}
  guardar(null);
}

export function avatarEl(src: string | null, nombre: string, clase = "acc-avatar"): HTMLElement {
  const el = document.createElement("span");
  el.className = clase;
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    el.append(img);
  } else {
    el.textContent = (nombre.trim()[0] ?? "?").toUpperCase();
  }
  return el;
}
