# Reglas de diseño — Interfaz de la herramienta

Estas reglas aplican SOLO a la interfaz de esta herramienta (las pantallas con las que
interactúa el usuario para armar las landings). **No** aplican al diseño de las landing
pages que la herramienta genera — esas tienen su propio sistema aparte.

Aplicarlas íntegramente antes de construir o modificar cualquier pantalla o componente de
la herramienta. Menos es más.

## Border radius (estándar)

REGLA: todo elemento de la interfaz usa **`rounded-lg`** como radio base.

| Elemento | Radio | Notas |
|----------|-------|-------|
| Botones (CTA, submit, file) | `rounded-lg` | Todos iguales, sin excepción |
| Chips / filtros / etiquetas | `rounded-lg` | |
| Inputs y campos | `rounded-lg` | |
| Badges pequeños | `rounded-lg` | |
| Tarjetas / contenedores grandes | `rounded-2xl` | Cards de plantillas, sub-paneles |
| Tarjeta principal (formulario) | `rounded-3xl` | Contenedor superior |
| Sidebar (barra lateral fija) | `rounded-lg` | Links de navegación |

No usar `rounded-full` en botones ni chips. No usar `rounded-full` en ningún elemento. No usar `rounded-xl` (se reemplazó por `rounded-lg`).

Sidebar: `fixed left-0 w-64 border-r border-white/10 bg-[#0A0A0A]`; link activo `bg-brand text-white font-semibold`, inactivo `text-white/50 hover:bg-white/[0.06]`.

## Layout

Shell único en `app/layout.tsx`: `<Sidebar />` + `<main className='min-h-[100dvh] pb-24 pl-0 pt-20 sm:pl-64 sm:pt-24'>`. Cada página aporta solo su contenido: `mx-auto max-w-3xl px-6` (`max-w-2xl` en el builder `[id]`).

## Colores

- Fondo base: `#0A0A0A` (negro)
- Acento único: `#FF5911` (naranja) — token `brand` en Tailwind (`bg-brand`, `text-brand`, con opacidad `bg-brand/85`)
- Tarjetas: `bg-[#161616]` o `bg-white/5`
- Inputs: `bg-[#1a1a1a]`
- Bordes: `border-white/10` (o `border-white/[0.08]` en tarjetas)
- Texto principal: `text-white`
- Texto secundario: `text-white/50`, `text-white/40` (usar `white/40` solo en labels xs-uppercase y metadatos; contenido real va en `white/50`)
- Placeholder: `text-white/25`
- Rojo funcional: `text-red-400` solo para mensajes de error y acción destructiva (eliminar). No es color de marca ni se usa decorativamente. Error en contenedor: `rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3`.

## Tipografía

Una sola familia: **Inter** (sans-serif clásica), cargada con `next/font/google` en `app/layout.tsx` y aplicada al body vía `font-sans`. Sin serif, sin fuentes decorativas.

Escala tipográfica (6 pasos, sin tamaños arbitrarios como `text-[10px]` o `text-[11px]`):

| Paso | Clase | Uso |
|------|-------|-----|
| micro-etiqueta / label / meta | `text-xs` | etiquetas uppercase, metadatos |
| cuerpo UI | `text-sm` | párrafos, inputs, botones |
| subtítulo de pantalla | `text-lg` | subtítulo bajo el H1 |
| H1 subpágina / detalle | `text-3xl sm:text-4xl` | builder `[id]` |
| H1 hub | `text-4xl sm:text-5xl` | inicio, biblioteca, generar, landings |

Mapa peso → rol: cuerpo/descripciones = `normal` (400, default, no explicitar); nombres/labels de item = `font-medium` (500); énfasis/CTA/label activo = `font-semibold` (600); títulos H1/H2 = `font-extrabold` (800). Todo en Inter.

## Botones

- CTA principal: `bg-brand text-white rounded-lg`
- Hover: `hover:bg-brand/85`
- Press: `active:scale-95`
- `transition` siempre
- Padding típico: `px-6 py-3` o `py-3.5` (ancho completo)
- Secundario: `bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 active:scale-95 transition`

## Encabezados de sección (jerarquía)

H1 de pantalla hub = `text-4xl sm:text-5xl`; H1 de subpágina/detalle = `text-3xl sm:text-4xl`. Título siempre `font-extrabold`, familia sans (Inter), sin serif.

## Chips / filtros

- Activo: `bg-brand text-white`
- Inactivo: `bg-white/[0.08] text-white/50 border border-white/10 hover:bg-white/[0.12]`
- Shape: `rounded-lg px-4 py-1.5 text-sm`
- Layout: `flex flex-wrap gap-2`

## Inputs

- `bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm`
- Focus: `focus:border-brand/50 focus:ring-2 focus:ring-brand/40 focus:outline-none`
- Placeholder: `placeholder:text-white/25`

## Encabezados de sección

- Etiqueta superior: `text-xs font-bold uppercase tracking-widest text-brand`
- Título: `font-extrabold text-white`
- Subtítulo: `text-white/50`

## Lo que NO se hace

- No fondo blanco ni gris claro
- No texto negro como color principal
- No animaciones ni efectos exagerados
- No glassmorphism pesado ni sombras fuertes
- No mezclar radios distintos en elementos del mismo tipo
