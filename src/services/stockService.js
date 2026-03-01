import * as XLSX from 'xlsx';

// Nombre de la base de datos
const DB_NAME = 'HojaPedidoDB';
const STOCK_DB_VERSION = 5; // Sincronizado con DB_VERSION en App.jsx

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
        if (item.sku !== '__metadata') {
          stockObj[item.sku] = item.disponible;
        }
      });
      resolve(stockObj);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda el timestamp de sincronización en IndexedDB
 * @param {string} timestamp - Timestamp de la última sincronización
 */
export async function saveStockTimestamp(timestamp) {
  const db = await initStockDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('stockAPI', 'readwrite');
    const store = transaction.objectStore('stockAPI');
    store.put({ sku: '__metadata', timestamp });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Carga el timestamp de sincronización desde IndexedDB
 * @returns {Promise<string|null>} Timestamp guardado o null si no existe
 */
export async function loadStockTimestamp() {
  const db = await initStockDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('stockAPI', 'readonly');
    const store = transaction.objectStore('stockAPI');
    const request = store.get('__metadata');

    request.onsuccess = () => {
      resolve(request.result?.timestamp || null);
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
 * @returns {Promise<Object|null>} Objeto con data, count y timestamp, o null si no existe
 */
export async function fetchStockFromAPI() {
  try {
    // Intentar cargar desde el archivo generado por GitHub Actions
    // Agregar timestamp para evitar caché del navegador
    const cacheBuster = `?_=${Date.now()}`;
    const response = await fetch(`./stock_data.json${cacheBuster}`, { 
      signal: AbortSignal.timeout(10000) // Timeout de 10 segundos para archivo grande
    });

    // Si el archivo no existe (404), retornar null silenciosamente
    if (response.status === 404) {
      console.log('Stock: archivo no encontrado, usando catálogo como fuente');
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Stock actualizado desde API: ${result.count} productos`);
    return result;

  } catch (error) {
    // Si es abort o error de red, retornar null (no es error crítico)
    if (error.name === 'AbortError' || error.message?.includes('Failed to fetch')) {
      console.log('Stock: no disponible en servidor, usando catálogo');
      return null;
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
    
    // Si no hay stock en el servidor, retornar éxito pero vacío
    if (!stockData) {
      const timestamp = new Date().toISOString();
      await saveStockTimestamp(timestamp);
      return {
        success: true,
        stock: {},
        count: 0,
        timestamp,
        source: 'catalogo'
      };
    }
    
    await saveStockToIndexedDB(stockData.data);
    await saveStockTimestamp(stockData.timestamp);
    
    // Convertir a objeto para uso rápido
    const stockObj = {};
    stockData.data.forEach(item => {
      stockObj[item.sku] = item.disponible;
    });

    return {
      success: true,
      stock: stockObj,
      count: stockData.count,
      timestamp: stockData.timestamp,
      source: 'api'
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
    
    const timestamp = new Date().toISOString();
    await saveStockTimestamp(timestamp);
    
    // Convertir a objeto para uso rápido
    const stockObj = {};
    stockData.forEach(item => {
      stockObj[item.sku] = item.disponible;
    });

    return {
      success: true,
      stock: stockObj,
      count: stockData.length,
      timestamp
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

/**
 * Parsea un archivo Excel de pedido previamente exportado
 * Extrae códigos de producto y cantidades para edición
 * NOTA: Los precios se toman del catálogo (JSON), no del Excel, para mantener la fuente de la verdad
 * @param {File} file - Archivo Excel de pedido
 * @param {Array} catalogoProductos - Array de productos del catálogo para obtener precios actualizados
 * @returns {Promise<Object>} Objeto con cliente y productos
 */
export async function parsePedidoFile(file, catalogoProductos = []) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Leer datos como array de arrays para manejar encabezados
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawData.length < 2) {
          throw new Error('El archivo no contiene datos de pedido');
        }
        
        // La primera fila son los encabezados
        const headers = rawData[0];
        
        // Encontrar índices de columnas (case insensitive)
        const findColumnIndex = (names) => {
          for (let i = 0; i < headers.length; i++) {
            const header = String(headers[i] || '').toUpperCase().trim();
            if (names.some(name => header.includes(name))) return i;
          }
          return -1;
        };
        
        const rucIdx = findColumnIndex(['RUC', 'RUC/DNI', 'DOCUMENTO']);
        const ocIdx = findColumnIndex(['OC', 'ORDEN', 'ORDEN_COMPRA']);
        const skuIdx = findColumnIndex(['SKU', 'CODIGO', 'CÓDIGO', 'PRODUCTO']);
        const cantidadIdx = findColumnIndex(['CANTIDAD', 'CANT', 'QTY', 'QUANTITY']);
        const obsIdx = findColumnIndex(['OBSERVACIONES', 'OBS', 'OBSERVACION', 'NOTA']);
        
        if (skuIdx === -1 || cantidadIdx === -1) {
          throw new Error('No se encontraron las columnas SKU o CANTIDAD en el archivo');
        }
        
        // Extraer datos del cliente de la primera fila de datos
        const firstDataRow = rawData[1] || [];
        const clientData = {
          ruc: rucIdx >= 0 ? String(firstDataRow[rucIdx] || '').trim() : '',
          oc: ocIdx >= 0 ? String(firstDataRow[ocIdx] || '').trim() : ''
        };
        
        // Crear mapa del catálogo para búsqueda rápida
        const catalogoMap = new Map();
        catalogoProductos.forEach(p => {
          catalogoMap.set(p.codigo, p);
        });
        
        // Extraer productos (omitir fila de encabezados)
        const products = [];
        const noEncontrados = [];
        
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const sku = String(row[skuIdx] || '').trim();
          const cantidad = parseFloat(row[cantidadIdx]) || 0;
          
          if (sku && cantidad > 0) {
            // Buscar producto en catálogo (fuente de la verdad)
            const productoCatalogo = catalogoMap.get(sku);
            
            if (productoCatalogo) {
              products.push({
                codigo: sku,
                cantidad: cantidad,
                precioLista: productoCatalogo.precioLista || 0,
                bxSize: productoCatalogo.bxSize || 1,
                nombre: productoCatalogo.nombre || '',
                observacion: obsIdx >= 0 ? String(row[obsIdx] || '') : ''
              });
            } else {
              // Producto no encontrado en catálogo
              noEncontrados.push(sku);
              // Aún así agregarlo pero marcado como personalizado
              products.push({
                codigo: sku,
                cantidad: cantidad,
                precioLista: 0,
                bxSize: 1,
                nombre: 'Producto no encontrado en catálogo',
                observacion: (obsIdx >= 0 ? String(row[obsIdx] || '') : '') + ' [NO CATÁLOGO]',
                esPersonalizado: true
              });
            }
          }
        }
        
        console.log(`Pedido parseado: ${products.length} productos, RUC: ${clientData.ruc}`);
        if (noEncontrados.length > 0) {
          console.warn(`Productos no encontrados en catálogo: ${noEncontrados.join(', ')}`);
        }
        
        resolve({
          clientData,
          products,
          count: products.length,
          noEncontrados: noEncontrados.length > 0 ? noEncontrados : null
        });
        
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
