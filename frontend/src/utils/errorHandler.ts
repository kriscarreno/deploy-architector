/**
 * @file errorHandler.js
 * @description Utilidades para extraer mensajes de error de respuestas Axios.
 */

/**
 * Extrae un mensaje legible de un error de Axios o genérico.
 * @param {unknown} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return "Error desconocido";

  // Error de Axios con respuesta del servidor
  if (error.response?.data) {
    const { data } = error.response;
    if (typeof data === "string") return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
  }

  // Error de red (sin respuesta)
  if (error.message === "Network Error") {
    return "No se pudo conectar con el servidor. Verifica tu conexión.";
  }

  // Timeout
  if (error.code === "ECONNABORTED") {
    return "La solicitud tardó demasiado. Intenta de nuevo.";
  }

  return error.message || "Error desconocido";
}

/**
 * Devuelve true si el error es un 404.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isNotFound(error) {
  return error?.response?.status === 404;
}

/**
 * Devuelve true si el error es un 401.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isUnauthorized(error) {
  return error?.response?.status === 401;
}
