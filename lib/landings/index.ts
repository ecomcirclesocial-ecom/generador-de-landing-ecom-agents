// Armado de landings — editor de bloques.
// Una landing es un proyecto con producto, mercado y fotos (subidas una vez),
// al que se le agregan bloques ordenables. Vive en /data/landings/<id>/.
// Un bloque de imagen sin `image` es un HUECO VACÍO del wireframe.

import { promises as fs } from "fs";
import path from "path";
import { moldSection, type ImageInput } from "@/lib/imagegen";
import { writeSectionHtml } from "@/lib/copy";
import { SECTION_CATALOG } from "@/lib/sections";
import { getTemplate, templateFilePath } from "@/lib/templates";
import { getWireframe } from "@/lib/wireframes";

const ROOT = path.join(process.cwd(), "data", "landings");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export type BlockKind = "image" | "html";

export interface LandingBlock {
  id: string;
  kind: BlockKind;
  label: string; // nombre visible del bloque
  image?: string; // archivo dentro de sections/. Ausente = hueco vacío
  templateId?: string; // plantilla de origen, si vino de la biblioteca
  category?: string; // categoría de la plantilla de origen
  html?: string; // solo kind:"html"
}

export interface ShopifyRef {
  productId: string;
  handle: string;
  productUrl: string;
  adminUrl: string;
  publishedAt: string;
}

export interface Landing {
  id: string;
  name: string;
  product: string;
  market: string;
  productPhotos: string[]; // archivos en photos/
  blocks: LandingBlock[];
  shopify?: ShopifyRef;
  createdAt: string;
}

export interface LandingSummary {
  id: string;
  name: string;
  product: string;
  market: string;
  sectionCount: number;
  createdAt: string;
}

export type AddBlockInput =
  | { kind: "image"; templateId?: string; label?: string; index?: number }
  | { kind: "html"; html?: string; label?: string; index?: number };

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const categoryLabel = (category: string) =>
  SECTION_CATALOG.find((c) => c.id === category)?.label || category;

async function save(l: Landing): Promise<void> {
  await fs.writeFile(
    path.join(ROOT, l.id, "landing.json"),
    JSON.stringify(l, null, 2),
    "utf8",
  );
}

// Formato viejo: sections[] con imagen + html opcional pegados.
interface LegacySection {
  id: string;
  category: string;
  templateId: string;
  image: string;
  html?: string;
}

function migrate(raw: Landing & { sections?: LegacySection[] }): {
  landing: Landing;
  changed: boolean;
} {
  const { sections, ...rest } = raw;
  if (Array.isArray(raw.blocks)) {
    return { landing: rest as Landing, changed: Boolean(sections) };
  }
  const blocks: LandingBlock[] = [];
  for (const s of sections ?? []) {
    blocks.push({
      id: s.id,
      kind: "image",
      label: categoryLabel(s.category),
      image: s.image,
      templateId: s.templateId,
      category: s.category,
    });
    if (s.html) {
      blocks.push({ id: newId(), kind: "html", label: "Texto", html: s.html });
    }
  }
  return { landing: { ...(rest as Landing), blocks }, changed: true };
}

export async function getLanding(id: string): Promise<Landing | undefined> {
  let raw: Landing & { sections?: LegacySection[] };
  try {
    raw = JSON.parse(
      await fs.readFile(path.join(ROOT, id, "landing.json"), "utf8"),
    );
  } catch {
    return undefined;
  }
  const { landing, changed } = migrate(raw);
  if (changed) await save(landing);
  return landing;
}

