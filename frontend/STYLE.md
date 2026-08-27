# Style Guide — Riwi Messenger

Guía de estilos visuales del frontend. Colores, tipografía y componentes base para mantener consistencia entre modo claro y oscuro.

## Identidad

Paleta: **blanco + naranja + azul-carbón**, con el naranja como color de acento (nunca como base) y el azul-carbón como fondo dominante en modo oscuro.

## Paleta de colores

### Color de marca
| Uso | Hex |
|---|---|
| Naranja (acento principal) | `#FF6B35` |
| Naranja hover/activo | `#E5541F` |

### Modo claro
| Uso | Hex |
|---|---|
| Fondo principal | `#FFFFFF` |
| Fondo secundario (paneles, sidebar) | `#F7F7F8` |
| Texto principal | `#1A1A2E` |
| Texto secundario | `#6B7280` |
| Bordes | `#E5E7EB` |

### Modo oscuro
| Uso | Hex |
|---|---|
| Fondo principal | `#0F1117` |
| Fondo secundario (paneles, sidebar) | `#181B24` |
| Texto principal | `#F5F5F7` |
| Texto secundario | `#9CA3AF` |
| Bordes | `#2A2D3A` |

### Estados (comunes a ambos modos)
| Estado | Hex |
|---|---|
| Éxito / enviado | `#22C55E` |
| Error / fallido | `#EF4444` |
| Pendiente | `#FBBF24` |

### Colores de texto en modo claro (accesibilidad WCAG)

Los colores de marca y de estado de arriba están pensados para **fondos/acentos** — sobre el azul-carbón oscuro tienen buen contraste, pero sobre blanco no cumplen el mínimo AA (4.5:1) si se usan como color de texto o ícono. Contraste verificado con la fórmula de luminancia relativa de WCAG 2.1:

| Uso | Color de fondo/acento | Contraste sobre blanco | Variante para texto/ícono en modo claro | Contraste variante |
|---|---|---|---|---|
| Naranja de marca | `#FF6B35` | 2.84:1 ❌ | `#C2410C` | 5.18:1 ✅ |
| Pendiente | `#FBBF24` | 1.67:1 ❌ | `#B45309` | 5.02:1 ✅ |
| Error | `#EF4444` | 3.76:1 ❌ | `#DC2626` | 4.83:1 ✅ |

Regla: en modo claro, usar la columna "variante para texto/ícono" en labels, texto de estado, íconos pequeños y cualquier elemento donde el color cargue el significado (no solo decore un fondo). Las columnas originales (`#FF6B35`, `#FBBF24`, `#EF4444`) se mantienen para fondos, acentos y modo oscuro, donde sí cumplen contraste.

## Configuración Tailwind

Agregar en `tailwind.config.ts`:

```ts
darkMode: "class",
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: "#FF6B35",
        hover: "#E5541F",
      },
      background: {
        light: "#FFFFFF",
        "light-secondary": "#F7F7F8",
        dark: "#0F1117",
        "dark-secondary": "#181B24",
      },
      foreground: {
        light: "#1A1A2E",
        "light-secondary": "#6B7280",
        dark: "#F5F5F7",
        "dark-secondary": "#9CA3AF",
      },
      border: {
        light: "#E5E7EB",
        dark: "#2A2D3A",
      },
      status: {
        success: "#22C55E",
        error: "#EF4444",
        pending: "#FBBF24",
        // variantes accesibles para texto/ícono en modo claro (≥4.5:1 sobre blanco)
        "error-text-light": "#DC2626",
        "pending-text-light": "#B45309",
      },
      "brand-text-light": "#C2410C",
      avatar: {
        1: "#2563EB", // azul
        2: "#7C3AED", // violeta
        3: "#0F766E", // verde azulado
        4: "#DB2777", // rosa
        5: "#4F46E5", // índigo
        6: "#0E7490", // cian
      },
    },
    spacing: {
      "icon-sm": "14px",
      "icon-md": "16px",
      "icon-lg": "24px",
      "icon-xl": "48px",
    },
  },
},
```

El toggle de modo oscuro debe agregar/quitar la clase `dark` en el `<html>`.

## Paleta de avatares

Todos los avatares usando el naranja de marca hacen que los usuarios se vean idénticos en un canal con varios miembros. Se define una paleta fija de 6 colores, distintos del naranja de marca y de los colores de estado, para diferenciar usuarios de un vistazo.

| Índice | Color | Hex | Contraste con iniciales blancas |
|---|---|---|---|
| `avatar-1` | Azul | `#2563EB` | 5.17:1 ✅ |
| `avatar-2` | Violeta | `#7C3AED` | 5.70:1 ✅ |
| `avatar-3` | Verde azulado | `#0F766E` | 5.47:1 ✅ |
| `avatar-4` | Rosa | `#DB2777` | 4.60:1 ✅ |
| `avatar-5` | Índigo | `#4F46E5` | 6.29:1 ✅ |
| `avatar-6` | Cian | `#0E7490` | 5.36:1 ✅ |

