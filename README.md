# 📋 Hoja de Pedido v1.3.0

Sistema de gestión de hojas de pedido para fuerza de ventas. Optimizado para móvil y desktop con navegación tipo app, sincronización de stock y catálogo de productos.

![Versión](https://img.shields.io/badge/version-1.3.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Vite](https://img.shields.io/badge/Vite-5-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC)
![Status](https://img.shields.io/badge/status-production-green)

---

## 📑 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Novedades v1.3.0](#-novedades-v130)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Uso](#️-instalación-y-uso)
- [Configuración del Catálogo](#-configuración-del-catálogo)
- [Sincronización de Stock](#-sincronización-de-stock)
- [Guía de Uso](#-guía-de-uso)
- [Formato de Exportación Excel](#-formato-de-exportación-excel)
- [Paleta de Colores](#-paleta-de-colores)
- [Arquitectura](#️-arquitectura)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Notas Técnicas](#-notas-técnicas)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## 🚀 Características Principales

### 📱 Interfaz Responsive con Navegación Tipo App
- **Modo Móvil**: Barra de navegación inferior fija (5 accesos directos)
- **Modo Desktop**: Sidebar lateral fijo + contenido principal
- **Modo Oscuro/Claro**: Alternancia instantánea con persistencia local
- **Glassmorphism**: Diseño moderno con efectos de transparencia

### 🔄 Gestión de Productos
- **Búsqueda por Código/Nombre/EAN**: Búsqueda rápida y flexible
- **Categorías con Filtros**: Pelotas, Escolar, Representadas
- **Equivalencias Dinámicas**: Conversión automática Unidades ↔ Cajas
- **Validación de Stock**: Advertencias antes de agregar al carrito
- **Orden de Ingreso**: Numeración secuencial para cotejo con listas manuales

### 💾 Persistencia y Sincronización
- **localStorage**: Carrito y datos de cliente persistidos automáticamente
- **Recuperación de Pedidos**: Cargar pedidos Excel previamente exportados
- **Modo Offline**: Funciona sin conexión después de la primera carga

### 📤 Exportación y Carga XLSX
- **Exportar a Excel**: Archivo formato estándar con datos del cliente
- **Cargar XLSX**: Importar pedidos guardados previamente

---

## 🆕 Novedades v1.3.0

| Feature | Descripción |
|---------|-------------|
| **React Router v7** | Navegación SPA multi-página |
| **Context API** | Estado global compartido (carrito, tema, cliente) |
| **Navegación Móvil** | Barra inferior fija estilo app nativa |
| **Sidebar PC** | Navegación lateral en pantallas grandes |
| **Carga XLSX** | Importar pedidos desde archivos Excel |
| **Tema Moderno** | Paleta Teal/Cyan con glassmorphism |
| **Nueva Arquitectura** | Componentes, Context, Pages, Utils separados |

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
│   └── 📄 favicon.svg          # Icono de la app
│
├── 📁 scripts/
│   └── 📄 download-stock.js     # Script de sincronización
│
├── 📁 stock-api/                 # API local opcional
│   ├── 📄 server.js
│   └── 📄 package.json
│
├── 📁 docs/
│   └── 📄 MANUAL_USUARIO.md     # Manual de usuario
│
└── � src/                       # Código fuente
    ├── 📄 main.jsx              # Punto de entrada React
    ├── 📄 App.jsx              # Componente principal + Rutas
    ├── 📄 index.css            # Estilos globales + CSS variables
    │
    ├── 📁 components/          # Componentes reutilizables
    │   ├── 📄 PedidoModal.jsx  # Modal datos del cliente
    │   └── 📄 Tooltip.jsx      # Tooltip informativo
    │
    ├── 📁 context/             # Estado global
    │   └── 📄 AppContext.jsx   # Context API (carrito, tema, cliente)
    │
    ├── 📁 pages/               # Páginas principales
    │   ├── 📄 Layout.jsx       # Layout con navegación
    │   ├── 📄 CatalogoPage.jsx # Catálogo y búsqueda
    │   └── 📄 OrdenPage.jsx    # Resumen y exportación
    │
    ├── 📁 hooks/
    │   └── 📄 useDebounce.js   # Hook de debounce
    │
    ├── 📁 services/
    │   └── 📄 stockService.js  # Servicios de stock
    │
    └── 📁 utils/
        ├── 📄 formatters.js    # Formateadores de datos
        ├── 📄 xlsxGenerator.js # Generador de Excel
        └── 📄 xlsxLoader.js    # Loader de archivos XLSX
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
    "stock_referencial": 100,
    "orden": 1
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
| `orden` | `orden` | Orden de aparición |

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

---

## 💡 Guía de Uso

### Navegación

| Acceso | Descripción |
|--------|-------------|
| **Inicio** | Catálogo de productos con búsqueda |
| **Catálogo** | Enlace externo al catálogo online |
| **Cargar** | Importar pedido desde archivo Excel |
| **Actualizar** | Recargar catálogos y datos |
| **Cliente** | Datos del cliente (RUC, nombre, OC, dirección) |

### Flujo de Trabajo

1. **Ingresar Datos del Cliente**
   - RUC (11 dígitos) o DNI (8 dígitos) - Obligatorio para exportar
   - Nombre del cliente, OC/Referencia, Provincia, Dirección, Vendedor

2. **Buscar y Agregar Productos**
   - Escribir código, nombre o EAN en el buscador
   - Seleccionar categoría (Todos, Pelotas, Escolar, Representadas)
   - Configurar cantidad y agregar al carrito

3. **Revisar Orden**
   - Ver resumen de productos seleccionados
   - Modificar cantidades o eliminar productos
   - Validar datos del cliente

4. **Exportar**
   - Hacer clic en "Descargar OC"
   - Archivo Excel: `OC_{ruc}_{provincia}_{oc}.xlsx`

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

## 🎨 Paleta de Colores

### Modo Claro
- **Fondo**: `#f8fafc` (slate-50)
- **Cards**: `#ffffff` con glassmorphism
- **Primario**: `#0d9488` (teal-600)
- **Acento**: `#06b6d4` (cyan-500)
- **Texto**: `#0f172a` (slate-900)

### Modo Oscuro
- **Fondo**: `#020617` (slate-950)
- **Cards**: `#0f172a` con glassmorphism
- **Primario**: `#14b8a6` (teal-500)
- **Acento**: `#22d3ee` (cyan-400)
- **Texto**: `#f8fafc` (slate-50)

---

## 🏗️ Arquitectura

### Estado Global (Context API)

```
AppContext
├── selectedProducts     # Carrito de compras
├── clientData          # Datos del cliente (RUC, nombre, OC, etc.)
├── isDarkMode          # Tema claro/oscuro
├── showPedidoModal     # Control del modal de cliente
│
└── Métodos:
    ├── addToCart()
    ├── removeFromCart()
    ├── updateCartQuantity()
    ├── clearCart()
    ├── updateClientData()
    └── toggleTheme()
```

### Rutas (React Router)

| Ruta | Componente | Descripción |
|------|-------------|-------------|
| `/` | Redirect → `/catalogo` | Redirección |
| `/catalogo` | CatalogoPage | Catálogo y búsqueda |
| `/orden` | OrdenPage | Resumen y exportación |

### Persistencia (localStorage)

| Clave | Contenido |
|-------|------------|
| `hoja_pedido_cart` | Carrito de productos |
| `hoja_pedido_client` | Datos del cliente |
| `hoja_pedido_order_index` | Índice de orden |
| `hoja_pedido_theme` | Tema claro/oscuro |

---

## 🔧 Tecnologías Utilizadas

- **React 18** - Framework UI
- **React Router v7** - Navegación SPA
- **Vite 5** - Build tool y dev server
- **Tailwind CSS 3** - Framework CSS utilitario
- **XLSX (SheetJS)** - Generación y parsing de archivos Excel
- **localStorage** - Persistencia de datos

---

## 📝 Notas Técnicas

### Versionado
- **APP_VERSION**: `v1.3.0` (versión de la aplicación)

### Variables de Entorno (opcional)
Crear archivo `.env`:
```
VITE_API_URL=https://api.ejemplo.com
VITE_BASE_PATH=/Hoja_de_Pedido
VITE_APP_NAME=Hoja de Pedido
```

### Límites Conocidos
- Catálogo: ~5000 productos (optimizado con paginado)
- Búsqueda: 30 productos por página
- Exportación: Sin límite de productos

---

## 🔧 Solución de Problemas

### Problemas Comunes

| Problema | Causa Posible | Solución |
|----------|---------------|----------|
| No carga el catálogo | Error de red | Recargar la página |
| Stock no se sincroniza | Problema de red o repo | Verificar conexión y permisos |
| Exportación falla | RUC inválido o sin productos | Verificar datos completos |
| Pérdida de pedido | Limpieza de navegador | Recuperar desde Excel exportado |
| Iconos no cargan | Sin conexión a Google Fonts | Los iconos fallback no están implementados |

---

## 🛡️ Seguridad del Repositorio

### Medidas Implementadas

| Medida | Descripción | Estado |
|--------|-------------|--------|
| **Branch Protection (main)** | Requiere PR + 1 aprobación para hacer merge | ✅ Script disponible |
| **Branch Protection (gh-pages)** | Rama de solo lectura, solo Actions puede escribir | ✅ Script disponible |
| **Permisos Workflow** | Permisos mínimos: contents:read, pages:write, id-token:write | ✅ Implementado |
| **Secrets** | Sin credenciales hardcodeadas en el código | ✅ Verificado |

### Configuración de Protección

#### 1. Proteger rama principal (main) y permitir GitHub Actions

El script configura la rama main para:
- ✅ Require Pull Request para hacer merge
- ✅ Require al menos 1 aprobación
- ✅ **GitHub Actions puede hacer push directamente (bypass)**

```bash
# Configurar variables de entorno
$env:GITHUB_TOKEN="tu_token_personal"
$env:REPO_OWNER="tu_usuario"
$env:REPO_NAME="Hoja_de_Pedido"

# Ejecutar script
node scripts/setup-branch-protection.js
```

```bash
# Configurar variables de entorno
$env:GITHUB_TOKEN="tu_token_personal"
$env:REPO_OWNER="tu_usuario"
$env:REPO_NAME="Hoja_de_Pedido"

# Ejecutar script
node scripts/setup-branch-protection.js
```

#### 2. Proteger rama de despliegue (gh-pages)

```bash
# Configurar variables de entorno
$env:GITHUB_TOKEN="tu_token_personal"
$env:REPO_OWNER="tu_usuario"
$env:REPO_NAME="Hoja_de_Pedido"

# Ejecutar script
node scripts/setup-gh-pages-protection.js
```

### Permisos del Workflow

El workflow [`update-stock.yml`](.github/workflows/update-stock.yml) usa el principio de menor privilegio:

```yaml
permissions:
  contents: read    # Solo leer archivos
  pages: write     # Escribir en GitHub Pages
  id-token: write  # needed for pages deployment
```

### Recomendaciones Adicionales

1. **Crear un Environment de producción** en GitHub (Settings → Environments)
   - Nombre: `production`
   - Requerir aprobación manual antes del despliegue

2. **Configurar secrets** si el workflow necesita acceder a APIs externas:
   - Ve a Settings → Secrets and variables → Actions
   - Agrega las variables necesarias

3. **Habilitar 2FA** en tu cuenta de GitHub para mayor seguridad

---

## 🤝 Contribución

**Desarrollador**: Carlos Cusi  
**Asistencia de código**: Kilo Code - Coding Assistant  
**Última actualización**: 2026-03-10

---

## 📄 Licencia

Proyecto privado - Uso exclusivo para fuerza de ventas.

---

**Versión**: 1.3.0  
**Estado**: ✅ Estable y listo para producción
