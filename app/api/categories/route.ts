import { NextRequest, NextResponse } from "next/server";
import { listCategories, addCategory } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(req: NextRequest) {
  const { label } = await req.json();
  if (!label?.trim()) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }
  try {
    return NextResponse.json(await addCategory(label), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear la sección";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
