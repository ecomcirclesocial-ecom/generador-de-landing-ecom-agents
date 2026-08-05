import { NextResponse } from "next/server";
import { getLanding } from "@/lib/landings";
import { toBlocks, renderPreviewPage } from "@/lib/render";

export const dynamic = "force-dynamic";

// La landing exactamente como se va a ver publicada, para el iframe de preview.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const landing = await getLanding(params.id);
  if (!landing) {
    return new NextResponse("Landing no encontrada", { status: 404 });
  }

  const blocks = toBlocks(
    landing.blocks,
    (b) => `/api/landings/${landing.id}/blocks/${b.id}/raw`,
  );

  return new NextResponse(renderPreviewPage(blocks, landing.name), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
