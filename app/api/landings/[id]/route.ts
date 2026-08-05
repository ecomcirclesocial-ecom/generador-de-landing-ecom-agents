import { NextResponse } from "next/server";
import { getLanding, deleteLanding } from "@/lib/landings";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const landing = await getLanding(params.id);
  if (!landing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json(landing);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await deleteLanding(params.id);
  return NextResponse.json({ ok: true });
}
