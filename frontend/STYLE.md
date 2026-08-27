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
      },
    },
  },
},
```

El toggle de modo oscuro debe agregar/quitar la clase `dark` en el `<html>`.

## Tipografía

- Fuente sugerida: `Inter` (limpia, legible, buen soporte de pesos)
- Pesos: 400 (texto normal), 500 (labels/subtítulos), 600–700 (títulos, botones)

## Principios de uso

- El naranja se usa solo para: botones primarios, estados activos/seleccionados, notificaciones, elementos que requieren atención inmediata. **No** como color de fondo de secciones completas.
- En modo oscuro el naranja debe resaltar sobre el azul-carbón — evitar negros puros (`#000000`) que apagan el contraste.
- Los estados de mensaje (pendiente/enviado/fallido) siempre usan los colores de `status`, nunca el naranja de marca, para no confundir "acción" con "estado".
- Bordes sutiles, nunca gruesos ni saturados — separan secciones sin competir con el contenido.
- Mantener el mismo espaciado y jerarquía visual entre modo claro y oscuro; solo cambian los colores, no el layout.
