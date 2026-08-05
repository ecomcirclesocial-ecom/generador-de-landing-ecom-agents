import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { getConfig, saveConfig, type Config } from "@/lib/config";

export const dynamic = "force-dynamic";

// ¿Está instalado el CLI? Es lo que decide si la suscripción sirve o no.
function cliInstalado(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("which", [bin], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function GET() {
  const [config, claude, codex] = await Promise.all([
    getConfig(),
    cliInstalado("claude"),
    cliInstalado("codex"),
  ]);
  return NextResponse.json({ config, cli: { claude, codex } });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Config>;
  const config = await saveConfig({
    mode: body.mode,
    textEngine: body.textEngine,
    imageEngine: body.imageEngine,
    promptEngine: body.promptEngine,
    geminiApiKey: body.geminiApiKey?.trim(),
    openaiApiKey: body.openaiApiKey?.trim(),
  });
  return NextResponse.json({ config });
}
