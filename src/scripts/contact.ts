// Formulario de contacto.
// - Con clave de Web3Forms (data-key): envía por fetch y redirige a /gracias.
// - Sin clave: abre el cliente de correo con el mensaje ya redactado.

interface Field {
  name: string;
  validate: (value: string) => string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const fields: Field[] = [
  { name: "name", validate: (v) => (v.trim().length >= 2 ? null : "Dime tu nombre.") },
  { name: "email", validate: (v) => (EMAIL_RE.test(v.trim()) ? null : "Revisa el email.") },
  { name: "type", validate: (v) => (v ? null : "Elige un tipo de proyecto.") },
  {
    name: "message",
    validate: (v) => (v.trim().length >= 20 ? null : "Cuéntame un poco más (mín. 20 caracteres)."),
  },
  { name: "privacy", validate: (v) => (v === "on" ? null : "Necesito tu consentimiento.") },
];

function setError(form: HTMLFormElement, name: string, message: string | null) {
  const input = form.elements.namedItem(name) as HTMLInputElement | null;
  const out = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  if (out) out.textContent = message ?? "";
}

function validate(form: HTMLFormElement): boolean {
  const data = new FormData(form);
  let firstInvalid: string | null = null;

  for (const field of fields) {
    const error = field.validate(String(data.get(field.name) ?? ""));
    setError(form, field.name, error);
    if (error && !firstInvalid) firstInvalid = field.name;
  }

  if (firstInvalid) {
    (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
    return false;
  }
  return true;
}

function buildMailto(to: string, data: FormData): string {
  const subject = `Nuevo proyecto: ${data.get("type")} — ${data.get("name")}`;
  const body = [
    `Nombre: ${data.get("name")}`,
    `Email: ${data.get("email")}`,
    `Empresa: ${data.get("company") || "-"}`,
    `Tipo: ${data.get("type")}`,
    `Presupuesto: ${data.get("budget") || "-"}`,
    `Plazo: ${data.get("deadline") || "-"}`,
    "",
    String(data.get("message")),
  ].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function setStatus(form: HTMLFormElement, text: string, kind: "ok" | "error" | "") {
  const status = form.querySelector<HTMLElement>("[data-status]");
  if (!status) return;
  status.textContent = text;
  status.dataset.kind = kind;
}

document.querySelectorAll<HTMLFormElement>("form[data-contact]").forEach((form) => {
  const key = form.dataset.key ?? "";
  const to = form.dataset.email ?? "";
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");

  // /contacto?tipo=Web%20online (desde las páginas de /servicios) marca ese tipo
  const tipo = new URLSearchParams(location.search).get("tipo");
  if (tipo) {
    form.querySelectorAll<HTMLInputElement>('input[name="type"]').forEach((r) => (r.checked = r.value === tipo));
  }

  // limpia el error de un campo en cuanto se corrige
  form.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const field = fields.find((f) => f.name === target.name);
    if (!field || target.getAttribute("aria-invalid") !== "true") return;
    const value = target.type === "checkbox" ? (target.checked ? "on" : "") : target.value;
    setError(form, field.name, field.validate(value));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate(form)) return;

    const data = new FormData(form);
    if (data.get("botcheck")) return; // honeypot anti-spam

    if (!key) {
      window.location.href = buildMailto(to, data);
      setStatus(form, "Se ha abierto tu cliente de correo con el mensaje listo para enviar.", "ok");
      return;
    }

    submit?.setAttribute("disabled", "");
    setStatus(form, "Enviando…", "");

    try {
      data.set("access_key", key);
      data.set("subject", `Nuevo proyecto: ${data.get("type")} — ${data.get("name")}`);
      data.set("from_name", "Web AntonioooJ.dev");
      data.delete("privacy");

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const json = (await res.json()) as { success?: boolean; message?: string };

      if (!res.ok || !json.success) throw new Error(json.message || "Error al enviar");
      window.location.href = "/gracias";
    } catch {
      setStatus(form, `No se pudo enviar. Escríbeme directamente a ${to}.`, "error");
      submit?.removeAttribute("disabled");
    }
  });
});
