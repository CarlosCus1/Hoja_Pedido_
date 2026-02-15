# 📋 Hoja de Pedido - Versión Lite

Sistema de gestión de hojas de pedido con buscador flexible y exportación a Excel.

## 🚀 Características

- **Formulario de Cliente**: RUC/DNI, Nombre, OC/Referencia, Fecha, Vendedor
- **Buscador Flexible**: Búsqueda por código con debounce de 300ms
- **Selector Múltiple**: Checkbox para seleccionar productos
- **Botones +/-**: Incrementar y decrementar cantidades fácilmente
- **Cálculo de Cajas**: Columna que muestra cajas según unidades/cantidad por caja
- **Persistencia IndexedDB**: Los datos se guardan localmente
- **Exportación XLSX**: Formato específico para hojas de pedido

## 📊 Formato de Exportación Excel

| RUC | OC | (vacía) | (vacía) | Código | (vacía) | Cantidad | Precio |
|-----|----|---------|---------|--------|---------|----------|--------|

El RUC y OC se repiten en cada fila.

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
│   ├── productos.json       # Datos de productos
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
  "cantidadPorCaja": 25,
  "precioLista": 70.00
}
```

## 🎯 Uso

1. **Ingresar datos del cliente**: Complete el formulario con RUC/DNI, nombre, OC, fecha y vendedor
2. **Buscar productos**: Use el buscador para filtrar por código
3. **Seleccionar productos**: Marque los productos deseados con el checkbox
4. **Ajustar cantidades**: Use los botones +/- o escriba directamente
5. **Ver cajas**: La columna "Cajas" muestra el cálculo automático
6. **Exportar**: Haga clic en "Exportar a Excel" para descargar

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
- La fecha se ingresa en formato ddmmyyyy (ej: 14022026)
- El cálculo de cajas es: `unidades / cantidadPorCaja`

---

**Versión**: 1.0.0  
**Proyecto**: Hoja de Pedido Lite
