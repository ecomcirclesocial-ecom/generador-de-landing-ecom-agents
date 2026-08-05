import { NextRequest, NextResponse } from "next/server";
import { updateBlock, deleteBlock } from "@/lib/landings";

export const dynamic = "force-dynamic";

// Edita el bloque: texto, nombre, o llena un hueco con una imagen de la biblioteca.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; bid: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    html?: string;
    label?: string;
    templateId?: string;
  };
  try {
    return NextResponse.json(await updateBlock(params.id, params.bid, body));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al editar el bloque";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; bid: string } },
) {
  try {
    return NextResponse.json(await deleteBlock(params.id, params.bid));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al borrar el bloque";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
