// Motor de generación de imágenes de sección — Fase 3.
// Toma una plantilla-imagen como guía ESTRUCTURAL + fotos reales del producto
// y moldea el producto a esa estructura: del original solo sobrevive el
// esqueleto; colores, ambiente, tipografía y textos se rediseñan.
//
// Son dos motores distintos y se eligen por separado en Configuraciones:
//   1. Motor del prompt (director de arte) — lee la maqueta y escribe el prompt.
//   2. Motor de imagen (Nano Banana o ChatGPT) — pinta la imagen.

import { GoogleGenAI } from "@google/genai";
import { getConfig, type ImageEngine, type PromptEngine } from "@/lib/config";
import { writeImagePrompt } from "./director";
import { REGLAS, buildImagePrompt, type ImageInput } from "./prompt";

export type { ImageEngine, PromptEngine, ImageInput };

export interface MoldRequest {
  template: ImageInput; // plantilla guía
  productImages: ImageInput[]; // fotos reales del producto
  market: string; // país, para que los avatares se vean realistas
  product: string; // nombre/descripción del producto
  instructions?: string; // colores, detalles
  engine?: ImageEngine; // por defecto, el motor elegido en Configuraciones
  promptEngine?: PromptEngine; // quién escribe el prompt; por defecto, el de Configuraciones
  kind?: "seccion" | "anuncio"; // sección de landing (default) o anuncio publicitario
  size?: string; // "original" o relación de aspecto: "1:1", "4:5", "9:16", "16:9"
}

export interface MoldResult {
  base64: string;
  mime: string;
  prompt: string; // el prompt que se usó, para poder afinarlo
}

async function moldWithNanoBanana(
  req: MoldRequest,
  prompt: string,
  apiKey: string,
): Promise<MoldResult> {
  const ai = new GoogleGenAI({ apiKey });
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  parts.push({
    inlineData: { mimeType: req.template.mime, data: req.template.base64 },
  });
  for (const p of req.productImages) {
    parts.push({ inlineData: { mimeType: p.mime, data: p.base64 } });
  }

  // El prompt solo no basta: con imagen de referencia, Nano Banana conserva la
  // relación de aspecto de la referencia salvo que se fije en imageConfig.
  const aspectRatio = req.size && req.size !== "original" ? req.size : undefined;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts }],
    ...(aspectRatio ? { config: { imageConfig: { aspectRatio } } } : {}),
  });

  const out = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of out) {
    const inline = (part as { inlineData?: { data?: string; mimeType?: string } })
      .inlineData;
    if (inline?.data) {
      return { base64: inline.data, mime: inline.mimeType || "image/png", prompt };
    }
  }
  throw new Error("Nano Banana no devolvió ninguna imagen");
}

// gpt-image-1 solo acepta tamaños fijos: cuadrado, vertical y horizontal.
const OPENAI_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
};

function toBlob(img: ImageInput): Blob {
  return new Blob([Buffer.from(img.base64, "base64")], { type: img.mime });
}

function ext(mime: string): string {
  return mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
}

async function moldWithChatGPT(
  req: MoldRequest,
  prompt: string,
  apiKey: string,
): Promise<MoldResult> {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", (req.size && OPENAI_SIZE[req.size]) || "auto");
  form.append("image[]", toBlob(req.template), `plantilla.${ext(req.template.mime)}`);
  req.productImages.forEach((p, i) => {
    form.append("image[]", toBlob(p), `producto-${i + 1}.${ext(p.mime)}`);
  });

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const data = (await res.json()) as {
    data?: { b64_json?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `ChatGPT respondió ${res.status}`);
  }
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("ChatGPT no devolvió ninguna imagen");
  return { base64: b64, mime: "image/png", prompt };
}

export async function moldSection(req: MoldRequest): Promise<MoldResult> {
  const cfg = await getConfig();
  const engine = req.engine || cfg.imageEngine;
  const brief = {
    product: req.product,
    market: req.market,
    instructions: req.instructions,
    kind: req.kind,
    size: req.size,
  };

  // El director de arte desarma la maqueta y escribe el prompt; si no hay
  // director o falla, se usa el prompt base. Las reglas duras van siempre.
  const guion = await writeImagePrompt(
    cfg,
    req.promptEngine || cfg.promptEngine,
    brief,
    [req.template, ...req.productImages],
  );
  const prompt = guion ? `${guion}\n\n${REGLAS}` : buildImagePrompt(brief);

  if (engine === "chatgpt") {
    if (!cfg.openaiApiKey) {
      throw new Error(
        "Falta la clave de ChatGPT (OpenAI). Ponla en Configuraciones o cambia el motor a Nano Banana.",
      );
    }
    return moldWithChatGPT(req, prompt, cfg.openaiApiKey);
  }

  if (!cfg.geminiApiKey) {
    throw new Error(
      "Falta la clave de Nano Banana (Gemini). Ponla en Configuraciones.",
    );
  }
  return moldWithNanoBanana(req, prompt, cfg.geminiApiKey);
}
