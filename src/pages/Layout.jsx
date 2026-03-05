/**
 * Layout.jsx
 * Layout principal con barra de navegación inferior tipo app móvil
 * Accesos: Inicio (catálogo), Catálogo (URL), Cargar XLSX, Actualizar, Cliente
 */

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useRef, useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { loadExcelFile } from '../utils/xlsxLoader';
import Tooltip from '../components/Tooltip';

// Componente de Modal de Confirmación reutilizable
function ConfirmModal({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors ${danger ? 'bg-danger-500 hover:bg-danger-600' : 'bg-teal-600 hover:bg-teal-700'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de Modal de Alerta/Información
function AlertModal({ isOpen, title, message, buttonText = 'Aceptar', onClose, type = 'info' }) {
  if (!isOpen) return null;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  
  const colors = {
    success: 'bg-success-100 dark:bg-success-900/30 text-success-600',
    error: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600',
    info: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors[type]}`}>
            <span className="text-lg font-bold">{icons[type]}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <button onClick={onClose} className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors">
          {buttonText}
        </button>
      </div>
    </div>
  );
}

function Layout() {
  const { cartCount, setShowPedidoModal, selectedProducts, setClientDataAll, clearCart, addToCart, isDarkMode, toggleTheme } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Estado para timestamp de última sincronización de stock
  const [lastStockSync, setLastStockSync] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estado para modales de confirmación y alerta
  const [modals, setModals] = useState({
    refresh: { open: false, type: 'refresh' },
    load: { open: false, type: 'load', data: null },
    alert: { open: false, title: '', message: '', type: 'info' }
  });
  
  const isActive = (path) => location.pathname === path;

  // Función para formatear fecha con hora (formato peruano: día/mes)
  const formatSyncTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hour12}:${minutes} ${ampm}`;
  };
  
  // Función para obtener el estado del stock basado en el tiempo (calculado con useMemo)
  const stockStatus = useMemo(() => {
    if (!lastStockSync) return { color: 'text-slate-400', bg: 'bg-slate-100', label: 'Sin actualizar' };
    
    const now = new Date();
    const lastUpdate = new Date(lastStockSync);
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Actualizado' };
    } else if (diffMinutes < 70) {
      return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Por actualizar' };
    } else {
      return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Desactualizado' };
    }
  }, [lastStockSync]);

  // Función para mostrar alerta
  const showAlert = (title, message, type = 'info') => {
    setModals(prev => ({ ...prev, alert: { open: true, title, message, type } }));
  };
  
  // Función para sincronizar stock y catálogo (sin recargar la página)
  const handleRefresh = async () => {
    // Confirmar si hay productos en el carrito
    if (cartCount > 0) {
      setModals(prev => ({ ...prev, refresh: { open: true, type: 'refresh' } }));
      return;
    }
    
    await performRefresh();
  };
  
  // Ejecutar la actualización de stock y catálogo
  const performRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Iniciando actualización de stock y catálogo...');
      const startTime = Date.now();
      
      // 1. Descargar stock fresco del servidor
      console.log('📥 Descargando stock...');
      const stockResponse = await fetch('./stock_data.json?t=' + Date.now());
      if (!stockResponse.ok) {
        throw new Error('No se pudo descargar stock');
      }
      const stockData = await stockResponse.json();
      
      // 2. Descargar catálogo de productos
      console.log('📥 Descargando catálogo...');
      const catalogResponse = await fetch('/productos_local.json?t=' + Date.now());
      if (!catalogResponse.ok) {
        throw new Error('No se pudo descargar catálogo');
      }
      const catalogData = await catalogResponse.json();
      
      // 3. Guardar en localStorage con timestamp
      const syncInfo = {
        timestamp: new Date().toISOString(),
        stockData: stockData.data,
        stockCount: stockData.count || stockData.data?.length || 0,
        catalogData: catalogData,
        catalogCount: catalogData.length
      };
      localStorage.setItem('hoja_pedido_stock', JSON.stringify(syncInfo));
      localStorage.setItem('hoja_pedido_stock_sync', JSON.stringify(syncInfo.timestamp));
      setLastStockSync(syncInfo.timestamp);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Actualización completada en ${elapsed}ms`);
      console.log(`   - Stock: ${syncInfo.stockCount} productos`);
      console.log(`   - Catálogo: ${syncInfo.catalogCount} productos`);
      
      // 4. Forzar actualización del componente CatalogoPage sin recargar
      window.dispatchEvent(new CustomEvent('stock-updated', { detail: syncInfo }));
      
      // 5. Mostrar feedback al usuario
      showAlert('Actualización Completa', `Stock (${syncInfo.stockCount}) y Catálogo (${syncInfo.catalogCount}) actualizados`, 'success');
    } catch (err) {
      console.error('❌ Error sincronizando:', err);
      showAlert('Error de Sincronización', 'Error al sincronizar: ' + err.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cleanup para cancelar fetchs pendientes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Cargar archivo XLSX desde la barra de navegación
  const handleLoadXLSX = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Cancelar fetch anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const { clientData, products } = await loadExcelFile(file);
      
      if (products.length === 0) {
        showAlert('Archivo Vacío', 'No se encontraron productos en el archivo', 'warning');
        return;
      }

      // Confirmar carga
      if (cartCount > 0) {
        setModals(prev => ({ ...prev, load: { open: true, type: 'load', data: { clientData, products } } }));
        return;
      }

      await loadProductsToCart(clientData, products);
    } catch (err) {
      showAlert('Error al Cargar', 'Error al cargar el archivo: ' + err.message, 'error');
    }
    
    // Limpiar input
    event.target.value = '';
  };
  
  // Cargar productos al carrito
  const loadProductsToCart = async (clientData, products) => {
    try {
      const response = await fetch('/productos_local.json?t=' + Date.now(), {
        signal: abortControllerRef.current.signal
      });
      if (!response.ok) {
        throw new Error(`Error al cargar catálogo: ${response.status} ${response.statusText}`);
      }
      const catalogData = await response.json();
      const normalizedCatalog = catalogData.map(p => ({
        codigo: p.codigo,
        nombre: p.descripcion || p.nombre || '',
        bxSize: Number(p.uni_caja || p.u_por_caja || p.bxSize || 1),
        precioLista: Number(p.precio || p.precio_lista || p.precioLista || 0),
        ean: p.ean || '',
        linea: p.linea || '',
        stock: Number(p.stock_referencial || p.stock || 0)
      }));

      let loadedCount = 0;
      let skippedCount = 0;
      products.forEach(p => {
        if (p.codigo && p.cantidad > 0) {
          const productoData = normalizedCatalog.find(prod => prod.codigo === p.codigo);
          if (productoData) {
            const result = addToCart(productoData, p.cantidad);
            if (result.success) {
              loadedCount++;
            } else {
              skippedCount++;
              console.warn(`No se pudo cargar ${p.codigo}: ${result.message}`);
            }
          }
        }
      });

      if (skippedCount > 0) {
        console.warn(`${skippedCount} productos no se encontraron en el catálogo y fueron omitidos`);
      }

      showAlert('Pedido Cargado', `Se cargaron ${loadedCount} productos al carrito`, 'success');
      
      // Ir al resumen para revisar
      if (loadedCount > 0) {
        navigate('/orden');
      }
    } catch (fetchError) {
      showAlert('Error de Catálogo', 'Error al cargar el catálogo: ' + fetchError.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header superior PC - Con z-index mayor que el sidebar */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 h-16 items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-xl">inventory_2</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Hoja de Pedido
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sistema de gestión comercial</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Botón de tema para PC */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 group"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          
          {/* Botón Cliente para PC */}
          <Tooltip text="RUC, nombre, orden de compra y dirección de entrega">
            <button
              onClick={() => setShowPedidoModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-sm">person</span>
              <span>Datos del Cliente</span>
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Header superior móvil */}
      <header className="flex lg:hidden items-center justify-between px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-lg">inventory_2</span>
          </div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Hoja de Pedido
          </h1>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 active:scale-95"
          title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-xl">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </header>

      {/* Layout principal PC: Sidebar fijo + Contenido con margen */}
      <div className="hidden lg:flex">
        {/* Sidebar de navegación - Solo PC */}
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-40">
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Tooltip text="Busca productos por código, nombre o EAN" position="top">
              <NavLink
                to="/catalogo"
                className={() =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full ${
                    isActive('/catalogo')
                      ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <span className="material-symbols-outlined">search</span>
                <span>Buscar Productos</span>
              </NavLink>
            </Tooltip>
            
            <Tooltip text="Ver catálogo completo en línea" position="top">
              <a
                href="https://fliphtml5.com/bookcase/ilmjw/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">menu_book</span>
                <span>Catálogo Online</span>
                <span className="material-symbols-outlined text-sm ml-auto text-slate-400">open_in_new</span>
              </a>
            </Tooltip>

            <Tooltip text="Cargar un pedido guardado desde Excel" position="top">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">upload_file</span>
                <span>Cargar XLSX</span>
              </button>
            </Tooltip>

            <div className="border-t border-slate-200 dark:border-slate-800 my-2"></div>

            <Tooltip text="Actualiza catálogos, stock y precios" position="top">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 ${stockStatus.color}`}
              >
                {isRefreshing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                ) : (
                  <span className="material-symbols-outlined">refresh</span>
                )}
                <span>Actualizar</span>
                {lastStockSync && !isRefreshing && (
                  <span className={`text-[10px] ml-auto ${stockStatus.color}`}>
                    {formatSyncTime(lastStockSync)}
                  </span>
                )}
              </button>
            </Tooltip>
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              v1.3.0 • by Carlos Cusi
            </p>
          </div>
        </aside>

        {/* Contenido principal PC - Con margen izquierdo para el sidebar */}
        <main className="flex-1 ml-64 pt-16 min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Layout Móvil - Sin sidebar */}
      <div className="lg:hidden">
        <main className="min-h-screen pb-24">
          <Outlet />
        </main>
      </div>

      {/* Barra de navegación inferior - Móvil/Tablet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 pt-2 pb-6 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          
          {/* 1. Inicio → Catálogo interno */}
          <NavLink
            to="/catalogo"
            className={() =>
              `flex flex-col items-center gap-1 group transition-all duration-200 ${
                isActive('/catalogo')
                  ? 'text-teal-600 dark:text-teal-400 scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400'
              }`
            }
          >
            <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110">
              home
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tight">Inicio</span>
          </NavLink>

          {/* 2. Catálogo → URL externa */}
          <a
            href="https://fliphtml5.com/bookcase/ilmjw/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">menu_book</span>
            <span className="text-[10px] font-bold uppercase tracking-tight">Catálogo</span>
          </a>

          {/* 3. Cargar XLSX */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
            title="Cargar pedido XLSX"
          >
            <span className="material-symbols-outlined text-2xl">upload_file</span>
            <span className="text-[10px] font-bold uppercase tracking-tight">Cargar</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleLoadXLSX}
            className="hidden"
          />

          {/* 4. Actualizar */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex flex-col items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 transition-all disabled:opacity-50 ${stockStatus.color}`}
            title={lastStockSync ? `Última actualización: ${stockStatus.label} - ${formatSyncTime(lastStockSync)}` : 'Actualizar datos'}
          >
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            ) : (
              <span className="material-symbols-outlined text-2xl">refresh</span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-tight">{isRefreshing ? 'Actualizando...' : stockStatus.label}</span>
          </button>

          {/* 5. Cliente */}
          <button
            onClick={() => setShowPedidoModal(true)}
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">person</span>
            <span className="text-[10px] font-bold uppercase tracking-tight">Cliente</span>
          </button>
        </div>
      </nav>

      {/* ==================== MODALES PERSONALIZADOS ==================== */}
      
      {/* Modal de confirmación para actualizar stock */}
      <ConfirmModal
        isOpen={modals.refresh.open}
        title="Actualizar Catálogo"
        message={`El carrito tiene ${cartCount} productos. ¿Desea actualizar el catálogo y stock? Esto no afectará su pedido actual.`}
        confirmText="Actualizar"
        cancelText="Cancelar"
        onConfirm={() => {
          setModals(prev => ({ ...prev, refresh: { open: false, type: '' } }));
          performRefresh();
        }}
        onCancel={() => setModals(prev => ({ ...prev, refresh: { open: false, type: '' } }))}
      />

      {/* Modal de confirmación para cargar XLSX */}
      <ConfirmModal
        isOpen={modals.load.open}
        title="Reemplazar Carrito"
        message={`El carrito actual tiene ${cartCount} productos. ¿Desea reemplazarlo con el pedido cargado (${modals.load.data?.products.length || 0} productos)?`}
        confirmText="Reemplazar"
        cancelText="Cancelar"
        danger
        onConfirm={() => {
          const data = modals.load.data;
          setModals(prev => ({ ...prev, load: { open: false, type: '', data: null } }));
          clearCart();
          loadProductsToCart(data.clientData, data.products);
        }}
        onCancel={() => setModals(prev => ({ ...prev, load: { open: false, type: '', data: null } }))}
      />

      {/* Modal de alerta/información */}
      <AlertModal
        isOpen={modals.alert.open}
        title={modals.alert.title}
        message={modals.alert.message}
        type={modals.alert.type}
        onClose={() => setModals(prev => ({ ...prev, alert: { open: false, title: '', message: '', type: 'info' } }))}
      />
    </div>
  );
}

export default Layout;
