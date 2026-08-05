"use client";

import { useEffect, useState } from "react";
import {
  GripVertical,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  drag,
  iniciarArrastre,
  pedir,
  type Landing,
  type LandingBlock,
} from "./tipos";

export default function BloqueLienzo({
  landingId,
  bloque,
  indice,
  recarga,
  onLanding,
}: {
  landingId: string;
  bloque: LandingBlock;
  indice: number;
  recarga: number;
  onLanding: (l: Landing) => void;
}) {
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState(bloque.html ?? "");
  const [pista, setPista] = useState("");
  const [panelIA, setPanelIA] = useState(false);
  const [reemplazando, setReemplazando] = useState(false);
  const [sobre, setSobre] = useState(false);

  // Si el servidor devuelve otro HTML (lo escribió la IA), refrescamos el borrador.
  useEffect(() => setBorrador(bloque.html ?? ""), [bloque.html]);

  const base = `/api/landings/${landingId}/blocks/${bloque.id}`;

  async function accion(nombre: string, url: string, init?: RequestInit) {
    setOcupado(nombre);
    setError("");
    try {
      onLanding(await pedir(url, init));
      setPanelIA(false);
      setPista("");
      setReemplazando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado("");
    }
  }

  const eliminar = () =>
    confirm("¿Eliminar este bloque?") &&
    accion("eliminar", base, { method: "DELETE" });

  const llenar = (templateId: string) =>
    accion("llenar", base, {
      method: "PATCH",
      body: JSON.stringify({ templateId }),
    });

  const moldear = () =>
    accion("moldear", `${base}/mold`, {
      method: "POST",
      body: JSON.stringify({ instructions: pista }),
    });

  const escribir = (keepCurrent: boolean) =>
    accion("escribir", `${base}/write`, {
      method: "POST",
      body: JSON.stringify({ instructions: pista, keepCurrent }),
    });

  const guardar = () =>
    accion("guardar", base, {
      method: "PATCH",
      body: JSON.stringify({ html: borrador }),
    });

  const hueco = bloque.kind === "image" && (!bloque.image || reemplazando);

  return (
    <div className="card relative p-3">
      {ocupado === "moldear" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-background/80 backdrop-blur-sm">
          <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-accent" />
          <p className="text-xs text-foreground/80">Moldeando con IA...</p>
          <p className="text-[10px] text-muted">Puede tardar ~1 min</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span
          draggable
          onDragStart={(e) => iniciarArrastre(e, { tipo: "bloque", id: bloque.id })}
          onDragEnd={() => (drag.actual = null)}
          title="Arrastra para reordenar"
          className="cursor-grab text-muted transition hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical size={16} strokeWidth={1.5} />
        </span>
        <span className="text-[10px] text-muted/70">{indice + 1}</span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {bloque.label}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-muted">
          {bloque.kind === "html" ? "Texto" : "Imagen"}
        </span>
        <button
          type="button"
          onClick={eliminar}
          disabled={!!ocupado}
          className="rounded-md p-1.5 text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
          aria-label="Eliminar bloque"
        >
          {ocupado === "eliminar" ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Trash2 size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {hueco && (
        <div
          onDragOver={(e) => {
            if (drag.actual?.tipo !== "plantilla") return;
            e.preventDefault();
            e.stopPropagation();
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => {
            const a = drag.actual;
            if (a?.tipo !== "plantilla") return;
            e.preventDefault();
            e.stopPropagation();
            drag.actual = null;
            setSobre(false);
            llenar(a.templateId);
          }}
          className={
            "mt-2 flex min-h-[88px] items-center justify-center rounded-xl border border-dashed px-3 text-center transition " +
            (sobre ? "border-accent bg-accent/10" : "border-border bg-foreground/[0.03]")
          }
        >
          {ocupado === "llenar" ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-accent" />
          ) : (
            <p className="text-xs text-muted">
              Suelta aquí la imagen de {bloque.label}
              {reemplazando && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setReemplazando(false)}
                    className="text-accent hover:underline"
                  >
                    cancelar
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {bloque.kind === "image" && bloque.image && !reemplazando && (
        <div className="mt-2 flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}/raw?v=${recarga}`}
            alt={bloque.label}
            className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPanelIA((v) => !v)}
                disabled={!!ocupado}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/70 transition hover:text-foreground disabled:opacity-40"
              >
                <Wand2 size={13} strokeWidth={1.5} />
                Moldear con IA
              </button>
              <button
                type="button"
                onClick={() => setReemplazando(true)}
                disabled={!!ocupado}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/70 transition hover:text-foreground disabled:opacity-40"
              >
                <RefreshCw size={13} strokeWidth={1.5} />
                Reemplazar
              </button>
            </div>

            {panelIA && (
              <div className="flex gap-1.5">
                <input
                  value={pista}
                  onChange={(e) => setPista(e.target.value)}
                  placeholder="Qué cambiar (opcional)"
                  className="input px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={moldear}
                  className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                >
                  Moldear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {bloque.kind === "html" && (
        <div className="mt-2">
          <textarea
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            spellCheck={false}
            placeholder="Escribe el HTML del bloque o pídeselo a la IA"
            className="input min-h-[110px] resize-y font-mono text-xs leading-relaxed"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <input
              value={pista}
              onChange={(e) => setPista(e.target.value)}
              placeholder="Indicaciones para la IA (opcional)"
              className="input min-w-[140px] flex-1 px-3 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => escribir(!!bloque.html)}
              disabled={!!ocupado}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/70 transition hover:text-foreground disabled:opacity-40"
            >
              {ocupado === "escribir" ? (
                <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Sparkles size={13} strokeWidth={1.5} />
              )}
              {bloque.html ? "Reescribir" : "Escribir con IA"}
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={!!ocupado || borrador === (bloque.html ?? "")}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/70 transition hover:text-foreground disabled:opacity-40"
            >
              {ocupado === "guardar" && (
                <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
              )}
              Guardar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
