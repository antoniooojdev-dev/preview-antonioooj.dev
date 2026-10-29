import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Importa todos los .js de una carpeta de src/ y devuelve su export default */
export async function loadModules(folder) {
  const dir = join(SRC, folder);
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  return Promise.all(files.map(async (f) => (await import(pathToFileURL(join(dir, f)).href)).default));
}
