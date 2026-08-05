import { NextResponse } from "next/server";
import { listExtracted } from "@/lib/extraidas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listExtracted());
}
