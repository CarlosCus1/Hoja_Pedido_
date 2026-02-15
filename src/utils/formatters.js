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
 * Formatea un número con separador de miles
 * @param {number} number - Número a formatear
 * @returns {string} - Número formateado
 */
export function formatNumber(number) {
  if (number === null || number === undefined || isNaN(number)) return '0';
  
  return new Intl.NumberFormat('es-PE').format(number);
}

/**
 * Calcula el número de cajas basado en unidades y cantidad por caja
 * @param {number} unidades - Cantidad de unidades
 * @param {number} cantidadPorCaja - Cantidad de unidades por caja
 * @returns {number} - Número de cajas (redondeado a 2 decimales)
 */
export function calcularCajas(unidades, cantidadPorCaja) {
  if (!unidades || !cantidadPorCaja || cantidadPorCaja === 0) return 0;
  return Math.round((unidades / cantidadPorCaja) * 100) / 100;
}

/**
 * Formatea una fecha en formato ddmmyyyy a formato legible
 * @param {string} fecha - Fecha en formato ddmmyyyy
 * @returns {string} - Fecha formateada (dd/mm/yyyy)
 */
export function formatFecha(fecha) {
  if (!fecha || fecha.length !== 8) return fecha;
  
  const dia = fecha.substring(0, 2);
  const mes = fecha.substring(2, 4);
  const anio = fecha.substring(4, 8);
  
  return `${dia}/${mes}/${anio}`;
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
