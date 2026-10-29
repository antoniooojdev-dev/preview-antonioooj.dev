// Datos de «Agendo» (caso de ejemplo: Barbería Navaja), compartidos por la web pública
// (reservas y «Mis citas») y el panel del equipo. Todo vive en el navegador (localStorage),
// así que lo que reserva un cliente en la web aparece en el panel y al revés; si las dos
// están abiertas en pestañas distintas, se avisan con el evento «storage».

export type Estado = "confirmada" | "llego" | "noshow" | "cancelada";

export interface Servicio {
  id: string;
  n: string;
  /** descripción para la web */
  d: string;
  min: number;
  p: number;
  c: string;
  ico: string;
}

/** turnos de un día en horas decimales: [[9, 14], [16, 20]] */
export type Turnos = [number, number][];

export interface Barbero {
  id: string;
  n: string;
  apellido: string;
  rol: string;
  bio: string;
  c: string;
  /** índice 0 = domingo … 6 = sábado */
  horario: Turnos[];
}

export interface Cita {
  id: string;
  cliente: string;
  tel: string;
  servicio: string;
  barbero: string;
  inicio: number;
  estado: Estado;
  notas: string;
  /** dónde se creó: la web pública o el panel */
  origen: "web" | "panel";
  creada: number;
}

export interface Cliente {
  n: string;
  tel: string;
}

export interface Datos {
  servicios: Servicio[];
  barberos: Barbero[];
  clientes: Cliente[];
  citas: Cita[];
}

