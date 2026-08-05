import { promises as fs } from "fs";
import { getLanding, blockFilePath } from "@/lib/landings";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string; bid: string } },
) {
  const landing = await getLanding(params.id);
  const block = landing?.blocks.find((b) => b.id === params.bid);
  if (!block?.image) return new Response("No encontrada", { status: 404 });

  const bytes = await fs.readFile(blockFilePath(params.id, block));
  const ext = block.image.split(".").pop()?.toLowerCase() || "png";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": TYPES[ext] || "image/png",
      "Cache-Control": "no-store",
    },
  });
}
