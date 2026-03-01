/**
 * ============================================================================
 * HOJA DE PEDIDO v1.2.1
 * ============================================================================
 * Sistema de gestión de pedidos para fuerza de ventas
 *
 * Desarrollador: Carlos Cusi
 * Asistencia de código: Kilo Code - Coding Assistant
 * Fecha de última actualización: 2026-03-01
 *
 * FUNCIONALIDADES PRINCIPALES:
 *   - Búsqueda de productos por código y nombre
 *   - Gestión de cantidades en Unidades (Un) o Cajas/Master (Bx)
 *   - Precios referenciales con indicador (sin IGV, sin descuentos)
 *   - Sincronización de stock desde archivo Excel/JSON
 *   - Exportación a Excel para procesamiento de pedidos
 *   - Catálogo online integrado (FlipHTML5)
 *   - Interfaz responsive para móvil y escritorio
 *   - Modo oscuro/claro
 *   - Orden de ingreso: los productos se ordenan según el orden de ingreso
 * 
 * ESTRUCTURA DEL PROYECTO:
 *   - App.jsx: Componente principal con toda la lógica de la aplicación
 *   - hooks/useDebounce.js: Hook para debounce de búsqueda
 *   - services/stockService.js: Servicios para sincronización de stock
 *   - utils/formatters.js: Utilidades de formateo de datos
 *   - utils/xlsxGenerator.js: Generador de archivos Excel
 *   - public/productos_local.json: Catálogo de productos
 * 
 * DEPENDENCIAS PRINCIPALES:
 *   - React 18+ 
 *   - Tailwind CSS
 *   - XLSX (para exportación Excel)
 *   - IndexedDB (para almacenamiento local)
 * 
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback, Fragment, useRef } from 'react';
import { useDebounce } from './hooks/useDebounce';
import { formatMoney, calcularBx, getFechaActual, validarDocumento, tipoDocumento, getFechaCorta, getFechaCompacta, formatFechaCorta, formatTimestamp, getTimeAgo, getStockAgeColor } from './utils/formatters';
import { generateExcel } from './utils/xlsxGenerator';
import { syncStock, loadStockFromIndexedDB, getStock, syncStockFromFile, parsePedidoFile, loadStockTimestamp } from './services/stockService';

// Nombre de la base de datos IndexedDB
const DB_NAME = 'HojaPedidoDB';
const DB_VERSION = 5; // Incrementamos para forzar recarga de productos

// Variable global para controlar si se necesita recargar
let needsReloadFromUpgrade = false;

/**
 * Inicializa la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaction = event.target.transaction;

      // Store para productos - siempre crear o actualizar
      if (!db.objectStoreNames.contains('productos')) {
        db.createObjectStore('productos', { keyPath: 'codigo' });
      } else {
        // El store ya existe - limpiar para forzar recarga con nuevos campos
        const store = transaction.objectStore('productos');
        store.clear();
      }
      needsReloadFromUpgrade = true;

      // Store para selección actual
      if (!db.objectStoreNames.contains('seleccion')) {
        db.createObjectStore('seleccion', { keyPath: 'id' });
      }

      // Store para stock de la API
      if (!db.objectStoreNames.contains('stockAPI')) {
        db.createObjectStore('stockAPI', { keyPath: 'sku' });
      }
    };
  });
}

/**
 * Guarda datos en IndexedDB
 * @param {string} storeName - Nombre del store
 * @param {any} data - Datos a guardar
 */
