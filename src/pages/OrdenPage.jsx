/**
 * OrdenPage.jsx
 * Página de resumen de Orden de Compra con exportación a Excel
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatMoney, getFechaCompacta, validarDocumento } from '../utils/formatters';
import { generateExcel } from '../utils/xlsxGenerator';

function OrdenPage() {
  const {
    selectedProductsArray,
    clientData,
    cartCount,
    cartTotalValue,
    cartTotalUnits,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    setShowPedidoModal,
    setClientDataAll
  } = useApp();

  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Redirigir al catálogo si la orden está vacía (con protección contra bucles)
  useEffect(() => {
    // Solo redirigir si hay productos Y el usuario acaba de llegar (sin datos del cliente)
    // O si el carrito quedó vacío después de una actualización
    if (selectedProductsArray.length === 0 && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      // Pequeño delay para evitar redirecciones rápidas durante transiciones
      const timer = setTimeout(() => {
        navigate('/catalogo', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedProductsArray.length, navigate]);

  // Calcular cajas
  const calcularCajas = (cantidad, bxSize) => {
    return Math.ceil(cantidad / bxSize);
  };

  // Exportar a Excel
  const handleExport = () => {
    if (!validarDocumento(clientData.ruc)) {
      alert('Por favor, ingrese un RUC (11 dígitos) o DNI (8 dígitos) válido en los datos del pedido');
      setShowPedidoModal(true);
      return;
    }

    if (selectedProductsArray.length === 0) {
      alert('No hay productos en la orden');
      return;
    }

    setShowExportConfirm(true);
  };

  const confirmExport = () => {
    setExportLoading(true);
    
    // Auto-generar OC si está vacía
    let exportClientData = { ...clientData };
    if (!clientData.oc.trim()) {
      const fechaCompacta = getFechaCompacta();
      exportClientData = {
        ...clientData,
        oc: fechaCompacta
      };
    }

    try {
      generateExcel(exportClientData, selectedProductsArray);
      setShowExportConfirm(false);
      
      // Actualizar datos del cliente si se generó OC automáticamente
      if (!clientData.oc.trim()) {
        setClientDataAll(exportClientData);
      }
    } catch (err) {
      alert('Error al generar el Excel: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const confirmClear = () => {
    clearCart();
    setShowClearConfirm(false);
    // Redirigir al catálogo después de vaciar
    navigate('/catalogo', { replace: true });
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-900">
      {/* Resumen de la orden - Tarjeta mejorada */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 text-white p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Resumen de Orden</h2>
            <p className="text-xs text-white/70">Precios referenciales sin IGV</p>
          </div>
        </div>
        
        {/* Statsgrid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-xs text-white/70 mb-1">Productos</p>
            <p className="text-2xl font-bold">{cartCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-xs text-white/70 mb-1">Unidades</p>
            <p className="text-2xl font-bold">{cartTotalUnits.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-xs text-white/70 mb-1">Total</p>
            <p className="text-xl font-bold">{formatMoney(cartTotalValue)}</p>
          </div>
        </div>
        
        <div className="pt-3 border-t border-white/20 text-xs text-white/60 text-center">
          * Precios referenciales sin IGV ni descuentos
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="px-4 py-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Datos del Pedido</h2>
            <button
              onClick={() => setShowPedidoModal(true)}
              className="text-primary-600 text-sm font-medium"
            >
              Editar
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">RUC/DNI:</span>
              <span className={`font-mono ${!validarDocumento(clientData.ruc) ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                {clientData.ruc || 'No ingresado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                {clientData.nombre || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">OC:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {clientData.oc || <span className="text-amber-500">(auto)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Provincia:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {clientData.provincia || '-'}
              </span>
            </div>
          </div>

          {!validarDocumento(clientData.ruc) && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="material-symbols-outlined text-xs mr-1">warning</span>
                Se requiere RUC/DNI válido para exportar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de productos */}
      <div className="px-4 space-y-3">
        <h2 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">
          Productos ({cartCount})
        </h2>

        {selectedProductsArray.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
            <p>No hay productos en la orden</p>
            <Link
              to="/catalogo"
              className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold"
            >
              Ir al Catálogo
            </Link>
          </div>
        ) : (
          selectedProductsArray.map((producto) => (
            <div
              key={producto.codigo}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                      {producto.ordenIngreso}
                    </span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                      {producto.codigo}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                    {producto.nombre}
                  </p>
                  {(producto.ean || producto.linea) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {producto.ean && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          EAN: <span className="font-mono">{producto.ean}</span>
                        </span>
                      )}
                      {producto.linea && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {producto.linea}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>U/Bx: {producto.bxSize}</span>
                    <span>Cajas: {calcularCajas(producto.cantidad, producto.bxSize)}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {formatMoney(producto.precioLista * producto.cantidad)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {producto.cantidad} un × {formatMoney(producto.precioLista)}
                  </p>
                </div>
              </div>

              {/* Controles de cantidad */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateCartQuantity(producto.codigo, producto.cantidad - 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <input
                    type="number"
                    className="w-14 text-center bg-transparent border-none text-sm font-bold dark:text-slate-100 p-0"
                    value={producto.cantidad}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateCartQuantity(producto.codigo, val);
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => updateCartQuantity(producto.codigo, producto.cantidad + 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(producto.codigo)}
                  className="p-2 text-slate-400 hover:text-danger-500 transition-colors"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botones de acción */}
      {selectedProductsArray.length > 0 && (
        <div className="fixed bottom-[4.25rem] lg:bottom-[4.125rem] left-auto right-4 z-40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-2 sm:px-4 sm:py-3 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg font-bold text-xs sm:text-sm transition-colors"
              >
                Vaciar
              </button>
              <button
                onClick={handleExport}
                disabled={!validarDocumento(clientData.ruc)}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors shadow-lg shadow-teal-600/25 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">download</span>
                Descargar OC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar vaciar */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">
              ¿Vaciar orden?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Se eliminarán todos los productos de la orden. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exportación */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-success-600 dark:text-success-400 text-2xl">
                  description
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Confirmar Exportación
              </h3>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">RUC/DNI:</span>
                <span className="font-medium">{clientData.ruc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-medium truncate max-w-[180px]">{clientData.nombre || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">OC:</span>
                <span className="font-medium">{clientData.oc || '(auto)'}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Productos:</span>
                  <span className="font-bold text-primary-600">{cartCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total:</span>
                  <span className="font-bold">{formatMoney(cartTotalValue)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExport}
                disabled={exportLoading}
                className="flex-1 px-4 py-3 bg-success-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {exportLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">download</span>
                    Descargar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdenPage;
