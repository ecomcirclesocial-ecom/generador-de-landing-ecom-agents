// Bloques de HTML que acompañan a cada imagen de la landing.
// El texto lo puede escribir el CLI de Claude Code o el de Codex (así corre con
// tu suscripción y no gasta créditos de API), o la API de Gemini/OpenAI.
// Qué se usa lo decide el modo elegido en Configuraciones.

import { spawn } from "child_process";
import { GoogleGenAI } from "@google/genai";
import { getConfig, type Config } from "@/lib/config";

export interface HtmlBrief {
  product: string;
  market: string;
  section: string; // tipo de sección (ej. "Hero", "Beneficios")
  instructions?: string; // ángulo de venta / indicaciones del usuario
  current?: string; // HTML actual, cuando se pide ajustar en vez de crear
}

const SYSTEM = `Eres copywriter y maquetador de landing pages de ecommerce para LATAM.

Escribes bloques de HTML que van DEBAJO de la imagen de una sección en una página de producto de Shopify. La imagen ya vende visualmente: tu bloque aporta el texto que convierte.

Reglas del HTML:
- Devuelve SOLO el HTML del bloque. Sin explicaciones, sin markdown, sin comentarios.
- Un solo <div> contenedor. Nada de <html>, <head>, <body>, <script>, <style> ni <img>.
- Todos los estilos van inline en cada etiqueta (style="..."). El tema de Shopify no debe poder romperlo.
- Diseñado para móvil primero: ancho máximo 700px, centrado, padding 24px 20px, line-height 1.6.
- Tipografía: font-family:inherit. Tamaños: título 26px, subtítulo 17px, cuerpo 16px.
- Colores sobrios: texto #1a1a1a, texto secundario #555. Un solo color de acento si hace falta.
- Si la sección lo pide, incluye un botón CTA: fondo #FF5911, texto blanco, padding 14px 32px, border-radius 8px, display inline-block, text-decoration none, href="#comprar".

Reglas del copy:
- Español natural del mercado indicado. Directo, concreto, sin relleno ni hype vacío.
- Habla de beneficios y del problema real del cliente, no de características técnicas.
- Máximo 80 palabras en total. Menos es más.`;

function stripFences(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("<");
  const end = raw.lastIndexOf(">");
  if (start === -1 || end === -1) throw new Error("No se recibió HTML");
  return raw.slice(start, end + 1);
}

function buildPrompt(brief: HtmlBrief): string {
  return [
    `Producto: ${brief.product}.`,
    `Mercado: ${brief.market}.`,
    `Sección de la landing: ${brief.section}.`,
    brief.instructions ? `Indicaciones: ${brief.instructions}` : "",
    brief.current
      ? `Este es el bloque actual, ajústalo según las indicaciones:\n${brief.current}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// CLI en modo headless. stdin cerrado (si no, espera de más) y sin claves de API
// en el entorno para que corra con la suscripción, no con la API.
function runCLI(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.OPENAI_API_KEY;

    const child = spawn(bin, args, { env, stdio: ["ignore", "pipe", "pipe"] });

    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));

    // Por debajo del maxDuration de la ruta (120s), dejando margen al respaldo.
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${bin} tardó demasiado`));
    }, 90_000);

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`No se pudo ejecutar ${bin}: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(err.trim() || `${bin} salió con código ${code}`));
      resolve(out);
    });
  });
}

async function withSubscription(brief: HtmlBrief, engine: Config["textEngine"]): Promise<string> {
  const prompt = buildPrompt(brief);
  const out =
    engine === "codex"
      ? // Codex no tiene bandera de system prompt: va dentro del mismo prompt.
        await runCLI("codex", ["exec", "--skip-git-repo-check", `${SYSTEM}\n\n${prompt}`])
      : await runCLI("claude", ["-p", prompt, "--system-prompt", SYSTEM, "--model", "opus"]);
  return stripFences(out);
}

async function withGemini(apiKey: string, brief: HtmlBrief): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: `${SYSTEM}\n\n${buildPrompt(brief)}` }] },
    ],
  });

  return stripFences(
    (response.candidates?.[0]?.content?.parts ?? [])
      .map((p) => (p as { text?: string }).text || "")
      .join(""),
  );
}

async function withOpenAI(apiKey: string, brief: HtmlBrief): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(brief) },
      ],
    }),
  });

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data.error?.message || `OpenAI respondió ${res.status}`);
  return stripFences(data.choices?.[0]?.message?.content || "");
}

// Con clave API el texto sigue al motor de imágenes elegido, y si esa clave
// falta usa la otra: lo importante es no quedarse sin escribir el bloque.
async function withApi(cfg: Config, brief: HtmlBrief): Promise<string> {
  const orden =
    cfg.imageEngine === "chatgpt"
      ? ([["openai", cfg.openaiApiKey], ["gemini", cfg.geminiApiKey]] as const)
      : ([["gemini", cfg.geminiApiKey], ["openai", cfg.openaiApiKey]] as const);

  for (const [proveedor, key] of orden) {
    if (!key) continue;
    return proveedor === "openai" ? withOpenAI(key, brief) : withGemini(key, brief);
  }
  throw new Error("No hay ninguna clave API configurada. Ponla en Configuraciones.");
}

export async function writeSectionHtml(brief: HtmlBrief): Promise<string> {
  const cfg = await getConfig();

  if (cfg.mode === "api") return withApi(cfg, brief);
  if (cfg.mode === "suscripcion") return withSubscription(brief, cfg.textEngine);

  try {
    return await withSubscription(brief, cfg.textEngine);
  } catch (errorSuscripcion) {
    try {
      return await withApi(cfg, brief);
    } catch {
      throw errorSuscripcion;
    }
  }
}
