# 📋 Hoja de Pedido - Versión Lite

Sistema de gestión de hojas de pedido con buscador flexible y exportación a Excel.

## 🚀 Características

- **Formulario de Cliente**: RUC/DNI, Nombre, OC, Provincia, Dirección, Vendedor
- **Buscador Flexible**: Búsqueda por código o nombre con debounce de 300ms
- **Agregar con Cantidad**: Input de cantidad en resultados de búsqueda
- **Selector Múltiple**: Checkbox para seleccionar varios productos a la vez
- **Botón "Agregar Seleccionados"**: Agrega todos los productos seleccionados con sus cantidades
- **Input Numérico Directo**: Modifica la cantidad directamente en la tabla
- **Cálculo de Cajas**: Columna que muestra cajas según unidades/cantidad por caja
- **Persistencia IndexedDB**: Los datos se guardan localmente
- **Exportación XLSX**: Formato específico de 6 columnas para hojas de pedido
- **Ordenamiento Automático**: Productos seleccionados se ordenan por código
- **Sección Colapsable (Móvil)**: Datos del cliente pueden colapsarse
- **Prevención de Duplicados**: Alerta si el producto ya está seleccionado
- **Selección Múltiple**: Selecciona varios productos y agrégalos todos a la vez

## 📊 Formato de Exportación Excel

| RUC | OC | SKU | CANTIDAD | PRECIO | OBSERVACIONES |
|-----|----|-----|----------|--------|---------------|
| 20456127917 | 01 | 85007 | 560.00 | 3.33 | |
| 20456127917 | 01 | 03110 | 100.00 | 5.14 | |
| 20456127917 | 01 | 02210 | 2000.00 | 10.25 | |

- El RUC y OC se repiten en cada fila
- Nombre de la pestaña: Provincia (ej: "Trujillo")
- Nombre del archivo: `OC_(ruc)_(provincia)_ddmmyy`
  - Ejemplo: `OC_20456127917_trujillo_210226.xlsx`

## 🛠️ Instalación

```bash
# Entrar al directorio
cd Hoja_de_Pedido

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📁 Estructura del Proyecto

```
Hoja_de_Pedido/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── productos_local.json  # Datos de productos
│   └── favicon.svg
└── src/
    ├── main.jsx             # Punto de entrada
    ├── App.jsx              # Componente principal
    ├── index.css            # Estilos Tailwind
    ├── hooks/
    │   └── useDebounce.js   # Hook para debounce
    └── utils/
        ├── formatters.js    # Formateadores
        └── xlsxGenerator.js # Generador de Excel
```

## 📦 Datos de Productos (JSON)

```json
{
  "codigo": "016763",
  "nombre": "Producto de ejemplo",
  "cantidadPorCaja": 25,
  "precioLista": 70.00
}
```

## 🎯 Uso

1. **Ingresar datos del cliente**: Complete el formulario con RUC/DNI, nombre, OC, provincia, dirección y vendedor
2. **Buscar productos**: Use el buscador para filtrar por código o nombre
3. **Agregar productos**: 
   - Escriba la cantidad directamente en los resultados y haga clic en "Agregar"
   - O seleccione varios productos con los checkboxes y luego "Agregar X productos"
4. **Seleccionar productos**: Los productos aparecen en la lista de seleccionados
5. **Ajustar cantidades**: Escriba directamente en el campo de cantidad
6. **Ver cajas**: La columna "Cajas" muestra el cálculo automático
7. **Agregar observaciones**: Haga clic en el ícono de observación para agregar notas
8. **Exportar**: Haga clic en "Exportar a Excel" para descargar (mínimo: RUC + 1 producto)

## 💾 Persistencia

Los datos se guardan automáticamente en IndexedDB:
- **productos**: Catálogo de productos
- **seleccion**: Selección actual y datos del cliente

## 🔧 Tecnologías

- React 18
- Vite
- Tailwind CSS
- IndexedDB
- XLSX (SheetJS)

## 📝 Notas

- El RUC debe tener 11 dígitos, el DNI 8 dígitos
- La OC es un número entero (se autogenera con fecha ddmmyy si está vacío)
- La provincia se usa para el nombre del archivo y pestaña de Excel
- El cálculo de cajas es: `unidades / cantidadPorCaja`
- Productos duplicados no se permiten (se muestra alerta)

---

**Versión**: 1.2.0  
**Proyecto**: Hoja de Pedido Lite
