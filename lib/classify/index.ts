// Clasificador de imágenes con Gemini (la misma API key de Nano Banana).
// Al subir una imagen, sugiere: tipo de sección (o anuncio), nicho y nombre.
// Es solo una sugerencia: si falla, el flujo manual sigue igual.

import { GoogleGenAI } from "@google/genai";
import {
  SECTION_CATALOG,
  AD_CATEGORY,
  NICHES,
  normalizeNiche,
  type SectionCategory,
} from "@/lib/sections";
import { geminiKey } from "@/lib/config";

export interface Classification {
  category: SectionCategory;
  niche: string;
  name: string;
}

// onlySections: cuando ya sabemos que la imagen salió de una landing, quitamos
// "anuncio" de las opciones. Sin esto la IA manda ahí casi todo, porque un hero
// de landing y un creativo de Ads se parecen mucho.
export async function classifyImage(
  base64: string,
  mime: string,
  onlySections = false,
): Promise<Classification> {
  const ai = new GoogleGenAI({ apiKey: await geminiKey() });
  const cats = [
    ...SECTION_CATALOG.map((c) => `${c.id} (${c.label})`),
    ...(onlySections
      ? []
      : [`${AD_CATEGORY} (Anuncio publicitario para Facebook/Instagram Ads — no es una sección de landing)`]),
  ].join(", ");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mime, data: base64 } },
          {
            text: [
              "Eres experto en landing pages y anuncios de ecommerce/dropshipping para LATAM.",
              "Clasifica esta imagen.",
              `Categorías posibles: ${cats}.`,
              onlySections
                ? "Esta imagen es un bloque de una landing: elige la sección que le corresponde."
                : [
                    "Para separar sección de anuncio: una SECCIÓN es un bloque de una página de producto — se apila con otros al hacer scroll, suele ser ancha o muy alargada, y desarrolla un solo tema (beneficios, testimonios, envío, comparativa...).",
                    "Un ANUNCIO es un creativo suelto para el feed de Facebook/Instagram/TikTok: formato compacto (1:1, 4:5, 9:16), una sola idea, hecho para detener el scroll fuera del sitio.",
                    "Ante la duda, es una sección de landing.",
                  ].join(" "),
              "Fíjate en el CONTENIDO para elegir la sección: comparación con la competencia = comparativa; caras y comillas = testimonios; pasos numerados = como-se-usa; preguntas y respuestas = faq; envío/entrega = logistica; devolución o sello de garantía = garantia; precio y descuento = oferta; solo el titular grande con el producto = hero.",
              `Responde SOLO con un objeto JSON con estas claves: {"categoria": "<id de la lista>", "nicho": "<exactamente UNO de: ${NICHES.join(", ")}>", "nombre": "<nombre corto y descriptivo en español para guardarla en la biblioteca>"}. Sin markdown ni texto extra.`,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .map((p) => (p as { text?: string }).text || "")
    .join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini no devolvió JSON");
  const raw = JSON.parse(text.slice(start, end + 1)) as {
    categoria?: string;
    nicho?: string;
    nombre?: string;
  };

  const valid = new Set<string>([...SECTION_CATALOG.map((c) => c.id), AD_CATEGORY]);
  return {
    category: (valid.has(raw.categoria || "") ? raw.categoria : "hero") as SectionCategory,
    niche: normalizeNiche(raw.nicho),
    name: (raw.nombre || "").trim(),
  };
}
