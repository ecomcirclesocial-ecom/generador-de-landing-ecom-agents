import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { listTemplates, templateFilePath, updateTemplate } from "@/lib/templates";
import { classifyImage } from "@/lib/classify";
import { normalizeNiche, AD_CATEGORY } from "@/lib/sections";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Por defecto: normaliza los nichos al catálogo fijo (sin IA) y clasifica con
// IA las plantillas que no tienen nicho.
// Con { categorias: true }: vuelve a clasificar la CATEGORÍA de cada plantilla
// con IA. Sirve de backfill — las extraídas de una URL quedaron todas en "hero"
// porque el etiquetado automático estaba caído.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { categorias?: boolean };
  const templates = await listTemplates();

  let normalizadas = 0;
  let clasificadas = 0;
  const cambios: string[] = [];
  const errors: string[] = [];
  for (const t of templates) {
    try {
      if (body.categorias) {
        // Las que ya están marcadas como anuncio se respetan: el backfill es
        // para las secciones de landing que quedaron todas en "hero".
        if (t.category === AD_CATEGORY) continue;
        const bytes = await fs.readFile(templateFilePath(t));
        const ext = t.file.split(".").pop()?.toLowerCase() || "png";
        const result = await classifyImage(
          bytes.toString("base64"),
          MIME[ext] || "image/png",
          true,
        );
        await updateTemplate(t.id, {
          category: result.category,
          niche: result.niche || t.niche,
        });
        clasificadas++;
        if (result.category !== t.category) {
          cambios.push(`${t.name}: ${t.category} → ${result.category}`);
        }
        continue;
      }
      if (t.niche) {
        const norm = normalizeNiche(t.niche);
        if (norm !== t.niche) {
          await updateTemplate(t.id, { niche: norm });
          normalizadas++;
        }
        continue;
      }
      const bytes = await fs.readFile(templateFilePath(t));
      const ext = t.file.split(".").pop()?.toLowerCase() || "png";
      const result = await classifyImage(
        bytes.toString("base64"),
        MIME[ext] || "image/png",
      );
      if (result.niche) {
        await updateTemplate(t.id, { niche: result.niche });
        clasificadas++;
      }
    } catch (e) {
      errors.push(`${t.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return NextResponse.json({
    total: templates.length,
    normalizadas,
    clasificadas,
    cambios,
    errores: errors,
  });
}
