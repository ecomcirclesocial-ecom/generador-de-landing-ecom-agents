import { NextRequest, NextResponse } from "next/server";
import { classifyImage } from "@/lib/classify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const result = await classifyImage(base64, file.type || "image/jpeg");
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al clasificar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
