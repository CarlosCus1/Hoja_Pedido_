import * as XLSX from 'xlsx';

/**
 * Genera un archivo Excel con el formato específico para hoja de pedido
 * @param {Object} clientData - Datos del cliente
 * @param {Array} selectedProducts - Productos seleccionados con cantidades
 * @returns {void} - Descarga el archivo Excel
 */
export function generateExcel(clientData, selectedProducts) {
  if (!selectedProducts || selectedProducts.length === 0) {
    alert('No hay productos seleccionados para exportar');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Fila de encabezados según formato especificado
  const headers = [
    'RUC',
    'OC',
    'SKU',
    'CANTIDAD',
    'PRECIO',
    'OBSERVACIONES'
  ];

  // Crear datos con formato específico de 6 columnas
  const productRows = selectedProducts.map(product => [
    clientData.ruc || '',                       // A: RUC (se repite)
    clientData.oc || '',                        // B: OC (se repite)
    product.codigo,                             // C: SKU
    Number(product.cantidad).toFixed(2),        // D: Cantidad con 2 decimales
    Number(product.precioLista).toFixed(2),     // E: Precio con 2 decimales
    product.observacion || ''                   // F: Observaciones
  ]);

  // Combinar encabezados + datos
  const data = [headers, ...productRows];

  // Crear hoja de cálculo
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Configurar anchos de columna
  ws['!cols'] = [
    { wch: 15 },  // A: RUC
    { wch: 12 },  // B: OC
    { wch: 12 },  // C: SKU
    { wch: 12 },  // D: CANTIDAD
    { wch: 12 },  // E: PRECIO
    { wch: 30 },  // F: OBSERVACIONES
  ];

  // Agregar hoja al libro con nombre de la provincia/sucursal
  const sheetName = clientData.provincia ? clientData.provincia.substring(0, 30) : 'Hoja Pedido';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generar nombre del archivo: OC_(ruc)_(provincia)_ddmmyy
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2); // Últimos 2 dígitos del año
  const dateStr = `${day}${month}${year}`; // ddmmyy sin guiones
  
  // Limpiar provincia para nombre de archivo (remover espacios y caracteres especiales)
  const provincia = (clientData.provincia || '')
    .toLowerCase()
    .replace(/\s+/g, '')  // Quitar espacios
    .replace(/[^a-z0-9]/g, '');  // Solo letras y números
  
  // Nombre del archivo: OC_(ruc)_(provincia)_ddmmyy
  // Ejemplo: OC_20100654025_trujillo_210226.xlsx
  const ruc = clientData.ruc || 'sin_ruc';
  const fileName = `OC_${ruc}_${provincia || 'sin_sucursal'}_${dateStr}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(wb, fileName);
}

export default { generateExcel };
