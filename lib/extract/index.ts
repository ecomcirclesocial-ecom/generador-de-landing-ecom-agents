// Extractor de imágenes de secciones desde una landing — Fase 7.
// Dado el URL de una landing (o página de anuncios) que nos gusta: baja su HTML,
// saca las imágenes, y Gemini (visión) etiqueta cada una.
// kind "landing" → tipo de sección + nicho. kind "anuncio" → solo nicho.
// La UI/agente luego las guarda en la biblioteca de plantillas (lib/templates).

import { GoogleGenAI } from "@google/genai";
import {
  SECTION_CATALOG,
  AD_CATEGORY,
  NICHES,
  normalizeNiche,
  type SectionCategory,
} from "@/lib/sections";
import { geminiKey } from "@/lib/config";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export type ExtractKind = "landing" | "anuncio";

export interface ExtractedImage {
  url: string; // URL original en máxima calidad — la que se guarda
  preview: string; // URL reducida — la que ve Claude y se muestra en la grilla
  category: SectionCategory; // sugerida por Claude ("anuncio" fija en modo anuncio)
  niche: string; // nicho del producto sugerido por Claude
  name: string; // nombre descriptivo sugerido por Claude
  use: boolean; // Claude marca false para logos/íconos/basura
}

export interface ExtractResult {
  pageUrl: string;
  images: ExtractedImage[];
  aiError?: string; // si Claude falla (ej. sin créditos), la extracción igual sirve
}

// --- Paso 1: sacar las URLs de imagen del HTML (sin IA, nunca falla) ---

// Ancho declarado de la variante: ?width= / ?w= o sufijo Shopify _600x600 en el
// nombre del archivo. Sin pista = original (máxima calidad).
function widthOf(u: URL): number {
  const w = u.searchParams.get("width") || u.searchParams.get("w");
  let n = w ? parseInt(w, 10) : NaN;
  if (!Number.isFinite(n)) {
    const m = u.pathname.match(/_(\d+)x\d*(?:_crop_[a-z]+)?\.[a-z0-9]+$/i);
    n = m ? parseInt(m[1], 10) : NaN;
  }
  return Number.isFinite(n) ? n : Infinity;
}

// Archivos que nunca son una sección: logos, íconos, sellos de pago, banderas...
const JUNK =
  /(logo|icon|favicon|sprite|badge|payment|paypal|visa|mastercard|amex|flag|avatar|placeholder|loading|blank)/i;

export function extractImageUrls(html: string, baseUrl: string): string[] {
  const found: string[] = [];
  // src="..." y las entradas de srcset="url 320w, url 640w, ..."
  for (const m of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    found.push(m[1]);
  }
  for (const m of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url) found.push(url);
    }
  }

  // Nos quedamos con la variante de mayor resolución por imagen. El sufijo de
  // tamaño de Shopify (_160x160) se quita de la clave para que las miniaturas
  // de la misma imagen no cuenten como imágenes distintas.
  const best = new Map<string, URL>();
  for (const raw of found) {
    if (!raw || raw.startsWith("data:")) continue;
    let u: URL;
    try {
      u = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    if (!/\.(png|jpe?g|webp|gif)$/i.test(u.pathname)) continue;
    if (JUNK.test(u.pathname)) continue;
    const key =
      u.origin + u.pathname.replace(/_\d+x\d*(?:_crop_[a-z]+)?(\.[a-z0-9]+)$/i, "$1");
    const prev = best.get(key);
    if (!prev || widthOf(u) > widthOf(prev)) best.set(key, u);
  }

  // Las imágenes cuya mejor variante sigue siendo pequeña son miniaturas
  // (productos relacionados, catálogo) — no secciones de la landing.
  return [...best.values()].filter((u) => widthOf(u) >= 400).map((u) => u.href);
}

// Shopify CDN sirve miniaturas con &width=. Para el resto usamos la original.
function previewUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("cdn.shopify.com")) {
      u.searchParams.set("width", "640");
      return u.href;
    }
  } catch {
    // url inválida, la devolvemos tal cual
  }
  return url;
}

// --- Paso 2: Gemini etiqueta cada imagen ---

