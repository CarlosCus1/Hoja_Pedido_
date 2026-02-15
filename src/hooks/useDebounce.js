import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce de valores
 * @param {any} value - Valor a aplicar debounce
 * @param {number} delay - Tiempo de espera en milisegundos
 * @returns {any} - Valor con debounce aplicado
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
