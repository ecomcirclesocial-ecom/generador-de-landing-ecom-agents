import { NextRequest, NextResponse } from "next/server";
import { writeSectionHtml, type HtmlBrief } from "@/lib/copy";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Generador suelto de bloques de texto, sin landing asociada.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<HtmlBrief>;
  if (!body.product || !body.section) {
    return NextResponse.json(
      { error: "Falta el producto o la sección" },
      { status: 400 },
    );
  }
  try {
    const html = await writeSectionHtml({
      product: body.product,
      market: body.market || "",
      section: body.section,
      instructions: body.instructions,
      current: body.current,
    });
    return NextResponse.json({ html });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al escribir el texto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
