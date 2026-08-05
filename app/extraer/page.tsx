"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { SECTION_CATALOG, type SectionCategory } from "@/lib/sections";

type Kind = "landing" | "anuncio";

interface Img {
  url: string;
  preview: string;
  category: SectionCategory;
  niche: string;
  name: string;
  use: boolean;
}

interface ExtractedLanding {
  id: string;
  url: string;
  createdAt: string;
  items: { templateId: string; category: SectionCategory; name: string }[];
}

const LABELS: Record<string, string> = Object.fromEntries(
  SECTION_CATALOG.map((c) => [c.id, c.label]),
);

export default function Extraer() {
  const [kind, setKind] = useState<Kind>("landing");
  const [url, setUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [imgs, setImgs] = useState<Img[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [extraidas, setExtraidas] = useState<ExtractedLanding[]>([]);

  async function loadExtraidas() {
    const res = await fetch("/api/extraidas");
    if (res.ok) setExtraidas(await res.json());
  }

  useEffect(() => {
    loadExtraidas();
  }, []);

  async function extract(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAiError("");
    setImgs([]);
    setSavedCount(0);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, kind }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al extraer");
      return;
    }
    setImgs(data.images);
    setPageUrl(data.pageUrl);
    if (data.aiError) setAiError(data.aiError);
  }

  function changeKind(k: Kind) {
    setKind(k);
    setImgs([]);
    setError("");
    setAiError("");
    setSavedCount(0);
  }

  function update(i: number, patch: Partial<Img>) {
    setImgs((prev) => prev.map((im, idx) => (idx === i ? { ...im, ...patch } : im)));
  }

  async function save() {
    const items = imgs.filter((im) => im.use);
    if (!items.length) return;
    setSaving(true);
    const res = await fetch("/api/extract/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        pageUrl,
        items: items.map((im) => ({
          url: im.url,
          category: im.category,
          niche: im.niche,
          name: im.name,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error || "Error al guardar");
      return;
    }
    const data = await res.json();
    setSavedCount(data.saved.length);
    setImgs([]);
    if (kind === "landing") loadExtraidas();
  }

  const selected = imgs.filter((im) => im.use).length;
  const esAnuncio = kind === "anuncio";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      {/* Encabezado */}
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Extraer de una página
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Pega el link de una landing o página de anuncios que te guste. Claude
        etiqueta cada imagen y la guarda donde corresponde.
      </p>

      {/* Formulario */}
      <form onSubmit={extract} className="card mt-8 p-4 sm:p-6">
        <p className="label mb-2">¿Qué vas a extraer?</p>
        <div className="grid max-w-sm grid-cols-2 gap-2">
          {(
            [
              ["landing", "Secciones de landing"],
              ["anuncio", "Anuncios"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => changeKind(k)}
              className={
                "rounded-lg border px-4 py-2 text-sm font-medium transition " +
                (kind === k
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-border bg-card text-muted hover:bg-foreground/5 hover:text-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {esAnuncio
            ? "Las imágenes se guardan en el generador de anuncios, clasificadas por nicho."
            : "Las imágenes se guardan en la biblioteca por tipo de sección y nicho, y se registra cómo estaba armada la landing."}
        </p>

        <p className="label mb-2 mt-6">
          {esAnuncio ? "URL de la página de anuncios" : "URL de la landing"}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tienda.com/producto"
            className="input"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="btn-primary flex shrink-0 items-center justify-center gap-2 px-8"
          >
            {loading && (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            )}
            {loading ? "Extrayendo…" : "Extraer"}
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </p>
        )}
      </form>

      {savedCount > 0 && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <Check size={16} strokeWidth={1.5} />
          <span>
            {savedCount} imagen{savedCount === 1 ? "" : "es"} guardada
            {savedCount === 1 ? "" : "s"} en{" "}
            <a
              href={esAnuncio ? "/anuncios" : "/biblioteca"}
              className="font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {esAnuncio ? "anuncios" : "la biblioteca"}
            </a>
            .
          </span>
        </div>
      )}

      {aiError && imgs.length > 0 && (
        <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-500">
          Claude no pudo etiquetar automáticamente ({aiError}). Las imágenes
          salen sin clasificar — etiquétalas a mano y guarda.
        </p>
      )}

      {/* Resultados */}
      {imgs.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label">
              {imgs.length} imagen{imgs.length === 1 ? "" : "es"} · {selected}{" "}
              seleccionada{selected === 1 ? "" : "s"}
            </p>
            <button
              onClick={save}
              disabled={saving || selected === 0}
              className="btn-primary flex items-center gap-2"
            >
              {saving && (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              )}
              {saving
                ? "Guardando…"
                : `Guardar ${selected} en ${esAnuncio ? "anuncios" : "la biblioteca"}`}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {imgs.map((im, i) => (
              <div
                key={im.url}
                className={`card p-4 transition ${
                  im.use ? "border-accent/30" : "opacity-50"
                }`}
              >
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.preview}
                    alt={im.name}
                    className="h-28 w-28 shrink-0 rounded-lg border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={im.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      className="input px-3 py-2"
                    />
                    <input
                      type="text"
                      value={im.niche}
                      onChange={(e) => update(i, { niche: e.target.value })}
                      placeholder="Nicho (ej. salud, hogar)"
                      className="input mt-2 px-3 py-2"
                    />
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={im.use}
                        onChange={(e) => update(i, { use: e.target.checked })}
                        className="h-3.5 w-3.5 accent-accent"
                      />
                      Guardar esta imagen
                    </label>
                  </div>
                </div>

                {/* Chips de categoría (solo en modo landing) */}
                {!esAnuncio && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SECTION_CATALOG.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => update(i, { category: c.id, use: true })}
                        className={
                          "rounded-full border px-3 py-1 text-xs transition " +
                          (im.category === c.id
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-border bg-card text-muted hover:bg-foreground/5 hover:text-foreground")
                        }
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Landings extraídas */}
      <section className="mt-12">
        <p className="label">Landings extraídas</p>
        <p className="mt-1 text-xs text-muted">
          Cómo estaba armada cada landing que extrajiste, sección por sección.
        </p>
        {extraidas.length === 0 ? (
          <div className="card mt-4 p-4 sm:p-6">
            <p className="text-sm text-muted">
              Todavía no has extraído ninguna landing. Pega una URL arriba y
              extrae la primera.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {extraidas.map((l) => (
              <div key={l.id} className="card p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-sm font-medium text-foreground hover:text-accent"
                  >
                    {l.url}
                  </a>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(l.createdAt).toLocaleDateString("es-CO")} ·{" "}
                    {l.items.length} sección{l.items.length === 1 ? "" : "es"}
                  </span>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {l.items.map((it) => (
                    <div key={it.templateId} className="w-24 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/templates/${it.templateId}/raw`}
                        alt={it.name}
                        className="aspect-[3/4] w-full rounded-lg border border-border object-cover"
                      />
                      <p className="mt-1 truncate text-center text-[10px] text-muted">
                        {LABELS[it.category] ?? it.category}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