export async function listLandings(): Promise<LandingSummary[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(ROOT);
  } catch {
    return [];
  }
  const out: LandingSummary[] = [];
  for (const e of entries) {
    const l = await getLanding(e);
    if (l) {
      out.push({
        id: l.id,
        name: l.name,
        product: l.product,
        market: l.market,
        sectionCount: l.blocks.length,
        createdAt: l.createdAt,
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLanding(input: {
  name: string;
  product: string;
  market: string;
  photos: { bytes: Buffer; ext: string }[];
}): Promise<Landing> {
  const id = newId();
  const dir = path.join(ROOT, id);
  await fs.mkdir(path.join(dir, "photos"), { recursive: true });
  await fs.mkdir(path.join(dir, "sections"), { recursive: true });

  const productPhotos: string[] = [];
  for (let i = 0; i < input.photos.length; i++) {
    const fn = `photo-${i}.${input.photos[i].ext}`;
    await fs.writeFile(path.join(dir, "photos", fn), input.photos[i].bytes);
    productPhotos.push(fn);
  }

  const landing: Landing = {
    id,
    name: input.name,
    product: input.product,
    market: input.market,
    productPhotos,
    blocks: [],
    createdAt: new Date().toISOString(),
  };
  await save(landing);
  return landing;
}

export async function deleteLanding(id: string): Promise<void> {
  await fs.rm(path.join(ROOT, id), { recursive: true, force: true });
}

export function blockFilePath(id: string, block: LandingBlock): string {
  return path.join(ROOT, id, "sections", block.image || "");
}

async function readAsInput(file: string): Promise<ImageInput> {
  const ext = file.split(".").pop()?.toLowerCase() || "png";
  const bytes = await fs.readFile(file);
  return { base64: bytes.toString("base64"), mime: MIME[ext] || "image/png" };
}

async function productPhotoInputs(l: Landing): Promise<ImageInput[]> {
  return Promise.all(
    l.productPhotos.map((fn) => readAsInput(path.join(ROOT, l.id, "photos", fn))),
  );
}

async function removeImage(id: string, block: LandingBlock): Promise<void> {
  if (!block.image) return;
  try {
    await fs.unlink(blockFilePath(id, block));
  } catch {
    // ya no existe
  }
}

// Copia el archivo de una plantilla de la biblioteca al bloque. Sin IA.
async function copyTemplateInto(
  id: string,
  block: LandingBlock,
  templateId: string,
): Promise<void> {
  const tpl = await getTemplate(templateId);
  if (!tpl) throw new Error("Plantilla no encontrada");
  const ext = tpl.file.split(".").pop()?.toLowerCase() || "png";
  const file = `${newId()}.${ext}`;
  await fs.mkdir(path.join(ROOT, id, "sections"), { recursive: true });
  await fs.copyFile(templateFilePath(tpl), path.join(ROOT, id, "sections", file));

  await removeImage(id, block);
  block.image = file;
  block.templateId = tpl.id;
  block.category = tpl.category;
}

function insert(landing: Landing, block: LandingBlock, index?: number): void {
  const at =
    typeof index === "number" && index >= 0 && index <= landing.blocks.length
      ? index
      : landing.blocks.length;
  landing.blocks.splice(at, 0, block);
}

async function load(id: string): Promise<Landing> {
  const landing = await getLanding(id);
  if (!landing) throw new Error("Landing no encontrada");
  return landing;
}

export async function addBlock(
  id: string,
  input: AddBlockInput,
): Promise<Landing> {
  const landing = await load(id);

  const block: LandingBlock = {
    id: newId(),
    kind: input.kind,
    label: input.label?.trim() || (input.kind === "html" ? "Texto" : "Imagen"),
  };

  if (input.kind === "image" && input.templateId) {
    await copyTemplateInto(id, block, input.templateId);
    if (!input.label && block.category) block.label = categoryLabel(block.category);
  }
  if (input.kind === "html" && input.html?.trim()) {
    block.html = input.html.trim();
  }

  insert(landing, block, input.index);
  await save(landing);
  return landing;
}

// Aplica un esqueleto completo: todos sus bloques entran como huecos vacíos.
export async function applyWireframe(
  id: string,
  wireframeId: string,
  index?: number,
): Promise<Landing> {
  const wf = getWireframe(wireframeId);
  if (!wf) throw new Error("Esqueleto no encontrado");
  const landing = await load(id);

  const nuevos: LandingBlock[] = wf.blocks.map((b) => ({
    id: newId(),
    kind: b.kind,
    label: b.label,
  }));
  const at =
    typeof index === "number" && index >= 0 && index <= landing.blocks.length
      ? index
      : landing.blocks.length;
  landing.blocks.splice(at, 0, ...nuevos);

  await save(landing);
  return landing;
}

export async function updateBlock(
  id: string,
  bid: string,
  patch: { html?: string; label?: string; templateId?: string },
): Promise<Landing> {
  const landing = await load(id);
  const block = landing.blocks.find((b) => b.id === bid);
  if (!block) throw new Error("Bloque no encontrado");

  if (patch.templateId) await copyTemplateInto(id, block, patch.templateId);
  if (patch.label !== undefined) block.label = patch.label.trim() || block.label;
  if (patch.html !== undefined) block.html = patch.html.trim() || undefined;

  await save(landing);
  return landing;
}

export async function deleteBlock(id: string, bid: string): Promise<Landing> {
  const landing = await load(id);
  const block = landing.blocks.find((b) => b.id === bid);
  if (block) await removeImage(id, block);
  landing.blocks = landing.blocks.filter((b) => b.id !== bid);
  await save(landing);
  return landing;
}

export async function reorderBlocks(
  id: string,
  orderedIds: string[],
): Promise<Landing> {
  const landing = await load(id);
  const map = new Map(landing.blocks.map((b) => [b.id, b]));
  const next = orderedIds
    .map((bid) => map.get(bid))
    .filter(Boolean) as LandingBlock[];
  // conservar cualquier bloque no incluido (por seguridad)
  for (const b of landing.blocks) if (!orderedIds.includes(b.id)) next.push(b);
  landing.blocks = next;
  await save(landing);
  return landing;
}

// Regenera la imagen del bloque con IA usando su imagen actual (o la de su
// plantilla de origen) como referencia estructural y las fotos del producto.
export async function moldBlockImage(
  id: string,
  bid: string,
  instructions?: string,
): Promise<Landing> {
  const landing = await load(id);
  const block = landing.blocks.find((b) => b.id === bid);
  if (!block) throw new Error("Bloque no encontrado");
  if (block.kind !== "image") throw new Error("El bloque no es de imagen");

  let reference: ImageInput;
  if (block.image) {
    reference = await readAsInput(blockFilePath(id, block));
  } else if (block.templateId) {
    const tpl = await getTemplate(block.templateId);
    if (!tpl) throw new Error("Plantilla no encontrada");
    reference = await readAsInput(templateFilePath(tpl));
  } else {
    throw new Error("El bloque no tiene imagen de referencia");
  }

  const result = await moldSection({
    template: reference,
    productImages: await productPhotoInputs(landing),
    market: landing.market,
    product: landing.product,
    instructions,
  });

  const ext = result.mime.includes("jpeg")
    ? "jpg"
    : result.mime.includes("webp")
      ? "webp"
      : "png";
  // Nombre nuevo en cada moldeado: así el navegador no muestra la imagen vieja.
  const file = `${newId()}.${ext}`;
  await fs.mkdir(path.join(ROOT, id, "sections"), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, id, "sections", file),
    Buffer.from(result.base64, "base64"),
  );

  await removeImage(id, block);
  block.image = file;
  await save(landing);
  return landing;
}

// Escribe (o ajusta) el HTML del bloque con IA.
export async function writeBlockHtml(
  id: string,
  bid: string,
  input: { instructions?: string; keepCurrent?: boolean },
): Promise<Landing> {
  const landing = await load(id);
  const block = landing.blocks.find((b) => b.id === bid);
  if (!block) throw new Error("Bloque no encontrado");

  block.html = await writeSectionHtml({
    product: landing.product,
    market: landing.market,
    section: block.label,
    instructions: input.instructions,
    current: input.keepCurrent ? block.html : undefined,
  });

  await save(landing);
  return landing;
}

export async function setShopifyRef(
  id: string,
  ref: ShopifyRef,
): Promise<void> {
  const landing = await getLanding(id);
  if (!landing) return;
  landing.shopify = ref;
  await save(landing);
}
