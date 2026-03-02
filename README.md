# 📋 Hoja de Pedido v1.2.1

Sistema de gestión de hojas de pedido para fuerza de ventas. Optimizado para móvil y desktop con sincronización de stock y catálogo de productos.

![Versión](https://img.shields.io/badge/version-1.2.1-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC)
![Status](https://img.shields.io/badge/status-production-green)

---

## 📑 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Uso](#️-instalación-y-uso)
- [Configuración del Catálogo](#-configuración-del-catálogo)
- [Sincronización de Stock](#-sincronización-de-stock)
- [Guía de Uso](#-guía-de-uso)
- [Formato de Exportación Excel](#-formato-de-exportación-excel)
- [Paleta de Colores](#-paleta-de-colores-corporativa)
- [Arquitectura de Datos](#️-arquitectura-de-datos)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Notas Técnicas](#-notas-técnicas)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## 🚀 Características Principales

### 📱 Interfaz Responsive
- **Modo Móvil**: Header compacto, tarjetas de productos táctiles, secciones colapsables
- **Modo Desktop**: Tablas completas, atajos de teclado, vista optimizada
- **Modo Oscuro/Claro**: Alternancia instantánea con persistencia

### 🔄 Gestión de Cantidades
- **Toggle Unidades/Bx**: Switch deslizante tipo iOS para cambiar modo de entrada
- **Equivalencias Dinámicas**: Conversión automática Unidades ↔ Cajas en tiempo real
- **Precios Adaptativos**: Precio por unidad o por caja según el modo
- **Formato de Entrada**: Soporta números simples o notación "10xBx"

### 📊 Orden de Ingreso
- **Numeración Secuencial**: Cada producto recibe un número de orden (#1, #2, #3...)
- **Ordenamiento Flexible**: Por orden de ingreso, código, nombre o precio
- **Facilita Cotejo**: Permite verificar contra listas manuales escritas

### 💾 Persistencia y Sincronización
- **IndexedDB**: Almacenamiento local del catálogo y pedidos
- **Sincronización de Stock**: Descarga automática vía GitHub Actions
- **Recuperación de Pedidos**: Carga pedidos Excel previamente exportados
- **Modo Offline**: Funciona sin conexión después de la primera carga

---

## 📁 Estructura del Proyecto

```
Hoja_de_Pedido/
├── 📄 index.html                 # Punto de entrada HTML
├── 📄 package.json               # Dependencias y scripts
├── 📄 vite.config.js            # Configuración Vite
├── 📄 tailwind.config.js        # Configuración Tailwind CSS
├── 📄 postcss.config.js         # Configuración PostCSS
├── 📄 README.md                 # Este archivo
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 update-stock.yml  # GitHub Actions para stock
│
├── 📁 public/                    # Archivos estáticos
│   ├── 📄 productos_local.json  # Catálogo de productos
│   ├── 📄 stock_data.json       # Datos de stock (generado)
│   └── 📄 favicon.svg           # Icono de la app
│
├── 📁 scripts/
│   └── 📄 download-stock.js     # Script de sincronización
│
├── 📁 stock-api/                 # API local opcional
│   ├── 📄 server.js
│   └── 📄 package.json
│
└── 📁 src/                       # Código fuente
    ├── 📄 main.jsx              # Punto de entrada React
    ├── 📄 App.jsx               # Componente principal
    ├── 📄 index.css             # Estilos globales
    │
    ├── 📁 hooks/
    │   └── 📄 useDebounce.js    # Hook de debounce
    │
    ├── 📁 services/
    │   └── 📄 stockService.js   # Servicios de stock
    │
    └── 📁 utils/
        ├── 📄 formatters.js     # Formateadores de datos
        └── 📄 xlsxGenerator.js  # Generador de Excel
```

---

## 🛠️ Instalación y Uso

### Requisitos Previos
- Node.js 18+ 
- npm o yarn

### Instalación

```bash
# Clonar o descargar el proyecto
cd Hoja_de_Pedido

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

### Acceso
- Desarrollo: `http://localhost:5173`
- Producción: Desplegar carpeta `dist/` en GitHub Pages, Netlify, Vercel, etc.

---

## 📦 Configuración del Catálogo

### Ubicación
Colocar el archivo **`productos_local.json`** en la carpeta **`public/`**:

```
public/
└── productos_local.json
```

### Estructura del JSON

```json
[
  {
    "codigo": "03290",
    "descripcion": "FOLDER N VINIFAN DOBLE TAPA OFICIO CELESTE GUSANO",
    "uni_caja": 50,
    "precio": 5.14,
    "ean": "7751832032908",
    "linea": "OFICIO",
    "stock_referencial": 100
  }
]
```

### Mapeo de Campos

El sistema acepta múltiples nombres de campo y los normaliza automáticamente:

| Campo en JSON | Normalizado a | Descripción |
|---------------|---------------|-------------|
| `descripcion` / `nombre` | `nombre` | Nombre del producto |
| `uni_caja` / `u_por_caja` | `bxSize` | Unidades por caja/bulto |
| `precio` / `precio_lista` | `precioLista` | Precio de lista (sin IGV) |
| `ean` | `ean` | Código de barras |
| `linea` | `linea` | Línea/Categoría |
| `stock_referencial` / `stock` | `stock` | Stock disponible |

### Actualización del Catálogo

1. Reemplazar archivo `public/productos_local.json`
2. Incrementar `DB_VERSION` en `src/App.jsx` (línea 47)
3. Hacer commit y push (requiere permisos de escritura en el repositorio)
4. Los usuarios verán el nuevo catálogo al recargar la app

---

## 🔄 Sincronización de Stock

### Flujo Automático (GitHub Actions)

```
┌─────────────────┐
│  GitHub Actions │ ← Se ejecuta cada X horas
│  (update-stock) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Descarga stock │ ← Desde API/appweb
│  de la empresa  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Genera         │
│  stock_data.json│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Commit al repo │
│  automático     │
└─────────────────┘
```

### Sincronización Manual (Usuario)

1. Hacer clic en el botón 🔄 (Sincronizar stock)
2. El sistema descarga `stock_data.json` más reciente
3. Los datos se guardan en IndexedDB
4. Se muestra timestamp de última sincronización

---

## 💡 Guía de Uso

### 1. Ingresar Datos del Cliente
- RUC (11 dígitos) o DNI (8 dígitos) - **Obligatorio**
- Nombre del cliente
- OC/Referencia (se autogenera si está vacío: formato `ddmmyy`)
- Provincia (para nombre de archivo Excel)
- Dirección y Vendedor (opcionales)

### 2. Buscar y Agregar Productos
1. Escribir código o nombre en el buscador
2. Configurar modo: **Unidades** o **Bx** (cajas/bultos)
3. Ingresar cantidad:
   - Número simple: `100`
   - Notación cajas: `10xBx`
4. Seleccionar con checkbox o agregar individualmente
5. Los productos aparecen con número de orden secuencial

### 3. Gestionar Pedido
- Ver equivalencias: "= 2.5 Bx" o "= 500 un"
- Modificar cantidades directamente
- Agregar observaciones por producto
- Ordenar por: orden de ingreso, código, nombre, precio

### 4. Exportar
- Hacer clic en "Exportar a Excel"
- Archivo generado: `OC_{ruc}_{provincia}_{ddmmyy}.xlsx`
- Formato: 6 columnas estándar (RUC, OC, SKU, CANTIDAD, PRECIO, OBS)

---

## 📋 Formato de Exportación Excel

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| RUC | RUC del cliente (11 dígitos) | 20456127917 |
| OC | Orden de compra | 280226 |
| SKU | Código de producto | 03290 |
| CANTIDAD | Cantidad en unidades | 100.00 |
| PRECIO | Precio de lista (sin IGV) | 5.14 |
| OBSERVACIONES | Notas del producto | Entregar en tienda |

**Nombre del archivo:** `OC_20456127917_trujillo_280226.xlsx`
**Nombre de pestaña:** Provincia (ej: "Trujillo")

---

## 🎨 Paleta de Colores Corporativa

### Modo Claro
- **Fondo**: `#f8fafc` (slate-50) - Azul muy suave
- **Cards**: `#ffffff` (blanco)
- **Primario**: `#4f46e5` (indigo-600)
- **Texto**: `#1e293b` (slate-800)
- **Bordes**: `#e2e8f0` (slate-200)

### Modo Oscuro
- **Fondo**: `#0f172a` (slate-900)
- **Cards**: `#1e293b` (slate-800)
- **Primario**: `#818cf8` (indigo-400)
- **Texto**: `#e2e8f0` (slate-200)
- **Bordes**: `#334155` (slate-700)

---

## 🏗️ Arquitectura de Datos

### IndexedDB (Almacenamiento Local)

| Store | Propósito | Persistencia |
|-------|-----------|--------------|
| `productos` | Catálogo de productos | Hasta actualización de versión |
| `seleccion` | Pedido actual y datos cliente | Continua |
| `stockAPI` | Stock sincronizado | Hasta nueva sincronización |

### Flujo de Datos

```
Usuario abre app
      ↓
┌─────────────────┐
│ ¿Hay caché?     │
└────────┬────────┘
   SÍ    │    NO
    ↓    │     ↓
Cargar   │   Fetch
IndexedDB│   productos_
         │   local.json
         │      ↓
         │   Guardar en
         │   IndexedDB
         │      ↓
      └──┴──┐
            ▼
     Mostrar UI
            ↓
   ┌────────────────┐
   │ Usuario navega │
   └────────────────┘
```

---

## 🔧 Tecnologías Utilizadas

- **React 18** - Framework UI
- **Vite 5** - Build tool y dev server
- **Tailwind CSS 3** - Framework CSS utilitario
- **IndexedDB** - Almacenamiento local del navegador
- **XLSX (SheetJS)** - Generación de archivos Excel
- **Lucide React** - Iconos

---

## 📝 Notas Técnicas

### Versionado
- **APP_VERSION**: `v1.2.1` (versión de la aplicación)
- **DB_VERSION**: `5` (versión de la base de datos IndexedDB)
- Incrementar `DB_VERSION` fuerza recarga del catálogo

### Variables de Entorno (opcional)
Crear archivo `.env`:
```
VITE_API_URL=https://api.ejemplo.com
VITE_APP_NAME=Hoja de Pedido
```

### Límites Conocidos
- IndexedDB: ~50MB (depende del navegador)
- Búsqueda: Máximo 50 resultados visibles
- Exportación: Sin límite de productos

---

## 🔧 Solución de Problemas

### Problemas Comunes

| Problema | Causa Posible | Solución |
|----------|---------------|----------|
| No carga el catálogo | Versión de DB desactualizada | Incrementar `DB_VERSION` en App.jsx |
| Stock no se sincroniza | Problema de red o repo | Verificar conexión y permisos del repo |
| Exportación falla | Datos incompletos | Verificar que RUC y Provincia estén llenos |
| Pérdida de pedido | Limpieza de navegador | Recuperar desde archivo Excel exportado |
| App lenta | Muchos productos en pedido | Exportar y crear nuevo pedido |

### Contacto de Soporte
- Desarrollador: Carlos Cusi
- Email: [tu-email@ejemplo.com]

---

## 🤝 Contribución

**Desarrollador**: Carlos Cusi  
**Asistencia de código**: Kilo Code - Coding Assistant  
**Última actualización**: 2026-03-01

---

## 📄 Licencia

Proyecto privado - Uso exclusivo para fuerza de ventas.

---

**Versión**: 1.2.1  
**Estado**: ✅ Estable y listo para producción
