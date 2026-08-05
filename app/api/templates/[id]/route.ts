import { NextResponse } from "next/server";
import { deleteTemplate } from "@/lib/templates";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await deleteTemplate(params.id);
  return NextResponse.json({ ok: true });
}
