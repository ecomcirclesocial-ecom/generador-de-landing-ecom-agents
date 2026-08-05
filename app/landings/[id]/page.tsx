"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Biblioteca from "@/components/editor/Biblioteca";
import Lienzo from "@/components/editor/Lienzo";
import Preview from "@/components/editor/Preview";
import { type Dispositivo } from "@/components/editor/MarcoDispositivo";
import { pedir, type Landing, type Wireframe } from "@/components/editor/tipos";

export default function Editor() {
  const { id } = useParams<{ id: string }>();

  const [landing, setLanding] = useState<Landing | null>(null);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  // El preview de portátil necesita más ancho para leerse: la columna crece con él.
  const [dispositivo, setDispositivo] = useState<Dispositivo>("movil");

  const [publicando, setPublicando] = useState(false);
  const [publicada, setPublicada] = useState<{
    productUrl: string;
    adminUrl: string;
    updated?: boolean;
  } | null>(null);
  const [errorPublicar, setErrorPublicar] = useState("");

  // Toda mutación devuelve la Landing completa: la guardamos y recargamos el preview.
  function aplicar(l: Landing) {
    setLanding(l);
    setRecarga((k) => k + 1);
  }

  useEffect(() => {
    pedir(`/api/landings/${id}`)
      .then(setLanding)
      .catch((e) => setError(e.message));
  }, [id]);

  async function aplicarEsqueleto(w: Wireframe) {
    if (!landing) return;
    if (
      landing.blocks.length &&
      !confirm(
        `El lienzo ya tiene ${landing.blocks.length} bloques. ¿Agregar igual el esqueleto "${w.name}"?`,
      )
    )
      return;
    try {
      aplicar(
        await pedir(`/api/landings/${id}/blocks`, {
          method: "POST",
          body: JSON.stringify({ wireframe: w.id }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo aplicar el esqueleto");
    }
  }

  async function publicar() {
    setPublicando(true);
    setErrorPublicar("");
    setPublicada(null);
    const res = await fetch(`/api/landings/${id}/publish`, { method: "POST" });
    setPublicando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrorPublicar(data.error || "Error al subir a Shopify");
      return;
    }
    setPublicada(data);
    pedir(`/api/landings/${id}`).then(aplicar).catch(() => {});
  }

  if (!landing) {
    return (
      <div className="px-4 pb-16 sm:px-6">
        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            Cargando landing...
          </p>
        )}
      </div>
    );
  }

  const bloques = landing.blocks ?? [];

  return (
    <div className="px-4 pb-16 sm:px-6">
      {/* Encabezado */}
      <Link
        href="/landings"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Subir landing
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {landing.name}
        </h1>
        {landing.shopify && (
          <a
            href={landing.shopify.productUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-500 transition hover:bg-emerald-500/20"
          >
            Publicada
          </a>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        {landing.product} · {landing.market} · {bloques.length} bloque
        {bloques.length === 1 ? "" : "s"}
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </p>
      )}

      <div
        className={
          "mt-6 grid gap-4 " +
          (dispositivo === "portatil"
            ? "lg:grid-cols-[13rem_minmax(0,1fr)_30rem] xl:grid-cols-[15rem_minmax(0,22rem)_46rem]"
            : "lg:grid-cols-[13rem_minmax(0,1fr)_22rem] xl:grid-cols-[15rem_minmax(0,1fr)_28rem]")
        }
      >
        <Biblioteca onEsqueleto={aplicarEsqueleto} />

        <div className="min-w-0">
          <Lienzo landing={landing} recarga={recarga} onLanding={aplicar} />

          {/* Publicar */}
          {bloques.length > 0 && (
            <div className="card mt-6 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="label">Subir a Shopify</h2>
                {publicando && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-500">
                    En proceso
                  </span>
                )}
                {!publicando && publicada && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-500">
                    {publicada.updated ? "Actualizada" : "Publicada"}
                  </span>
                )}
                {!publicando && !publicada && errorPublicar && (
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-500">
                    Error
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-muted">
                {landing.shopify
                  ? "Ya existe el producto en tu tienda. Se va a actualizar, no se crea uno nuevo."
                  : "Se crea como página de producto en tu tienda."}
              </p>

              <button
                onClick={publicar}
                disabled={publicando}
                className="btn-primary mt-4 flex w-full items-center justify-center gap-2"
              >
                {publicando && (
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                )}
                {publicando
                  ? "Subiendo a Shopify..."
                  : landing.shopify
                    ? "Actualizar en Shopify"
                    : "Crear producto y subir a Shopify"}
              </button>

              {errorPublicar && (
                <p className="mt-3 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-500">
                  {errorPublicar}
                </p>
              )}

              {publicada && (
                <div className="mt-3 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                  <a
                    href={publicada.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-emerald-500 hover:underline"
                  >
                    <ExternalLink size={16} strokeWidth={1.5} />
                    Ver página de producto
                  </a>
                  <a
                    href={publicada.adminUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-muted transition hover:text-foreground"
                  >
                    <ExternalLink size={16} strokeWidth={1.5} />
                    Abrir en el admin
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <Preview
          landingId={landing.id}
          recarga={recarga}
          vacia={bloques.length === 0}
          dispositivo={dispositivo}
          onDispositivo={setDispositivo}
        />
      </div>
    </div>
  );
}
