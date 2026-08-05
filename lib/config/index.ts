// Configuración de motores — qué usa la herramienta y con qué se paga.
// Vive en data/config.json (fuera de git) y manda sobre las variables de .env.local.

import { promises as fs } from "fs";
import path from "path";

// Cómo se paga el TEXTO: con la suscripción del CLI, con clave API, o CLI con API de respaldo.
// Las imágenes siempre necesitan clave API (ninguna suscripción las expone).
export type UsageMode = "suscripcion" | "api" | "ambos";
export type TextEngine = "claude" | "codex";
export type ImageEngine = "nano-banana" | "chatgpt";
// Quién escribe el prompt de la imagen (director de arte), antes de pintarla.
export type PromptEngine = "gemini" | "chatgpt" | "ninguno";

export interface Config {
  mode: UsageMode;
  textEngine: TextEngine;
  imageEngine: ImageEngine;
  promptEngine: PromptEngine;
  geminiApiKey: string;
  openaiApiKey: string;
}

const FILE = path.join(process.cwd(), "data", "config.json");

const DEFAULTS: Omit<Config, "geminiApiKey" | "openaiApiKey"> = {
  mode: "ambos",
  textEngine: "claude",
  imageEngine: "nano-banana",
  promptEngine: "gemini",
};

const MODES: UsageMode[] = ["suscripcion", "api", "ambos"];
const TEXT_ENGINES: TextEngine[] = ["claude", "codex"];
const IMAGE_ENGINES: ImageEngine[] = ["nano-banana", "chatgpt"];
const PROMPT_ENGINES: PromptEngine[] = ["gemini", "chatgpt", "ninguno"];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export async function getConfig(): Promise<Config> {
  let saved: Partial<Config> = {};
  try {
    saved = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    // Sin archivo todavía: valores por defecto + .env.local.
  }
  return {
    mode: pick(saved.mode, MODES, DEFAULTS.mode),
    textEngine: pick(saved.textEngine, TEXT_ENGINES, DEFAULTS.textEngine),
    imageEngine: pick(saved.imageEngine, IMAGE_ENGINES, DEFAULTS.imageEngine),
    promptEngine: pick(saved.promptEngine, PROMPT_ENGINES, DEFAULTS.promptEngine),
    geminiApiKey: (saved.geminiApiKey || process.env.GEMINI_API_KEY || "").trim(),
    openaiApiKey: (saved.openaiApiKey || process.env.OPENAI_API_KEY || "").trim(),
  };
}

export async function saveConfig(patch: Partial<Config>): Promise<Config> {
  const limpio = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  );
  const next = { ...(await getConfig()), ...limpio };
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function geminiKey(): Promise<string> {
  const key = (await getConfig()).geminiApiKey;
  if (!key) throw new Error("Falta la clave de Nano Banana (Gemini). Ponla en Configuraciones.");
  return key;
}

export async function openaiKey(): Promise<string> {
  const key = (await getConfig()).openaiApiKey;
  if (!key) throw new Error("Falta la clave de ChatGPT (OpenAI). Ponla en Configuraciones.");
  return key;
}