async function classify(
  previews: string[],
  kind: ExtractKind,
): Promise<{ category: SectionCategory; niche: string; name: string; use: boolean }[]> {
  const ai = new GoogleGenAI({ apiKey: await geminiKey() });
  const cats = SECTION_CATALOG.map((c) => `${c.id} (${c.label})`).join(", ");

  const nichoDesc = `"nicho": "<exactamente UNO de: ${NICHES.join(", ")}>"`;
  const basura =
    'Si una imagen es logo, ícono, badge, sello de pago, pixel de tracking o elemento de interfaz que NO sirve como plantilla ni como foto real de producto, marca "usar": false.';

  const prompt =
    kind === "landing"
      ? [
          "Eres experto en landing pages de ecommerce/dropshipping para LATAM.",
          `Te paso ${previews.length} imágenes extraídas de una página de producto, numeradas y en el orden en que aparecen.`,
          "Primero identifica cuál es el producto principal de la página (el que más se repite en las imágenes grandes).",
          'Marca "usar": true SOLO si la imagen es una sección de la landing del producto principal: infografía, banner con texto, foto de uso, antes/después, comparativa, testimonios, garantía, envío, etc.',
          'Marca "usar": false para TODO lo demás: fotos o miniaturas de OTROS productos (relacionados, recomendados, colecciones, "también te puede interesar"), variantes sueltas, logos, íconos, badges, sellos de pago, banners genéricos de la tienda y elementos de interfaz. Ante la duda, marca false.',
          "Clasifica cada imagen en UNA de estas categorías de sección:",
          cats,
          `Responde SOLO con un array JSON, un objeto por imagen EN EL MISMO ORDEN, con las claves: {"i": <número>, "categoria": "<id de la lista>", ${nichoDesc}, "nombre": "<nombre corto en español>", "usar": <true|false>}. Sin markdown ni texto extra.`,
        ].join("\n")
      : [
          "Eres experto en anuncios de ecommerce/dropshipping para LATAM.",
          `Te paso ${previews.length} imágenes de anuncios publicitarios extraídas de una página, numeradas.`,
          "Clasifica CADA imagen por el nicho del producto que anuncia.",
          basura,
          `Responde SOLO con un array JSON, un objeto por imagen EN EL MISMO ORDEN, con las claves: {"i": <número>, ${nichoDesc}, "nombre": "<nombre corto en español>", "usar": <true|false>}. Sin markdown ni texto extra.`,
        ].join("\n");

  // Gemini no acepta URLs de imagen: bajamos cada preview y la pasamos en base64.
  const fetched = await Promise.all(
    previews.map(async (url) => {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`No se pudo bajar la imagen (HTTP ${r.status})`);
      const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
      return { mime, data: Buffer.from(await r.arrayBuffer()).toString("base64") };
    }),
  );

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  fetched.forEach((img, idx) => {
    parts.push({ text: `Imagen ${idx + 1}:` });
    parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });

  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .map((p) => (p as { text?: string }).text || "")
    .join("");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Gemini no devolvió JSON");
  const raw = JSON.parse(text.slice(start, end + 1)) as {
    i: number;
    categoria?: string;
    nicho?: string;
    nombre: string;
    usar: boolean;
  }[];

  const valid = new Set<string>(SECTION_CATALOG.map((c) => c.id));
  // Ordenamos por índice para alinear con las imágenes de entrada.
  return previews.map((_, idx) => {
    const r = raw.find((x) => x.i === idx + 1) ?? raw[idx];
    const category =
      kind === "anuncio"
        ? AD_CATEGORY
        : ((r && valid.has(r.categoria || "") ? r.categoria : "hero") as SectionCategory);
    return {
      category,
      niche: normalizeNiche(r?.nicho),
      name: (r?.nombre || "").trim() || `Imagen ${idx + 1}`,
      use: r ? r.usar !== false : true,
    };
  });
}

function nameFromUrl(url: string): string {
  try {
    const base = new URL(url).pathname.split("/").pop() || "imagen";
    return decodeURIComponent(base.replace(/\.[a-z0-9]+$/i, "")).slice(0, 60);
  } catch {
    return "imagen";
  }
}

// --- Orquestación ---

export async function extractFromUrl(
  pageUrl: string,
  kind: ExtractKind = "landing",
): Promise<ExtractResult> {
  const res = await fetch(pageUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`No se pudo abrir la landing (HTTP ${res.status})`);
  const html = await res.text();

  const urls = extractImageUrls(html, pageUrl);
  if (!urls.length) return { pageUrl, images: [] };

  const previews = urls.map(previewUrl);
  const fallbackCategory = kind === "anuncio" ? AD_CATEGORY : ("hero" as SectionCategory);

  try {
    const tags = await classify(previews, kind);
    const images = urls.map((url, i) => ({
      url,
      preview: previews[i],
      category: tags[i].category,
      niche: tags[i].niche,
      name: tags[i].name,
      use: tags[i].use,
    }));
    return { pageUrl, images };
  } catch (e) {
    // La extracción no depende de la IA: si Claude falla, entregamos las
    // imágenes sin clasificar para etiquetarlas a mano.
    const images = urls.map((url, i) => ({
      url,
      preview: previews[i],
      category: fallbackCategory,
      niche: "",
      name: nameFromUrl(url),
      use: true,
    }));
    return { pageUrl, images, aiError: e instanceof Error ? e.message : String(e) };
  }
}
