/**
 * Utilitario para obtener la URL base del proyecto.
 * Útil para deployments en subdirectorios con Vite.
 * 
 * IMPORTANTE: Esta función debe mantener consistencia con la lógica
 * de basename en App.jsx Y con vite.config.js para evitar problemas de rutas.
 */

// Obtiene la URL base del proyecto
// Usa la misma lógica que App.jsx para mantener consistencia
// con el BrowserRouter basename
// También considera la configuración base de Vite para desarrollo
const getViteBase = () => {
  // En desarrollo, Vite puede usar un base path diferente
  // que se configura en vite.config.js
  if (typeof document === 'undefined') return null; // SSR guard
  const baseFromMeta = document.querySelector('meta[name="vite-base"]');
  if (baseFromMeta) {
    const value = baseFromMeta.getAttribute('content');
    // Validar que no sea null o vacío y asegurar que termina con /
    if (value && value !== 'null') {
      return value.endsWith('/') ? value : value + '/';
    }
  }
  console.warn('Advertencia: meta tag "vite-base" no encontrado o vacío');
  return null;
};

export const getBaseUrl = () => {
  // Primero verificar si hay un base path de Vite en meta tag
  const viteBase = getViteBase();
  if (viteBase) {
    return viteBase;
  }
  
  const envBasePath = (import.meta.env.VITE_BASE_PATH || '').trim();
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  const basePath = envBasePath || (isGitHubPages ? '/Hoja_Pedido_' : '/');
  // Asegurar que siempre termina con /
  return basePath.endsWith('/') ? basePath : basePath + '/';
};