export const CLAVE = "agendo-v3";
/** el cliente que ha reservado desde este navegador (para «Mis citas») */
export const CLAVE_YO = "agendo-v3-yo";
export const H_INI = 9;
export const H_FIN = 21;
export const DIA = 86_400_000;
export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ── formato ─────
export const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
export const horaTxt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
export const turnosTxt = (t: Turnos) => (t.length ? t.map(([a, b]) => `${horaTxt(a)}–${horaTxt(b)}`).join(" · ") : "Libra");
export const sameDay = (ms: number, f: Date | number) => new Date(ms).toDateString() === new Date(f).toDateString();
export const iniciales = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function lunes(d: Date | number = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function inicioDia(d: Date | number = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** El día `dia` a la hora decimal `h` (con setHours: sumar ms falla el día del cambio de hora) */
export function aLas(dia: Date | number, h: number) {
  const x = new Date(dia);
  x.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
  return x.getTime();
}

/** `n` días después de `d`, a medianoche (también seguro con el cambio de hora) */
export function masDias(d: Date | number, n: number) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x.getTime();
}

// ── datos de ejemplo ─────
const SERVICIOS: Servicio[] = [
  { id: "corte", n: "Corte", d: "Corte a tijera o máquina, lavado y peinado. Te asesoramos según tu tipo de pelo.", min: 30, p: 15, c: "#6366f1", ico: "scissors" },
  { id: "barba", n: "Arreglo de barba", d: "Perfilado con navaja, rebaje y aceite para barba. Sale definida y cuidada.", min: 20, p: 10, c: "#f59e0b", ico: "user-tie" },
  { id: "combo", n: "Corte + barba", d: "El combo completo: corte, perfilado de barba y toalla caliente al terminar.", min: 45, p: 22, c: "#10b981", ico: "star" },
  { id: "afeitado", n: "Afeitado clásico", d: "Toalla caliente, espuma a brocha y navaja. El ritual de toda la vida.", min: 30, p: 14, c: "#ec4899", ico: "spa" },
  { id: "nino", n: "Corte niño", d: "Para menores de 12 años, con paciencia y sin prisas.", min: 20, p: 11, c: "#0ea5e9", ico: "child" },
];

const BARBEROS: Barbero[] = [
  {
    id: "nacho",
    n: "Nacho",
    apellido: "Vidal",
    rol: "Fundador · barbero",
    bio: "20 años con la tijera. Especialista en cortes clásicos y en entender lo que quieres aunque no sepas explicarlo.",
    c: "#6366f1",
    horario: [[], [[9, 14], [16, 20]], [[9, 14], [16, 20]], [[9, 14], [16, 20]], [[9, 14], [16, 20]], [[9, 14], [16, 20]], [[9, 14]]],
  },
  {
    id: "leo",
    n: "Leo",
    apellido: "Marín",
    rol: "Barbero · degradados",
    bio: "Degradados, diseños y cortes modernos. Si lo has visto en Instagram, Leo sabe hacerlo.",
    c: "#f43f5e",
    horario: [[], [], [[10, 14], [16.5, 21]], [[10, 14], [16.5, 21]], [[10, 14], [16.5, 21]], [[10, 14], [16.5, 21]], [[10, 15]]],
  },
  {
    id: "sara",
    n: "Sara",
    apellido: "Llorens",
    rol: "Barbera · barba y afeitado",
    bio: "La de las barbas perfectas y el afeitado a navaja. Paciencia infinita con los primeros cortes de los peques.",
    c: "#10b981",
    horario: [[], [[12, 20]], [], [[12, 20]], [[12, 20]], [[12, 20]], []],
  },
];

const NOMBRES = ["Carlos Ruiz", "Miguel Torres", "Javier Molina", "Alberto Sanz", "Pablo Ibáñez", "Hugo Ferrer", "Sergio Pons", "Raúl Castro", "Iván Gómez", "Daniel Prieto", "Óscar Vidal", "Mario León", "Lucas Martín", "Adrián Soler", "Marcos Gil", "Álex Navarro"];

export function ejemplo(): Datos {
  const servicios = structuredClone(SERVICIOS);
  const barberos = structuredClone(BARBEROS);
  const clientes = NOMBRES.map((n, i) => ({ n, tel: `6${String(10000000 + i * 7919337).slice(0, 8)}` }));
  const citas: Cita[] = [];
  const base = lunes();
  let semilla = 11;
  const azar = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280;
  // dos semanas atrás, la actual y la siguiente; solo dentro del horario de cada uno
  for (let sem = -2; sem <= 1; sem++) {
    for (let d = 0; d < 7; d++) {
      const dia = new Date(masDias(base, sem * 7 + d));
      for (const b of barberos) {
        for (const [a, z] of b.horario[dia.getDay()]) {
          let h = a;
          while (h < z) {
            const s = servicios[Math.floor(azar() * servicios.length)];
            if (h + s.min / 60 > z) break;
            if (azar() < 0.45) {
              const inicio = aLas(dia, h);
              const pasada = inicio < Date.now();
              const cli = clientes[Math.floor(azar() * clientes.length)];
              citas.push({
                id: Math.random().toString(36).slice(2, 9),
                cliente: cli.n,
                tel: cli.tel,
                servicio: s.id,
                barbero: b.id,
                inicio,
                estado: pasada ? (azar() < 0.07 ? "noshow" : "llego") : "confirmada",
                notas: "",
                origen: azar() < 0.35 ? "web" : "panel",
                creada: inicio - Math.floor(azar() * 6 + 1) * DIA,
              });
              h += Math.ceil(s.min / 15) * 0.25;
            } else h += 0.5;
          }
        }
      }
    }
  }
  return { servicios, barberos, clientes, citas };
}

// ── guardar y cargar ─────
export function cargar(): Datos {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Datos | null;
    if (d?.barberos?.length && d.servicios?.length) return d;
  } catch {}
  const d = ejemplo();
  guardar(d);
  return d;
}

export function guardar(d: Datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d));
  } catch {}
}

export function restablecer(): Datos {
  const d = ejemplo();
  guardar(d);
  return d;
}

/** Avisa cuando otra pestaña (la web o el panel) cambia los datos */
export function alCambiar(cb: (d: Datos) => void) {
  addEventListener("storage", (e) => {
    if (e.key === CLAVE) cb(cargar());
  });
}

export function leerYo(): Cliente | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_YO) ?? "null");
  } catch {
    return null;
  }
}

export function guardarYo(c: Cliente | null) {
  try {
    if (c) localStorage.setItem(CLAVE_YO, JSON.stringify(c));
    else localStorage.removeItem(CLAVE_YO);
  } catch {}
}

export const nuevoId = () => Math.random().toString(36).slice(2, 9);
export const normalTel = (t: string) => t.replace(/\D/g, "");

