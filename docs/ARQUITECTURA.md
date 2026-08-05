# Arquitectura

Cómo funciona por dentro. Para quien vaya a modificar la herramienta.

---

## La idea de fondo

Una sola capa de lógica (`lib/`), expuesta por HTTP (`app/api/`), consumida por dos
clientes: la web y el agente de terminal.

```
  components/          agent.mjs
       │                   │
       └──────► app/api/ ◄─┘
                   │
                 lib/
                   │
                 data/
```

`agent.mjs` no importa nada de `lib/`. Habla por `fetch` con el server local
(`LANDING_BASE`, default `http://localhost:3001`). Por eso web y agente nunca se
desincronizan.

---

## Los datos

Todo en disco, sin base de datos.

```
data/
  config.json                  Motores + claves (fuera de git)
  templates/
    index.json                 Índice de la biblioteca
    hero/<id>.webp             Los archivos, carpeta por categoría
    beneficios/<id>.png
    ...
  landings/
    <id>/
      landing.json             Producto, mercado, bloques, ref de Shopify
      fotos/                   Fotos reales del producto
      bloques/                 Imágenes generadas de cada bloque
```

**Una plantilla** es una imagen + `{ categoria, nicho, nombre }`. Cambiar de
categoría **mueve el archivo** de carpeta (lo hace `updateTemplate`).

**Una landing** es un proyecto: producto, mercado, fotos subidas una vez, y una
lista ordenada de bloques.

**Un bloque** es `image` o `html`. Un bloque `image` sin archivo es un **hueco
vacío** del wireframe: se muestra en el editor para llenarlo, pero no se renderiza.

---

## Los cuatro motores de IA

Se eligen por separado en **Configuraciones** (`lib/config`).

| Motor | Qué hace | Quién lo corre |
|---|---|---|
| **Texto** | El HTML de cada bloque | CLI de Claude Code (suscripción) o Codex. Respaldo: Gemini API |
| **Imagen** | Pinta la sección | Gemini `gemini-2.5-flash-image` (Nano Banana). Alternativa cableada: `gpt-image` |
| **Prompt** (director de arte) | Lee la maqueta y escribe el prompt de la imagen | Gemini, ChatGPT o ninguno |
| **Clasificación / extracción** | Etiqueta imágenes | Gemini 2.5 Flash |

`UsageMode` decide con qué se paga el texto: `suscripcion` (CLI), `api` (clave), o
`ambos` (CLI con API de respaldo). Las **imágenes siempre necesitan clave API** —
ninguna suscripción las expone.

### El moldeo (`lib/imagegen`)

1. `director.ts` recibe la plantilla-imagen y escribe un prompt describiendo su
   estructura.
2. `index.ts` manda a Gemini: plantilla (guía estructural) + fotos del producto +
   mercado + instrucciones.
3. De la plantilla **solo sobrevive el esqueleto**. Colores, ambiente, tipografía y
   textos se rediseñan con el producto real.

El aspecto (1:1, 4:5, 9:16, 16:9) va en `config.imageConfig.aspectRatio`, **no** en
el texto del prompt — con imagen de referencia el prompt no controla el aspecto.

---

## Publicación en Shopify (`lib/shopify`)

La auth **no vive aquí**: vive en el Shopify CLI (`shopify store auth`). Este módulo
ejecuta `shopify store execute --allow-mutations` por `child_process`, así que sirve
igual para la web y para el agente.

Flujo de `publishLanding`:

1. **`themeFilesUpsert`** — sube `templates/product.landing.liquid` al tema
   principal. Ese Liquid itera el metafield y apila los bloques.
2. **Por cada imagen**: `stagedUploadsCreate` → POST binario a la URL firmada de GCS
   → `fileCreate(IMAGE)` → poll hasta `READY` → URL de CDN.
3. **`productCreate`** con `templateSuffix: "landing"` y el metafield
   `custom.landing_blocks` (json) con los bloques.
4. **`publishablePublish`** al canal "Tienda online". Sin este paso el producto da
   404 en tiendas nuevas, aunque esté `ACTIVE`.

Scopes necesarios en `shopify store auth`:
`write_products, read_products, write_files, write_themes, read_themes,
write_publications, read_publications`.

El preview local y lo que se guarda en el metafield salen de la **misma función**:
`toBlocks()` en `lib/render.ts`. Cambiarla afecta a los dos.

> **Pendiente:** la validación end-to-end en Shopify se hizo con el metafield
> anterior (`landing_sections`, solo imágenes). El camino actual con
> `landing_blocks` (imagen + HTML) nunca se corrió completo.

---

## Rutas API

### Plantillas
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/templates` | GET, POST | Lista / sube una plantilla |
| `/api/templates/[id]` | DELETE | Borra |
| `/api/templates/[id]/raw` | GET | Sirve el archivo |
| `/api/templates/reclassify` | POST | Backfill: reclasifica la biblioteca (`{"categorias":true}` respeta las que ya son anuncio) |
| `/api/categories` | GET, POST | Catálogo de categorías |
| `/api/classify` | POST | Clasifica una imagen antes de guardarla |

### Generación
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/generate` | POST | Moldea una imagen (`kind: seccion \| anuncio`) |
| `/api/copy` | POST | Escribe el HTML de un bloque |
| `/api/wireframes` | GET | Esqueletos disponibles |

### Landings
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/landings` | GET, POST | Lista / crea |
| `/api/landings/[id]` | GET, DELETE | Ver / borrar |
| `/api/landings/[id]/blocks` | POST, PUT | Agrega bloque / reordena |
| `/api/landings/[id]/blocks/[bid]` | PATCH, DELETE | Edita / borra |
| `/api/landings/[id]/blocks/[bid]/mold` | POST | Genera la imagen del bloque |
| `/api/landings/[id]/blocks/[bid]/write` | POST | Escribe o ajusta el texto |
| `/api/landings/[id]/blocks/[bid]/raw` | GET | Sirve la imagen |
| `/api/landings/[id]/preview` | GET | Vista previa apilada |
| `/api/landings/[id]/publish` | POST | Publica en Shopify |

### Extracción
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/extract` | POST | Analiza un URL (no guarda) |
| `/api/extract/save` | POST | Descarga y guarda las confirmadas |
| `/api/extraidas` | GET | Lo extraído |

### Configuración
| Ruta | Métodos | Qué hace |
|---|---|---|
| `/api/config` | GET, POST | Motores y claves |

---

## Extracción de imágenes (`lib/extract`)

1. Baja el HTML del URL.
2. Saca las URLs de `<img>` (regex sobre `src` y `srcset`), deduplica por `pathname`
   quedándose con la de mayor `width`, resuelve las relativas, descarta `data:` y lo
   que no sea imagen.
3. Gemini etiqueta cada una: `{ categoria, nicho, nombre, usar }`. Para el CDN de
   Shopify pide la miniatura con `&width=640`.
4. Si la IA falla, **la extracción no se pierde**: cae a etiquetado manual
   (`categoria: hero`, nombre = filename, `usar: true`) más un `aiError`.
5. Al guardar entran a la **misma biblioteca** de plantillas.

---

## Degradación: la regla

Ninguna falla de IA puede hacer perder trabajo.

- Copy falla → la sección se guarda igual, solo con la imagen.
- Clasificador falla → etiquetado manual.
- CLI de Claude falla → respaldo Gemini.

Si agregas un paso con IA, resuélvelo igual.
