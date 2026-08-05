# Generador de Landing Pages · Ecom Circle

Herramienta local que arma landing pages de producto **sección por sección** con IA y
las publica como **página de producto en Shopify**.

Corre en tu computador. El texto de venta lo escribe **Claude Code con tu suscripción**
(no gasta créditos de API) y las imágenes las genera **Gemini**.

Versión 1.0.0 · Licencia MIT

---

## Qué necesitas

1. **Node.js 18 o superior** — https://nodejs.org
2. **Claude Code**, instalado y con sesión iniciada — https://claude.ai/code
   Es lo que escribe el copy de cada sección usando tu suscripción.
3. **Una API key de Gemini** (gratis) — https://aistudio.google.com/apikey
   Es lo que genera las imágenes.
4. **Shopify CLI** *(opcional, solo para publicar)* — https://shopify.dev/docs/api/shopify-cli
   Instálalo y corre `shopify store auth` una vez.

---

## Instalación

```bash
# 1. Clona el repo
git clone https://github.com/ecomcirclesocial-ecom/ecom-circle.git
cd ecom-circle

# 2. Instala las dependencias
npm install

# 3. Copia el archivo de ejemplo y pon tus datos
cp .env.example .env.local
```

Abre `.env.local` y llena:

```
GEMINI_API_KEY=tu_key_de_gemini
SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
```

> **No pongas `ANTHROPIC_API_KEY`.** El texto lo escribe Claude Code con tu
> suscripción. Si pones esa key, te cobraría por API en vez de usar tu plan.

```bash
# 4. Arranca
npm run dev
```

Abre **http://localhost:3000**.

Las claves también se pueden pegar desde la web, en **Configuraciones**. Lo que
guardes ahí (`data/config.json`) manda sobre `.env.local`.

---

## Cómo se usa

La barra lateral tiene siete pantallas:

| Pantalla | Para qué |
|---|---|
| **Generador de landing** | Tu biblioteca de plantillas + el estudio donde moldeas cada sección |
| **Generador de anuncios** | Lo mismo, pero para creativos de Meta/TikTok (sin copy) |
| **Extraer** | Pegas el URL de una landing que te gusta y baja sus imágenes, ya clasificadas |
| **Subir landing** | Armas la landing completa y la publicas en Shopify |
| **Recursos** | Descargas (tema Shirene listo para Shopify) |
| **Configuraciones** | Motores de IA y claves |

### El flujo completo

1. **Junta plantillas.** Sube capturas de secciones de landings que te gusten
   (hero, beneficios, testimonios…) o usa **Extraer** para bajarlas de un URL.
   La IA las clasifica sola por tipo de sección y por nicho.
2. **Moldea una sección.** Eliges una plantilla + subes fotos reales de tu
   producto → Gemini genera la sección con la **misma estructura**, tu producto,
   tus colores. La plantilla es guía estructural, no se copia.
3. **Crea la landing.** Le pones nombre, producto, mercado (país, para que los
   avatares se vean realistas) y las fotos. Eliges un wireframe (Clásica, etc.)
   que te arma todos los huecos.
4. **Llena los huecos.** Cada bloque es imagen o texto. El texto lo escribe
   Claude y lo puedes editar.
5. **Previsualiza** la landing apilada, tal como quedará.
6. **Publica** a Shopify con un clic: sube las imágenes al CDN, crea el producto
   con la plantilla `product.landing` y lo publica en la tienda online.

---

## Modo agente (terminal)

Todo lo de la web se puede hacer desde la terminal. El agente habla con las
**mismas rutas API** del servidor local, así que no hay lógica duplicada.

Necesita el server corriendo (`npm run dev`).

```bash
node agent.mjs list                          # tus landings
node agent.mjs templates --categoria hero    # tus plantillas
node agent.mjs show <id>                     # una landing en JSON
node agent.mjs create --name "X" --product "Y" [--market Colombia] [--photos a.jpg,b.jpg]
node agent.mjs section <id> --template <tid> [--instructions "..."] [--texto]
node agent.mjs texto <id> <sid> [--instructions "..."] [--ajustar]
node agent.mjs quitar <id> <sid>
node agent.mjs orden <id> <sid,sid,sid>
node agent.mjs preview <id>
node agent.mjs publish <id>
node agent.mjs extract <url> [--save]
```

El agente apunta a `http://localhost:3001` por defecto. Si tu server corre en
otro puerto: `LANDING_BASE=http://localhost:3000 node agent.mjs list`.

---

## Estructura

```
app/            La web local + las rutas de API
components/     Sidebar, Estudio (biblioteca + generación), editor de bloques
lib/
  sections.ts   Catálogo de tipos de sección, mercados y nichos
  wireframes.ts Esqueletos de landing (qué bloques y en qué orden)
  imagegen/     Generación de imágenes con Gemini (director de arte + pintor)
  copy/         Texto de cada bloque con Claude Code (+ respaldo Gemini)
  classify/     Clasificador de imágenes al subirlas
  extract/      Extractor de imágenes desde el URL de una landing
  templates/    Biblioteca de plantillas en disco
  landings/     Proyectos de landing en disco
  shopify/      Publicación como página de producto
  render.ts     Bloques imagen + HTML (preview y Shopify comparten esto)
data/
  templates/    Biblioteca de plantillas (viene con la de Ecom Circle)
  landings/     Cada landing que creas (fuera de git)
  config.json   Tus claves y motores (fuera de git)
agent.mjs       Modo agente
```

Todo se guarda en `data/` en tu propio computador. Nada sale de tu máquina salvo
las llamadas a Gemini (imágenes) y a tu tienda Shopify (al publicar).

Detalle técnico en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
Reglas de diseño de la interfaz en [docs/DISENO.md](docs/DISENO.md).

---

## Mejorarla con Claude Code

Esta herramienta está hecha para crecer con Claude Code. El repo trae un
[CLAUDE.md](CLAUDE.md) con las reglas de la casa: arquitectura, convenciones,
qué no romper.

```bash
cd ecom-circle
claude
```

Y le pides lo que necesites: *"agrega un wireframe para productos de belleza"*,
*"quiero exportar la landing como HTML"*, *"soporta dos tiendas de Shopify"*.
Claude lee el `CLAUDE.md`, entiende dónde va cada cosa y lo hace.

Si te queda bien, manda un Pull Request y lo usa toda la comunidad.

---

## Problemas comunes

**"credit balance too low"** — Tienes `ANTHROPIC_API_KEY` en `.env.local`.
Bórrala: el copy debe correr por el CLI de Claude Code, con tu suscripción.

**Error 500 en toda la app / "Cannot find module './XXX.js'"** — El caché de
Next se corrompió al agregar rutas en caliente. `rm -rf .next` y arranca de nuevo.

**El aspecto de la imagen no cambia** — El aspecto (1:1, 4:5, 9:16, 16:9) se
manda a Gemini como parámetro, no en el texto del prompt. Si lo cambiaste en el
prompt no va a funcionar.

**Publiqué y el producto da 404 en la tienda** — El estado ACTIVE no basta en
tiendas nuevas: hay que publicarlo al canal "Tienda online". La herramienta ya lo
hace; si falla, revisa los scopes de `shopify store auth`.

**Las plantillas se clasifican todas como "anuncio"** — Un hero de landing y un
creativo de Ads se parecen mucho. Al subir desde el Generador de landing se
excluye la categoría "anuncio" automáticamente.

---

## Licencia

MIT — úsala, modifícala y véndele con ella. Ver [LICENSE](LICENSE).
