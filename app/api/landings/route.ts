import { NextRequest, NextResponse } from "next/server";
import { listLandings, createLanding } from "@/lib/landings";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listLandings());
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const name = (form.get("name") as string | null)?.trim() || "";
  const product = (form.get("product") as string | null)?.trim() || "";
  const market = (form.get("market") as string | null)?.trim() || "";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!name || !product) {
    return NextResponse.json(
      { error: "Falta el nombre o el producto" },
      { status: 400 },
    );
  }

  const photos = await Promise.all(
    files.map(async (f) => ({
      bytes: Buffer.from(await f.arrayBuffer()),
      ext: (f.name.split(".").pop() || "jpg").toLowerCase(),
    })),
  );

  const landing = await createLanding({ name, product, market, photos });
  return NextResponse.json(landing, { status: 201 });
}
