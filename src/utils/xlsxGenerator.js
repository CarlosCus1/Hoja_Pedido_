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

  // Crear datos con el formato específico:
  // | RUC | OC | (vacía) | (vacía) | Código | (vacía) | Cantidad | Precio |
  const data = selectedProducts.map(product => [
    clientData.ruc || '',           // A: RUC (se repite)
    clientData.oc || '',            // B: OC (se repite)
    '',                             // C: vacía
    '',                             // D: vacía
    product.codigo,                 // E: Código
    '',                             // F: vacía
    product.cantidad,               // G: Cantidad
    product.precioLista             // H: Precio
  ]);

  // Crear hoja de cálculo
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Configurar anchos de columna
  ws['!cols'] = [
    { wch: 15 },  // A: RUC
    { wch: 15 },  // B: OC
    { wch: 5 },   // C: vacía
    { wch: 5 },   // D: vacía
    { wch: 12 },  // E: Código
    { wch: 5 },   // F: vacía
    { wch: 10 },  // G: Cantidad
    { wch: 12 },  // H: Precio
  ];

  // Agregar hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja de Pedido');

  // Generar nombre del archivo
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `hoja_pedido_${clientData.ruc || 'sin_ruc'}_${timestamp}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(wb, fileName);
}

/**
 * Genera un archivo Excel con formato extendido (incluye observaciones)
 * Con fila de encabezados según formato específico
 * @param {Object} clientData - Datos del cliente
 * @param {Array} selectedProducts - Productos seleccionados con cantidades
 * @returns {void} - Descarga el archivo Excel
 */
export function generateExcelExtended(clientData, selectedProducts) {
  if (!selectedProducts || selectedProducts.length === 0) {
    alert('No hay productos seleccionados para exportar');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Fila de encabezados según formato especificado
  const headers = [
    'RUC',           // A
    'OC',            // B
    'ean',           // C: vacía (para llenar manualmente)
    'SKU',           // D: vacía (para llenar manualmente)
    'CODIGO',        // E
    'CANTIDAD',      // F
    'Columna2',      // G: vacía (para llenar manualmente)
    'PRECIO',        // H
    'DESC 01',       // I: vacía (para llenar manualmente)
    'DESC 02',       // J: vacía (para llenar manualmente)
    'OBSERVACIONES'  // K
  ];

  // Crear datos con formato específico
  const productRows = selectedProducts.map(product => [
    clientData.ruc || '',                       // A: RUC (se repite)
    clientData.oc || '',                        // B: OC (se repite)
    '',                                         // C: ean (vacía para llenar manualmente)
    '',                                         // D: SKU (vacía para llenar manualmente)
    product.codigo,                             // E: Código
    product.cantidad.toFixed(2),                // F: Cantidad con 2 decimales
    '',                                         // G: Columna2 (vacía para llenar manualmente)
    `S/ ${product.precioLista.toFixed(2)}`,     // H: Precio con formato S/
    '',                                         // I: DESC 01 (vacía para llenar manualmente)
    '',                                         // J: DESC 02 (vacía para llenar manualmente)
    product.observacion || ''                   // K: Observaciones
  ]);

  // Combinar encabezados + datos
  const data = [headers, ...productRows];

  // Crear hoja de cálculo
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Configurar anchos de columna
  ws['!cols'] = [
    { wch: 15 },  // A: RUC
    { wch: 10 },  // B: OC
    { wch: 10 },  // C: ean
    { wch: 10 },  // D: SKU
    { wch: 12 },  // E: Código
    { wch: 10 },  // F: Cantidad
    { wch: 10 },  // G: Columna2
    { wch: 12 },  // H: Precio
    { wch: 10 },  // I: DESC 01
    { wch: 10 },  // J: DESC 02
    { wch: 30 },  // K: Observaciones
  ];

  // Agregar hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja de Pedido');

  // Generar nombre del archivo: hoja_de_pedido_(cliente)_(dd-mm-yy)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2); // Últimos 2 dígitos del año
  const dateStr = `${day}-${month}-${year}`;
  
  // Usar nombre del cliente si está disponible, sino RUC
  const clientName = clientData.nombre || clientData.ruc || 'sin_cliente';
  // Limpiar nombre del cliente para usar en nombre de archivo (remover caracteres no válidos)
  const cleanClientName = clientName.toString().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  
  const fileName = `hoja_de_pedido_${cleanClientName}_${dateStr}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(wb, fileName);
}

export default { generateExcel, generateExcelExtended };
