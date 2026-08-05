import { promises as fs } from "fs";
import { getTemplate, templateFilePath } from "@/lib/templates";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const t = await getTemplate(params.id);
  if (!t) return new Response("No encontrada", { status: 404 });

  const bytes = await fs.readFile(templateFilePath(t));
  const ext = t.file.split(".").pop()?.toLowerCase() || "png";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
