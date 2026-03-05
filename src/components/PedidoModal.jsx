/**
 * PedidoModal.jsx
 * Modal para editar los datos del cliente/pedido
 */

import { useApp } from '../context/AppContext';
import { validarDocumento, tipoDocumento } from '../utils/formatters';

function PedidoModal() {
  const { clientData, updateClientData, setShowPedidoModal } = useApp();

  const handleRucChange = (value) => {
    // Solo permitir números y limitar a 11 dígitos
    const cleanValue = value.replace(/\D/g, '').slice(0, 11);
    updateClientData('ruc', cleanValue);
  };

  const handleOcChange = (value) => {
    // Solo números
    const cleanValue = value.replace(/\D/g, '');
    updateClientData('oc', cleanValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setShowPedidoModal(false)}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-xl sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Handle (móvil) */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 z-20 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Datos del Pedido
          </h2>
          <button
            onClick={() => setShowPedidoModal(false)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Formulario */}
        <div className="p-4 space-y-4">
          {/* RUC/DNI */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              RUC/DNI <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              className={`w-full rounded-lg border px-4 py-3 text-base focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-white ${
                !validarDocumento(clientData.ruc) && clientData.ruc
                  ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
              placeholder="RUC (11 dígitos) o DNI (8 dígitos)"
              value={clientData.ruc}
              onChange={(e) => handleRucChange(e.target.value)}
            />
            {clientData.ruc && (
              <p className={`text-xs mt-1 ${validarDocumento(clientData.ruc) ? 'text-green-600' : 'text-danger-500'}`}>
                {validarDocumento(clientData.ruc)
                  ? `✓ ${tipoDocumento(clientData.ruc)} válido`
                  : 'Debe tener 8 u 11 dígitos'}
              </p>
            )}
          </div>

          {/* Nombre del Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-3 text-base focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-white"
              placeholder="Razón Social o Nombre completo"
              value={clientData.nombre}
              onChange={(e) => updateClientData('nombre', e.target.value)}
            />
          </div>

          {/* Orden de Compra */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Orden de Compra / Referencia
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-3 text-base focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-white"
              placeholder="Número entero (se autogenera si está vacío)"
              value={clientData.oc}
              onChange={(e) => handleOcChange(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Solo números enteros. Se autogenera si está vacío.
            </p>
          </div>

          {/* Provincia */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Provincia / Departamento
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-3 text-base focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-white"
              placeholder="Ej: Trujillo, Lima, Arequipa..."
              value={clientData.provincia}
              onChange={(e) => updateClientData('provincia', e.target.value)}
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dirección / Punto de Llegada
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-3 text-base focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-white"
              placeholder="Av, Jr, Calle, número..."
              value={clientData.direccion}
              onChange={(e) => updateClientData('direccion', e.target.value)}
            />
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Vendedor
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-3 text-base focus:ring-2 focus:ring-teal-500 dark:bg-slate-800 dark:text-white"
              placeholder="Nombre del vendedor"
              value={clientData.vendedor}
              onChange={(e) => updateClientData('vendedor', e.target.value)}
            />
          </div>

          {/* Botón guardar */}
          <button
            onClick={() => setShowPedidoModal(false)}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">check</span>
            Guardar y Continuar
          </button>
        </div>

        {/* Espaciador para móvil */}
        <div className="h-safe-bottom sm:hidden" />
      </div>
    </div>
  );
}

export default PedidoModal;
