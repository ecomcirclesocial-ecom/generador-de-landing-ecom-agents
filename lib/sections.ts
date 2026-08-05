// Catálogo de tipos de sección de una landing de dropshipping.
// La biblioteca de plantillas-imágenes (Fase 2) se organiza por estas categorías.

export type SectionCategory =
  | "hero"
  | "oferta"
  | "antes-despues"
  | "beneficios"
  | "comparativa"
  | "autoridad"
  | "testimonios"
  | "como-se-usa"
  | "logistica"
  | "faq"
  | "garantia"
  | "cta"
  | "anuncio";

// Categoría especial: imágenes de anuncios/publicidad.
// No aparece en SECTION_CATALOG porque no es una sección de landing.
export const AD_CATEGORY = "anuncio" as const;

// Mercados para moldear los avatares según el país.
export const MARKETS = [
  "Colombia",
  "México",
  "Perú",
  "Chile",
  "Ecuador",
  "Argentina",
  "España",
  "Estados Unidos (latino)",
];

// Nichos fijos: la IA elige UNO de esta lista al clasificar, para que el
// filtro por nicho no se llene de variantes libres ("Salud", "salud canina"...).
export const NICHES = [
  "salud",
  "belleza",
  "hogar",
  "cocina",
  "mascotas",
  "fitness",
  "tecnología",
  "bebés",
  "moda",
  "otro",
];

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function isNiche(v: string | undefined): boolean {
  if (!v) return false;
  const lc = stripAccents(v.trim().toLowerCase());
  return NICHES.some((n) => stripAccents(n) === lc);
}

// Lleva cualquier respuesta de la IA al nicho del catálogo más cercano.
export function normalizeNiche(raw: string | undefined): string {
  const lc = stripAccents((raw || "").trim().toLowerCase());
  if (!lc) return "";
  const exact = NICHES.find((n) => stripAccents(n) === lc);
  if (exact) return exact;
  const partial = NICHES.find((n) => lc.includes(stripAccents(n)));
  return partial || "otro";
}

export const SECTION_CATALOG: { id: SectionCategory; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "oferta", label: "Oferta" },
  { id: "antes-despues", label: "Antes / Después" },
  { id: "beneficios", label: "Beneficios" },
  { id: "comparativa", label: "Tabla comparativa" },
  { id: "autoridad", label: "Prueba de autoridad" },
  { id: "testimonios", label: "Testimonios" },
  { id: "como-se-usa", label: "Cómo se usa" },
  { id: "logistica", label: "Logística / Envío" },
  { id: "faq", label: "FAQ" },
  { id: "garantia", label: "Garantía" },
  { id: "cta", label: "CTA final" },
];
