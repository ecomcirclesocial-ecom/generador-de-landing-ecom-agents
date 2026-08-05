import { NextRequest, NextResponse } from "next/server";
import { moldBlockImage } from "@/lib/landings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Regenera la imagen del bloque con IA (~1 min).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; bid: string } },
) {
  const body = (await req.json().catch(() => ({}))) as { instructions?: string };
  try {
    return NextResponse.json(
      await moldBlockImage(params.id, params.bid, body.instructions),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al moldear la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
