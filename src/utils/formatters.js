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
  const cleanValue = documento.replace(/\D/g, '');
  return cleanValue.length === 8 || cleanValue.length === 11;
}

/**
 * Determina si el documento es DNI (8 dígitos) o RUC (11 dígitos)
 * @param {string} documento - Número de documento
 * @returns {string} - 'DNI', 'RUC' o 'Inválido'
 */
export function tipoDocumento(documento) {
  if (!documento) return 'Inválido';
  const cleanValue = documento.replace(/\D/g, '');
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
 * Formats an ISO 8601 timestamp into a relative, human-readable format.
 * If the date is from today, it shows the time.
 * If the date is from yesterday, it shows "yesterday".
 * Otherwise, it shows the date in "dd/mm/yyyy" format.
 *
 * @param {string} isoTimestamp - The ISO 8601 timestamp to format.
 * @returns {string} The formatted relative time string.
 */
export function formatTimestamp(isoTimestamp) {
  if (!isoTimestamp) return 'nunca';

  const date = new Date(isoTimestamp);
  const now = new Date();

  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

  if (isYesterday) {
    return 'ayer';
  }

  return date.toLocaleDateString('es-PE');
}

/**
 * Calcula el tiempo transcurrido desde un timestamp hasta ahora
 * Devuelve un string descriptivo como "hace 2 horas", "hace 30 min", etc.
 * 
 * @param {string} isoTimestamp - Timestamp ISO 8601
 * @returns {string} - Descripción del tiempo transcurrido
 */
export function getTimeAgo(isoTimestamp) {
  if (!isoTimestamp) return '';
  
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
  if (!isoTimestamp) return 'text-slate-400';
  
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffHours = (now - date) / 3600000;
  
  if (diffHours < 2) return 'text-green-600 dark:text-green-400';
  if (diffHours < 6) return 'text-amber-600 dark:text-amber-400';
  if (diffHours < 24) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}
