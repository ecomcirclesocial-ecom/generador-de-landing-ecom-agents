// Biblioteca de plantillas-imágenes — Fase 2.
// Cada plantilla es una imagen de sección guardada en /data/templates/<categoria>/,
// con un índice JSON en /data/templates/index.json.

import { promises as fs } from "fs";
import path from "path";
import { SECTION_CATALOG, AD_CATEGORY } from "@/lib/sections";

const DATA_DIR = path.join(process.cwd(), "data", "templates");
const INDEX = path.join(DATA_DIR, "index.json");
const CATEGORIES = path.join(DATA_DIR, "categories.json");

export interface Template {
  id: string;
  category: string;
  name: string;
  niche?: string; // nicho del producto (salud, hogar, mascotas...)
  file: string; // nombre del archivo dentro de data/templates/<category>/
  createdAt: string;
}

export interface Category {
  id: string;
  label: string;
}

// Categorías personalizadas creadas por el usuario, además del catálogo base.
async function readCustomCategories(): Promise<Category[]> {
  try {
    return JSON.parse(await fs.readFile(CATEGORIES, "utf8")) as Category[];
  } catch {
    return [];
  }
}

export async function listCategories(): Promise<Category[]> {
  return [...SECTION_CATALOG, ...(await readCustomCategories())];
}

export async function addCategory(label: string): Promise<Category> {
  const id = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!id) throw new Error("Nombre inválido");
  const all = await listCategories();
  const existing = all.find((c) => c.id === id);
  if (existing || id === AD_CATEGORY) return existing ?? { id, label: label.trim() };
  const custom = await readCustomCategories();
  const cat: Category = { id, label: label.trim() };
  custom.push(cat);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CATEGORIES, JSON.stringify(custom, null, 2), "utf8");
  return cat;
}

export async function isValidCategory(id: string): Promise<boolean> {
  if (id === AD_CATEGORY) return true;
  return (await listCategories()).some((c) => c.id === id);
}

async function readIndex(): Promise<Template[]> {
  try {
    return JSON.parse(await fs.readFile(INDEX, "utf8")) as Template[];
  } catch {
    return [];
  }
}

async function writeIndex(items: Template[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INDEX, JSON.stringify(items, null, 2), "utf8");
}

export async function listTemplates(): Promise<Template[]> {
  return readIndex();
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  return (await readIndex()).find((t) => t.id === id);
}

export function templateFilePath(t: Template): string {
  return path.join(DATA_DIR, t.category, t.file);
}

export async function addTemplate(input: {
  category: string;
  name: string;
  niche?: string;
  ext: string;
  bytes: Buffer;
}): Promise<Template> {
  const items = await readIndex();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.join(DATA_DIR, input.category);
  await fs.mkdir(dir, { recursive: true });
  const file = `${id}.${input.ext}`;
  await fs.writeFile(path.join(dir, file), input.bytes);

  const tpl: Template = {
    id,
    category: input.category,
    name: input.name,
    niche: input.niche?.trim() || undefined,
    file,
    createdAt: new Date().toISOString(),
  };
  items.push(tpl);
  await writeIndex(items);
  return tpl;
}

export async function updateTemplate(
  id: string,
  patch: { niche?: string; name?: string; category?: string },
): Promise<Template | undefined> {
  const items = await readIndex();
  const t = items.find((x) => x.id === id);
  if (!t) return undefined;
  if (patch.niche !== undefined) t.niche = patch.niche.trim() || undefined;
  if (patch.name !== undefined) t.name = patch.name.trim() || t.name;
  // Cambiar de categoría también mueve el archivo, que vive en la carpeta de su categoría.
  if (patch.category && patch.category !== t.category) {
    const dir = path.join(DATA_DIR, patch.category);
    await fs.mkdir(dir, { recursive: true });
    await fs.rename(templateFilePath(t), path.join(dir, t.file));
    t.category = patch.category;
  }
  await writeIndex(items);
  return t;
}

export async function deleteTemplate(id: string): Promise<void> {
  const items = await readIndex();
  const t = items.find((x) => x.id === id);
  if (!t) return;
  try {
    await fs.unlink(templateFilePath(t));
  } catch {
    // archivo ya no existe, seguimos
  }
  await writeIndex(items.filter((x) => x.id !== id));
}
