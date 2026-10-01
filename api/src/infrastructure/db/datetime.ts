const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000;

export function ahoraEnColombia(now: Date = new Date()): Date {
  return new Date(now.getTime() + COLOMBIA_OFFSET_MS);
}

export function hoyEnColombia(now: Date = new Date()): string {
  return ahoraEnColombia(now).toISOString().slice(0, 10);
}

export function diaDeSemanaEnColombia(now: Date = new Date()): number {
  return ahoraEnColombia(now).getUTCDay();
}

// MySQL DATETIME no lleva marcador de zona y el driver lo devuelve como
// cadena naive (dateStrings: true). Se asume UTC (sesion TiDB/Vercel) y se
// emite un ISO con Z para que el cliente pueda parsearlo con new Date(...)
// sin correrse a la zona local del dispositivo.
export function toUtcIso(value: string | null): string | null {
  if (!value) return null;
  if (value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value)) return value;
  return `${value.replace(' ', 'T')}Z`;
}

// MySQL en modo estricto rechaza ISO con sufijo 'Z'/'T' en datetime(3).
// El caller ya valido el string con z.string().datetime(); el chequeo es
// solo defensivo.
export function toMysqlDatetime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Campo invalido: fecha');
  }
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;
const HAS_OFFSET_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/;

// Formatea un valor crudo de la BD (DATE o DATETIME naive en UTC) como
// dd/mm/yyyy [HH:mm] en horario de Colombia. Las columnas DATE son fechas
// de calendario y se imprimen sin corrimiento; los DATETIME se convierten
// de UTC a America/Bogota antes de imprimir.
export function formatFechaColombia(value: string, conHora: boolean): string {
  const isDateOnly = DATE_ONLY_PATTERN.test(value);
  const isNaive = NAIVE_DATETIME_PATTERN.test(value) && !HAS_OFFSET_PATTERN.test(value);
  const d = new Date(isNaive ? `${value.replace(' ', 'T')}Z` : value);
  if (Number.isNaN(d.getTime())) return value;
  const c = isDateOnly ? d : new Date(d.getTime() + COLOMBIA_OFFSET_MS);
  const dd = String(c.getUTCDate()).padStart(2, '0');
  const mm = String(c.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = c.getUTCFullYear();
  if (!conHora) return `${dd}/${mm}/${yyyy}`;
  const hh = String(c.getUTCHours()).padStart(2, '0');
  const mi = String(c.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