// ── horarios y huecos ─────
export const serv = (d: Datos, id: string) => d.servicios.find((s) => s.id === id) ?? d.servicios[0];
export const barb = (d: Datos, id: string) => d.barberos.find((b) => b.id === id) ?? d.barberos[0];

/** Turnos de un profesional en una fecha */
export const turnosDe = (b: Barbero, fecha: Date | number) => b.horario[new Date(fecha).getDay()] ?? [];

/** ¿Cabe una cita de `min` minutos que empieza en `inicio` dentro de algún turno? */
export function dentroDeHorario(b: Barbero, inicio: number, min: number) {
  const d = new Date(inicio);
  const h = d.getHours() + d.getMinutes() / 60;
  return turnosDe(b, d).some(([a, z]) => h >= a && h + min / 60 <= z + 1e-9);
}

/** Citas que cuentan para ocupar un hueco (las canceladas no) */
const activas = (d: Datos) => d.citas.filter((c) => c.estado !== "cancelada");

export function solapa(d: Datos, inicio: number, min: number, x: Cita) {
  return inicio < x.inicio + serv(d, x.servicio).min * 60_000 && x.inicio < inicio + min * 60_000;
}

export function choque(d: Datos, barbero: string, inicio: number, min: number, excluir?: string) {
  return activas(d).find((x) => x.id !== excluir && x.barbero === barbero && solapa(d, inicio, min, x));
}

/** Horas libres (ms) de un profesional para un servicio en un día, cada 15 min y solo en el futuro */
export function huecos(d: Datos, barbero: string, fecha: Date | number, servicio: string, excluir?: string) {
  const b = barb(d, barbero);
  const min = serv(d, servicio).min;
  const dia = inicioDia(fecha);
  const ahora = Date.now() + 15 * 60_000;
  const lista: number[] = [];
  for (const [a, z] of turnosDe(b, dia)) {
    for (let h = a; h + min / 60 <= z + 1e-9; h += 0.25) {
      const ms = aLas(dia, h);
      if (ms >= ahora && !choque(d, barbero, ms, min, excluir)) lista.push(ms);
    }
  }
  return lista;
}

/** Para «cualquier profesional»: cada hora libre con quién la tiene libre */
export function huecosDeCualquiera(d: Datos, fecha: Date | number, servicio: string) {
  const mapa = new Map<number, string[]>();
  for (const b of d.barberos) for (const ms of huecos(d, b.id, fecha, servicio)) mapa.set(ms, [...(mapa.get(ms) ?? []), b.id]);
  return [...mapa.entries()].sort((a, b) => a[0] - b[0]);
}

/** Horario del local: la unión de los turnos de todo el equipo ese día */
export function horarioLocal(d: Datos, fecha: Date | number): Turnos {
  const todos = d.barberos.flatMap((b) => turnosDe(b, fecha)).sort((a, b) => a[0] - b[0]);
  const res: Turnos = [];
  for (const [a, z] of todos) {
    const ult = res[res.length - 1];
    if (ult && a <= ult[1]) ult[1] = Math.max(ult[1], z);
    else res.push([a, z]);
  }
  return res;
}

/** «Trabajando hasta las 14:00», «Vuelve a las 16:00», «Hoy libra» */
export function estadoAhora(b: Barbero, ahora = new Date()) {
  const h = ahora.getHours() + ahora.getMinutes() / 60;
  const hoy = turnosDe(b, ahora);
  const en = hoy.find(([a, z]) => h >= a && h < z);
  if (en) return { activo: true, txt: `Trabajando hasta las ${horaTxt(en[1])}` };
  const luego = hoy.find(([a]) => a > h);
  if (luego) return { activo: false, txt: `Entra a las ${horaTxt(luego[0])}` };
  return { activo: false, txt: hoy.length ? "Ya ha terminado hoy" : "Hoy libra" };
}

/** Minutos de trabajo de un profesional entre dos fechas (para la ocupación) */
export function minutosDeTrabajo(b: Barbero, desde: number, dias: number) {
  let total = 0;
  for (let i = 0; i < dias; i++) total += turnosDe(b, masDias(desde, i)).reduce((s, [a, z]) => s + (z - a) * 60, 0);
  return total;
}
