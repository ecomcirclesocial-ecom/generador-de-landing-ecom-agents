import type { DragEvent } from "react";

export type BlockKind = "image" | "html";

export interface LandingBlock {
  id: string;
  kind: BlockKind;
  label: string;
  image?: string;
  templateId?: string;
  category?: string;
  html?: string;
}

export interface ShopifyRef {
  productId: string;
  handle: string;
  productUrl: string;
  adminUrl: string;
  publishedAt: string;
}

export interface Landing {
  id: string;
  name: string;
  product: string;
  market: string;
  productPhotos: string[];
  blocks: LandingBlock[];
  shopify?: ShopifyRef;
  createdAt: string;
}

export interface Wireframe {
  id: string;
  name: string;
  description: string;
  blocks: { kind: BlockKind; label: string }[];
}

export interface Plantilla {
  id: string;
  category: string;
  name: string;
  niche?: string;
}

export interface Categoria {
  id: string;
  label: string;
}

// Lo que se está arrastrando ahora mismo. El evento `dragover` no deja leer
// dataTransfer, así que guardamos el payload aquí para decidir el resaltado.
export type Arrastre =
  | { tipo: "plantilla"; templateId: string }
  | { tipo: "nuevo"; kind: BlockKind }
  | { tipo: "bloque"; id: string };

export const drag: { actual: Arrastre | null } = { actual: null };

export function iniciarArrastre(e: DragEvent, a: Arrastre) {
  drag.actual = a;
  e.dataTransfer.effectAllowed = "copyMove";
  e.dataTransfer.setData("text/plain", JSON.stringify(a));
}

export async function pedir(url: string, init?: RequestInit): Promise<Landing> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ocurrió un error");
  return data as Landing;
}
