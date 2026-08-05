import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { getTemplate, templateFilePath } from "@/lib/templates";
import { moldSection, type ImageEngine, type ImageInput } from "@/lib/imagegen";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const templateId = form.get("templateId") as string | null;
  const product = (form.get("product") as string | null)?.trim() || "";
  const market = (form.get("market") as string | null)?.trim() || "";
  const instructions = (form.get("instructions") as string | null)?.trim() || "";
  // Sin "engine" en el formulario manda el motor elegido en Configuraciones.
  const engine = (form.get("engine") as string | null) as ImageEngine | null;
  const kind = form.get("kind") === "anuncio" ? ("anuncio" as const) : ("seccion" as const);
  const size = (form.get("size") as string | null)?.trim() || "original";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!templateId) {
    return NextResponse.json({ error: "Falta la plantilla" }, { status: 400 });
  }
  if (!product) {
    return NextResponse.json({ error: "Falta el nombre del producto" }, { status: 400 });
  }

  const tpl = await getTemplate(templateId);
  if (!tpl) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }

  const tplBytes = await fs.readFile(templateFilePath(tpl));
  const tplExt = tpl.file.split(".").pop()?.toLowerCase() || "png";

  const productImages: ImageInput[] = await Promise.all(
    files.map(async (f) => ({
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      mime: f.type || "image/jpeg",
    })),
  );

  try {
    const result = await moldSection({
      template: { base64: tplBytes.toString("base64"), mime: MIME[tplExt] || "image/png" },
      productImages,
      market,
      product,
      instructions,
      ...(engine ? { engine } : {}),
      kind,
      size,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al generar la sección";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
