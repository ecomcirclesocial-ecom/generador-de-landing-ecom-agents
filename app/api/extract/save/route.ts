import { NextRequest, NextResponse } from "next/server";
import { addTemplate } from "@/lib/templates";
import { addExtracted } from "@/lib/extraidas";
import { SECTION_CATALOG, AD_CATEGORY, type SectionCategory } from "@/lib/sections";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface Item {
  url: string;
  category: string;
  niche?: string;
  name: string;
}

export async function POST(req: NextRequest) {
  const { items, kind, pageUrl } = (await req.json()) as {
    items?: Item[];
    kind?: string;
    pageUrl?: string;
  };
  if (!items?.length) {
    return NextResponse.json({ error: "No hay imágenes para guardar" }, { status: 400 });
  }

  const esAnuncio = kind === "anuncio";
  const valid = new Set<string>(SECTION_CATALOG.map((c) => c.id));
  const saved = [];
  for (const it of items) {
    const category = esAnuncio ? AD_CATEGORY : it.category;
    if (!esAnuncio && !valid.has(category)) continue;
    const res = await fetch(it.url, { headers: { "User-Agent": UA } });
    if (!res.ok) continue;
    const bytes = Buffer.from(await res.arrayBuffer());
    const ext = (new URL(it.url).pathname.split(".").pop() || "jpg").toLowerCase();
    saved.push(
      await addTemplate({
        category: category as SectionCategory,
        name: it.name?.trim() || (esAnuncio ? "Anuncio extraído" : "Sección extraída"),
        niche: it.niche,
        ext,
        bytes,
      }),
    );
  }

  // En modo landing guardamos también cómo estaba armada: URL + secciones en orden.
  if (!esAnuncio && pageUrl && saved.length) {
    await addExtracted({
      url: pageUrl,
      items: saved.map((t) => ({ templateId: t.id, category: t.category, name: t.name })),
    });
  }

  return NextResponse.json({ saved }, { status: 201 });
}
