// Estructura de bloques de la landing: la misma para el preview local
// y para lo que se guarda en el metafield de Shopify.

export type Block =
  | { type: "image"; url: string }
  | { type: "html"; html: string };

export interface RenderableBlock {
  kind: "image" | "html";
  image?: string;
  html?: string;
}

// imageUrl resuelve dónde vive la imagen: local en el preview, CDN al publicar.
// Los huecos vacíos (imagen sin archivo, html sin texto) no se renderizan.
export function toBlocks<T extends RenderableBlock>(
  source: T[],
  imageUrl: (block: T, index: number) => string,
): Block[] {
  const blocks: Block[] = [];
  source.forEach((b, i) => {
    if (b.kind === "image") {
      if (b.image) blocks.push({ type: "image", url: imageUrl(b, i) });
    } else if (b.html) {
      blocks.push({ type: "html", html: b.html });
    }
  });
  return blocks;
}

export function renderBlocks(blocks: Block[]): string {
  return blocks
    .map((b) =>
      b.type === "image"
        ? `<img src="${b.url}" alt="" loading="lazy" style="display:block;width:100%;height:auto;" />`
        : b.html,
    )
    .join("\n");
}

// Página completa para el iframe de vista previa.
export function renderPreviewPage(blocks: Block[], title: string): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { margin:0; background:#fff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .ecom-landing { max-width:900px; margin:0 auto; }
</style>
</head><body>
<div class="ecom-landing">
${renderBlocks(blocks)}
</div>
</body></html>`;
}
