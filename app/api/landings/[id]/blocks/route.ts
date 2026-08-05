import { NextRequest, NextResponse } from "next/server";
import { addBlock, applyWireframe, reorderBlocks } from "@/lib/landings";

export const dynamic = "force-dynamic";

// Inserta un bloque (imagen de plantilla, hueco vacío o texto) o un esqueleto entero.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    kind?: "image" | "html";
    templateId?: string;
    label?: string;
    html?: string;
    wireframe?: string;
    index?: number;
  };

  try {
    if (body.wireframe) {
      return NextResponse.json(
        await applyWireframe(params.id, body.wireframe, body.index),
      );
    }
    if (body.kind !== "image" && body.kind !== "html") {
      return NextResponse.json({ error: "Falta el tipo de bloque" }, { status: 400 });
    }
    const landing =
      body.kind === "image"
        ? await addBlock(params.id, {
            kind: "image",
            templateId: body.templateId,
            label: body.label,
            index: body.index,
          })
        : await addBlock(params.id, {
            kind: "html",
            html: body.html,
            label: body.label,
            index: body.index,
          });
    return NextResponse.json(landing);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al agregar el bloque";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Reordena los bloques.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as { orderedIds?: string[] };
  if (!Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: "Falta el orden" }, { status: 400 });
  }
  try {
    return NextResponse.json(await reorderBlocks(params.id, body.orderedIds));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al reordenar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
