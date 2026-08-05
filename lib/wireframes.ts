// Esqueletos de landing: crean todos los bloques con sus huecos vacíos,
// para luego soltar imágenes de la biblioteca en cada hueco.

export type WireframeBlockKind = "image" | "html";

export interface Wireframe {
  id: string;
  name: string;
  description: string;
  blocks: { kind: WireframeBlockKind; label: string }[];
}

export const WIREFRAMES: Wireframe[] = [
  {
    id: "clasica",
    name: "Clásica",
    description:
      "La estructura completa de dropshipping: presenta, convence y cierra.",
    blocks: [
      { kind: "image", label: "Hero" },
      { kind: "html", label: "Texto de apertura" },
      { kind: "image", label: "Beneficios" },
      { kind: "image", label: "Cómo se usa" },
      { kind: "image", label: "Antes y después" },
      { kind: "image", label: "Testimonios" },
      { kind: "image", label: "Comparativa" },
      { kind: "image", label: "Oferta" },
      { kind: "html", label: "Garantía" },
      { kind: "html", label: "Preguntas frecuentes" },
      { kind: "html", label: "Cierre" },
    ],
  },
  {
    id: "corta",
    name: "Corta / oferta directa",
    description: "Pocos bloques, al grano. Para tráfico frío que ya sabe qué quiere.",
    blocks: [
      { kind: "image", label: "Hero" },
      { kind: "image", label: "Oferta" },
      { kind: "image", label: "Beneficios" },
      { kind: "image", label: "Testimonios" },
      { kind: "html", label: "Cierre" },
    ],
  },
  {
    id: "educativa",
    name: "Educativa",
    description:
      "Plantea el problema antes de vender. Para productos que hay que explicar.",
    blocks: [
      { kind: "image", label: "Hero" },
      { kind: "html", label: "El problema" },
      { kind: "image", label: "La solución" },
      { kind: "image", label: "Cómo se usa" },
      { kind: "image", label: "Beneficios" },
      { kind: "image", label: "Testimonios" },
      { kind: "image", label: "Oferta" },
      { kind: "html", label: "Preguntas frecuentes" },
    ],
  },
];

export function getWireframe(id: string): Wireframe | undefined {
  return WIREFRAMES.find((w) => w.id === id);
}