async function saveToDB(storeName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Carga datos desde IndexedDB
 * @param {string} storeName - Nombre del store
 * @param {string} key - Clave a buscar
 * @returns {Promise<any>}
 */
async function loadFromDB(storeName, key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Carga todos los datos de un store
 * @param {string} storeName - Nombre del store
 * @returns {Promise<Array>}
 */
async function loadAllFromDB(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Limpia un store en IndexedDB
 * @param {string} storeName - Nombre del store
 */
async function clearStore(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Opciones de paginación
const PAGE_SIZE_OPTIONS = [20, 50, 100];

function App() {
  // Estado de tema
  const [darkMode, setDarkMode] = useState(() => {
    // Recuperar preferencia guardada
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return JSON.parse(saved);
      // Detectar preferencia del sistema
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Estado de productos
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado de stock desde appweb
  const [stockData, setStockData] = useState({});
  const [stockLoading, setStockLoading] = useState(false);
  const [stockLastSync, setStockLastSync] = useState(null);
  const [stockTimestamp, setStockTimestamp] = useState(null);
  const [stockError, setStockError] = useState(null);
  const stockFileInputRef = useRef(null);

  // Estado del cliente
  const [clientData, setClientData] = useState({
    ruc: '',
    nombre: '',
    oc: '',
    provincia: '',
    direccion: '',
    vendedor: ''
  });

  // Estado de búsqueda
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  // Estado para cantidades en resultados de búsqueda
  const [searchQuantities, setSearchQuantities] = useState({});
  // Modo de entrada: 'un' o 'bx' (impacta cómo se interpretan números simples)
  const [inputMode, setInputMode] = useState('un');

  // Estado para selección múltiple en resultados de búsqueda
  const [selectedForAdd, setSelectedForAdd] = useState({});

  // Estado para producto no encontrado
  const [codeNotFound, setCodeNotFound] = useState(false);
  const [showCustomProductForm, setShowCustomProductForm] = useState(false);
  const [customProductData, setCustomProductData] = useState({
    nombre: '',
    precioLista: '',
    bxSize: '',
    cantidad: 1
  });

  // Estado de selección
  const [selectedProducts, setSelectedProducts] = useState({});

  // Estado de ordenamiento - ahora con soporte para 'ordenIngreso'
  const [sortConfig, setSortConfig] = useState({ key: 'ordenIngreso', direction: 'asc' });
  
  // Contador para el orden de ingreso de productos
  const [nextOrderIndex, setNextOrderIndex] = useState(1);

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Estado del modal de confirmación
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Estado para observaciones expandidas
  const [expandedObservations, setExpandedObservations] = useState({});

  // Estado para confirmación de cantidad vacía
  const [showQuantityConfirm, setShowQuantityConfirm] = useState(null);
  const [pendingQuantityCodigo, setPendingQuantityCodigo] = useState(null);

  // Estado para modal de confirmación de exportación
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  // Estado para sección de cliente colapsable en móvil
  const [clientSectionExpanded, setClientSectionExpanded] = useState(true);

  // Aplicar tema oscuro
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Toggle tema
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Sincronizar stock desde appweb
  const handleStockSync = async () => {
    setStockLoading(true);
    setStockError(null);
    
    try {
      // Limpiar cache de stock en IndexedDB para forzar recarga desde archivo
      await clearStore('stockAPI');
      
      const result = await syncStock();
      
      if (result.success) {
        setStockData(result.stock);
        setStockLastSync(result.timestamp);
        setStockTimestamp(result.timestamp);
        alert(`Stock actualizado: ${result.count} productos sincronizados`);
      } else {
        setStockError(result.error);
        alert(`Error al actualizar stock: ${result.error}\n\nNota: La appweb no permite conexión directa. Use el botón "Cargar Archivo" para importar un Excel.`);
      }
    } catch (err) {
      console.error('Error sincronizando stock:', err);
      setStockError(err.message);
      alert(`Error al conectar con el servidor: ${err.message}\n\nUse el botón "Cargar Archivo" para importar un Excel.`);
    } finally {
      setStockLoading(false);
    }
  };

  // Cargar pedido desde archivo Excel previamente exportado
  const handlePedidoFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStockLoading(true);

    try {
      // Parsear archivo Excel de pedido
      const resultado = await parsePedidoFile(file, productos);
      
      if (resultado.count === 0) {
        alert('No se encontraron productos en el archivo');
        return;
      }

      // Cargar productos en selectedProducts
      const nuevosProductos = {};
      resultado.products.forEach(producto => {
        nuevosProductos[producto.codigo] = {
          cantidad: producto.cantidad,
          precioLista: producto.precioLista,
          bxSize: producto.bxSize || 1,
          nombre: producto.nombre || '',
          observacion: producto.observacion || ''
        };
      });

      // Actualizar estado
      setSelectedProducts(nuevosProductos);
      
      // Actualizar datos del cliente si existen
      if (resultado.clientData.ruc || resultado.clientData.oc) {
        setClientData(prev => ({
          ...prev,
          ruc: resultado.clientData.ruc || prev.ruc,
          oc: resultado.clientData.oc || prev.oc
        }));
      }

      const mensaje = resultado.noEncontrados 
        ? `Pedido cargado: ${resultado.count} productos.\n⚠️ ${resultado.noEncontrados.length} productos no encontrados en catálogo.`
        : `Pedido cargado: ${resultado.count} productos listos para editar.`;
      
      alert(mensaje);
      
    } catch (err) {
      console.error('Error cargando pedido:', err);
      alert(`Error al cargar el pedido: ${err.message}`);
    } finally {
      setStockLoading(false);
      // Limpiar el input
      if (stockFileInputRef.current) {
        stockFileInputRef.current.value = '';
      }
    }
  };

  // Trigger para input file
  const triggerStockFileUpload = () => {
    stockFileInputRef.current?.click();
  };

  // Toggle observación expandida
  const toggleObservation = (codigo) => {
    setExpandedObservations(prev => ({
      ...prev,
      [codigo]: !prev[codigo]
    }));
  };

  // Actualizar observación de producto
  const updateObservation = (codigo, observacion) => {
    setSelectedProducts(prev => ({
      ...prev,
      [codigo]: {
        ...prev[codigo],
        observacion
      }
    }));
  };

  // Cargar productos desde JSON e IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Inicializar DB y verificar si se necesita recargar
        await initDB();

        // Variable para almacenar los productos cargados
        let loadedProductos = [];

        // Intentar cargar desde IndexedDB primero (solo si no se necesita recargar)
        const cachedProductos = !needsReloadFromUpgrade ? await loadAllFromDB('productos') : [];

        if (cachedProductos && cachedProductos.length > 0 && !needsReloadFromUpgrade) {
          loadedProductos = cachedProductos;
          setProductos(cachedProductos);
            } else {
              // Cargar desde JSON local con nombres de productos
              const response = await fetch('./productos_local.json');
              if (!response.ok) throw new Error('No se pudo cargar el archivo de productos');
              const data = await response.json();
              
              // Normalizar datos: mapear campos del JSON local a la estructura esperada
              const normalizedData = data.map(p => ({
                codigo: p.codigo,
                nombre: p.descripcion || p.nombre || '',
                bxSize: Number(p.uni_caja || p.u_por_caja || p.bxSize || p.cantidadPorCaja || 1),
                precioLista: Number(p.precio || p.precio_lista || p.precioLista || 0),
                ean: p.ean || '',
                linea: p.linea || '',
                stock: Number(p.stock_referencial || p.stock || 0)
              }));
              
              loadedProductos = normalizedData;
              setProductos(normalizedData);

          // Guardar en IndexedDB
          for (const producto of normalizedData) {
            await saveToDB('productos', producto);
          }
          
          // Resetear el flag de recarga
          needsReloadFromUpgrade = false;
        }

        // Cargar selección guardada y actualizar nombres desde el catálogo
        const savedSelection = await loadFromDB('seleccion', 'current');
        if (savedSelection) {
          // Actualizar nombres de productos seleccionados desde el catálogo cargado
          const updatedProducts = {};
          for (const [codigo, data] of Object.entries(savedSelection.products || {})) {
            const productoEnCatalogo = loadedProductos.find(p => p.codigo === codigo);
            updatedProducts[codigo] = {
              ...data,
              nombre: productoEnCatalogo?.nombre || data.nombre || ''
            };
          }
          setSelectedProducts(updatedProducts);
          setClientData(savedSelection.clientData || {
            ruc: '',
            nombre: '',
            oc: '',
            provincia: '',
            direccion: '',
            vendedor: ''
          });
        }

        setError(null);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los productos. Por favor, recargue la página.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    
    // Cargar stock guardado en IndexedDB al iniciar
    Promise.all([loadStockFromIndexedDB(), loadStockTimestamp()])
      .then(([savedStock, savedTimestamp]) => {
        if (savedStock && Object.keys(savedStock).length > 0) {
          setStockData(savedStock);
          setStockLastSync(savedTimestamp || localStorage.getItem('stockLastSync'));
          setStockTimestamp(savedTimestamp || localStorage.getItem('stockLastSync'));
        }
      })
      .catch(err => console.error('Error cargando stock guardado:', err));
  }, []);

  // Guardar selección en IndexedDB cuando cambie
  useEffect(() => {
    const saveSelection = async () => {
      try {
        await saveToDB('seleccion', {
          id: 'current',
          products: selectedProducts,
          clientData,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('Error guardando selección:', err);
      }
    };

    if (Object.keys(selectedProducts).length > 0 || clientData.ruc || clientData.nombre) {
      saveSelection();
    }
  }, [selectedProducts, clientData]);

  // Guardar fecha de sincronización de stock en localStorage
  useEffect(() => {
    if (stockLastSync) {
      localStorage.setItem('stockLastSync', stockLastSync);
    }
  }, [stockLastSync]);

  // Filtrar productos según búsqueda (por código o nombre)
  const filteredProducts = useMemo(() => {
    if (!debouncedSearch.trim()) return productos;

    const query = debouncedSearch.toLowerCase().trim();
    return productos.filter(p =>
      p.codigo.toLowerCase().includes(query) ||
      (p.nombre && p.nombre.toLowerCase().includes(query))
    );
  }, [productos, debouncedSearch]);

  // Ordenar productos
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Manejar valores numéricos
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Manejar strings
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredProducts, sortConfig]);

  // Productos paginados
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedProducts.slice(startIndex, startIndex + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  // Total de páginas
  const totalPages = Math.ceil(sortedProducts.length / pageSize);

  // Productos visibles en búsqueda (limitado a 50 para performance)
  const visibleSearchProducts = filteredProducts.slice(0, 50);

  // Resetear página cuando cambia el filtro o tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, pageSize]);

  // Productos seleccionados como array (ordenados según sortConfig)
  const selectedProductsArray = useMemo(() => {
    const products = Object.entries(selectedProducts).map(([codigo, data]) => ({
      codigo,
      cantidad: data.cantidad,
      precioLista: data.precioLista,
      bxSize: data.bxSize,
      cajas: calcularBx(data.cantidad, data.bxSize),
      observacion: data.observacion || '',
      stock: stockData[codigo] || 0,
      ordenIngreso: data.ordenIngreso || 0
    }));
    // Ordenar según sortConfig (soporta ordenIngreso, código, nombre, etc.)
    return products.sort((a, b) => {
      const key = sortConfig.key;
      let aValue = a[key];
      let bValue = b[key];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selectedProducts, sortConfig, stockData]);

  // Total de productos seleccionados
  const totalSelected = Object.keys(selectedProducts).length;

  // Manejar cambio en datos del cliente
  const handleClientChange = (field, value) => {
    if (field === 'ruc') {
      // Solo permitir números y limitar a 11 dígitos
      value = value.replace(/\D/g, '').slice(0, 11);
    }
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  // Verificar si un producto está seleccionado
  const isSelected = (codigo) => {
    return selectedProducts.hasOwnProperty(codigo);
  };

  // Toggle selección de producto (acepta cantidad opcional)
  const toggleProduct = (producto, cantidad = 1) => {
    // Verificar si el producto ya está seleccionado
    if (selectedProducts[producto.codigo]) {
      alert(`El producto ${producto.codigo} ya está seleccionado.\nCantidad actual: ${selectedProducts[producto.codigo].cantidad}\n\nUse el campo de cantidad en la lista de productos para modificar.`);
      // Limpiar input de búsqueda pero mantener las cantidades
      setSearch('');
      return;
    }
    
    const currentOrder = nextOrderIndex;
    setSelectedProducts(prev => {
      const newSelection = { ...prev };
      newSelection[producto.codigo] = {
        cantidad: cantidad,
        precioLista: producto.precioLista,
        bxSize: producto.bxSize,
        nombre: producto.nombre || '',
        ordenIngreso: currentOrder
      };
      return newSelection;
    });
    setNextOrderIndex(prev => prev + 1);
    // Limpiar input de búsqueda y cantidades
    setSearch('');
    setSearchQuantities({});
  };

  // Helper para obtener etiqueta de equivalencia (ej. "1 Bx = 72 unidades")
  const getMasterLabel = (codigo) => {
    const prod = productos.find(p => p.codigo === codigo);
    const perMaster = prod?.bxSize || 1;
    return perMaster === 1 ? null : `1 Bx = ${perMaster.toLocaleString()} unidades`;
  };

  // Helper para obtener equivalencia dinámica en tiempo real
  const getEquivalenceLabel = (codigo, displayValue, rawValue) => {
    if (!displayValue || displayValue === '' || displayValue === null) return null;
    const prod = productos.find(p => p.codigo === codigo);
    const perBox = prod?.bxSize || 1;
    if (perBox === 1) return null;
    
    // rawValue es la cantidad REAL en unidades (siempre)
    const unidadesReales = parseInt(String(rawValue).replace(/\D/g, ''), 10) || 0;
    if (isNaN(unidadesReales) || unidadesReales <= 0) return null;

    // Mostrar equivalencia basada en el modo de entrada
    if (inputMode === 'bx') {
      // Usuario ingresó en Bx (cajas/bultos), mostrar resultado en unidades
      return `= ${unidadesReales.toLocaleString()} un`;
    } else {
      // Usuario ingresó en unidades, mostrar equivalencia en Bx
      const totalCajas = unidadesReales / perBox;
      return `= ${totalCajas.toFixed(2)} Bx`;
    }
  };

  // Helper para mostrar cantidad en el input según el modo de entrada actual
  const getDisplayQuantity = (codigo, unidades) => {
    if (inputMode === 'bx') {
      const prod = productos.find(p => p.codigo === codigo);
      const perBox = prod?.bxSize || 1;
      if (perBox === 1) return unidades; // Si no hay cajas definidas, mostrar en unidades
      return Math.round((unidades / perBox) * 100) / 100; // Mostrar en cajas
    }
    return unidades; // Modo unidades: mostrar directamente
  };

  // Helper para mostrar precio según el modo de entrada actual
  const getDisplayPrice = (codigo, precioUnitario) => {
    if (inputMode === 'bx') {
      const prod = productos.find(p => p.codigo === codigo);
      const perBox = prod?.bxSize || 1;
      if (perBox === 1) return precioUnitario; // Si no hay cajas definidas, mostrar precio unitario
      return precioUnitario * perBox; // Mostrar precio por caja/empaque
    }
    return precioUnitario; // Modo unidades: mostrar precio unitario
  };

  // Parsear entradas de cantidad: soporta números y expresiones de cajas (ej. "10xBx")
  const parseQuantityInput = (value, codigo) => {
    if (value === '' || value === null || value === undefined) return null;
    if (typeof value === 'number') return Math.max(0, Math.floor(value));
    const raw = String(value).trim().replace(/\./g, '').replace(/,/g, '');

    // Formato cajas: 10xBx, 10xbx (case-insensitive)
    const boxMatch = raw.match(/^(\d+)\s*[xX*]\s*(bx|b)?$/i);
    if (boxMatch) {
      const boxes = parseInt(boxMatch[1], 10) || 0;
      const prod = productos.find(p => p.codigo === codigo);
      const perBox = prod?.bxSize || 1;
      return Math.max(0, boxes * perBox);
    }

    const n = parseInt(raw, 10);
    if (isNaN(n)) return null;
    // Si el modo de entrada global es 'bx', interpretar números simples como cajas
    if (inputMode === 'bx') {
      const prod = productos.find(p => p.codigo === codigo);
      const perBox = prod?.bxSize || 1;
      return Math.max(0, n * perBox);
    }
    return Math.max(0, n);
  };

  // Manejar cambio de cantidad en resultados de búsqueda
  const handleSearchQuantityChange = (codigo, value) => {
    const parsed = parseQuantityInput(value, codigo);
    const qty = parsed === null ? 1 : Math.max(1, parsed);
    setSearchQuantities(prev => ({
      ...prev,
      [codigo]: qty
    }));
  };

  // Toggle selección para agregar (checkbox individual)
  const toggleSelectForAdd = (codigo) => {
    setSelectedForAdd(prev => ({
      ...prev,
      [codigo]: !prev[codigo]
    }));
  };

  // Ref para selección por rango (shift+click)
  const lastSelectedIndexRef = useRef(null);

  // Maneja selección por fila (click/checkbox) con soporte para shift-select
  const handleRowSelect = (codigo, index, e, productList) => {
    if (selectedProducts[codigo]) return;

    // Shift+click: seleccionar rango entre última y actual
    if (e && e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const newSelection = { ...selectedForAdd };
      for (let i = start; i <= end; i++) {
        const c = productList[i].codigo;
        if (!selectedProducts[c]) newSelection[c] = true;
      }
      setSelectedForAdd(newSelection);
    } else {
      toggleSelectForAdd(codigo);
      lastSelectedIndexRef.current = index;
    }
  };

  // Seleccionar/deseleccionar todos los productos visibles
  const toggleSelectAll = (productList) => {
    const allSelected = productList.every(p => selectedForAdd[p.codigo]);
    if (allSelected) {
      // Deseleccionar todos
      setSelectedForAdd({});
    } else {
      // Seleccionar todos los que no están ya en el pedido
      const newSelection = {};
      productList.forEach(p => {
        if (!selectedProducts[p.codigo]) {
          newSelection[p.codigo] = true;
        }
      });
      setSelectedForAdd(newSelection);
    }
  };

  // Agregar todos los productos seleccionados
  const addSelectedProducts = () => {
    const productsToAdd = Object.keys(selectedForAdd);
    if (productsToAdd.length === 0) return;

    // Calcular el orden inicial
    let currentOrder = nextOrderIndex;

    // Agregar cada producto seleccionado con número de orden
    const newProducts = { ...selectedProducts };
    productsToAdd.forEach(codigo => {
      const producto = productos.find(p => p.codigo === codigo);
      if (producto && !newProducts[producto.codigo]) {
        const cantidad = searchQuantities[codigo] || 1;
        newProducts[producto.codigo] = {
          cantidad: cantidad,
          precioLista: producto.precioLista,
          bxSize: producto.bxSize,
          nombre: producto.nombre || '',
          ordenIngreso: currentOrder
        };
        currentOrder++;
      }
    });

    setSelectedProducts(newProducts);
    setNextOrderIndex(currentOrder);

    // Limpiar selección y cantidades
    setSelectedForAdd({});
    setSearchQuantities({});
    setSearch('');
  };

  // Contar productos seleccionados para agregar (que no están ya en el pedido)
  const selectedCountForAdd = Object.keys(selectedForAdd).filter(
    codigo => !selectedProducts[codigo]
  ).length;

  // Agregar producto por código manual (usa el mismo input del buscador)
  const addProductByCode = () => {
    const code = search.trim();
    if (!code) return;

    const producto = productos.find(p => p.codigo === code);
    if (producto) {
      // Verificar si el producto ya está seleccionado
      if (selectedProducts[producto.codigo]) {
        alert(`El producto ${producto.codigo} ya está seleccionado.\nCantidad actual: ${selectedProducts[producto.codigo].cantidad}\n\nUse el campo de cantidad en la lista de productos para modificar.`);
        setSearch('');
        return;
      }
      
      // Si el producto existe en el catálogo y no está seleccionado
      const currentOrder = nextOrderIndex;
      setSelectedProducts(prev => {
        const newSelection = { ...prev };
        newSelection[producto.codigo] = {
          cantidad: 1,
          precioLista: producto.precioLista,
          bxSize: producto.bxSize,
          nombre: producto.nombre || '',
          ordenIngreso: currentOrder
        };
        return newSelection;
      });
      setNextOrderIndex(prev => prev + 1);
      setSearch('');
      setCodeNotFound(false);
    } else {
      // Producto no encontrado - mostrar opción para agregar manualmente
      setCodeNotFound(true);
    }
  };

  // Agregar producto personalizado (no está en el catálogo)
  const addCustomProduct = (customData) => {
    const code = search.trim();
    if (!code) return;

    // Verificar si el producto ya está seleccionado
    if (selectedProducts[code]) {
      alert(`El producto ${code} ya está seleccionado.\nCantidad actual: ${selectedProducts[code].cantidad}\n\nUse el campo de cantidad en la lista de productos para modificar.`);
      return;
    }

    const currentOrder = nextOrderIndex;
    setSelectedProducts(prev => {
      const newSelection = { ...prev };
      newSelection[code] = {
        cantidad: customData.cantidad || 1,
        precioLista: customData.precioLista || 0,
        bxSize: customData.bxSize || 1,
        nombre: customData.nombre || `Producto ${code}`,
        esPersonalizado: true,
        ordenIngreso: currentOrder
      };
      return newSelection;
    });
    setNextOrderIndex(prev => prev + 1);
    setSearch('');
    setCodeNotFound(false);
    setShowCustomProductForm(false);
  };

  // Manejar tecla Enter en input de código manual
  const handleManualCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProductByCode();
    }
  };

  // Actualizar cantidad de producto
  const updateQuantity = (codigo, newQuantity) => {
    // Si el valor está vacío, mostrar diálogo de confirmación
    if (newQuantity === '' || newQuantity === null || newQuantity === undefined) {
      setPendingQuantityCodigo(codigo);
      setShowQuantityConfirm(true);
      return;
    }
    // Permitir entradas tipo "10xC" para cajas o números directos
    const parsed = parseQuantityInput(newQuantity, codigo);
    const quantity = Math.max(0, parsed || 0);
    
    setSelectedProducts(prev => {
      if (quantity === 0) {
        const newSelection = { ...prev };
        delete newSelection[codigo];
        return newSelection;
      }
      
      return {
        ...prev,
        [codigo]: {
          ...prev[codigo],
          cantidad: quantity
        }
      };
    });
  };

  // Manejar ordenamiento
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Limpiar selección con confirmación
  const handleClearSelection = async () => {
    setShowClearConfirm(true);
  };

  const confirmClear = async () => {
    setSelectedProducts({});
    // Resetear el contador de orden de ingreso
    setNextOrderIndex(1);
    // También limpiar los datos del cliente
    setClientData({
      ruc: '',
      nombre: '',
      oc: '',
      provincia: '',
      direccion: '',
      vendedor: ''
    });
    await clearStore('seleccion');
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  // Cancelar eliminación de cantidad vacía
  const cancelQuantityDelete = () => {
    setShowQuantityConfirm(false);
    setPendingQuantityCodigo(null);
  };

  // Confirmar eliminación por cantidad vacía
  const confirmQuantityDelete = () => {
    if (pendingQuantityCodigo) {
      const newSelection = { ...selectedProducts };
      delete newSelection[pendingQuantityCodigo];
      setSelectedProducts(newSelection);
    }
    setShowQuantityConfirm(false);
    setPendingQuantityCodigo(null);
  };

  // Exportar a Excel (mínimo: RUC + 1 producto)
  const handleExport = () => {
    if (!validarDocumento(clientData.ruc)) {
      alert('Por favor, ingrese un RUC (11 dígitos) o DNI (8 dígitos) válido');
      return;
    }

    if (selectedProductsArray.length === 0) {
      alert('Agregue al menos un producto para exportar');
      return;
    }

    // Mostrar modal de confirmación
    setShowExportConfirm(true);
  };

  // Confirmar y ejecutar exportación
  const confirmExport = () => {
    // Auto-generar OC si está vacía usando formato ddmmyy
    let exportClientData = { ...clientData };
    if (!clientData.oc.trim()) {
      const fechaCompacta = getFechaCompacta();
      exportClientData = {
        ...clientData,
        oc: fechaCompacta
      };
      // Actualizar el estado para reflejar el cambio
      setClientData(prev => ({ ...prev, oc: fechaCompacta }));
    }

    generateExcel(exportClientData, selectedProductsArray);
    setShowExportConfirm(false);
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Cargando productos...</p>
        </div>
      </div>
    );
  }

  // Renderizar estado de error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-corporate">
        <div className="text-center glass-card p-8 max-w-md">
          <svg className="w-16 h-16 text-danger-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Error</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-corporate">
      {/* Header Perfil - Optimizado para móvil con título izquierda y botones derecha */}
      <header className="header-corporate sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Layout flexible: en desktop y móvil - título izquierda, botones derecha */}
          <div className="flex items-center justify-between">
            {/* Título principal - siempre alineado a la izquierda */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Hoja de Pedido
              </h1>
            </div>
            
            {/* Botones de acción - alineados a la derecha */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Fecha actual */}
              <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">
                {getFechaCorta()}
              </span>

              {/* Botón para cambiar tema */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                )}
              </button>
              
              {/* Contador de productos - solo escritorio */}
              <span className="hidden md:inline text-sm text-slate-500 dark:text-slate-400">
                {productos.length} productos
              </span>

              {/* Botones de acción principales */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Catálogo */}
                <a href="https://fliphtml5.com/bookcase/ilmjw/" target="_blank" rel="noopener noreferrer" 
                   className="btn-secondary text-xs p-2" 
                   title="Ver catálogos">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </a>
                {/* Sincronizar stock */}
                <button onClick={handleStockSync} disabled={stockLoading} 
                        className="btn-secondary text-xs p-2" 
                        title={stockLastSync ? 'Última sync: ' + new Date(stockLastSync).toLocaleString() : 'Sincronizar stock'}>
                  {stockLoading ? 
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg> : 
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                </button>
                {/* Cargar pedido anterior */}
                <button onClick={triggerStockFileUpload} disabled={stockLoading} 
                        className="btn-secondary text-xs p-2" 
                        title="Cargar pedido anterior (Excel)">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <input ref={stockFileInputRef} type="file" accept=".xlsx,.xls" onChange={handlePedidoFileUpload} className="hidden"/>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Barra de información de stock - Estilo corporativo */}
      <section className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-indigo-950 border-b border-indigo-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-1.5">
          <div className="flex items-center justify-end text-[10px]">
            {stockTimestamp ? (
              <span className={`flex items-center gap-1 ${getStockAgeColor(stockTimestamp)}`}>
                <span className="font-medium">Stock:</span>
                <span>{formatTimestamp(stockTimestamp)}</span>
                <span className="opacity-75">({getTimeAgo(stockTimestamp)})</span>
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Stock: No sincronizado</span>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Datos del Cliente */}
        <section className="glass-card mb-6 animate-fadeIn">
          {/* Header colapsable en móvil */}
          <div className="p-6 pb-4">
            <button
              className="w-full flex items-center justify-between sm:hidden"
              onClick={() => setClientSectionExpanded(!clientSectionExpanded)}
            >
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Datos del Cliente
              </h2>
              <svg
                className={`w-5 h-5 text-slate-500 transition-transform ${clientSectionExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 hidden sm:flex">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Datos del Cliente
            </h2>
          </div>

          {/* Contenido colapsable de datos del cliente */}
          {/* La rejilla se ajusta para ser más compacta en pantallas grandes */}
          <div className={`${clientSectionExpanded ? 'block' : 'hidden'} sm:block px-6 pb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                RUC/DNI {!validarDocumento(clientData.ruc) && clientData.ruc && (
                  <span className="text-danger-500 text-xs">(8 u 11 dígitos)</span>
                )}
              </label>
              <input
                type="text"
                className={`glass-input ${!validarDocumento(clientData.ruc) && clientData.ruc ? 'border-danger-300 focus:border-danger-500' : ''}`}
                placeholder="RUC (11 dígitos) o DNI (8 dígitos)"
                title="Ingrese RUC (11 dígitos) o DNI (8 dígitos). Campo obligatorio para exportar."
                value={clientData.ruc}
                onChange={(e) => handleClientChange('ruc', e.target.value)}
                maxLength={11}
              />
              {clientData.ruc && (
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tipoDocumento(clientData.ruc)}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Nombre del Cliente
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="Razón Social o Nombre"
                title="Nombre o razón social del cliente (opcional)"
                value={clientData.nombre}
                onChange={(e) => handleClientChange('nombre', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                OC / Referencia
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="Número entero (ej: 12345)"
                title="Número de orden de compra o referencia. Solo números enteros. Se autogenera si está vacío."
                value={clientData.oc}
                onChange={(e) => handleClientChange('oc', e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Provincia / Departamento
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="Ej: Trujillo, Lima, Arequipa..."
                title="Ciudad o departamento de entrega. Se usa para el nombre del archivo Excel."
                value={clientData.provincia}
                onChange={(e) => handleClientChange('provincia', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Dirección / Punto de llegada
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="Av, Jr, Calle, número..."
                title="Dirección exacta de entrega (opcional)"
                value={clientData.direccion}
                onChange={(e) => handleClientChange('direccion', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Vendedor
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="Nombre del vendedor"
                title="Nombre del vendedor que atiende (opcional)"
                value={clientData.vendedor}
                onChange={(e) => handleClientChange('vendedor', e.target.value)}
              />
            </div>
          </div>
        </div>
        </section>

        {/* Agregar código manual y Buscador unificado */}
        <section className="glass-card mb-6 animate-fadeIn">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                Buscar / Agregar Producto
              </h2>
              <div className="flex-1 flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  className={`glass-input flex-1 ${codeNotFound ? 'border-danger-300 focus:border-danger-500' : ''}`}
                  placeholder="Ingrese código o nombre de producto..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCodeNotFound(false);
                    if (!e.target.value.trim()) {
                      setSearchQuantities({});
                      setSelectedForAdd({});
                    }
                  }}
                  onKeyDown={handleManualCodeKeyDown}
                />
                {/* Switch deslizable tipo iOS - sin etiquetas laterales redundantes */}
                <button
                  onClick={() => setInputMode(inputMode === 'un' ? 'bx' : 'un')}
                  className={`relative w-28 sm:w-32 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                    inputMode === 'bx' ? 'bg-primary-500' : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                  title={inputMode === 'un' ? 'Modo Bx: cada unidad representa un bulto/caja/saco' : 'Modo Unidades: ingreso por unidades individuales'}
                >
                  {/* Track labels */}
                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-colors ${inputMode === 'un' ? 'text-white' : 'text-white/50'}`}>
                    Unidades
                  </span>
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-colors ${inputMode === 'bx' ? 'text-white' : 'text-white/50'}`}>
                    Bx
                  </span>
                  {/* Thumb deslizante */}
                  <span
                    className={`absolute top-0.5 bg-white h-7 rounded-full shadow-md transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-slate-700 w-14 ${
                      inputMode === 'bx' ? 'left-[calc(100%-3.6rem)]' : 'left-0.5'
                    }`}
                  >
                    {inputMode === 'bx' ? 'Bx' : 'Unidades'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    // Si hay un solo producto en resultados y no está seleccionado, agregarlo con su cantidad
                    if (filteredProducts.length === 1) {
                      const producto = filteredProducts[0];
                      if (!selectedProducts[producto.codigo]) {
                        const cantidad = searchQuantities[producto.codigo] || 1;
                        toggleProduct(producto, cantidad);
                        return;
                      }
                    }
                    // Comportamiento original: agregar por código exacto
                    addProductByCode();
                  }}
                  className="btn-primary whitespace-nowrap"
                >
                  Agregar
                </button>
              </div>
              {codeNotFound && (
                <button
                  onClick={() => setShowCustomProductForm(true)}
                  className="text-primary-600 text-sm underline hover:text-primary-700 whitespace-nowrap"
                >
                  Agregar manualmente
                </button>
              )}
            </div>
          </div>

          {/* Tabla de búsqueda - Solo para agregar productos */}
          {search.trim() && (
            <>
              {/* Botón Agregar Seleccionados */}
              {selectedCountForAdd > 0 && (
                <div className="px-4 py-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
                  <button
                    onClick={addSelectedProducts}
                    className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Agregar {selectedCountForAdd} producto{selectedCountForAdd > 1 ? 's' : ''}
                  </button>
                </div>
              )}

              {/* Vista Desktop - Tabla completa */}
              <div className="hidden sm:block overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-center w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                          checked={visibleSearchProducts.length > 0 && visibleSearchProducts.every(p => selectedForAdd[p.codigo])}
                          onChange={() => toggleSelectAll(visibleSearchProducts)}
                          title="Seleccionar todos"
                        />
                      </th>
                      <th className="px-2 py-2 text-left font-medium">Código</th>
                      <th className="px-2 py-2 text-left font-medium">Nombre</th>
                      <th className="px-2 py-2 text-center font-medium">U/Bx</th>
                      <th className="px-2 py-2 text-center font-medium">Stock</th>
                      <th className="px-2 py-2 text-right font-medium">Precio</th>
                      <th className="px-2 py-2 text-center font-medium w-20">Cant.</th>
                      <th className="px-2 py-2 text-center font-medium w-20">Seleccionar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {visibleSearchProducts.map((producto, idx) => {
                      const alreadySelected = isSelected(producto.codigo);
                      const isChecked = selectedForAdd[producto.codigo];
                      const qty = searchQuantities[producto.codigo] || 1;
                      return (
                        <tr
                          key={producto.codigo}
                          className={`table-row-hover ${alreadySelected ? 'bg-slate-100 dark:bg-slate-800/50' : isChecked ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-slate-800'}`}
                          onClick={(e) => {
                            if (e.target.tagName.toLowerCase() === 'input' || e.target.closest('button')) return;
                            if (!alreadySelected) handleRowSelect(producto.codigo, idx, e, visibleSearchProducts);
                          }}
                        >
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                              checked={isChecked || alreadySelected}
                              disabled={alreadySelected}
                              onChange={(e) => !alreadySelected && handleRowSelect(producto.codigo, idx, e, visibleSearchProducts)}
                              title={alreadySelected ? 'Ya está en el pedido' : isChecked ? 'Quitar selección' : 'Seleccionar'}
                            />
                          </td>
                          <td className="px-2 py-2 font-mono font-medium text-slate-800 dark:text-slate-100">
                            {producto.codigo}
                          </td>
                          <td className="px-2 py-2 text-slate-600 dark:text-slate-300 max-w-[10rem]">
                            <p className="line-clamp-2 text-sm">{producto.nombre || '-'}</p>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300" title={`${producto.bxSize} unidades por Bx (box/bulto)`}>
                              {producto.bxSize} U/Bx
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {stockData[producto.codigo] > 0 ? (
                              <span className="text-green-600 dark:text-green-400 font-medium" title="Stock disponible">
                                {stockData[producto.codigo]}
                              </span>
                            ) : (
                              <span className="text-red-500" title="Sin stock">0</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex flex-col items-end" title="Precio de lista referencial (sin IGV, sin descuentos)">
                              <span className="font-mono text-slate-800 dark:text-slate-100 text-sm">
                                {formatMoney(getDisplayPrice(producto.codigo, producto.precioLista))}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {inputMode === 'bx' ? 'por Bx (ref.)' : 'por unidad (ref.)'}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={inputMode === 'boxes' ? "e.g. 10 o 10xC" : "e.g. 100 o 10xC"}
                                className={`w-14 text-center border border-slate-300 dark:border-slate-600 rounded py-1 text-sm dark:bg-slate-700 dark:text-slate-100 ${alreadySelected ? 'bg-slate-100 dark:bg-slate-700 cursor-not-allowed' : ''}`}
                                value={getDisplayQuantity(producto.codigo, qty)}
                                disabled={alreadySelected}
                                onChange={(e) => handleSearchQuantityChange(producto.codigo, e.target.value)}
                                onFocus={(e) => e.target.select()}
                              />
                              {/* Equivalencia dinámica en tiempo real */}
                              {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, qty)), qty) && (
                                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium whitespace-nowrap">
                                  {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, qty)), qty)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {alreadySelected ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500">En pedido</span>
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">Marcar</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-slate-500 dark:text-slate-400">
                          No se encontraron productos con ese código o nombre.
                          <button
                            onClick={() => setShowCustomProductForm(true)}
                            className="ml-2 text-primary-600 underline hover:text-primary-700"
                          >
                            Agregar manualmente
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil - Lista con input de cantidad y nombre en 2 líneas */}
              <div className="sm:hidden max-h-80 overflow-y-auto">
                {visibleSearchProducts.map((producto, idx) => {
                  const alreadySelected = isSelected(producto.codigo);
                  const isChecked = selectedForAdd[producto.codigo];
                  const qty = searchQuantities[producto.codigo] || 1;
                  return (
                    <div
                      key={producto.codigo}
                      className={`flex flex-col gap-2 px-3 py-3 border-b border-slate-100 dark:border-slate-700 ${
                        alreadySelected ? 'bg-slate-100 dark:bg-slate-800/50' : isChecked ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-slate-800'
                      }`}
                      onClick={(e) => {
                        if (e.target.tagName.toLowerCase() === 'input' || e.target.closest('button')) return;
                        if (!alreadySelected) handleRowSelect(producto.codigo, idx, e, visibleSearchProducts);
                      }}
                    >
                      {/* Primera línea: Checkbox + Código + Nombre */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-1 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 cursor-pointer shrink-0"
                            checked={isChecked || alreadySelected}
                            disabled={alreadySelected}
                            onChange={(e) => !alreadySelected && handleRowSelect(producto.codigo, idx, e, visibleSearchProducts)}
                            title={alreadySelected ? 'Ya está en el pedido' : isChecked ? 'Quitar selección' : 'Seleccionar'}
                          />
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-primary-600 dark:text-primary-400 text-sm">
                              {producto.codigo}
                            </span>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5" title={producto.nombre}>
                              {producto.nombre || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300" title={`${producto.bxSize} unidades por Bx (box/bulto)`}>
                            {producto.bxSize} U/Bx
                          </span>
                          <p className="text-xs font-mono text-slate-700 dark:text-slate-200 mt-1" title="Precio de lista referencial (sin IGV, sin descuentos)">
                            {formatMoney(getDisplayPrice(producto.codigo, producto.precioLista))}
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                              {inputMode === 'bx' ? '/Bx (ref.)' : '/unidad (ref.)'}
                            </span>
                          </p>
                          <p className="text-xs mt-1">
                            {stockData[producto.codigo] > 0 ? (
                              <span className="text-green-600 dark:text-green-400 font-medium" title="Stock disponible">
                                {stockData[producto.codigo]}
                              </span>
                            ) : (
                              <span className="text-red-500" title="Sin stock">0</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Segunda línea: Cantidad + Botón */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            Cant:
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={inputMode === 'boxes' ? "e.g. 10 o 10xC" : "e.g. 100 o 10xC"}
                            className={`flex-1 text-center border border-slate-300 dark:border-slate-600 rounded py-1.5 px-2 text-sm dark:bg-slate-700 dark:text-slate-100 ${alreadySelected ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                            value={getDisplayQuantity(producto.codigo, qty)}
                            disabled={alreadySelected}
                            onChange={(e) => handleSearchQuantityChange(producto.codigo, e.target.value)}
                            onFocus={(e) => e.target.select()}
                          />
                          {alreadySelected ? (
                            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-400">En pedido</span>
                          ) : (
                            <span className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400">Marcar</span>
                          )}
                        </div>
                          {/* Equivalencia dinámica en tiempo real - Móvil */}
                          {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, qty)), qty) ? (
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium ml-auto">
                              {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, qty)), qty)}
                            </span>
                          ) : null}
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No se encontraron productos.
                    <button
                      onClick={() => setShowCustomProductForm(true)}
                      className="ml-2 text-primary-600 underline hover:text-primary-700"
                    >
                      Agregar manualmente
                    </button>
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                {filteredProducts.length > 50 ? 'Mostrando 50 de ' : 'Mostrando '}{filteredProducts.length} productos
              </div>
            </>
          )}
        </section>

        {/* Productos Seleccionados */}
        <section className="glass-card mb-6 animate-fadeIn">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Productos Seleccionados
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ordenado por: {sortConfig.key === 'ordenIngreso' ? 'Orden de ingreso' : sortConfig.key === 'codigo' ? 'Código' : sortConfig.key === 'nombre' ? 'Nombre' : sortConfig.key}
                  <span className="ml-1 text-slate-400 dark:text-slate-500 cursor-help" title="Haga clic en los encabezados de la tabla para cambiar el ordenamiento">(ℹ️)</span>
                </p>
              </div>
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                {totalSelected} productos
              </span>
            </div>
          </div>

          {/* Controles de paginación */}
          {selectedProductsArray.length > pageSize && (
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">Filas por página:</span>
                <select
                  className="glass-input py-1 px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Tabla de Productos Seleccionados - Vista Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th
                    className="px-2 py-3 text-center font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 w-14"
                    onClick={() => handleSort('ordenIngreso')}
                    title="Orden de ingreso"
                  >
                    <div className="flex items-center justify-center gap-1">
                      #
                      {sortConfig.key === 'ordenIngreso' && (
                        <span className="text-primary-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => handleSort('codigo')}
                  >
                    <div className="flex items-center gap-1">
                      Código
                      {sortConfig.key === 'codigo' && (
                        <span className="text-primary-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => handleSort('nombre')}
                  >
                    <div className="flex items-center gap-1">
                      Nombre
                      {sortConfig.key === 'nombre' && (
                        <span className="text-primary-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => handleSort('bxSize')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      U/Bx
                      {sortConfig.key === 'bxSize' && (
                        <span className="text-primary-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => handleSort('precioLista')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Precio
                      {sortConfig.key === 'precioLista' && (
                        <span className="text-primary-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Cantidad</th>
                  <th className="px-2 py-3 text-center font-medium w-10" title="Observación">Obs.</th>
                  <th className="px-4 py-3 text-center font-medium w-16">Quitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {selectedProductsArray.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay productos seleccionados. Use el buscador o ingrese un código para agregar productos.
                    </td>
                  </tr>
                ) : (
                  selectedProductsArray.map((producto) => {
                    const productoData = productos.find(p => p.codigo === producto.codigo);
                    const nombre = productoData?.nombre || selectedProducts[producto.codigo]?.nombre || '-';
                    const observacion = selectedProducts[producto.codigo]?.observacion || '';
                    const isExpanded = expandedObservations[producto.codigo];
                    
                    return (
                      <Fragment key={producto.codigo}>
                        <tr
                          className="bg-white dark:bg-slate-800 table-row-hover"
                        >
                          <td className="px-2 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                              {producto.ordenIngreso}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-100">
                            {producto.codigo}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[12rem]">
                            <p className="line-clamp-2">{nombre}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300" title={`${producto.bxSize} unidades por Bx (box/bulto)`}>
                              {producto.bxSize} U/Bx
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end" title="Precio de lista referencial (sin IGV, sin descuentos)">
                              <span className="font-mono text-slate-800 dark:text-slate-100">
                                {formatMoney(getDisplayPrice(producto.codigo, producto.precioLista))}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {inputMode === 'bx' ? 'por Bx (ref.)' : 'por unidad (ref.)'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={inputMode === 'bx' ? "e.g. 10 o 10xBx" : "e.g. 100 o 10xBx"}
                                className="w-16 text-center border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm font-semibold dark:bg-slate-700 dark:text-slate-100"
                                value={getDisplayQuantity(producto.codigo, producto.cantidad)}
                                onChange={(e) => updateQuantity(producto.codigo, e.target.value)}
                                onFocus={(e) => e.target.select()}
                              />
                              {/* Solo equivalencia dinámica */}
                              {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, producto.cantidad)), producto.cantidad) && (
                                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium whitespace-nowrap">
                                  {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, producto.cantidad)), producto.cantidad)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={() => toggleObservation(producto.codigo)}
                              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                observacion 
                                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' 
                                  : 'text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                              title={observacion ? 'Editar observación' : 'Agregar observación'}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                const newSelection = { ...selectedProducts };
                                delete newSelection[producto.codigo];
                                setSelectedProducts(newSelection);
                              }}
                              className="btn-icon text-danger-500 hover:text-danger-700"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        {/* Fila expandible para observación */}
                        {isExpanded && (
                          <tr key={`${producto.codigo}-obs`} className="bg-slate-50 dark:bg-slate-800/50">
                            <td colSpan={7} className="px-4 py-2">
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">Obs:</span>
                                <textarea
                                  className="flex-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 resize-none dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  rows={2}
                                  placeholder="Agregar observación para este producto..."
                                  value={observacion}
                                  onChange={(e) => updateObservation(producto.codigo, e.target.value)}
                                />
                                <button
                                  onClick={() => toggleObservation(producto.codigo)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-2"
                                  title="Cerrar"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Vista de Cards para Móvil - Optimizada para ser más compacta */}
          <div className="sm:hidden">
            {selectedProductsArray.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                No hay productos seleccionados.
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {selectedProductsArray.map((producto) => {
                  const productoData = productos.find(p => p.codigo === producto.codigo);
                  const nombre = productoData?.nombre || selectedProducts[producto.codigo]?.nombre || '-';
                  const observacion = selectedProducts[producto.codigo]?.observacion || '';
                  const isExpanded = expandedObservations[producto.codigo];
                  
                  return (
                    <div key={producto.codigo} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="p-3">
                        <div className="flex justify-between items-start gap-3">
                          {/* Información del producto */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                                {producto.ordenIngreso}
                              </span>
                              <p className="font-mono font-bold text-primary-600 dark:text-primary-400">{producto.codigo}</p>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 line-clamp-2" title={nombre}>{nombre}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                               <span>Stock: <span className="font-semibold">{stockData[producto.codigo] ?? 0}</span></span>
                               <span>U/Bx: <span className="font-semibold">{producto.bxSize}</span></span>
                            </div>
                          </div>
                          {/* Input de cantidad */}
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-20 text-center text-lg font-bold border-b-2 border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 dark:bg-slate-700 dark:text-slate-100 focus:border-primary-500 focus:ring-0 transition"
                              value={getDisplayQuantity(producto.codigo, producto.cantidad)}
                              onChange={(e) => updateQuantity(producto.codigo, e.target.value)}
                              onFocus={(e) => e.target.select()}
                            />
                            <span className="text-xs text-primary-600 dark:text-primary-400 h-4">
                              {getEquivalenceLabel(producto.codigo, String(getDisplayQuantity(producto.codigo, producto.cantidad)), producto.cantidad)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Acciones y Observaciones */}
                      <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleObservation(producto.codigo)}
                          className={`flex-1 text-left text-xs transition-colors ${observacion ? 'text-primary-600 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-primary-600'}`}
                        >
                          {observacion ? 'Ver/Editar Nota' : 'Agregar Nota'}
                        </button>
                        <button
                          onClick={() => {
                            const newSelection = { ...selectedProducts };
                            delete newSelection[producto.codigo];
                            setSelectedProducts(newSelection);
                          }}
                          className="p-1.5 text-slate-400 hover:text-danger-500 rounded-md"
                          title="Eliminar producto"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-700 p-3">
                          <textarea
                            className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 dark:bg-slate-700 dark:text-slate-100"
                            rows={2}
                            placeholder="Observación..."
                            value={observacion}
                            onChange={(e) => updateObservation(producto.codigo, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          {selectedProductsArray.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
              Total: {selectedProductsArray.length} productos seleccionados
            </div>
          )}
        </section>

        {/* Acciones - Desktop */}
        <section className="glass-card p-6 animate-fadeIn hidden sm:block">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClearSelection}
              disabled={totalSelected === 0}
              className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Limpiar Selección
            </button>
            <button
              onClick={handleExport}
              disabled={totalSelected === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Exportar a Excel
            </button>
          </div>
        </section>
       </main>

      {/* Barra de acciones fija para móvil - Estilo corporativo */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-t border-indigo-100 dark:border-slate-700 p-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3">
          <button
            onClick={handleClearSelection}
            disabled={totalSelected === 0}
            className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Limpiar
          </button>
          <button
            onClick={handleExport}
            disabled={totalSelected === 0}
            className="btn-primary flex-[2] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Espaciador para el footer fijo en móvil */}
      <div className="sm:hidden h-20"></div>

      {/* Modal de confirmación */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
              Confirmar limpieza
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              ¿Está seguro de que desea limpiar todo? Se eliminarán los productos seleccionados y los datos del cliente (RUC, nombre, OC, vendedor). Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelClear}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClear}
                className="px-4 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors"
              >
                Limpiar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para cantidad vacía */}
      {showQuantityConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                ¿Eliminar producto?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                Ha dejado la cantidad vacía. ¿Desea eliminar este producto de la lista o restaurar el valor?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelQuantityDelete}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Restaurar (1)
              </button>
              <button
                onClick={confirmQuantityDelete}
                className="flex-1 px-4 py-3 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para exportación */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-success-600 dark:text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Confirmar Exportación
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                Verifique los datos antes de generar el archivo Excel
              </p>
            </div>
            
            {/* Resumen de datos */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">RUC/DNI:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{clientData.ruc || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Cliente:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{clientData.nombre || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">OC/Referencia:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{clientData.oc || <span className="text-amber-500">(auto)</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Provincia:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{clientData.provincia || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Dirección:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{clientData.direccion || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Vendedor:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{clientData.vendedor || '-'}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Productos:</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">{selectedProductsArray.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total unidades:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedProductsArray.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExport}
                className="flex-1 px-4 py-3 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar producto personalizado */}
      {showCustomProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
              Agregar Producto Manual
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Código: <span className="font-mono font-bold">{search}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  className="glass-input w-full"
                  placeholder="Nombre del producto"
                  value={customProductData.nombre}
                  onChange={(e) => setCustomProductData(prev => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Precio
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="glass-input w-full"
                    placeholder="0.00"
                    value={customProductData.precioLista}
                    onChange={(e) => setCustomProductData(prev => ({ ...prev, precioLista: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Unidades por Caja
                  </label>
                  <input
                    type="number"
                    className="glass-input w-full"
                    placeholder="1"
                    value={customProductData.bxSize}
                    onChange={(e) => setCustomProductData(prev => ({ ...prev, bxSize: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  className="glass-input w-full"
                  placeholder="1"
                  value={customProductData.cantidad}
                  onChange={(e) => setCustomProductData(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCustomProductForm(false);
                  setCodeNotFound(false);
                  setCustomProductData({ nombre: '', precioLista: '', bxSize: '', cantidad: 1 });
                  setSearch('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => addCustomProduct(customProductData)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer corporativo */}
      <footer className="bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-t border-indigo-100/50 dark:border-slate-700 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              📋 Hoja de Pedido <span className="text-primary-600 dark:text-primary-400 font-mono">v1.2.1</span>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-400 dark:text-slate-500">
              by Carlos Cusi
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
