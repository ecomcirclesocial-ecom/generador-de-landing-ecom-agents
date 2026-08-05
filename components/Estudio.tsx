"use client";

// Estudio: galería de plantillas + generación en una sola pantalla.
// Izquierda: galería (punto de entrada). Derecha: panel de generación sticky.
// Subir plantilla es un modal secundario con clasificación automática por IA.
// mode "seccion" → secciones de landing (con categorías y copy).
// mode "anuncio" → anuncios publicitarios (categoría fija, solo imagen).

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { SECTION_CATALOG, MARKETS, AD_CATEGORY } from "@/lib/sections";

interface Template {
  id: string;
  category: string;
  name: string;
  niche?: string;
  file: string;
  createdAt: string;
}

interface Category {
  id: string;
  label: string;
}

// Convierte dimensiones en la relación de aspecto conocida más cercana (9:16,
// 1:1...) para que sea fácil de leer; si no se parece a ninguna, muestra píxeles.
const RATIOS: [string, number][] = [
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["3:4", 3 / 4],
  ["2:3", 2 / 3],
  ["9:16", 9 / 16],
  ["1:2", 1 / 2],
  ["5:4", 5 / 4],
  ["4:3", 4 / 3],
  ["3:2", 3 / 2],
  ["16:9", 16 / 9],
];

function ratioLabel(w: number, h: number): string {
  if (!w || !h) return "";
  const r = w / h;
  let best: [string, number] = RATIOS[0];
  for (const cand of RATIOS)
    if (Math.abs(cand[1] - r) < Math.abs(best[1] - r)) best = cand;
  return Math.abs(best[1] - r) / best[1] <= 0.04 ? best[0] : `${w}×${h}`;
}

const CHIP_ACTIVE =
  "rounded-lg border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent";
const CHIP_IDLE =
  "rounded-lg border border-border bg-card px-4 py-1.5 text-sm text-muted transition hover:bg-foreground/5 hover:text-foreground";
const CHIP_DASHED =
  "inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-foreground";
const ERROR_CLS =
  "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500";

