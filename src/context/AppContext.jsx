/**
 * AppContext.jsx
 * Contexto global para manejar el estado de la aplicación
 * - Productos seleccionados (carrito)
 * - Datos del cliente
 * - Estado de búsqueda
 * - Persistencia en localStorage
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const AppContext = createContext(null);

// Claves para localStorage
const STORAGE_KEYS = {
  CART: 'hoja_pedido_cart',
  CLIENT: 'hoja_pedido_client',
  ORDER_INDEX: 'hoja_pedido_order_index',
  THEME: 'hoja_pedido_theme'
};

// Helper para cargar desde localStorage de forma segura
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.warn(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Helper para guardar en localStorage de forma segura
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error saving ${key} to localStorage:`, error);
  }
};

export function AppProvider({ children }) {
  // Estado de productos seleccionados (carrito) - valores por defecto para SSR
  const [selectedProducts, setSelectedProducts] = useState({});
  const [nextOrderIndex, setNextOrderIndex] = useState(1);

  // Estado del cliente - valores por defecto para SSR
  const [clientData, setClientData] = useState({
    ruc: '',
    nombre: '',
    oc: '',
    provincia: '',
    direccion: '',
    vendedor: ''
  });

  // Estado del tema (claro/oscuro) - default a false para SSR
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Efecto de hidratación: carga desde localStorage solo en cliente
  useEffect(() => {
    // Cargar datos del localStorage
    setSelectedProducts(loadFromStorage(STORAGE_KEYS.CART, {}));
    setNextOrderIndex(loadFromStorage(STORAGE_KEYS.ORDER_INDEX, 1));
    setClientData(loadFromStorage(STORAGE_KEYS.CLIENT, {
      ruc: '',
      nombre: '',
      oc: '',
      provincia: '',
      direccion: '',
      vendedor: ''
    }));

    // Cargar tema con preferencia del sistema como fallback
    const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, null);
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme);
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    setIsHydrated(true);
  }, []);

  // Listener para cambios en la preferencia de tema del sistema
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    // Solo escuchar cambios si el usuario no ha establecido una preferencia manual
    const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, null);
    if (savedTheme !== null) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Solo actualizar si no hay preferencia guardada
      const currentSaved = loadFromStorage(STORAGE_KEYS.THEME, null);
      if (currentSaved === null) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listener para evento de actualización de stock
  const [lastStockUpdate, setLastStockUpdate] = useState(null);
  useEffect(() => {
    const handleStockUpdate = (event) => {
      setLastStockUpdate(event.detail);
    };
    window.addEventListener('stock-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-updated', handleStockUpdate);
  }, []);

  // Estado del modal de pedido
  const [showPedidoModal, setShowPedidoModal] = useState(false);

  // Aplicar clase dark al documento cuando cambie el tema
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveToStorage(STORAGE_KEYS.THEME, isDarkMode);
  }, [isDarkMode]);

  // Toggle del tema
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Persistir cambios en localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CART, selectedProducts);
  }, [selectedProducts]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLIENT, clientData);
  }, [clientData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORDER_INDEX, nextOrderIndex);
  }, [nextOrderIndex]);

  // Agregar producto al carrito
  const addToCart = useCallback((producto, cantidad = 1) => {
    // Validar que el producto tenga código
    if (!producto.codigo) {
      return { success: false, message: 'Producto sin código válido' };
    }

    // Validar cantidad
    if (cantidad <= 0) {
      return { success: false, message: 'La cantidad debe ser mayor a 0' };
    }
    if (cantidad > 99999) {
      return { success: false, message: 'La cantidad máxima es 99,999 unidades' };
    }

    // Verificar si el producto ya está en el carrito - actualizar cantidad si existe
    if (selectedProducts[producto.codigo]) {
      // Actualizar la cantidad sumando a la existente
      setSelectedProducts(prev => ({
        ...prev,
        [producto.codigo]: {
          ...prev[producto.codigo],
          cantidad: prev[producto.codigo].cantidad + cantidad
        }
      }));
      return { success: true, message: 'Cantidad actualizada correctamente' };
    }

    const currentOrder = nextOrderIndex;
    setSelectedProducts(prev => ({
      ...prev,
      [producto.codigo]: {
        cantidad,
        precioLista: Number(producto.precioLista) || 0,
        bxSize: Number(producto.bxSize) || 1,
        nombre: producto.nombre || '',
        ean: producto.ean || '',
        linea: producto.linea || '',
        ordenIngreso: currentOrder
      }
    }));
    setNextOrderIndex(prev => prev + 1);
    return { success: true, message: 'Producto agregado correctamente' };
  }, [selectedProducts, nextOrderIndex]);

  // Actualizar cantidad de producto en carrito
  const updateCartQuantity = useCallback((codigo, cantidad) => {
    if (cantidad <= 0) {
      setSelectedProducts(prev => {
        const newSelection = { ...prev };
        delete newSelection[codigo];
        return newSelection;
      });
    } else {
      setSelectedProducts(prev => ({
        ...prev,
        [codigo]: { ...prev[codigo], cantidad }
      }));
    }
  }, []);

  // Eliminar producto del carrito
  const removeFromCart = useCallback((codigo) => {
    setSelectedProducts(prev => {
      const newSelection = { ...prev };
      delete newSelection[codigo];
      return newSelection;
    });
  }, []);

  // Limpiar carrito
  const clearCart = useCallback(() => {
    setSelectedProducts({});
    setNextOrderIndex(1);
    // Limpiar localStorage
    localStorage.removeItem(STORAGE_KEYS.CART);
    localStorage.removeItem(STORAGE_KEYS.ORDER_INDEX);
  }, []);

  // Total de productos en carrito
  const cartCount = useMemo(() => Object.keys(selectedProducts).length, [selectedProducts]);

  // Total de unidades en carrito
  const cartTotalUnits = useMemo(() =>
    Object.values(selectedProducts).reduce((sum, p) => sum + p.cantidad, 0),
    [selectedProducts]
  );

  // Valor total del carrito
  const cartTotalValue = useMemo(() =>
    Object.entries(selectedProducts).reduce((sum, [codigo, data]) =>
      sum + (data.precioLista * data.cantidad), 0),
    [selectedProducts]
  );

  // Actualizar datos del cliente
  const updateClientData = useCallback((field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Actualizar todos los datos del cliente
  const setClientDataAll = useCallback((data) => {
    setClientData(data);
  }, []);

  // Verificar si producto está en carrito
  const isInCart = useCallback((codigo) => {
    return selectedProducts.hasOwnProperty(codigo);
  }, [selectedProducts]);

  // Productos seleccionados como array
  const selectedProductsArray = useMemo(() => {
    return Object.entries(selectedProducts).map(([codigo, data]) => ({
      codigo,
      ...data,
      cajas: Math.ceil(data.cantidad / data.bxSize)
    })).sort((a, b) => a.ordenIngreso - b.ordenIngreso);
  }, [selectedProducts]);

  const value = {
    selectedProducts,
    selectedProductsArray,
    clientData,
    showPedidoModal,
    cartCount,
    cartTotalUnits,
    cartTotalValue,
    isDarkMode,
    lastStockUpdate,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    updateClientData,
    setClientDataAll,
    setShowPedidoModal,
    isInCart,
    nextOrderIndex,
    toggleTheme
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
}

export default AppContext;
