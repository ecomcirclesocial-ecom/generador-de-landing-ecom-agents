# CLAUDE.md

Reglas de la casa para trabajar en este proyecto con Claude Code.

---

## Qué es esto

Herramienta **local** (no se despliega) que arma landing pages de producto para
dropshipping sección por sección con IA, y las publica como **página de producto**
en Shopify. Todo vive en el computador del usuario: los datos en `data/`, las
credenciales en `.env.local` o `data/config.json`.

La usa la comunidad de Ecom Circle: gente de ecommerce, **no programadores**. Todo
lo que se agregue tiene que poder usarse sin leer código.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind v3 · datos en disco (JSON + archivos).
Sin base de datos, sin auth, sin deploy. `npm run dev` y listo.

---

## Arquitectura: la regla que no se rompe

**Toda la lógica vive en `lib/`. `app/api/*` solo traduce HTTP ↔ `lib/`. La web y el
agente consumen las mismas rutas API.**

```
components/  →  app/api/*  →  lib/*  →  data/
agent.mjs    →  app/api/*  ↗
```

`agent.mjs` **no importa nada de `lib/`**: habla por HTTP con el server local. Por eso
no hay lógica duplicada. Si agregas una capacidad, va en `lib/`, se expone en
`app/api/`, y ahí la usan la UI y el agente.

Nunca metas lógica de negocio dentro de un componente de React ni dentro de un
`route.ts`.

---

## Mapa de `lib/`

| Módulo | Responsabilidad |
|---|---|
| `sections.ts` | Catálogo fijo: `SECTION_CATALOG` (tipos de sección), `MARKETS` (países), `NICHES` + `normalizeNiche`. La IA **elige de estas listas**, no inventa |
| `wireframes.ts` | Esqueletos de landing: qué bloques y en qué orden |
| `render.ts` | `toBlocks()` — la estructura de bloques que comparten el preview local y el metafield de Shopify. Cambiarla afecta a los dos |
| `imagegen/` | Moldea la sección. `director.ts` escribe el prompt leyendo la maqueta, `index.ts` pinta con Gemini |
| `copy/` | El HTML de texto de cada bloque. Corre el **CLI de Claude Code en headless**, no la API |
| `classify/` | Clasifica una imagen al subirla (categoría + nicho + nombre) |
| `extract/` | Baja las imágenes de un URL y las etiqueta |
| `templates/` | CRUD de la biblioteca (`data/templates/<categoria>/`, índice en `index.json`) |
| `landings/` | CRUD de proyectos de landing (`data/landings/<id>/`) |
| `shopify/` | Publicación. Ejecuta el Shopify CLI por `child_process` |
| `config/` | `data/config.json` — motores y claves. **Manda sobre `.env.local`** |

---

## Cosas que ya se aprendieron a la mala

No las vuelvas a descubrir:

1. **El copy NO usa la API de Anthropic.** Corre `claude -p` en headless borrando
   `ANTHROPIC_API_KEY` del env, para que use la suscripción del usuario. Si alguien
   mete esa key, empieza a cobrar por API. Respaldo: Gemini.
2. **El aspecto de la imagen va como parámetro**, `config.imageConfig.aspectRatio`
   en la llamada a Gemini. Pedirlo en el texto del prompt **no funciona** cuando hay
   imagen de referencia.
3. **Al clasificar plantillas de landing hay que excluir "anuncio"**
   (`classifyImage(..., onlySections=true)`). Sin eso Gemini manda ~80% de las
   plantillas a "anuncio": un hero y un creativo de Ads se parecen demasiado.
4. **Publicar en Shopify necesita `publishablePublish`** al canal "Tienda online".
   Poner el producto en `status: ACTIVE` **no basta** en tiendas nuevas → 404.
5. **Agregar rutas API con `next dev` en caliente corrompe `.next`** (500 en toda la
   app, "Cannot find module './XXX.js'"). Se arregla con `rm -rf .next` + reiniciar.
6. **En macOS no existe `setsid`.** Para dejar el dev corriendo en background:
   `nohup npx next dev -p 3001 &> log & disown`.
7. **Los nichos y categorías se normalizan siempre.** Si dejas a la IA responder
   libre, la biblioteca se llena de variantes ("Salud", "salud canina", "Nutrición…").

---

## Estilo

- **Código y UI en español.** Nombres de variables, comentarios, textos, todo.
- **Menos es más.** La solución más simple que funcione. No agregues manejo de
  errores, abstracciones ni features que nadie pidió.
- Comentarios: pocos, y para explicar *por qué*, no *qué*. Mira los que ya hay —
  cada archivo abre con 2-4 líneas diciendo para qué existe. Mantén esa costumbre.
- **Nada de romper el flujo por un error de IA.** Si el copy falla, la sección se
  guarda igual con su imagen. Si el clasificador falla, se cae a etiquetado manual.
  El usuario nunca pierde trabajo por una IA caída.

### Visual

Las reglas completas de la interfaz están en [docs/DISENO.md](docs/DISENO.md) —
léelas antes de tocar una pantalla. En corto:

- Naranja de marca: `brand` = `#FF5911` (en `tailwind.config.ts`), como acento.
- Tema claro/oscuro con `ThemeToggle`; usa los tokens (`foreground`, `muted`,
  `card`, `accent`) — **no hardcodees colores**.
- `<Sidebar/>` vive en `app/layout.tsx`. Las páginas **no** lo importan.
- Serio, clásico, natural. Sin glassmorphism, sin sombras pesadas, sin animaciones
  de más. Máximo 2 tamaños de fuente por sección.

---

## Cómo correr y probar

```bash
npm run dev              # http://localhost:3000
npm run build            # verifica que compile antes de dar algo por listo
node agent.mjs list      # prueba el agente (requiere el server arriba)
```

No hay suite de tests. Lo que se cambia se prueba **de verdad**: generando una
sección, armando una landing, publicando. Un `npm run build` limpio es el mínimo,
no la prueba.

---

## Pendientes conocidos

- **Falta un end-to-end real del flujo de bloques.** La publicación en Shopify se
  validó con el metafield viejo (`landing_sections`, solo imágenes). El código hoy
  usa `custom.landing_blocks` (imagen + HTML) y ese camino completo nunca se corrió
  de punta a punta. Es lo primero que hay que verificar antes de tocar `lib/shopify`.
- El comentario de cabecera de `lib/shopify/index.ts` todavía dice
  `landing_sections`. El código correcto es `landing_blocks`.
- Motor de imagen ChatGPT (`gpt-image`) está cableado en config pero sin probar.
- Solo soporta **una** tienda de Shopify.