**Asignación:** determinística por usuario, nunca aleatoria en cada render. Calcular un hash simple del `id` (o `username`) del usuario y tomar el módulo 6 para elegir el índice de la paleta, de forma que el mismo usuario siempre tenga el mismo color en toda la app y para todos los que lo vean.

Las iniciales del usuario van siempre en blanco (`#FFFFFF`) sobre estos fondos — todos cumplen ≥4.5:1, funcionan igual en modo claro y oscuro sin variantes adicionales.

## Escala de íconos

Los íconos (`lucide-react`) usan una escala nombrada de 4 tamaños en vez de valores sueltos:

| Token | Tamaño | Uso |
|---|---|---|
| `icon-sm` | 14px | Badges, texto inline, metadatos pequeños |
| `icon-md` | 16px | Botones y acciones por defecto |
| `icon-lg` | 24px | Encabezados, íconos de sección |
| `icon-xl` | 48px | Branding grande, estados vacíos, FAB del copiloto |

Uso con `lucide-react`: `<Icon size={16} />` para `icon-md`, o vía clase Tailwind si el ícono se envuelve en un `<span>` con `w-icon-md h-icon-md`.

## Layout de la aplicación

Estructura de 3 zonas + panel deslizante del copiloto:

```
┌──────────┬────────────────────────────────────────┬─────────┐
│          │  Header: nombre canal · miembros        │         │
│ Sidebar  ├────────────────────────────────────────┤         │
│ canales  │                                          │ Panel   │
│          │  [avatar] mensaje user 1                 │ copilot │
│ - Perfil │                                          │ (oculto │
│   user   │            mensaje user 2 [avatar]       │ hasta   │
│   abajo  │                                          │ click)  │
│          │                                          │         │
│          │                                    ⬤ IA  │         │
│          ├────────────────────────────────────────┤         │
│          │  input para texto             [enviar]  │         │
└──────────┴────────────────────────────────────────┴─────────┘
```

### Zona 1 — Sidebar de canales (izquierda)
- Lista de canales/conversaciones, ancho fijo (~280px)
- Fondo: `background-secondary`
- Canal activo resaltado con borde/fondo sutil en `brand` (naranja) al 10-15% de opacidad, nunca relleno sólido
- **Perfil de usuario** anclado abajo del todo del sidebar (avatar + nombre + estado), siempre visible, sin ocupar espacio del área de mensajes

### Zona 2 — Conversación (centro)
- Header fijo arriba: nombre del canal, miembros
- Mensajes: burbujas alineadas según autor (propio a la derecha, ajeno a la izquierda con avatar)
- Estados de mensaje (pendiente/enviado/fallido) como ícono pequeño junto a la hora, usando colores de `status`
- Input de texto fijo abajo, con botón de enviar en `brand`

### Zona 3 — Panel del copiloto (desplegable, overlay derecho)
- **Oculto por defecto.** No ocupa espacio del layout mientras está cerrado — solo se ve un botón flotante circular (FAB) en la esquina inferior derecha del área de conversación (icono tipo chispa/robot, fondo `brand`, sombra suave)
- Al hacer clic en el FAB, el panel se despliega desde la derecha (~360px de ancho, transición 200-250ms), con fondo `background-secondary` y su propio scroll
- Al hacer clic de nuevo en el mismo botón (o en una X dentro del panel), se cierra y vuelve a quedar solo el FAB visible
- Es completamente opcional: el usuario decide cuándo abrirlo, la conversación nunca pierde espacio por su causa

### Responsivo (móvil)
- Sidebar de canales se colapsa a un drawer accesible por ícono de hamburguesa
- El FAB del copiloto se mantiene visible sobre la conversación
- El panel del copiloto pasa a ocupar el 100% del ancho al abrirse (en vez de 360px fijos)

## Tipografía

- Fuente sugerida: `Inter` (limpia, legible, buen soporte de pesos)
- Pesos: 400 (texto normal), 500 (labels/subtítulos), 600–700 (títulos, botones)

## Principios de uso

- El naranja se usa solo para: botones primarios, estados activos/seleccionados, notificaciones, elementos que requieren atención inmediata. **No** como color de fondo de secciones completas.
- En modo oscuro el naranja debe resaltar sobre el azul-carbón — evitar negros puros (`#000000`) que apagan el contraste.
- Los estados de mensaje (pendiente/enviado/fallido) siempre usan los colores de `status`, nunca el naranja de marca, para no confundir "acción" con "estado".
- Bordes sutiles, nunca gruesos ni saturados — separan secciones sin competir con el contenido.
- Mantener el mismo espaciado y jerarquía visual entre modo claro y oscuro; solo cambian los colores, no el layout.
