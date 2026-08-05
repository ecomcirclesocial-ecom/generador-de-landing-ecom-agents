import { NextResponse } from "next/server";
import { publishLanding } from "@/lib/shopify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await publishLanding(params.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error al publicar" },
      { status: 500 },
    );
  }
}
