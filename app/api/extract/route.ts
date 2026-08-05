import { NextRequest, NextResponse } from "next/server";
import { extractFromUrl, type ExtractKind } from "@/lib/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { url, kind } = (await req.json()) as { url?: string; kind?: string };
  const clean = (url || "").trim();
  if (!/^https?:\/\//i.test(clean)) {
    return NextResponse.json({ error: "Pega un URL válido (https://...)" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await extractFromUrl(clean, kind === "anuncio" ? "anuncio" : ("landing" as ExtractKind)),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al extraer" },
      { status: 500 },
    );
  }
}
