/**
 * CatalogoPage.jsx
 * Página de catálogo con búsqueda y selección de productos
 * - "Todos": búsqueda libre (código, nombre, EAN) para clientes
 * - Categorías con filtros de líneas para fuerza de ventas
 * - Carga automática al seleccionar línea
 * - Paginado de productos
 * - Botón flotante al resumen OC
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../utils/formatters';
import { getBaseUrl } from '../utils/baseUrl';
import Tooltip from '../components/Tooltip';

// Grupos de categorías (agrupaciones de líneas)
const CATEGORIES = [
  { id: 'todos', label: 'Todos', lines: [], isFreeSearch: true },
  { 
    id: 'pelotas', 
    label: 'Pelotas',
    lines: ['PELOTAS', 'OTROS', 'MASCOTAS', 'JUGUETES'],
    isFreeSearch: false
  },
  { 
    id: 'escolar', 
    label: 'Escolar',
    lines: ['ESCRITURA', 'DIBUJO', 'MANUALIDADES', 'DIDACTICOS', 'FORROS', 'ARCHIVO', 'PINTURA', 'PEGAMENTOS', 'ACCESORIOS'],
    isFreeSearch: false
  },
  { 
    id: 'representadas', 
    label: 'Representadas',
    lines: ['REPRESENTADAS', 'PRODUCTOS INDUSTRIALES', 'PUBLICIDAD'],
    isFreeSearch: false
  },
];

// Productos por página
const PRODUCTS_PER_PAGE = 30;

// Hook para cargar productos desde JSON con stock actualizado
function useProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dataLoadedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const loadData = useCallback(async (forceReload = false) => {
    // Si ya se cargó y no se fuerza, no volver a cargar
    if (dataLoadedRef.current && !forceReload) return;
    
    // Cancelar fetch anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    
    try {
      // Cargar catálogo de productos
      const response = await fetch(`${getBaseUrl()}productos_local.json?t=${Date.now()}`, {
        signal: abortControllerRef.current.signal
      });
      if (!response.ok) throw new Error('No se pudo cargar el catálogo');
      const data = await response.json();
      
      // Cargar stock desde localStorage (actualizado por el botón sincronizar)
      let stockMap = {};
      try {
        const savedStock = localStorage.getItem('hoja_pedido_stock');
        if (savedStock) {
          const stockData = JSON.parse(savedStock);
          // Soportar formato nuevo (con stockData) y antiguo (con data)
          const stockArray = stockData.stockData || stockData.data || [];
          stockArray.forEach(item => {
            stockMap[item.sku] = item.disponible;
          });
        }
      } catch (e) {
        console.warn('No se pudo cargar stock guardado:', e);
      }
      
      const normalized = data.map(p => ({
        codigo: p.codigo,
        nombre: p.descripcion || p.nombre || '',
        bxSize: Number(p.uni_caja || p.u_por_caja || p.bxSize || 1),
        precioLista: Number(p.precio || p.precio_lista || p.precioLista || 0),
        ean: p.ean || '',
        linea: p.linea || '',
        // Usar stock del mapa si existe, sino el referencial del catálogo
        stock: stockMap[p.codigo] ?? Number(p.stock_referencial || p.stock || 0),
        orden: Number(p.orden || p.indice || 0)
      }));
      
      setProductos(normalized);
      dataLoadedRef.current = true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Escuchar evento de actualización de stock
  useEffect(() => {
    const handleStockUpdate = () => {
      console.log('📡 Evento stock-updated recibido, recargando catálogo...');
      dataLoadedRef.current = false; // Permitir recarga
      loadData(true); // Forzar recarga
    };
    
    window.addEventListener('stock-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-updated', handleStockUpdate);
  }, [loadData]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { productos, loading, error, loadData, dataLoaded: dataLoadedRef.current };
}

function CatalogoPage() {
  const { productos, loading, error, loadData, dataLoaded } = useProductos();
  const { 
    addToCart, 
    isInCart, 
    cartCount,
    cartTotalUnits,
    cartTotalValue
  } = useApp();
  
  // Estado de búsqueda
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  // Estado para cantidades en resultados de búsqueda
  const [searchQuantities, setSearchQuantities] = useState({});
  
  // Estado para catálogo activo
  const [activeCatalog, setActiveCatalog] = useState('todos');
  const [activeLineFilters, setActiveLineFilters] = useState([]);
  
  // Estado para paginado
  const [currentPage, setCurrentPage] = useState(1);

  // Helpers para filtrado
  const shouldHideProduct = useCallback((producto) => {
    if (producto.precioLista > 0) return false;
    const nombreLower = (producto.nombre || '').toLowerCase();
    const palabrasOcultar = ['descuento', 'descuentos', 'bonificacion', 'bonificaciones', 'bonif', 'dscto', 'dto'];
    return palabrasOcultar.some(palabra => nombreLower.includes(palabra));
  }, []);

  // Obtener las líneas disponibles para la categoría activa
  const getAvailableLines = useCallback(() => {
    const category = CATEGORIES.find(c => c.id === activeCatalog);
    if (!category || category.lines.length === 0) return [];
    
    const visibleProducts = productos.filter(p => !shouldHideProduct(p));
    const linesSet = new Set(
      visibleProducts
        .filter(p => category.lines.includes(p.linea?.toUpperCase().trim()))
        .map(p => p.linea?.toUpperCase().trim())
        .filter(Boolean)
    );
    return Array.from(linesSet).sort();
  }, [productos, activeCatalog, shouldHideProduct]);

  const availableLines = getAvailableLines();
  const currentCategory = CATEGORIES.find(c => c.id === activeCatalog);

  // Cargar datos cuando se selecciona una categoría con líneas o búsqueda en "Todos"
  useEffect(() => {
    // Si es "Todos" con búsqueda, cargar datos
    if (currentCategory?.isFreeSearch && debouncedSearch.trim() && !dataLoaded) {
      loadData();
    }
    // Si hay líneas disponibles y el usuario seleccionó alguna, cargar datos
    if (availableLines.length > 0 && activeLineFilters.length > 0 && !dataLoaded) {
      loadData();
    }
  }, [debouncedSearch, availableLines.length, activeLineFilters.length, currentCategory, dataLoaded, loadData]);

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCatalog, activeLineFilters, debouncedSearch]);

  // Toggle línea en multiselección
  const toggleLineFilter = (linea) => {
    setActiveLineFilters(prev => {
      if (prev.includes(linea)) {
        return prev.filter(l => l !== linea);
      } else {
        return [...prev, linea];
      }
    });
    // Si es la primera vez que se selecciona una línea, cargar datos
    if (!dataLoaded) {
      loadData();
    }
  };

  // Funciones de control de cantidad
  const incrementQuantity = (codigo, incremento = 1) => {
    setSearchQuantities(prev => ({
      ...prev,
      [codigo]: (prev[codigo] || 0) + incremento
    }));
  };

  const decrementQuantity = (codigo) => {
    setSearchQuantities(prev => ({
      ...prev,
      [codigo]: Math.max(0, (prev[codigo] || 0) - 1)
    }));
  };

  const getQuantity = (codigo) => searchQuantities[codigo] || 0;

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    // Si es "Todos" y hay búsqueda - búsqueda libre
    if (currentCategory?.isFreeSearch && debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      return productos
        .filter(p => !shouldHideProduct(p))
        .filter(p =>
          p.codigo.toLowerCase().includes(query) ||
          (p.nombre && p.nombre.toLowerCase().includes(query)) ||
          (p.ean && p.ean.toLowerCase().includes(query))
        );
    }
    
    // Si no hay filtros ni búsqueda, no mostrar
    if (activeLineFilters.length === 0 && activeCatalog === 'todos') {
      return [];
    }
    
    let result = productos.filter(p => !shouldHideProduct(p));
    
    // Filtrar por categoría
    if (currentCategory && !currentCategory.isFreeSearch) {
      result = result.filter(p => currentCategory.lines.includes(p.linea?.toUpperCase().trim()));
    }
    
    // Filtrar por líneas seleccionadas (multiselección)
    if (activeLineFilters.length > 0) {
      result = result.filter(p => activeLineFilters.includes(p.linea?.toUpperCase().trim()));
    }
    
    // Filtrar por búsqueda (para categorías con filtros)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      result = result.filter(p =>
        p.codigo.toLowerCase().includes(query) ||
        (p.nombre && p.nombre.toLowerCase().includes(query)) ||
        (p.ean && p.ean.toLowerCase().includes(query))
      );
    }
    
    // Ordenar por campo 'orden' si está definido (mayor a 0), luego por código
    result.sort((a, b) => {
      // Si ambos tienen orden definido, comparar por orden
      if (a.orden > 0 && b.orden > 0) {
        return a.orden - b.orden;
      }
      // Si solo a tiene orden, va primero
      if (a.orden > 0) return -1;
      // Si solo b tiene orden, va primero
      if (b.orden > 0) return 1;
      // Si ninguno tiene orden, ordenar por código
      return a.codigo.localeCompare(b.codigo);
    });
    
    return result;
  }, [productos, debouncedSearch, activeCatalog, activeLineFilters, shouldHideProduct, currentCategory]);

  // Productos paginados
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  // Estado para modal de advertencia de stock
  const [stockWarning, setStockWarning] = useState(null);

  // Agregar al carrito con validación de stock
  const handleAddToCart = (producto) => {
    const qty = getQuantity(producto.codigo);
    if (qty <= 0) return;

    // Verificar si hay stock suficiente
    if (producto.stock === 0) {
      setStockWarning({
        producto,
        qty,
        message: 'Este producto no tiene stock disponible'
      });
      return;
    }

    if (producto.stock > 0 && qty > producto.stock) {
      setStockWarning({
        producto,
        qty,
        message: `Solo hay ${producto.stock} unidades disponibles`
      });
      return;
    }

    proceedAddToCart(producto, qty);
  };

  // Agregar al carrito de todas maneras (ignorando advertencia)
  const confirmAddAnyway = () => {
    if (stockWarning) {
      proceedAddToCart(stockWarning.producto, stockWarning.qty);
      setStockWarning(null);
    }
  };

  // Proceder con agregar al carrito
  const proceedAddToCart = (producto, qty) => {
    const result = addToCart(producto, qty);
    if (result.success) {
      setSearchQuantities(prev => ({ ...prev, [producto.codigo]: 0 }));
    } else {
      alert(result.message);
    }
  };

  // Determinar si mostrar productos
  const showProducts = currentCategory?.isFreeSearch 
    ? debouncedSearch.trim() 
    : activeLineFilters.length > 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-teal-800/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">storefront</span>
            <div>
              <h1 className="text-lg font-bold">Catálogo</h1>
              <p className="text-xs text-slate-500">
                {productos.length > 0 ? `${productos.length} productos` : 'Cargando...'}
              </p>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500"
              placeholder={currentCategory?.isFreeSearch ? "Buscar código, nombre o EAN..." : "Buscar dentro de la línea..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs de categorías principales */}
        <div className="flex px-4 gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => (
            <Tooltip 
              key={cat.id}
              text={cat.isFreeSearch 
                ? 'Búsqueda libre por código, nombre o EAN' 
                : `Filtra productos de ${cat.label.toLowerCase()}`
              }
            >
              <button
                onClick={() => {
                  setActiveCatalog(cat.id);
                  setActiveLineFilters([]);
                  // Si es "Todos", no cargar hasta que escriba
                  if (!cat.isFreeSearch && cat.lines.length > 0 && !dataLoaded) {
                    loadData();
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  activeCatalog === cat.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat.label}
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Filtros de líneas - Multiselección (visible al seleccionar categoría con líneas) */}
        {activeCatalog !== 'todos' && availableLines.length > 0 && (
          <div className="flex px-4 gap-2 overflow-x-auto no-scrollbar pb-2">
            {availableLines.map((linea) => (
                <button
                  key={linea}
                  onClick={() => toggleLineFilter(linea)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    activeLineFilters.includes(linea)
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
              >
                {linea.charAt(0) + linea.slice(1).toLowerCase()}
                {activeLineFilters.includes(linea) && (
                  <span className="ml-1">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Lista de productos o mensaje inicial */}
      <main className="p-4 space-y-3">
        {!showProducts ? (
          // Mensaje inicial
          <div className="text-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4">search</span>
            {currentCategory?.isFreeSearch ? (
              <>
                <p className="text-lg font-medium text-slate-600 mb-2">Búsqueda libre</p>
                <p className="text-sm max-w-xs mx-auto">
                  Escribe un código, nombre o EAN para buscar en todo el catálogo
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-slate-600 mb-2">Explora por línea</p>
                <p className="text-sm max-w-xs mx-auto">
                  Selecciona una línea para ver sus productos
                </p>
              </>
            )}
          </div>
        ) : loading ? (
          // Cargando
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : error ? (
          // Error
          <div className="text-center py-8 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2 text-danger-500">error</span>
            <p>{error}</p>
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg">
              Reintentar
            </button>
          </div>
        ) : (
          // Resultados de búsqueda
          <>
            {/* Info de resultados */}
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>{filteredProducts.length} productos {currentCategory?.isFreeSearch ? 'encontrados' : 'en la línea'}</span>
              {totalPages > 1 && (
                <span>Página {currentPage} de {totalPages}</span>
              )}
            </div>

            {paginatedProducts.map((producto) => {
              const alreadySelected = isInCart(producto.codigo);
              const qty = getQuantity(producto.codigo);

              return (
                <div
                  key={producto.codigo}
                  className={`bg-white dark:bg-slate-800 rounded-xl border p-4 shadow-sm ${
                    alreadySelected
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {/* Info del producto */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                          {producto.codigo}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600">
                          {producto.bxSize} U/Bx
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                        {producto.nombre || '-'}
                      </p>
                      {producto.ean && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          EAN: <span className="font-mono">{producto.ean}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {formatMoney(producto.precioLista)} /unidad (ref. sin IGV)
                        </p>
                        {producto.stock > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            producto.stock > 100
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : producto.stock > 20
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            Stock: {producto.stock}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {alreadySelected && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                        <span className="material-symbols-outlined text-sm mr-1">check</span>
                        Agregado
                      </span>
                    )}
                  </div>

                  {/* Controles de cantidad y acción */}
                  {!alreadySelected && (
                    <div className="flex items-center justify-between gap-3">
                      {/* Contador */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                        <button
                          onClick={() => decrementQuantity(producto.codigo)}
                          disabled={qty <= 0}
                          className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-lg">remove</span>
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-12 text-center bg-transparent border-none text-base font-bold dark:text-slate-100 p-0"
                          value={qty || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSearchQuantities(prev => ({ ...prev, [producto.codigo]: Math.max(0, val) }));
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          onClick={() => incrementQuantity(producto.codigo, 1)}
                          className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300"
                        >
                          <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                      </div>

                      {/* Botón +CAJA */}
                      {producto.bxSize > 1 && (
                        <Tooltip text={`Agrega ${producto.bxSize} unidades (1 caja completa)`}>
                          <button
                            onClick={() => incrementQuantity(producto.codigo, producto.bxSize)}
                            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg whitespace-nowrap"
                          >
                            +CAJA ({producto.bxSize})
                          </button>
                        </Tooltip>
                      )}

                      {/* Botón Agregar */}
                      <button
                        onClick={() => handleAddToCart(producto)}
                        disabled={qty <= 0}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold text-sm transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                <p>No se encontraron productos</p>
              </div>
            )}

            {/* Controles de paginado */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg disabled:opacity-50"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-slate-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg disabled:opacity-50"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de advertencia de stock */}
      {stockWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">warning</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Stock insuficiente
              </h3>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                <span className="font-mono font-bold">{stockWarning.producto.codigo}</span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {stockWarning.producto.nombre}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                {stockWarning.message}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Cantidad solicitada: {stockWarning.qty} unidades
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStockWarning(null)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAddAnyway}
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg font-medium"
              >
                Agregar de todas maneras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante a la orden */}
      {cartCount > 0 && (
        <Link
          to="/orden"
          className="fixed bottom-24 right-4 z-40 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl shadow-xl px-4 py-3 flex flex-col gap-1 transition-transform hover:scale-105 min-w-[180px]"
        >
          {/* Fila superior: Icono + Items + Unidades */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="font-bold text-sm">{cartCount} ítems</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {cartTotalUnits} und
            </span>
          </div>
          
          {/* Fila inferior: Monto total */}
          <div className="flex items-center justify-between border-t border-white/20 pt-1 mt-1">
            <span className="text-xs opacity-80">Total:</span>
            <span className="font-bold text-sm">{formatMoney(cartTotalValue)}</span>
          </div>
        </Link>
      )}
    </div>
  );
}

export default CatalogoPage;
