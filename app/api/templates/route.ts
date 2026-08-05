import { NextRequest, NextResponse } from "next/server";
import { listTemplates, addTemplate, isValidCategory } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listTemplates());
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const category = form.get("category") as string | null;
  const name = (form.get("name") as string | null)?.trim() || "";
  const niche = (form.get("niche") as string | null)?.trim() || "";

  if (!file || !category) {
    return NextResponse.json({ error: "Falta la imagen o la categoría" }, { status: 400 });
  }
  if (!(await isValidCategory(category))) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const tpl = await addTemplate({
    category,
    name: name || file.name,
    niche,
    ext,
    bytes,
  });
  return NextResponse.json(tpl, { status: 201 });
}
