/**
 * ============================================================================
 * HOJA DE PEDIDO v1.3.0
 * ============================================================================
 * Sistema de gestión de pedidos para fuerza de ventas
 * Ahora con navegación tipo app móvil (React Router)
 *
 * Desarrollador: Carlos Cusi
 * Asistencia de código: Kilo Code - Coding Assistant
 * Fecha de última actualización: 2026-03-05
 *
 * NUEVA ARQUITECTURA v1.3.0:
 *   - React Router para navegación entre páginas
 *   - Context API (AppContext) para estado global
 *   - Páginas: Catálogo (búsqueda), Resumen (carrito/exportación)
 *   - Barra de navegación inferior tipo app móvil
 *   - Modal de Pedido para datos del cliente
 *   - Exportación XLSX en página de Resumen
 *
 * RUTAS:
 *   /           - Redirige a /catalogo
 *   /catalogo   - Catálogo (búsqueda y selección)
 *   /resumen    - Carrito/Orden (resumen y exportación)
 *
 * ============================================================================
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './pages/Layout';
import CatalogoPage from './pages/CatalogoPage';
import OrdenPage from './pages/OrdenPage';
import PedidoModal from './components/PedidoModal';

function AppContent() {
  const { showPedidoModal } = useApp();

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/catalogo" replace />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/orden" element={<OrdenPage />} />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Route>
      </Routes>
      
      {showPedidoModal && <PedidoModal />}
    </>
  );
}

function App() {
  // El base path está configurado en vite.config.js como '/Hoja_Pedido_'
  // Usar siempre ese valor para desarrollo local y producción
  const basename = '/Hoja_Pedido_';

  return (
    <BrowserRouter basename={basename}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
