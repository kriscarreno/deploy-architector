/**
 * @file formatDate.js
 * @description Helpers para formatear fechas y duraciones.
 */

/**
 * Formatea una fecha ISO a formato legible local.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDate(date, opts = {}) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  }).format(new Date(date));
}

/**
 * Devuelve cuánto tiempo hace desde una fecha (p.ej. "hace 3 min").
 * @param {string|Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals = [
    { label: "año", secs: 31536000 },
    { label: "mes", secs: 2592000 },
    { label: "semana", secs: 604800 },
    { label: "día", secs: 86400 },
    { label: "hora", secs: 3600 },
    { label: "minuto", secs: 60 },
    { label: "segundo", secs: 1 },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) {
      return `hace ${count} ${label}${count > 1 ? "s" : ""}`;
    }
  }
  return "justo ahora";
}

/**
 * Convierte segundos a formato mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
