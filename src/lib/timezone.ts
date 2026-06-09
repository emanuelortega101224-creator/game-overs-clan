// Country / timezone helpers used by registration and event time display.
// Detection is offline — based on the browser's Intl timezone.

const TZ_TO_COUNTRY: Record<string, { code: string; name: string }> = {
  "America/Mexico_City": { code: "MX", name: "México" },
  "America/Tijuana": { code: "MX", name: "México" },
  "America/Monterrey": { code: "MX", name: "México" },
  "America/Cancun": { code: "MX", name: "México" },
  "America/Merida": { code: "MX", name: "México" },
  "America/Chihuahua": { code: "MX", name: "México" },
  "America/Hermosillo": { code: "MX", name: "México" },
  "America/Mazatlan": { code: "MX", name: "México" },
  "America/Guayaquil": { code: "EC", name: "Ecuador" },
  "Pacific/Galapagos": { code: "EC", name: "Ecuador" },
  "America/Bogota": { code: "CO", name: "Colombia" },
  "America/Lima": { code: "PE", name: "Perú" },
  "America/Santiago": { code: "CL", name: "Chile" },
  "America/Punta_Arenas": { code: "CL", name: "Chile" },
  "America/Argentina/Buenos_Aires": { code: "AR", name: "Argentina" },
  "America/Argentina/Cordoba": { code: "AR", name: "Argentina" },
  "America/Argentina/Mendoza": { code: "AR", name: "Argentina" },
  "America/Argentina/Salta": { code: "AR", name: "Argentina" },
  "America/Argentina/Tucuman": { code: "AR", name: "Argentina" },
  "America/Argentina/Ushuaia": { code: "AR", name: "Argentina" },
  "America/Caracas": { code: "VE", name: "Venezuela" },
  "America/La_Paz": { code: "BO", name: "Bolivia" },
  "America/Asuncion": { code: "PY", name: "Paraguay" },
  "America/Montevideo": { code: "UY", name: "Uruguay" },
  "America/Guatemala": { code: "GT", name: "Guatemala" },
  "America/Tegucigalpa": { code: "HN", name: "Honduras" },
  "America/El_Salvador": { code: "SV", name: "El Salvador" },
  "America/Managua": { code: "NI", name: "Nicaragua" },
  "America/Costa_Rica": { code: "CR", name: "Costa Rica" },
  "America/Panama": { code: "PA", name: "Panamá" },
  "America/Santo_Domingo": { code: "DO", name: "República Dominicana" },
  "America/Havana": { code: "CU", name: "Cuba" },
  "America/Puerto_Rico": { code: "PR", name: "Puerto Rico" },
  "Europe/Madrid": { code: "ES", name: "España" },
  "Atlantic/Canary": { code: "ES", name: "España" },
  "America/Sao_Paulo": { code: "BR", name: "Brasil" },
  "America/Bahia": { code: "BR", name: "Brasil" },
  "America/Manaus": { code: "BR", name: "Brasil" },
  "America/Belem": { code: "BR", name: "Brasil" },
  "America/Fortaleza": { code: "BR", name: "Brasil" },
  "America/Recife": { code: "BR", name: "Brasil" },
  "America/New_York": { code: "US", name: "Estados Unidos" },
  "America/Chicago": { code: "US", name: "Estados Unidos" },
  "America/Denver": { code: "US", name: "Estados Unidos" },
  "America/Los_Angeles": { code: "US", name: "Estados Unidos" },
  "America/Phoenix": { code: "US", name: "Estados Unidos" },
  "America/Anchorage": { code: "US", name: "Estados Unidos" },
};

// Curated list of base timezones admins can choose from when scheduling events.
export const BASE_TIMEZONES: { tz: string; label: string }[] = [
  { tz: "America/Mexico_City", label: "México (CDMX)" },
  { tz: "America/Guayaquil", label: "Ecuador" },
  { tz: "America/Bogota", label: "Colombia" },
  { tz: "America/Lima", label: "Perú" },
  { tz: "America/Santiago", label: "Chile" },
  { tz: "America/Argentina/Buenos_Aires", label: "Argentina" },
  { tz: "America/Caracas", label: "Venezuela" },
  { tz: "America/La_Paz", label: "Bolivia" },
  { tz: "America/Asuncion", label: "Paraguay" },
  { tz: "America/Montevideo", label: "Uruguay" },
  { tz: "America/Guatemala", label: "Guatemala" },
  { tz: "America/Tegucigalpa", label: "Honduras" },
  { tz: "America/El_Salvador", label: "El Salvador" },
  { tz: "America/Managua", label: "Nicaragua" },
  { tz: "America/Costa_Rica", label: "Costa Rica" },
  { tz: "America/Panama", label: "Panamá" },
  { tz: "America/Santo_Domingo", label: "Rep. Dominicana" },
  { tz: "America/Havana", label: "Cuba" },
  { tz: "America/Puerto_Rico", label: "Puerto Rico" },
  { tz: "Europe/Madrid", label: "España" },
  { tz: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
  { tz: "America/New_York", label: "USA (Este)" },
  { tz: "America/Los_Angeles", label: "USA (Pacífico)" },
];

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function countryFromTimezone(tz: string): { code: string; name: string } | null {
  return TZ_TO_COUNTRY[tz] ?? null;
}

export function countryLabelFromTimezone(tz: string | null | undefined): string {
  if (!tz) return "—";
  const c = countryFromTimezone(tz);
  if (c) return c.name;
  // Best effort: use the region segment of the tz
  const parts = tz.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

// Format a UTC timestamp into a target timezone, in Spanish.
export function formatInTz(iso: string, tz: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: tz,
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return new Date(iso).toLocaleString();
  }
}

// "21:00 hora México · 22:00 tu hora" style helper.
export function formatBaseAndLocal(
  iso: string,
  baseTz: string | null,
  userTz: string | null,
): { base: string | null; local: string; sameZone: boolean } {
  const local = formatInTz(iso, userTz || detectTimezone());
  if (!baseTz) return { base: null, local, sameZone: true };
  const base = formatInTz(iso, baseTz);
  return { base, local, sameZone: base === local };
}

// Format a phone number for tighter display (remove spaces, keep + prefix).
export function compactPhone(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  const sign = trimmed.startsWith("+") ? "+" : "";
  return sign + trimmed.replace(/[^\d]/g, "");
}
