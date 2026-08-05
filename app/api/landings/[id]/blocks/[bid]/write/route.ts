import { NextRequest, NextResponse } from "next/server";
import { writeBlockHtml } from "@/lib/landings";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Escribe (o ajusta) el texto del bloque con IA.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; bid: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    instructions?: string;
    keepCurrent?: boolean;
  };
  try {
    return NextResponse.json(
      await writeBlockHtml(params.id, params.bid, {
        instructions: body.instructions,
        keepCurrent: body.keepCurrent ?? false,
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al escribir el texto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
