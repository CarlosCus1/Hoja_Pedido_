/**
 * xlsxLoader.js
 * Utilidades para cargar y parsear archivos Excel de pedidos
 */

import * as XLSX from 'xlsx';

/**
 * Carga un archivo Excel y extrae los productos
 * @param {File} file - Archivo Excel a cargar
 * @returns {Promise<{clientData: Object, products: Array}>}
 */
export function loadExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leer la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('El archivo no contiene datos válidos'));
          return;
        }
        
        // Extraer encabezados (primera fila) - filtrar valores vacíos
        const headers = jsonData[0].map(h => String(h ?? '').toUpperCase().trim()).filter(Boolean);
        
        // Encontrar índices de columnas
        const idxRUC = headers.indexOf('RUC');
        const idxOC = headers.indexOf('OC');
        const idxSKU = headers.indexOf('SKU');
        const idxCantidad = headers.findIndex(h => h.includes('CANTIDAD'));
        const idxPrecio = headers.findIndex(h => h.includes('PRECIO'));
        const idxObs = headers.findIndex(h => h.includes('OBSERVACION'));
        const idxNombre = headers.findIndex(h => h.includes('NOMBRE') || h.includes('CLIENTE') || h.includes('RAZÓN'));
        
        if (idxSKU === -1 || idxCantidad === -1) {
          reject(new Error('El archivo no tiene el formato esperado (faltan columnas SKU o CANTIDAD)'));
          return;
        }
        
        // Extraer datos del cliente de la primera fila de datos
        const firstDataRow = jsonData[1] || [];
        const clientData = {
          ruc: String(firstDataRow[idxRUC] || '').trim(),
          oc: String(firstDataRow[idxOC] || '').trim(),
          nombre: idxNombre >= 0 ? String(firstDataRow[idxNombre] || '').trim() : '',
          provincia: '',
          direccion: '',
          vendedor: ''
        };
        
        // Extraer productos
        const products = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[idxSKU]) continue;
          
          products.push({
            codigo: String(row[idxSKU] || '').trim(),
            cantidad: idxCantidad >= 0 ? Number(row[idxCantidad]) || 0 : 0,
            precioLista: idxPrecio >= 0 ? Number(row[idxPrecio]) || 0 : 0,
            observacion: idxObs >= 0 ? String(row[idxObs] || '') : ''
          });
        }
        
        resolve({ clientData, products });
      } catch (error) {
        reject(new Error('Error al procesar el archivo: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export default { loadExcelFile };
