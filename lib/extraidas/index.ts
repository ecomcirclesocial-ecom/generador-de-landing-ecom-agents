// Registro de landings extraídas — guarda la URL original y las secciones
// (en el orden en que aparecían) para saber cómo estaba armada la landing.
// Cada sección referencia una plantilla guardada en la biblioteca.

import { promises as fs } from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "data", "extraidas.json");

export interface ExtractedLanding {
  id: string;
  url: string;
  createdAt: string;
  items: { templateId: string; category: string; name: string }[];
}

async function read(): Promise<ExtractedLanding[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as ExtractedLanding[];
  } catch {
    return [];
  }
}

export async function listExtracted(): Promise<ExtractedLanding[]> {
  return (await read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addExtracted(input: {
  url: string;
  items: ExtractedLanding["items"];
}): Promise<ExtractedLanding> {
  const all = await read();
  const record: ExtractedLanding = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: input.url,
    createdAt: new Date().toISOString(),
    items: input.items,
  };
  all.push(record);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2), "utf8");
  return record;
}