export default function Estudio({ mode }: { mode: "seccion" | "anuncio" }) {
  const esAnuncio = mode === "anuncio";

  // Biblioteca
  const [templates, setTemplates] = useState<Template[]>([]);
  const [catalog, setCatalog] = useState<Category[]>(SECTION_CATALOG);
  const [filter, setFilter] = useState<"todas" | string>("todas");
  const [nicheFilter, setNicheFilter] = useState<"todos" | string>("todos");
  const [sectionModal, setSectionModal] = useState<null | "filter" | "upload">(null);
  const [sectionName, setSectionName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ src: string; alt: string } | null>(null);
  const [dims, setDims] = useState<Record<string, string>>({});

  // Subida (modal)
  const [showUpload, setShowUpload] = useState(false);
  const [category, setCategory] = useState<string>(
    esAnuncio ? AD_CATEGORY : "hero",
  );
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [ai, setAi] = useState<{ status: "loading" | "done" | "error"; text: string } | null>(null);
  const aiSeq = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Generación
  const [product, setProduct] = useState("");
  const [market, setMarket] = useState(MARKETS[0]);
  const [angle, setAngle] = useState("");
  const [size, setSize] = useState("original");
  const photoInput = useRef<HTMLInputElement>(null);
  const photoSlot = useRef(0);
  const [photos, setPhotos] = useState<({ file: File; url: string } | null)[]>([
    null,
    null,
    null,
  ]);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [image, setImage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const labels: Record<string, string> = Object.fromEntries(
    catalog.map((c) => [c.id, c.label]),
  );

  async function load() {
    const res = await fetch("/api/templates");
    setTemplates(await res.json());
    setLoaded(true);
    try {
      const cats = await fetch("/api/categories");
      if (cats.ok) setCatalog(await cats.json());
    } catch {
      // sin categorías personalizadas, seguimos con el catálogo base
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Crear un tipo de sección nuevo y dejarlo activo donde se pidió.
  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    const label = sectionName.trim();
    if (!label) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) return;
    const cat: Category = await res.json();
    setCatalog((prev) =>
      prev.some((c) => c.id === cat.id) ? prev : [...prev, cat],
    );
    if (sectionModal === "filter") setFilter(cat.id);
    else setCategory(cat.id);
    setSectionModal(null);
    setSectionName("");
  }

  // La IA clasifica la imagen apenas se elige: tipo de sección (o anuncio),
  // nicho y nombre sugerido. Es una sugerencia — los chips y el nombre se
  // pueden cambiar antes de guardar. Si falla, el flujo manual sigue igual.
  async function onFileChange(f: File | null) {
    setFile(f);
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : "";
    });
    const seq = ++aiSeq.current;
    if (!f) {
      setAi(null);
      return;
    }
    setAi({ status: "loading", text: "Clasificando con IA..." });
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/classify", { method: "POST", body: fd });
      const data = await res.json();
      if (seq !== aiSeq.current) return;
      if (!res.ok) throw new Error(data.error);
      const cat = data.category as string;
      const aiNiche = (data.niche as string) || "";
      const suggested = (data.name as string) || "";
      const esCatAnuncio = cat === AD_CATEGORY;
      const label = esCatAnuncio ? "Anuncio" : (labels[cat] ?? cat);

      if (!esAnuncio && !esCatAnuncio) setCategory(cat);
      if (suggested) setName((prev) => prev || suggested);
      if (aiNiche) setNiche((prev) => prev || aiNiche);

      const nicho = aiNiche ? ` · nicho: ${aiNiche}` : "";
      let text: string;
      if (!esAnuncio && esCatAnuncio) {
        text = `IA: esto parece un anuncio, no una sección de landing${nicho}. Puedes guardarlo mejor en Anuncios.`;
      } else if (esAnuncio && !esCatAnuncio) {
        text = `IA: esto parece una sección "${label}", no un anuncio${nicho}. Puedes guardarlo mejor en el Generador de landing.`;
      } else {
        text = `IA: ${label}${nicho} — ajusta la categoría o el nombre si no coincide.`;
      }
      setAi({ status: "done", text });
    } catch {
      if (seq !== aiSeq.current) return;
      setAi({ status: "error", text: "La IA no pudo clasificar la imagen — etiquétala manual." });
    }
  }

  function resetUpload() {
    setName("");
    setNiche("");
    setFile(null);
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setAi(null);
    setUploadError("");
    aiSeq.current++;
  }

  function setPhoto(i: number, f: File | null) {
    setPhotos((prev) => {
      const next = [...prev];
      const old = next[i];
      if (old) URL.revokeObjectURL(old.url);
      next[i] = f ? { file: f, url: URL.createObjectURL(f) } : null;
      return next;
    });
  }

  // Soltar imágenes en un slot: la primera va al slot destino y las demás
  // se reparten en los slots vacíos siguientes.
  function dropPhotos(i: number, dropped: FileList) {
    const imgs = Array.from(dropped).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      const place = (idx: number, f: File) => {
        const old = next[idx];
        if (old) URL.revokeObjectURL(old.url);
        next[idx] = { file: f, url: URL.createObjectURL(f) };
      };
      place(i, imgs[0]);
      let cursor = 0;
      for (const f of imgs.slice(1)) {
        while (cursor < next.length && (next[cursor] || cursor === i)) cursor++;
        if (cursor >= next.length) break;
        place(cursor, f);
      }
      return next;
    });
  }

  function closeUpload() {
    setShowUpload(false);
    resetUpload();
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError("Elige una imagen");
      return;
    }
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    fd.append("name", name);
    fd.append("niche", niche);
    const res = await fetch("/api/templates", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      setUploadError((await res.json()).error || "Error al subir");
      return;
    }
    if (!esAnuncio) setFilter(category);
    closeUpload();
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (selected === id) setSelected(null);
    setConfirmDelete(null);
    load();
  }

  function select(id: string) {
    const next = selected === id ? null : id;
    setSelected(next);
    // En pantallas angostas el panel queda abajo — llevarlo a la vista.
    if (next && window.innerWidth < 1024)
      setTimeout(
        () => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50,
      );
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    const files = photos.filter((p): p is { file: File; url: string } => !!p);
    if (!selected) return setGenError("Selecciona una plantilla de la galería");
    if (!product.trim()) return setGenError("Escribe el nombre del producto");
    if (!files.length) return setGenError("Sube al menos una foto del producto");

    setLoading(true);
    setImage("");

    try {
      const fd = new FormData();
      fd.append("templateId", selected);
      fd.append("product", product);
      fd.append("market", market);
      fd.append("instructions", angle);
      fd.append("kind", mode);
      fd.append("size", size);
      files.forEach((p) => fd.append("files", p.file));

      const r = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al generar la imagen");
      setImage(`data:${data.mime};base64,${data.base64}`);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const propios = templates.filter((t) =>
    esAnuncio ? t.category === AD_CATEGORY : t.category !== AD_CATEGORY,
  );
  // Nichos presentes en la biblioteca de este modo (los asigna la IA al subir).
  const niches = [...new Set(propios.map((t) => t.niche).filter((n): n is string => !!n))].sort();
  const galleryItems = propios.filter(
    (t) =>
      (esAnuncio || filter === "todas" || t.category === filter) &&
      (nicheFilter === "todos" || t.niche === nicheFilter),
  );
  const selectedTpl = templates.find((t) => t.id === selected);

  return (
    <div className="w-full px-6 sm:px-10">
      {/* Encabezado compacto */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-accent">Herramienta interna · Ecom Circle</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
            {esAnuncio ? "Generador de anuncios" : "Generador de landing"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {esAnuncio
              ? "Selecciona una referencia y genera el anuncio con tu producto."
              : "Selecciona una plantilla y genera la sección con tu producto."}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Upload size={16} strokeWidth={1.5} />
          {esAnuncio ? "Subir referencia" : "Subir plantilla"}
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Columna izquierda: galería */}
        <div className="min-w-0 flex-1">
          {!esAnuncio && (
            <div className="flex flex-wrap gap-2">
              {[{ id: "todas" as const, label: "Todas" }, ...catalog].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilter(c.id)}
                  className={filter === c.id ? CHIP_ACTIVE : CHIP_IDLE}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSectionModal("filter")}
                className={CHIP_DASHED}
              >
                <Plus size={16} strokeWidth={1.5} />
                Nueva sección
              </button>
            </div>
          )}

          {niches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="label mr-1">Nicho</span>
              {["todos", ...niches].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNicheFilter(n)}
                  className={
                    nicheFilter === n
                      ? "rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent"
                      : "rounded-full border border-border bg-card px-3 py-1 text-xs text-muted transition hover:bg-foreground/5 hover:text-foreground"
                  }
                >
                  {n === "todos" ? "Todos" : n}
                </button>
              ))}
            </div>
          )}

          <h3 className="label mt-6">
            {esAnuncio
              ? "Referencias guardadas"
              : filter === "todas"
                ? "Todas las plantillas"
                : labels[filter]}{" "}
            <span className="text-muted/70">({galleryItems.length})</span>
          </h3>

          {!loaded ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-2xl border border-border bg-foreground/5"
                />
              ))}
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="card mt-4 p-4 sm:p-6">
              <p className="text-sm leading-relaxed text-muted">
                {esAnuncio
                  ? "Aún no hay referencias guardadas."
                  : "Aún no hay plantillas de este tipo."}
              </p>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="btn-secondary mt-4 inline-flex items-center gap-2"
              >
                <Upload size={16} strokeWidth={1.5} />
                {esAnuncio ? "Subir la primera referencia" : "Subir la primera plantilla"}
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {galleryItems.map((t) => (
                <div
                  key={t.id}
                  className={`card group relative overflow-hidden ${
                    selected === t.id
                      ? "border-accent/50 ring-1 ring-accent"
                      : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/templates/${t.id}/raw`}
                    alt={t.name}
                    onClick={() => select(t.id)}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      setDims((prev) =>
                        prev[t.id]
                          ? prev
                          : {
                              ...prev,
                              [t.id]: ratioLabel(el.naturalWidth, el.naturalHeight),
                            },
                      );
                    }}
                    className="aspect-[3/4] w-full cursor-pointer object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span
                      className="min-w-0 text-[11px] leading-snug text-muted"
                      title={[
                        esAnuncio ? "Anuncio" : (labels[t.category] ?? t.category),
                        t.niche,
                        dims[t.id],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <span className="block truncate">
                        {esAnuncio ? "Anuncio" : (labels[t.category] ?? t.category)}
                        {t.niche ? ` · ${t.niche}` : ""}
                      </span>
                      {dims[t.id] && (
                        <span className="block text-muted/60">{dims[t.id]}</span>
                      )}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          setViewing({
                            src: `/api/templates/${t.id}/raw`,
                            alt: t.name,
                          })
                        }
                        className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted transition hover:bg-foreground/5 hover:text-foreground"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="rounded-lg p-1.5 text-muted transition hover:text-red-500"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: panel de generación siempre visible */}
        <div
          ref={panelRef}
          className="w-full scroll-mt-24 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:w-96 lg:shrink-0 lg:overflow-y-auto"
        >
          <form
            onSubmit={generate}
            className={
              "card space-y-5 p-4 sm:p-6" +
              (loading ? " pointer-events-none opacity-60 transition" : "")
            }
          >
            <div>
              <h2 className="label text-accent">
                {esAnuncio ? "Generar anuncio" : "Generar sección"}
              </h2>
              {selectedTpl ? (
                <div className="mt-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/templates/${selectedTpl.id}/raw`}
                    alt={selectedTpl.name}
                    className="h-14 w-11 rounded-lg border border-border object-cover"
                  />
                  <p className="min-w-0 flex-1 truncate text-xs text-muted">
                    Usando:{" "}
                    {[
                      esAnuncio
                        ? "Anuncio"
                        : (labels[selectedTpl.category] ?? selectedTpl.category),
                      selectedTpl.niche,
                      dims[selectedTpl.id],
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="shrink-0 rounded-lg p-1 text-muted transition hover:text-foreground"
                    aria-label="Quitar selección"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                  <div className="h-14 w-11 shrink-0 rounded-lg bg-foreground/5" />
                  <p className="text-xs leading-relaxed text-muted">
                    {esAnuncio
                      ? "Haz clic en una referencia de la galería para empezar."
                      : "Haz clic en una plantilla de la galería para empezar."}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="label mb-2 block">Producto</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Ej. Masajeador cervical eléctrico"
                className="input"
              />
            </div>

            <div>
              <label className="label mb-2 block">Mercado</label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="input"
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-2 block">
                Ángulo de venta / indicaciones (opcional)
              </label>
              <textarea
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                rows={3}
                placeholder="Ej. Alivia dolor de cuello en 15 min. Colores cálidos. Público 35-55."
                className="input"
              />
            </div>

            <div>
              <label className="label mb-2 block">
                Fotos del producto{" "}
                <span className="font-normal normal-case tracking-normal text-muted/70">
                  (1 a 3)
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(i);
                    }}
                    onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      dropPhotos(i, e.dataTransfer.files);
                    }}
                  >
                    {p ? (
                      <div
                        className={`group relative aspect-[3/4] overflow-hidden rounded-xl border ${
                          dragOver === i
                            ? "border-accent/50 ring-1 ring-accent"
                            : "border-border"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={`Foto ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPhoto(i, null)}
                          className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-foreground opacity-0 transition group-hover:opacity-100"
                          aria-label={`Quitar foto ${i + 1}`}
                        >
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          photoSlot.current = i;
                          photoInput.current?.click();
                        }}
                        className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition ${
                          dragOver === i
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted hover:border-accent/50 hover:text-foreground"
                        }`}
                      >
                        <Plus size={16} strokeWidth={1.5} />
                        <span className="text-[10px]">Imagen {i + 1}</span>
                        <span className="text-[10px] text-muted/60">
                          o arrastra aquí
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(photoSlot.current, f);
                  e.target.value = "";
                }}
              />
            </div>

            <div>
              <label className="label mb-2 block">Tamaño de salida</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="input"
              >
                <option value="original">Tamaño original de la plantilla</option>
                <option value="1:1">Cuadrado (1:1)</option>
                <option value="4:5">Vertical feed (4:5)</option>
                <option value="9:16">Vertical historias (9:16)</option>
                <option value="16:9">Horizontal (16:9)</option>
              </select>
            </div>

            {genError && <p className={ERROR_CLS}>{genError}</p>}

            <button
              type="submit"
              disabled={loading || !selected}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3"
            >
              {loading && (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              )}
              {loading
                ? "Generando..."
                : esAnuncio
                  ? "Generar anuncio"
                  : "Generar sección"}
            </button>
            {loading && (
              <p className="text-xs text-muted">Puede tardar hasta ~1 min.</p>
            )}

            {/* Resultado dentro del mismo panel */}
            {image && (
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="label text-accent">
                    {esAnuncio ? "Anuncio generado" : "Imagen de la sección"}
                  </h2>
                  <a
                    href={image}
                    download={esAnuncio ? "anuncio.png" : "seccion.png"}
                    className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
                  >
                    <Download size={16} strokeWidth={1.5} />
                    Descargar
                  </a>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt="Resultado"
                  onClick={() => setViewing({ src: image, alt: "Resultado" })}
                  className="mt-3 w-full cursor-pointer rounded-lg border border-border"
                />
              </div>
            )}

          </form>
        </div>
      </div>

      {/* Modal: subir plantilla / referencia */}
      {showUpload && (
        <div
          onClick={closeUpload}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
        >
          <form
            onSubmit={upload}
            onClick={(e) => e.stopPropagation()}
            className="card max-h-full w-full max-w-lg overflow-y-auto bg-card p-4 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="label text-accent">
                {esAnuncio ? "Subir referencia" : "Subir plantilla"}
              </h2>
              <button
                type="button"
                onClick={closeUpload}
                className="rounded-lg p-1 text-muted transition hover:text-foreground"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <label className="label mb-2 mt-6 block">Imagen</label>
            <input
              id="file"
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-foreground/10 file:px-4 file:py-2 file:text-sm file:text-foreground hover:file:bg-foreground/15"
            />

            {filePreview && (
              <div className="mt-4 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filePreview}
                  alt="Vista previa"
                  className="h-28 w-20 shrink-0 rounded-lg border border-border object-cover"
                />
                {ai && (
                  <p
                    className={
                      "flex items-start gap-2 text-xs leading-relaxed " +
                      (ai.status === "error" ? "text-muted" : "text-accent")
                    }
                  >
                    {ai.status === "loading" && (
                      <Loader2
                        size={16}
                        strokeWidth={1.5}
                        className="mt-0.5 shrink-0 animate-spin"
                      />
                    )}
                    <span>{ai.text}</span>
                  </p>
                )}
              </div>
            )}

            {!esAnuncio && (
              <>
                <label className="label mb-2 mt-6 block">Tipo de sección</label>
                <div className="flex flex-wrap gap-2">
                  {catalog.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={category === c.id ? CHIP_ACTIVE : CHIP_IDLE}
                    >
                      {c.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSectionModal("upload")}
                    className={CHIP_DASHED}
                  >
                    <Plus size={16} strokeWidth={1.5} />
                    Nueva sección
                  </button>
                </div>
              </>
            )}

            <label className="label mb-2 mt-6 block">Nombre (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                esAnuncio
                  ? "Ej. Anuncio testimonial fondo blanco"
                  : "Ej. Hero limpio fondo blanco"
              }
              className="input"
            />

            <label className="label mb-2 mt-6 block">Nicho (opcional)</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ej. salud, hogar, mascotas"
              className="input"
            />

            {uploadError && <p className={"mt-4 " + ERROR_CLS}>{uploadError}</p>}

            <button
              type="submit"
              disabled={uploading}
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3"
            >
              {uploading && (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              )}
              {uploading ? "Subiendo..." : "Guardar en la biblioteca"}
            </button>
          </form>
        </div>
      )}

      {/* Popup: confirmar eliminación */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-sm bg-card p-4 sm:p-6"
          >
            <h2 className="label text-accent">Eliminar imagen</h2>
            <p className="mt-3 text-sm text-muted">
              ¿Seguro que quieres eliminar esta imagen? No se puede deshacer.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => remove(confirmDelete)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/20 active:scale-[0.98]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup: nueva sección */}
      {sectionModal && (
        <div
          onClick={() => {
            setSectionModal(null);
            setSectionName("");
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
        >
          <form
            onSubmit={createSection}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-sm bg-card p-4 sm:p-6"
          >
            <h2 className="label text-accent">Nueva sección</h2>
            <input
              type="text"
              autoFocus
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Ej. Unboxing"
              className="input mt-4"
            />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSectionModal(null);
                  setSectionName("");
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!sectionName.trim()}
                className="btn-primary"
              >
                Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visor de imagen */}
      {viewing && (
        <div
          onClick={() => setViewing(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
        >
          <div className="max-h-full max-w-4xl overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.src} alt={viewing.alt} className="w-full rounded-2xl" />
          </div>
          <button
            onClick={() => setViewing(null)}
            className="btn-secondary absolute right-6 top-6 inline-flex items-center px-3 py-1.5"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
