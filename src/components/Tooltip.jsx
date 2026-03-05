/**
 * Tooltip.jsx
 * Componente Tooltip compartido reutilizable
 * Muestra un mensaje emergente al hacer hover/focus en el elemento hijo
 */

import { useState } from 'react';

function Tooltip({ children, text, position = 'top' }) {
  const [show, setShow] = useState(false);
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800'
  };

  // Si no hay texto, renderizar solo el children sin wrapper adicional
  if (!text) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      aria-describedby={show ? tooltipId : undefined}
    >
      {children}
      {show && (
        <div 
          id={tooltipId}
          role="tooltip"
          className={`absolute ${positionClasses[position]} z-50 whitespace-nowrap`}
        >
          <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
            {text}
          </div>
          <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}

export default Tooltip;
