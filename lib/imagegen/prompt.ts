// Los prompts del moldeo. Vive aparte porque es lo que más se afina.
//
// Idea central: de la plantilla se copia SOLO el esqueleto (dónde va cada cosa
// y en qué orden se lee). Todo lo visual — producto, colores, fondo, ambiente,
// tipografía, personas, textos — se rediseña desde cero para el producto real.

export interface ImageInput {
  base64: string;
  mime: string;
}

export interface PromptBrief {
  product: string;
  market: string;
  instructions?: string;
  kind?: "seccion" | "anuncio";
  size?: string;
}

// Reglas duras. Van SIEMPRE al final del prompt de imagen, escriba el prompt
// el director de arte o no. Son lo que impide que la plantilla se cuele.
export const REGLAS = `REGLAS DEL MOLDEO — no negociables:

1. La PRIMERA imagen es solo una MAQUETA DE ESTRUCTURA. Trátala como un boceto en gris. De ella copias ÚNICAMENTE:
   - la retícula: qué bloque va arriba, al centro y abajo, y cuánto espacio ocupa cada uno
   - la jerarquía de lectura: qué se lee primero, segundo y tercero, y con qué diferencia de tamaño
   - la posición, el tamaño y el ángulo del producto dentro del encuadre
   - qué elementos de venta existen y dónde: titular, subtítulo, badges, sellos, precios, packs, flechas, franjas, personas
   - la densidad: cuánto aire hay y qué tan cargada es la composición

2. De la maqueta NO copias NADA más. Su producto, su marca, su logo, sus colores, su fondo, su ambiente, su tipografía, sus personas, sus props, sus textos y su iluminación NO EXISTEN. Ningún píxel de la maqueta puede sobrevivir en el resultado. Si el resultado se parece a la maqueta en color o ambiente, está mal.

3. Las imágenes siguientes son el PRODUCTO REAL y es el único producto que puede aparecer. Reprodúcelo con fidelidad fotográfica: misma forma, mismo envase, mismas proporciones, misma etiqueta, mismo logotipo, mismos colores del empaque y mismo texto de la etiqueta, legible y sin errores. Prohibido inventar variantes, cambiar el envase, alterar la marca o mezclar el producto de la maqueta con el real.

4. La dirección de arte NUEVA sale del producto, no de la maqueta: la paleta se deriva de los colores del propio producto y de su empaque; el fondo, el escenario y los props corresponden al uso real del producto y a su categoría; la iluminación es la que le queda bien a ese producto.

5. Las personas, si el esqueleto las pide, son del mercado indicado: rasgos, edad, tono de piel, ropa y entorno naturales y creíbles para ese país. Manos y rostros correctos, sin deformaciones.

6. Todos los textos van en español natural del mercado, cortos, con ortografía y acentuación perfectas, tipografía nítida y legible. Nada de texto inventado, deformado, cortado ni en otro idioma. La tipografía es una decisión nueva, coherente con el producto — no la de la maqueta.

7. Resultado final: una sola imagen plana, terminada, calidad publicitaria, sin marcas de agua, sin logos ajenos, sin bordes, sin collage de referencias, sin mostrar la maqueta.`;

function encabezado(kind?: string): string {
  return kind === "anuncio"
    ? "Eres director de arte de anuncios publicitarios de ecommerce (Meta Ads) para LATAM. Vas a producir un anuncio nuevo."
    : "Eres director de arte de secciones de página de producto de ecommerce para LATAM. Vas a producir una sección nueva.";
}

function tamano(size?: string): string {
  return size && size !== "original"
    ? `Formato de salida: relación de aspecto ${size}. Reacomoda la composición para que respire en ese formato, manteniendo el mismo orden de bloques.`
    : "Formato de salida: el mismo de la maqueta.";
}

// Prompt de imagen sin director de arte: el esqueleto lo lee el propio motor
// de imágenes desde la maqueta.
export function buildImagePrompt(brief: PromptBrief): string {
  return [
    encabezado(brief.kind),
    `Producto real: "${brief.product}". Mercado: ${brief.market || "LATAM"}.`,
    "Trabajo: replicar el ESQUELETO de la maqueta y rediseñar todo lo demás en función del producto real.",
    tamano(brief.size),
    brief.instructions ? `Indicaciones del cliente (mandan sobre lo demás): ${brief.instructions}` : "",
    REGLAS,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Prompt del director de arte: mira la maqueta y el producto real, y escribe
// el prompt de imagen. Es el paso que sube la calidad — traduce la maqueta a
// un plano verbal y decide la dirección de arte nueva.
export const DIRECTOR_SYSTEM = `Eres director de arte publicitario de ecommerce para LATAM. No generas imágenes: escribes el prompt que otro motor va a ejecutar.

Recibes:
- Primera imagen: una MAQUETA. Solo interesa su ESTRUCTURA.
- Imágenes siguientes: el PRODUCTO REAL que va a protagonizar la pieza.

Tu trabajo son dos lecturas y una decisión:

A) Desarmar la maqueta como un plano, no como una foto. Describe bloque por bloque, de arriba a abajo: qué hay, qué porcentaje del alto ocupa, alineación, tamaño relativo del texto, dónde está el producto y en qué ángulo, qué elementos de venta aparecen (badges, sellos, precios, packs, flechas, franjas, personas) y dónde. Ignora por completo colores, marca, producto, fondo y textos de la maqueta.

B) Leer el producto real: qué es, en qué envase viene, qué colores tiene su empaque, qué dice su etiqueta, a quién sirve y en qué contexto se usa.

C) Decidir la dirección de arte NUEVA que nace del producto: paleta (derivada del empaque), fondo y escenario, props, iluminación, estilo tipográfico, y quién aparece si el esqueleto pide personas.

Devuelve SOLO el prompt final para el motor de imágenes, en español, sin markdown, sin títulos en negrita, sin explicaciones ni comentarios tuyos. Estructúralo así:

ESCENA: una frase que resuma la pieza.
ESTRUCTURA (copiar de la maqueta): la lista de bloques de arriba a abajo, con posición y proporción.
PRODUCTO: descripción exacta del producto real y cómo debe verse en el encuadre.
DIRECCIÓN DE ARTE (nueva): paleta con colores concretos, fondo, ambiente, props, iluminación, estilo tipográfico.
PERSONAS: solo si el esqueleto las pide.
TEXTOS: el texto exacto de cada bloque, en español del mercado, corto y vendedor, indicando cuál es titular, subtítulo, badge, precio o CTA.

Reglas del copy que escribas: concreto, del mercado indicado, sin hype vacío, sin promesas médicas prohibidas, precios y moneda solo si el esqueleto los pide.`;

export function buildDirectorBrief(brief: PromptBrief): string {
  return [
    `Producto real: "${brief.product}".`,
    `Mercado: ${brief.market || "LATAM"}.`,
    brief.kind === "anuncio"
      ? "Pieza: anuncio publicitario para Meta Ads."
      : "Pieza: sección de página de producto.",
    tamano(brief.size),
    brief.instructions ? `Indicaciones del cliente (mandan sobre lo demás): ${brief.instructions}` : "",
    "Escribe ahora el prompt final.",
  ]
    .filter(Boolean)
    .join("\n");
}
