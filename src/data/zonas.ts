// ─────────────────────────────────────────────────────────────
//  Países para la tarjeta «Mi hora» de la portada: el visitante elige el suyo y ve
//  su hora junto a la de España y la diferencia.
//  cc: código ISO del país (el nombre sale traducido con Intl.DisplayNames).
//  zona: zona horaria IANA. ciudad: solo en países con varias zonas.
// ─────────────────────────────────────────────────────────────

export interface Zona {
  cc: string;
  zona: string;
  ciudad?: string;
}

export const ZONAS: Zona[] = [
  // España y Portugal
  { cc: "ES", zona: "Europe/Madrid", ciudad: "Madrid" },
  { cc: "ES", zona: "Atlantic/Canary", ciudad: "Canarias" },
  { cc: "PT", zona: "Europe/Lisbon", ciudad: "Lisboa" },
  { cc: "PT", zona: "Atlantic/Azores", ciudad: "Azores" },
  // Latinoamérica
  { cc: "MX", zona: "America/Mexico_City", ciudad: "Ciudad de México" },
  { cc: "MX", zona: "America/Cancun", ciudad: "Cancún" },
  { cc: "MX", zona: "America/Tijuana", ciudad: "Tijuana" },
  { cc: "AR", zona: "America/Argentina/Buenos_Aires" },
  { cc: "CL", zona: "America/Santiago" },
  { cc: "CO", zona: "America/Bogota" },
  { cc: "PE", zona: "America/Lima" },
  { cc: "VE", zona: "America/Caracas" },
  { cc: "EC", zona: "America/Guayaquil" },
  { cc: "BO", zona: "America/La_Paz" },
  { cc: "PY", zona: "America/Asuncion" },
  { cc: "UY", zona: "America/Montevideo" },
  { cc: "BR", zona: "America/Sao_Paulo", ciudad: "São Paulo" },
  { cc: "BR", zona: "America/Manaus", ciudad: "Manaus" },
  { cc: "BR", zona: "America/Fortaleza", ciudad: "Fortaleza" },
  { cc: "CU", zona: "America/Havana" },
  { cc: "DO", zona: "America/Santo_Domingo" },
  { cc: "PR", zona: "America/Puerto_Rico" },
  { cc: "GT", zona: "America/Guatemala" },
  { cc: "SV", zona: "America/El_Salvador" },
  { cc: "HN", zona: "America/Tegucigalpa" },
  { cc: "NI", zona: "America/Managua" },
  { cc: "CR", zona: "America/Costa_Rica" },
  { cc: "PA", zona: "America/Panama" },
  // Norteamérica
  { cc: "US", zona: "America/New_York", ciudad: "Nueva York" },
  { cc: "US", zona: "America/Chicago", ciudad: "Chicago" },
  { cc: "US", zona: "America/Denver", ciudad: "Denver" },
  { cc: "US", zona: "America/Los_Angeles", ciudad: "Los Ángeles" },
  { cc: "CA", zona: "America/Toronto", ciudad: "Toronto" },
  { cc: "CA", zona: "America/Vancouver", ciudad: "Vancouver" },
  // Europa
  { cc: "GB", zona: "Europe/London" },
  { cc: "IE", zona: "Europe/Dublin" },
  { cc: "FR", zona: "Europe/Paris" },
  { cc: "AD", zona: "Europe/Andorra" },
  { cc: "DE", zona: "Europe/Berlin" },
  { cc: "IT", zona: "Europe/Rome" },
  { cc: "NL", zona: "Europe/Amsterdam" },
  { cc: "BE", zona: "Europe/Brussels" },
  { cc: "CH", zona: "Europe/Zurich" },
  { cc: "AT", zona: "Europe/Vienna" },
  { cc: "PL", zona: "Europe/Warsaw" },
  { cc: "SE", zona: "Europe/Stockholm" },
  { cc: "NO", zona: "Europe/Oslo" },
  { cc: "DK", zona: "Europe/Copenhagen" },
  { cc: "FI", zona: "Europe/Helsinki" },
  { cc: "GR", zona: "Europe/Athens" },
  { cc: "RO", zona: "Europe/Bucharest" },
  { cc: "UA", zona: "Europe/Kyiv" },
  { cc: "TR", zona: "Europe/Istanbul" },
  { cc: "RU", zona: "Europe/Moscow", ciudad: "Moscú" },
  // África y Oriente Medio
  { cc: "MA", zona: "Africa/Casablanca" },
  { cc: "DZ", zona: "Africa/Algiers" },
  { cc: "EG", zona: "Africa/Cairo" },
  { cc: "NG", zona: "Africa/Lagos" },
  { cc: "AO", zona: "Africa/Luanda" },
  { cc: "MZ", zona: "Africa/Maputo" },
  { cc: "CV", zona: "Atlantic/Cape_Verde" },
  { cc: "GQ", zona: "Africa/Malabo" },
  { cc: "ZA", zona: "Africa/Johannesburg" },
  { cc: "AE", zona: "Asia/Dubai" },
  { cc: "SA", zona: "Asia/Riyadh" },
  { cc: "IL", zona: "Asia/Jerusalem" },
  // Asia y Oceanía
  { cc: "IN", zona: "Asia/Kolkata" },
  { cc: "CN", zona: "Asia/Shanghai" },
  { cc: "JP", zona: "Asia/Tokyo" },
  { cc: "KR", zona: "Asia/Seoul" },
  { cc: "PH", zona: "Asia/Manila" },
  { cc: "ID", zona: "Asia/Jakarta", ciudad: "Yakarta" },
  { cc: "TH", zona: "Asia/Bangkok" },
  { cc: "SG", zona: "Asia/Singapore" },
  { cc: "AU", zona: "Australia/Sydney", ciudad: "Sídney" },
  { cc: "AU", zona: "Australia/Perth", ciudad: "Perth" },
  { cc: "NZ", zona: "Pacific/Auckland" },
];
