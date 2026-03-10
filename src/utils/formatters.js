/**
 * Formatea un número como moneda (Soles peruanos)
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como moneda
 */
export function formatMoney(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'S/ 0.00';
  
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calcula el número de cajas (bx) basado en unidades y cantidad por caja
 * @param {number} unidades - Cantidad de unidades
 * @param {number} bxSize - Cantidad de unidades por caja (bx)
 * @returns {number} - Número de cajas (redondeado a 2 decimales)
 */
export function calcularBx(unidades, bxSize) {
  if (!unidades || !bxSize || bxSize === 0) return 0;
  return Math.round((unidades / bxSize) * 100) / 100;
}

/**
 * Obtiene la fecha actual en formato ddmmyyyy
 * @returns {string} - Fecha actual en formato ddmmyyyy
 */
export function getFechaActual() {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const anio = now.getFullYear();
  
  return `${dia}${mes}${anio}`;
}

/**
 * Valida si un RUC o DNI es válido
 * @param {string} documento - Número de documento
 * @returns {boolean} - true si es válido
 */
export function validarDocumento(documento) {
  if (!documento) return false;
  const cleanValue = sanitizeDocumento(documento);
  return cleanValue.length === 8 || cleanValue.length === 11;
}

/**
 * Sanitiza un documento eliminando caracteres especiales no válidos
 * Elimina: * @ # $ % & ! y cualquier carácter no alfanumérico
 * @param {string} documento - Número de documento a sanitizar
 * @returns {string} - Documento sanitizado (solo dígitos)
 */
export function sanitizeDocumento(documento) {
  if (!documento) return '';
  // Eliminar cualquier carácter que no sea dígito o letra
  return documento.replace(/[^0-9]/g, '');
}

/**
 * Limpia el RUC/DNI eliminando caracteres especiales y retorna solo dígitos
 * @param {string} documento - Número de documento
 * @returns {string} - Solo dígitos
 * @deprecated Usar sanitizeDocumento en su lugar
 */
export function cleanDocumento(documento) {
  // Eliminar cualquier carácter que no sea dígito (incluye * @ # etc)
  return sanitizeDocumento(documento);
}

/**
 * Determina si el documento es DNI (8 dígitos) o RUC (11 dígitos)
 * @param {string} documento - Número de documento
 * @returns {string} - 'DNI', 'RUC' o 'Inválido'
 */
export function tipoDocumento(documento) {
  if (!documento) return 'Inválido';
  const cleanValue = sanitizeDocumento(documento);
  if (cleanValue.length === 8) return 'DNI';
  if (cleanValue.length === 11) return 'RUC';
  return 'Inválido';
}

/**
 * Obtiene la fecha actual en formato corto dd/mm/yy
 * @returns {string} - Fecha actual en formato dd/mm/yy
 */
export function getFechaCorta() {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const anio = String(now.getFullYear()).slice(-2);
  
  return `${dia}/${mes}/${anio}`;
}

/**
 * Obtiene la fecha actual en formato compacto ddmmyy para OC
 * @returns {string} - Fecha en formato ddmmyy
 */
export function getFechaCompacta() {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const anio = String(now.getFullYear()).slice(-2);
  
  return `${dia}${mes}${anio}`;
}

/**
 * Formatea fecha de ddmmyyyy a dd/mm/yy para visualización
 * @param {string} fecha - Fecha en formato ddmmyyyy
 * @returns {string} - Fecha en formato dd/mm/yy
 */
export function formatFechaCorta(fecha) {
  if (!fecha || fecha.length !== 8) return fecha;
  
  const dia = fecha.substring(0, 2);
  const mes = fecha.substring(2, 4);
  const anio = fecha.substring(6, 8);
  
  return `${dia}/${mes}/${anio}`;
}

/**
 * Validates if a string is a valid ISO 8601 timestamp
 * @param {string} timestamp - The timestamp to validate
 * @returns {boolean} True if valid ISO 8601 format
 */
export function isValidISOTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return false;
  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!isoRegex.test(timestamp)) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Formats an ISO 8601 timestamp into a local Peruvian format.
 * Shows date and time in format: "dd/mm/yyyy, hh:mm:ss a. m./p. m."
 *
 * @param {string} isoTimestamp - The ISO 8601 timestamp to format.
 * @returns {string} The formatted timestamp in local format.
 */
export function formatTimestamp(isoTimestamp) {
  if (!isoTimestamp || !isValidISOTimestamp(isoTimestamp)) {
    return 'Fecha inválida';
  }

  const date = new Date(isoTimestamp);
  
  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Calcula el tiempo transcurrido desde un timestamp hasta ahora
 * Devuelve un string descriptivo como "hace 2 horas", "hace 30 min", etc.
 * 
 * @param {string} isoTimestamp - Timestamp ISO 8601
 * @returns {string} - Descripción del tiempo transcurrido
 */
export function getTimeAgo(isoTimestamp) {
  if (!isoTimestamp || !isValidISOTimestamp(isoTimestamp)) return '';
  
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'hace 1 día';
  return `hace ${diffDays} días`;
}

/**
 * Obtiene el color de estado según la antigüedad del stock
 * - Verde: menos de 2 horas
 * - Amarillo: entre 2 y 6 horas
 * - Naranja: entre 6 y 24 horas
 * - Rojo: más de 24 horas
 * 
 * @param {string} isoTimestamp - Timestamp ISO 8601
 * @returns {string} - Clase de color Tailwind
 */
export function getStockAgeColor(isoTimestamp) {
  if (!isoTimestamp || !isValidISOTimestamp(isoTimestamp)) return 'text-slate-400';
  
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffHours = (now - date) / 3600000;
  
  if (diffHours < 2) return 'text-green-600 dark:text-green-400';
  if (diffHours < 6) return 'text-amber-600 dark:text-amber-400';
  if (diffHours < 24) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}
