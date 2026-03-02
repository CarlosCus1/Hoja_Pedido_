# 📘 Manual de Usuario - Hoja de Pedido v1.2.1

**Sistema de Gestión de Pedidos para Fuerza de Ventas**

---

## 📑 Índice

1. [Introducción](#1-introducción)
2. [Primeros Pasos](#2-primeros-pasos)
3. [Interfaz de Usuario](#3-interfaz-de-usuario)
4. [Flujo de Trabajo](#4-flujo-de-trabajo-paso-a-paso)
5. [Funciones Avanzadas](#5-funciones-avanzadas)
6. [Consejos y Buenas Prácticas](#6-consejos-y-buenas-prácticas)
7. [Solución de Problemas](#7-solución-de-problemas)

---

## 1. Introducción

### 1.1 ¿Qué es Hoja de Pedido?

**Hoja de Pedido** es una aplicación web diseñada específicamente para el equipo de ventas que permite:

- ✅ Crear pedidos de clientes de forma rápida y organizada
- ✅ Buscar productos en el catálogo corporativo
- ✅ Calcular automáticamente unidades y cajas
- ✅ Exportar pedidos a formato Excel
- ✅ Trabajar sin conexión a internet (modo offline)

### 1.2 Ventajas Principales

| Ventaja | Beneficio |
|---------|-----------|
| **Modo Offline** | Trabaja sin internet después de la primera carga |
| **Sincronización** | Stock actualizado automáticamente |
| **Móvil/Desktop** | Funciona perfectamente en celular y computadora |
| **Números de Orden** | Facilita cotejo con listas manuscritas |
| **Exportación Excel** | Archivo listo para procesar en el sistema |

### 1.3 Requisitos

- 📱 **Dispositivo**: Celular, tablet o computadora
- 🌐 **Navegador**: Chrome, Safari, Firefox o Edge (última versión)
- 📶 **Internet**: Solo necesario para la primera carga y sincronización de stock

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
│  Cargando catálogo de productos...      │
│  ████████████░░░░░░░░  60%             │
│                                         │
│  Esto solo se hace una vez             │
└─────────────────────────────────────────┘
```

⏱️ **Tiempo estimado**: 10-30 segundos (depende de la conexión)

### 2.3 Sincronización de Stock

**Importante**: La primera vez, sincronizar el stock:

1. Buscar el botón 🔄 (arriba a la derecha)
2. Tocar y esperar confirmación
3. Verificar timestamp de última sincronización

---

## 3. Interfaz de Usuario

### 3.1 Vista General

```
┌─────────────────────────────────────────┐
│ 🌙  Hoja de Pedido v1.2.1     🔄 💾    │  ← Header
├─────────────────────────────────────────┤
│ 📋 Datos del Cliente           [▼]     │  ← Sección colapsable
├─────────────────────────────────────────┤
│ 🔍 Buscar productos...                 │  ← Buscador
│ ┌─────────────────────────────────────┐ │
│ │ ☑️ [03290] Folder Oficio Celeste   │ │  ← Resultados
│ │ ☑️ [03291] Folder Oficio Amarillo  │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 📦 Productos Seleccionados     [▼]     │  ← Pedido actual
│ #1 03290 - 100 un = 2 Bx       🗑️      │
│ #2 03291 - 50 un = 1 Bx        🗑️      │
├─────────────────────────────────────────┤
│                [📤 Exportar Excel]      │  ← Acción principal
└─────────────────────────────────────────┘
```

### 3.2 Modo Móvil vs Desktop

| Característica | Móvil 📱 | Desktop 💻 |
|----------------|----------|------------|
| Layout | Tarjetas verticales | Tablas compactas |
| Input cantidad | Teclado numérico | Teclado completo |
| Atajos | Táctiles | Teclado (Tab, Enter) |
| Vista | Una columna | Múltiples columnas |

### 3.3 Modo Oscuro/Claro

- 🌙 **Modo Oscuro**: Ideal para uso nocturno, reduce fatiga visual
- ☀️ **Modo Claro**: Mejor visibilidad bajo luz solar

**Cambio**: Botón 🌙/☀️ en el header superior

---

## 4. Flujo de Trabajo Paso a Paso

### 4.1 Paso 1: Ingresar Datos del Cliente

**Campos obligatorios marcados con ***

```
┌─────────────────────────────────────────┐
│ 📋 Datos del Cliente                    │
├─────────────────────────────────────────┤
│ RUC/DNI*: [20501234567    ]            │
│ Cliente:  [Ferretería El Progreso]      │
│ OC/Ref:   [280301         ] ← Auto      │
│ Provincia*: [Trujillo      ]            │
│ Dirección: [Av. Larco 123  ]            │
│ Vendedor:  [Carlos Cusi    ]            │
└─────────────────────────────────────────┘
```

**Notas importantes:**
- **RUC/DNI**: 11 dígitos para RUC, 8 para DNI
- **OC/Referencia**: Se autogenera con fecha si se deja vacío
- **Provincia**: Aparecerá como nombre de pestaña en el Excel

---

### 4.2 Paso 2: Buscar Productos

#### Métodos de Búsqueda

| Método | Ejemplo | Resultado |
|--------|---------|-----------|
| Código exacto | `03437` | Producto específico |
| Código parcial | `034` | Todos los 034xx |
| Descripción | `folder` | Todos con "folder" |
| Categoría | `oficio` | Línea de oficio |

#### Resultados de Búsqueda

```
┌─────────────────────────────────────────┐
│ Resultados: 3 productos                 │
├─────────────────────────────────────────┤
│ ☑️ [03437]                              │
│    FOLDER N VINIFAN DOBLE TAPA A4      │
│    CELESTE GUSANO                      │
│    💰 S/ 5.01  📦 50 un/caja           │
│    [Cant: ___] [modo: Unidades ▼]      │
├─────────────────────────────────────────┤
│ ☑️ [03438]                              │
│    FOLDER N VINIFAN DOBLE TAPA A4      │
│    VERDE LIMÓN GUSANO                  │
│    💰 S/ 5.01  📦 50 un/caja           │
│    [Cant: ___] [modo: Unidades ▼]      │
├─────────────────────────────────────────┤
│ ☑️ [03183]                              │
│    FOLDER N VINIFAN DOBLE TAPA OFICIO  │
│    VERDE CLARO GUSANO                  │
│    💰 S/ 5.14  📦 50 un/caja           │
│    [Cant: ___] [modo: Unidades ▼]      │
└─────────────────────────────────────────┘
```

---

### 4.3 Paso 3: Ingresar Cantidades

#### Modo Unidades (por defecto)

**Ejemplo con Folder A4 Celeste (50 un/caja):**
```
Cantidad: [100    ] unidades
           = 2 Bx (cajas)
           = S/ 501.00
```

**Ejemplo con Témpera Vinifan (360 un/caja):**
```
Cantidad: [360    ] unidades
           = 1 Bx (caja)
           = S/ 324.00
```

#### Modo Cajas (Bx)

**Ejemplo con Folder Oficio (50 un/caja):**
```
Cantidad: [10xBx  ] cajas
           = 500 unidades
           = S/ 2,570.00
```

**Ejemplo con Pelotas Crackcito (60 un/caja):**
```
Cantidad: [5xBx   ] cajas
           = 300 unidades
           = S/ 2,499.00
```

#### Notación Especial "xBx"

La notación `10xBx` significa: **10 cajas**

- Ventaja: Más rápido que calcular manualmente
- Conversión: Automática a unidades para el Excel
- Visualización: Muestra ambas equivalencias

---

### 4.4 Paso 4: Gestionar el Pedido

#### Vista del Pedido Actual

```
┌─────────────────────────────────────────┐
│ 📦 Productos Seleccionados (5 items)    │
│ 📊 Total: S/ 8,154.00                   │
├─────────────────────────────────────────┤
│ Ordenar por: [N° Orden ▼]              │
├─────────────────────────────────────────┤
│ #1  [03437] Folder A4 Celeste           │
│     100 un = 2 Bx | S/ 501.00          │
│     Obs: [Entregar en tienda      ] 🗑️ │
├─────────────────────────────────────────┤
│ #2  [03438] Folder A4 Verde Limón       │
│     50 un = 1 Bx | S/ 250.50           │
│     Obs: [                           ] 🗑️│
├─────────────────────────────────────────┤
│ #3  [01240] Pelota Crackcito Bl/Azl     │
│     120 un = 2 Bx | S/ 999.60          │
│     Obs: [Urgente                     ] 🗑️│
├─────────────────────────────────────────┤
│ #4  [77164] Témpera Vinifan 30g Blanco  │
│     360 un = 1 Bx | S/ 324.00          │
│     Obs: [                           ] 🗑️│
├─────────────────────────────────────────┤
│ #5  [016761] Fútbol Argentina #4        │
│     48 un = 2 Bx | S/ 1,872.00         │
│     Obs: [Pedido especial             ] 🗑️│
└─────────────────────────────────────────┘
```

#### Opciones de Ordenamiento

- **N° Orden**: Orden de ingreso (#1, #2, #3...)
- **Código**: Numérico ascendente
- **Nombre**: Alfabético A-Z
- **Precio**: De menor a mayor

#### Acciones por Producto

| Acción | Icono | Función |
|--------|-------|---------|
| Eliminar | 🗑️ | Quitar del pedido |
| Observación | 📝 | Agregar nota especial |
| Editar cantidad | ✏️ | Modificar cantidad |

---

### 4.5 Paso 5: Exportar a Excel

#### Al hacer clic en "Exportar a Excel"

```
┌─────────────────────────────────────────┐
│ ✅ Exportación Exitosa                  │
├─────────────────────────────────────────┤
│ Archivo: OC_20501234567_trujillo_       │
│         280301.xlsx                     │
│                                         │
│ 📊 Resumen:                             │
│ • 5 productos                           │
│ • 678 unidades totales                  │
│ • S/ 8,154.00 subtotal                  │
│ • S/ 9,621.72 con IGV (18%)             │
│                                         │
│ [📂 Abrir carpeta]  [📧 Enviar email]   │
└─────────────────────────────────────────┘
```

#### Formato del Archivo Excel

```
┌─────────┬────────┬────────┬──────────┬────────┬──────────────┐
│   RUC   │   OC   │  SKU   │ CANTIDAD │ PRECIO │ OBSERVACIONES│
├─────────┼────────┼────────┼──────────┼────────┼──────────────┤
│205012345│ 280301 │ 03437  │  100.00  │  5.01  │Entregar tienda│
│  67     │        │        │          │        │              │
├─────────┼────────┼────────┼──────────┼────────┼──────────────┤
│205012345│ 280301 │ 03438  │   50.00  │  5.01  │              │
│  67     │        │        │          │        │              │
├─────────┼────────┼────────┼──────────┼────────┼──────────────┤
│205012345│ 280301 │ 01240  │  120.00  │  8.33  │ Urgente      │
│  67     │        │        │          │        │              │
├─────────┼────────┼────────┼──────────┼────────┼──────────────┤
│205012345│ 280301 │ 77164  │  360.00  │  0.90  │              │
│  67     │        │        │          │        │              │
└─────────┴────────┴────────┴──────────┴────────┴──────────────┘
```

---

## 5. Funciones Avanzadas

### 5.1 Recuperación de Pedidos

Si necesitas continuar un pedido anterior:

```
1. Ir a la sección "Recuperar Pedido"
2. Seleccionar archivo Excel previamente exportado
3. El sistema carga:
   ✓ Datos del cliente
   ✓ Productos y cantidades
   ✓ Observaciones
```

**Caso de uso**: Cliente llama para agregar más productos a pedido existente

### 5.2 Sincronización de Stock

#### Stock Visual en Productos

```
┌─────────────────────────────────────────┐
│ [03437] Folder A4 Celeste               │
│ 💰 S/ 5.01  📦 50 un/caja              │
│ 📊 Stock: 4,900 un (98 cajas)          │
│ 🟢 Disponible                          │
└─────────────────────────────────────────┘
```

**Otro ejemplo con diferente empaque:**
```
┌─────────────────────────────────────────┐
│ [77164] Témpera Vinifan 30g Blanco      │
│ 💰 S/ 0.90  📦 360 un/caja             │
│ 📊 Stock: 41,666 un (115 cajas)        │
│ 🟢 Disponible                          │
└─────────────────────────────────────────┘
```

**Ejemplo con bajo stock:**
```
┌─────────────────────────────────────────┐
│ [016762] Fútbol Brasil #4               │
│ 💰 S/ 39.00  📦 24 un/caja             │
│ 📊 Stock: 169 un (7 cajas)             │
│ 🟡 Stock Bajo                          │
└─────────────────────────────────────────┘
```

#### Indicadores de Stock

| Color | Significado | Acción |
|-------|-------------|--------|
| 🟢 Verde | Stock suficiente (>50) | Proceder normal |
| 🟡 Amarillo | Stock bajo (10-50) | Verificar con almacén |
| 🔴 Rojo | Stock crítico (<10) | Confirmar disponibilidad |
| ⚪ Gris | Sin stock | No disponible |

### 5.3 Atajos de Teclado (Desktop)

| Tecla | Función |
|-------|---------|
| `Tab` | Siguiente campo |
| `Enter` | Confirmar/Agregar |
| `Esc` | Cerrar búsqueda |
| `Ctrl + F` | Foco en buscador |
| `Ctrl + S` | Guardar pedido |

---

## 6. Consejos y Buenas Prácticas

### 6.1 Optimización de Tiempo

| Situación | Consejo |
|-----------|---------|
| Pedido grande | Exportar en lotes de 20 productos |
| Cliente frecuente | Copiar datos del cliente anterior |
| Mismo producto | Usar notación `10xBx` para cantidades grandes |
| Revisión final | Ordenar por "N° Orden" para cotejar |

### 6.2 Verificación antes de Exportar

**Checklist de Calidad:**

- [ ] RUC/DNI tiene 11 u 8 dígitos
- [ ] Provincia está seleccionada
- [ ] Todos los productos tienen cantidad > 0
- [ ] Observaciones importantes están anotadas
- [ ] El total parece razonable

### 6.3 Manejo de Errores Comunes

| Error | Prevención |
|-------|------------|
| RUC incorrecto | Validar en SUNAT antes |
| Producto duplicado | Revisar lista antes de exportar |
| Cantidad equivocada | Verificar equivalencia un/caja |
| Archivo no descarga | Verificar conexión a internet |

---

## 7. Solución de Problemas

### 7.1 Problemas de Carga

**La app no carga:**
1. Verificar conexión a internet
2. Recargar página (Ctrl + F5)
3. Limpiar caché del navegador
4. Intentar en modo incógnito

**Catálogo no aparece:**
1. Esperar 30 segundos (primera carga)
2. Recargar la página
3. Contactar soporte si persiste

### 7.2 Problemas de Sincronización

**Stock no se actualiza:**
```
1. Verificar conexión a internet
2. Tocar botón 🔄 nuevamente
3. Si falla: Esperar 5 minutos y reintentar
4. Última opción: Limpiar datos del navegador
```

### 7.3 Problemas de Exportación

**Excel no se descarga:**
- Verificar que RUC tenga 11 dígitos
- Confirmar que provincia esté seleccionada
- Asegurar que haya al menos 1 producto
- Revisar espacio en disco

**Datos incorrectos en Excel:**
- Verificar modo Unidades/Cajas
- Revisar precios en el catálogo
- Confirmar cantidades ingresadas

### 7.4 Contacto de Soporte

**¿Necesitas ayuda?**

| Canal | Contacto |
|-------|----------|
| 📧 Email | soporte@empresa.com |
| 📱 WhatsApp | +51 999 888 777 |
| 👨‍💼 Desarrollador | Carlos Cusi |

---

## 📎 Anexos

### Anexo A: Códigos de Error

| Código | Descripción | Solución |
|--------|-------------|----------|
| ERR_001 | Catálogo no encontrado | Recargar página |
| ERR_002 | Sincronización fallida | Reintentar en 5 min |
| ERR_003 | Exportación inválida | Verificar campos obligatorios |
| ERR_004 | Stock no disponible | Sincronizar stock |

### Anexo B: Tabla de Productos de Ejemplo (Datos Reales)

| SKU | Nombre del Producto | Unidades/Caja | Precio Unit. | Línea |
|-----|---------------------|---------------|--------------|-------|
| 03437 | Folder A4 Celeste Gusano | 50 | S/ 5.01 | ARCHIVO |
| 03438 | Folder A4 Verde Limón Gusano | 50 | S/ 5.01 | ARCHIVO |
| 03183 | Folder Oficio Verde Claro Gusano | 50 | S/ 5.14 | ARCHIVO |
| 01240 | Pelota Crackcito Bl/Azl | 60 | S/ 8.33 | PELOTAS |
| 77164 | Témpera Vinifan 30g Blanco | 360 | S/ 0.90 | PINTURA |
| 016761 | Fútbol Argentina #4 | 24 | S/ 39.00 | PELOTAS |
| 78480 | Folder Plástico Deadpool | 120 | S/ 6.64 | ARCHIVO |
| 77125 | Colores Triangulares x12 | 288 | S/ 2.64 | PINTURA |
| 72007 | Goma Barra Circular 21g | 384 | S/ 1.70 | PEGAMENTOS |
| 79042 | Tijera Vinifan Oficina 20cm | 120 | S/ 4.75 | ACCESORIOS |

**Nota:** Los precios y stock mostrados son referenciales y pueden variar. Siempre verifique la información actualizada en la aplicación.

### Anexo C: Glosario

| Término | Significado |
|---------|-------------|
| **SKU** | Código único del producto |
| **Bx** | Abreviatura de "Box" (caja/bulto) |
| **un** | Unidades individuales |
| **OC** | Orden de Compra |
| **IGV** | Impuesto General a las Ventas (18%) |
| **IndexedDB** | Base de datos local del navegador |

---

**Versión del Manual**: 1.2.1  
**Última actualización**: 2026-03-01  
**Aplicación**: Hoja de Pedido v1.2.1