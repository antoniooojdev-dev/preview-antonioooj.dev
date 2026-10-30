// Cloudflare Pages Function: reenvía todo /api/* a la API del chat, que corre en el PC y se
// publica con Cloudflare Tunnel (ver DESPLIEGUE-TUNEL.md). Así la web y la API comparten
// dominio y la cookie de sesión funciona igual que en local.
//
// Variables en Pages → Settings → Variables and secrets:
//   API_ORIGEN    https://origen-api.antonioooj.dev  (el nombre del túnel)
//   PROXY_SECRET  la misma clave que api/.env.production: sin ella la API no atiende nada
export async function onRequest({ request, env }) {
  if (!env.API_ORIGEN || !env.PROXY_SECRET) {
    return Response.json({ detail: "La API no está configurada" }, { status: 503 });
  }
  const url = new URL(request.url);
  const destino = new URL(url.pathname + url.search, env.API_ORIGEN);

  const cabeceras = new Headers(request.headers);
  // La IP la pone Cloudflare (no se puede falsificar); la API solo se la cree con la clave
  const ip = request.headers.get("cf-connecting-ip") || "";
  cabeceras.set("x-real-ip", ip);
  cabeceras.set("x-forwarded-for", ip);
  cabeceras.set("x-forwarded-proto", "https");
  cabeceras.set("x-proxy-secret", env.PROXY_SECRET);
  cabeceras.delete("host");

  try {
    const respuesta = await fetch(destino, {
      method: request.method,
      headers: cabeceras,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      // Las redirecciones del login (a Discord, Google, GitHub y de vuelta) las sigue el navegador
      redirect: "manual",
    });
    // Tal cual: con sus Set-Cookie y cabeceras de seguridad
    return new Response(respuesta.body, respuesta);
  } catch {
    // PC apagado o túnel caído
    return Response.json({ detail: "El chat no está disponible ahora mismo. Vuelve a intentarlo más tarde." }, { status: 503 });
  }
}
