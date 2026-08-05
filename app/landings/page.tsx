"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { MARKETS } from "@/lib/sections";

interface LandingSummary {
  id: string;
  name: string;
  product: string;
  market: string;
  sectionCount: number;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Landings() {
  const router = useRouter();
  const [landings, setLandings] = useState<LandingSummary[]>([]);
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [market, setMarket] = useState(MARKETS[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const res = await fetch("/api/landings");
    setLandings(await res.json());
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !product.trim())
      return setError("Falta el nombre o el producto");
    if (!files.length) return setError("Sube al menos una foto del producto");
    setCreating(true);
    setError("");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("product", product);
    fd.append("market", market);
    files.forEach((f) => fd.append("files", f));
    const res = await fetch("/api/landings", { method: "POST", body: fd });
    setCreating(false);
    if (!res.ok) {
      setError((await res.json()).error || "Error al crear");
      return;
    }
    const landing = await res.json();
    router.push(`/landings/${landing.id}`);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta landing?")) return;
    await fetch(`/api/landings/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Subir landing
      </h1>
      <p className="mt-2 text-sm text-muted">
        Crea una landing por producto, ármala sección por sección y publícala en
        Shopify.
      </p>

      {/* Crear */}
      <form onSubmit={create} className="card mt-8 space-y-5 p-4 sm:p-6">
        <h2 className="label">Nueva landing</h2>

        <div>
          <label className="label mb-2 block">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Masajeador cervical — Colombia"
            className="input"
          />
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
          <label className="label mb-2 block">Fotos reales del producto</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm text-muted file:mr-4 file:rounded-lg file:border file:border-border file:bg-card file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground/70 file:transition hover:file:bg-foreground/5 hover:file:text-foreground"
          />
          {files.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              {files.length} foto{files.length === 1 ? "" : "s"} seleccionada
              {files.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </p>
        )}

        <button type="submit" disabled={creating} className="btn-primary w-full">
          {creating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              Creando landing…
            </span>
          ) : (
            "Crear landing"
          )}
        </button>
      </form>

      {/* Lista */}
      {!loaded ? (
        <div className="mt-10 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="card h-16 animate-pulse" />
          ))}
        </div>
      ) : landings.length === 0 ? (
        <div className="card mt-10 p-4 sm:p-6">
          <p className="text-sm text-foreground">Todavía no hay landings.</p>
          <p className="mt-1 text-sm text-muted">
            Crea la primera con el formulario de arriba.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          <h2 className="label">Mis landings</h2>
          {landings.map((l) => (
            <div
              key={l.id}
              className="card flex items-center justify-between gap-4 p-4 transition hover:bg-foreground/5"
            >
              <Link href={`/landings/${l.id}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {l.name}
                  </p>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-500">
                    {l.market}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">
                  {l.product} · {l.sectionCount} sección
                  {l.sectionCount === 1 ? "" : "es"} · {formatDate(l.createdAt)}
                </p>
              </Link>
              <button
                onClick={() => remove(l.id)}
                className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-red-500/10 hover:text-red-500"
                aria-label="Eliminar landing"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
