// Motor del prompt — el "director de arte".
//
// Mira la maqueta y las fotos del producto y escribe el prompt que después
// ejecuta el motor de imágenes. Es un motor aparte y se elige aparte: puede
// escribir el prompt Gemini y pintarlo ChatGPT, o al revés.

import { GoogleGenAI } from "@google/genai";
import type { Config, PromptEngine } from "@/lib/config";
import {
  DIRECTOR_SYSTEM,
  buildDirectorBrief,
  type ImageInput,
  type PromptBrief,
} from "./prompt";

export type { PromptEngine };

async function conGemini(
  apiKey: string,
  brief: PromptBrief,
  images: ImageInput[],
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const parts: Array<Record<string, unknown>> = [
    { text: `${DIRECTOR_SYSTEM}\n\n${buildDirectorBrief(brief)}` },
    ...images.map((i) => ({ inlineData: { mimeType: i.mime, data: i.base64 } })),
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });

  return (response.candidates?.[0]?.content?.parts ?? [])
    .map((p) => (p as { text?: string }).text || "")
    .join("")
    .trim();
}

async function conOpenAI(
  apiKey: string,
  brief: PromptBrief,
  images: ImageInput[],
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: DIRECTOR_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: buildDirectorBrief(brief) },
            ...images.map((i) => ({
              type: "image_url",
              image_url: { url: `data:${i.mime};base64,${i.base64}` },
            })),
          ],
        },
      ],
    }),
  });

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data.error?.message || `OpenAI respondió ${res.status}`);
  return (data.choices?.[0]?.message?.content || "").trim();
}

// Devuelve el prompt escrito por el director, o "" si no hay director o falla:
// quedarse sin imagen por un prompt es peor que generar con el prompt base.
export async function writeImagePrompt(
  cfg: Config,
  engine: PromptEngine,
  brief: PromptBrief,
  images: ImageInput[],
): Promise<string> {
  if (engine === "ninguno") return "";
  try {
    if (engine === "chatgpt") {
      return cfg.openaiApiKey ? await conOpenAI(cfg.openaiApiKey, brief, images) : "";
    }
    return cfg.geminiApiKey ? await conGemini(cfg.geminiApiKey, brief, images) : "";
  } catch {
    return "";
  }
}
