import { NextResponse } from "next/server";
import { WIREFRAMES } from "@/lib/wireframes";

export async function GET() {
  return NextResponse.json(WIREFRAMES);
}
