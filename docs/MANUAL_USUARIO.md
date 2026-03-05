# 📘 Manual de Usuario - Hoja de Pedido v1.3.0

**Sistema de Gestión de Pedidos para Fuerza de Ventas**

---

## 📑 Índice

1. [Introducción](#1-introducción)
2. [Primeros Pasos](#2-primeros-pasos)
3. [Navegación](#3-navegación)
4. [Flujo de Trabajo](#4-flujo-de-trabajo-paso-a-paso)
5. [Funciones Avanzadas](#5-funciones-avanzadas)
6. [Solución de Problemas](#6-solución-de-problemas)

---

## 1. Introducción

### 1.1 ¿Qué es Hoja de Pedido?

**Hoja de Pedido** es una aplicación web diseñada específicamente para el equipo de ventas que permite:

- ✅ Crear pedidos de clientes de forma rápida y organizada
- ✅ Buscar productos en el catálogo corporativo por código, nombre o EAN
- ✅ Filtrar productos por categorías (Pelotas, Escolar, Representadas)
- ✅ Calcular automáticamente unidades y cajas
- ✅ Exportar pedidos a formato Excel
- ✅ Importar pedidos guardados previamente
- ✅ Trabajar sin conexión a internet (modo offline)

### 1.2 Novedades v1.3.0

| Feature | Descripción |
|---------|-------------|
| **Navegación tipo App** | Barra inferior en móvil, sidebar en PC |
| **Carga XLSX** | Importar pedidos guardados desde Excel |
| **Tema Moderno** | Diseño con efectos glassmorphism |
| **Validación de Stock** | Advertencias antes de agregar al carrito |

### 1.3 Requisitos

- 📱 **Dispositivo**: Celular, tablet o computadora
- 🌐 **Navegador**: Chrome, Safari, Firefox o Edge (última versión)
- 📶 **Internet**: Necesario para cargar la app y sincronizar stock

---

## 2. Primeros Pasos

### 2.1 Acceso a la Aplicación

La aplicación está disponible en:

```
📍 URL: [URL de producción aquí]
📱 Instalable: Agregar a pantalla de inicio (PWA)
```

**Para instalar en el celular:**
1. Abrir la URL en Chrome/Safari
2. Tocar el menú (⋮) → "Agregar a pantalla de inicio"
3. ¡Listo! Funciona como app nativa

### 2.2 Primera Carga

Al abrir la aplicación por primera vez:

```
┌─────────────────────────────────────────┐
│  📋 Hoja de Pedido v1.3.0              │
│  ─────────────────────────────────────  │
│  Cargando catálogo de productos...      │
│  ████████████░░░░░░░░  60%             │
│                                         │
│  Esto solo se hace una vez             │
└─────────────────────────────────────────┘
```

⏱️ **Tiempo estimado**: 10-30 segundos (depende de la conexión)

---

## 3. Navegación

### 3.1 Vista General

La aplicación cuenta con dos vistas principales:

```
┌─────────────────────────────────────────┐
│  📋 Hoja de Pedido         🌙 [Cliente] │  ← Header
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Inicio  │ │ Catálogo│ │ Cargar  │   │  ← Navegación
│  │    🏠   │ │    📖   │ │   📤    │   │     inferior
│  └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐               │
│  │Actualizar│ │Cliente  │               │
│  │    🔄   │ │    👤   │               │
│  └─────────┘ └─────────┘               │
├─────────────────────────────────────────┤
│                                         │
│           CONTENIDO PRINCIPAL           │  ← Catálogo u Orden
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 Navegación en Móvil

La barra de navegación inferior contiene 5 accesos:

| Icono | Nombre | Función |
|-------|--------|---------|
| 🏠 | **Inicio** | Ir al catálogo de productos |
| 📖 | **Catálogo** | Abrir catálogo online externo |
| 📤 | **Cargar** | Importar pedido desde Excel |
| 🔄 | **Actualizar** | Recargar datos y catálogos |
| 👤 | **Cliente** | Abrir modal de datos del cliente |

### 3.3 Navegación en Desktop (PC)

En pantallas grandes (≥1024px), la navegación cambia a un **sidebar lateral**:

```
┌─────────────────────────────────────────────────────────┐
│  📋 Hoja de Pedido                      🌙 [Cliente]   │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  🔍Buscar  │           CONTENIDO PRINCIPAL              │
│  Productos │                                            │
│            │  ┌─────────────────────────────────────┐   │
│  📖Catálogo│  │  Catálogo / Orden de Compra        │   │
│  Online    │  │                                     │   │
│            │  └─────────────────────────────────────┘   │
│  📤Cargar  │                                            │
│  XLSX      │                                            │
│            │                                            │
│  🔄        │                                            │
│  Actualizar│                                            │
│            │                                            │
│ ────────── │                                            │
│ v1.3.0    │                                            │
└────────────┴────────────────────────────────────────────┘
```

### 3.4 Modo Oscuro/Claro

- 🌙 **Modo Oscuro**: Ideal para uso nocturno, reduce fatiga visual
- ☀️ **Modo Claro**: Mejor visibilidad bajo luz solar

**Cambio**: Botón 🌙/☀️ en el header superior

---

## 4. Flujo de Trabajo Paso a Paso

### 4.1 Paso 1: Ingresar Datos del Cliente

**Importante**: El RUC/DNI es obligatorio para exportar.

1. Tocar el botón **"Cliente"** en la barra de navegación
2. Llenar los campos:

```
┌─────────────────────────────────────────┐
│  📋 Datos del Pedido                    │
├─────────────────────────────────────────┤
│  RUC/DNI*: [20501234567    ]           │
│  Cliente:  [Ferretería El Progreso]    │
│  OC/Ref:   [280301         ] ← Auto    │
│  Provincia: [Trujillo       ]           │
│  Dirección:[Av. Larco 123  ]            │
│  Vendedor: [Carlos Cusi    ]           │
│                                         │
│  [ ✓ Guardar y Continuar ]             │
└─────────────────────────────────────────┘
```

**Notas:**
- **RUC/DNI**: 11 dígitos para RUC, 8 para DNI
- **OC/Referencia**: Se autogenera con fecha si se deja vacío
- **Provincia**: Appecerá como nombre de pestaña en el Excel

### 4.2 Paso 2: Buscar Productos

En la pantalla de **Inicio** (Catálogo):

1. **Seleccionar Categoría** (opcional):
   - **Todos**: Búsqueda libre por código, nombre o EAN
   - **Pelotas**: Pelotas, Juguetes, Mascotas
   - **Escolar**: Escritura, Dibujo, Manualidades, etc.
   - **Representadas**: Productos industriales, Publicidad

2. **Buscar**: Escribir en el campo de búsqueda
   - Código exacto: `03437`
   - Código parcial: `034`
   - Nombre: `folder`
   - EAN: `7751...`

#### Resultados de Búsqueda

```
┌─────────────────────────────────────────┐
│  Resultados: 3 productos                 │
├─────────────────────────────────────────┤
│  [03437]                              │
│  FOLDER N VINIFAN DOBLE TAPA A4        │
│  CELESTE GUSANO                        │
│  💰 S/ 5.01  📦 50 un/caja           │
│  Stock: 4,900 un                       │
│  ────────────────────────────────────   │
│  [-] [___] [+] [+CAJA (50)] [Agregar] │
├─────────────────────────────────────────┤
│  [03438]                              │
│  FOLDER N VINIFAN DOBLE TAPA A4        │
│  VERDE LIMÓN GUSANO                    │
│  ...                                   │
└─────────────────────────────────────────┘
```

### 4.3 Paso 3: Agregar Productos

1. **Ingresar cantidad**: Usar los botones + / - o escribir directamente
2. **Botón +CAJA**: Agrega una caja completa (ej: 50 unidades)
3. **Agregar**: Tocar el botón para añadir al carrito

**Validación de Stock**:
- Si el producto tiene **stock disponible**: Se agrega normalmente
- Si el stock es **bajo**: Muestra advertencia pero permite agregar
- Si **sin stock**: Advertencia, pero puede forzar la inclusión

### 4.4 Paso 4: Revisar el Carrito

Tocar el **botón flotante** que aparece cuando hay productos:

```
┌─────────────────────────────────────────┐
│  🛒 5 ítems          678 und   Total:   │
│  💰 S/ 8,154.00                        │
└─────────────────────────────────────────┘
```

Esto lleva a la página de **Orden**, donde puedes:

- Ver todos los productos seleccionados
- Modificar cantidades
- Eliminar productos
- Agregar observaciones por producto
- Ver el total del pedido

### 4.5 Paso 5: Exportar a Excel

En la página de **Orden**:

1. Verificar que el **RUC** sea válido (8 o 11 dígitos)
2. Tocar **"Descargar OC"**
3. Confirmar los datos en el modal
4. El archivo se descargará automáticamente

**Nombre del archivo**: `OC_{RUC}_{Provincia}_{OC}.xlsx`

---

## 5. Funciones Avanzadas

### 5.1 Cargar Pedido desde Excel

Si necesitas continuar un pedido anterior:

1. Tocar **"Cargar"** en la barra de navegación
2. Seleccionar archivo Excel previamente exportado
3. El sistema cargará:
   - ✓ Datos del cliente (RUC, OC)
   - ✓ Productos y cantidades
   - ✓ Observaciones

**Nota**: Si ya hay productos en el carrito, preguntará si desea reemplazarlos.

### 5.2 Modo Oscuro/Claro

Tocar el botón 🌙/☀️ en el header para alternar.

El tema se **persiste** en el navegador, recuerda tu preferencia.

### 5.3 Sincronización

Tocar **"Actualizar"** para:
- Recargar el catálogo de productos
- Actualizar datos de stock
- Recargar la página si hay problemas

---

## 6. Solución de Problemas

### 6.1 Problemas de Carga

**La app no carga:**
1. Verificar conexión a internet
2. Recargar página (Ctrl + F5)
3. Limpiar caché del navegador
4. Intentar en modo incógnito

**Catálogo no aparece:**
1. Esperar 30 segundos (primera carga)
2. Tocar "Actualizar"
3. Recargar la página

### 6.2 Problemas de Exportación

**Excel no se descarga:**
- Verificar que RUC tenga 8 u 11 dígitos
- Confirmar que haya al menos 1 producto
- Revisar espacio en disco

**Datos incorrectos en Excel:**
- Verificar cantidades ingresadas
- Revisar precios en el catálogo

### 6.3 Problemas con Carga XLSX

**No carga el archivo:**
- Verificar formato del archivo (xlsx o xls)
- Asegurar que tenga columnas: SKU, CANTIDAD
- Revisar que los códigos de producto existan en el catálogo

### 6.4 Contacto de Soporte

**¿Necesitas ayuda?**

| Canal | Contacto |
|-------|----------|
| 📧 Email | soporte@empresa.com |
| 📱 WhatsApp | +51 999 888 777 |
| 👨‍💼 Desarrollador | Carlos Cusi |

---

## 📎 Anexos

### Anexo A: Glosario

| Término | Significado |
|---------|-------------|
| **SKU** | Código único del producto |
| **Bx** | Abreviatura de "Box" (caja/bulto) |
| **un** | Unidades individuales |
| **OC** | Orden de Compra |
| **IGV** | Impuesto General a las Ventas (18%) |
| **XLSX** | Formato de archivo Excel |
| **PWA** | Progressive Web App |

### Anexo B: Estructura del Archivo XLSX

**Para cargar un pedido**, el Excel debe tener:

```
┌─────────┬────────┬────────┬──────────┬────────┬──────────────┐
│   RUC   │   OC   │  SKU   │ CANTIDAD │ PRECIO │ OBSERVACIONES│
├─────────┼────────┼────────┼──────────┼────────┼──────────────┤
│205012345│ 280301 │ 03437  │  100.00  │  5.01  │              │
│  67     │        │        │          │        │              │
└─────────┴────────┴────────┴──────────┴────────┴──────────────┘
```

Columnas requeridas: **SKU** y **CANTIDAD**

---

**Versión del Manual**: 1.3.0  
**Última actualización**: 2026-03-05  
**Aplicación**: Hoja de Pedido v1.3.0
