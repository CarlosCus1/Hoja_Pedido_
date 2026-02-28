import * as XLSX from 'xlsx';

// Nombre de la base de datos
const DB_NAME = 'HojaPedidoDB';
const STOCK_DB_VERSION = 4; // Nueva versión para el store de stock

// URL de la API de stock (appweb CIPSA) - usado por GitHub Actions
const STOCK_API_URL = 'http://appweb.cipsa.com.pe:8054/AlmacenStock/DownLoadFiles?value={%22%20%22:%22%22,%22parametroX1%22:%220%22,%22parametroX2%22:%220%22}';

/**
 * Inicializa la base de datos con el store de stock
 * @returns {Promise<IDBDatabase>}
 */
export function initStockDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, STOCK_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store para stock de la API
      if (!db.objectStoreNames.contains('stockAPI')) {
        db.createObjectStore('stockAPI', { keyPath: 'sku' });
      }
    };
  });
}

/**
 * Guarda el stock en IndexedDB
 * @param {Array} stockData - Array de objetos con sku y disponible
 */
export async function saveStockToIndexedDB(stockData) {
  const db = await initStockDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('stockAPI', 'readwrite');
    const store = transaction.objectStore('stockAPI');

    // Limpiar datos anteriores
    store.clear();

    // Insertar nuevos datos
    stockData.forEach(item => {
      store.put(item);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Carga todo el stock desde IndexedDB
 * @returns {Promise<Object>} Objeto con clave SKU y valor disponible
 */
export async function loadStockFromIndexedDB() {
  const db = await initStockDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('stockAPI', 'readonly');
    const store = transaction.objectStore('stockAPI');
    const request = store.getAll();

    request.onsuccess = () => {
      // Convertir array a objeto { sku: disponible }
      const stockObj = {};
      request.result.forEach(item => {
        stockObj[item.sku] = item.disponible;
      });
      resolve(stockObj);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene el stock de un SKU específico
 * @param {string} sku - Código del producto
 * @returns {Promise<number>} Stock disponible (0 si no existe)
 */
export async function getStockBySku(sku) {
  const db = await initStockDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('stockAPI', 'readonly');
    const store = transaction.objectStore('stockAPI');
    const request = store.get(sku);

    request.onsuccess = () => {
      resolve(request.result ? request.result.disponible : 0);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Carga el stock desde el archivo JSON generado por GitHub Actions
 * @returns {Promise<Array>} Array de objetos con sku y disponible
 */
export async function fetchStockFromAPI() {
  try {
    // Intentar cargar desde el archivo generado por GitHub Actions
    const response = await fetch('./stock_data.json', { 
      signal: AbortSignal.timeout(2000) // Timeout de 2 segundos
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Stock actualizado desde API: ${result.count} productos`);
    return result;

  } catch (error) {
    // No loguear si es un error de fetch (archivo no existe), es normal
    if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
      throw new Error('El archivo de stock no está disponible. Usa el botón "Cargar" para importar el Excel manualmente.');
    }
    
    console.error('Error cargando stock:', error);
    throw new Error('El archivo de stock no está disponible. Usa el botón "Cargar" para importar el Excel manualmente.');
  }
}

/**
 * Parsea un archivo Excel cargado por el usuario
 * @param {File} file - Archivo Excel
 * @returns {Promise<Array>} Array de objetos con sku y disponible
 */
export async function parseStockFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        const stockData = rawData
          .filter(row => row.Column2 && row.Column2 !== 'Total' && row.Column2 !== 'TOTAL')
          .map(row => ({
            sku: String(row.Column2).trim(),
            nombre: row.Column3 || '',
            disponible: parseInt(row.Column19, 10) || 0,
            almacen: row.Column10 || '',
            predespacho: parseInt(row.Column17, 10) || 0
          }));

        console.log(`Stock parseado: ${stockData.length} productos`);
        resolve(stockData);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Sincroniza el stock desde la appweb y lo guarda en IndexedDB
 * @returns {Promise<Object>} Objeto con el stock sincronizado
 */
export async function syncStock() {
  try {
    const stockData = await fetchStockFromAPI();
    await saveStockToIndexedDB(stockData.data);
    
    // Convertir a objeto para uso rápido
    const stockObj = {};
    stockData.data.forEach(item => {
      stockObj[item.sku] = item.disponible;
    });

    return {
      success: true,
      stock: stockObj,
      count: stockData.count,
      timestamp: stockData.timestamp
    };
  } catch (error) {
    console.error('Error en syncStock:', error);
    return {
      success: false,
      error: error.message,
      stock: {},
      count: 0
    };
  }
}

/**
 * Sincroniza el stock desde un archivo cargado por el usuario
 * @param {File} file - Archivo Excel o JSON
 * @returns {Promise<Object>} Objeto con el stock sincronizado
 */
export async function syncStockFromFile(file) {
  try {
    let stockData;
    
    // Determinar el tipo de archivo
    if (file.name.endsWith('.json')) {
      stockData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            // Asumir formato array de objetos
            resolve(data.map(item => ({
              sku: String(item.sku || item.codigo || item.Column2).trim(),
              nombre: item.nombre || item.nombre_producto || item.Column3 || '',
              disponible: parseInt(item.disponible || item.stock || item.Column19, 10) || 0
            })));
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    } else {
      // Es archivo Excel
      stockData = await parseStockFile(file);
    }

    await saveStockToIndexedDB(stockData);
    
    // Convertir a objeto para uso rápido
    const stockObj = {};
    stockData.forEach(item => {
      stockObj[item.sku] = item.disponible;
    });

    return {
      success: true,
      stock: stockObj,
      count: stockData.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error en syncStockFromFile:', error);
    return {
      success: false,
      error: error.message,
      stock: {},
      count: 0
    };
  }
}

/**
 * Obtiene el stock disponible para un SKU, retornando 0 si no existe
 * @param {string} sku - Código del producto
 * @param {Object} stockData - Objeto con todo el stock
 * @returns {number}
 */
export function getStock(sku, stockData) {
  if (!stockData || !sku) return 0;
  return stockData[sku] ?? 0;
}
