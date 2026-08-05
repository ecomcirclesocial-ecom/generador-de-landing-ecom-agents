"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import BloqueLienzo from "./BloqueLienzo";
import { drag, pedir, type Landing } from "./tipos";

export default function Lienzo({
  landing,
  recarga,
  onLanding,
}: {
  landing: Landing;
  recarga: number;
  onLanding: (l: Landing) => void;
}) {
  const [insertar, setInsertar] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const bloques = landing.blocks;
  const url = `/api/landings/${landing.id}/blocks`;

  // Mitad superior del bloque = insertar antes, mitad inferior = después.
  function sobrevolar(e: React.DragEvent, i: number) {
    if (!drag.actual) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setInsertar(e.clientY < r.top + r.height / 2 ? i : i + 1);
  }

  async function soltar(e: React.DragEvent) {
    e.preventDefault();
    const a = drag.actual;
    const index = insertar ?? bloques.length;
    drag.actual = null;
    setInsertar(null);
    if (!a) return;

    setOcupado(true);
    setError("");
    try {
      if (a.tipo === "bloque") {
        const ids = bloques.map((b) => b.id);
        const desde = ids.indexOf(a.id);
        if (desde === index || desde === index - 1) return;
        ids.splice(desde, 1);
        ids.splice(index > desde ? index - 1 : index, 0, a.id);
        onLanding(
          await pedir(url, {
            method: "PUT",
            body: JSON.stringify({ orderedIds: ids }),
          }),
        );
      } else {
        const cuerpo =
          a.tipo === "plantilla"
            ? { kind: "image", templateId: a.templateId, index }
            : a.kind === "html"
              ? { kind: "html", label: "Texto", index }
              : { kind: "image", label: "Imagen", index };
        onLanding(
          await pedir(url, { method: "POST", body: JSON.stringify(cuerpo) }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setOcupado(false);
    }
  }

  const linea = (i: number) => (
    <div
      className={
        "h-0.5 rounded-full transition " +
        (insertar === i ? "bg-accent" : "bg-transparent")
      }
    />
  );

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label">Lienzo</h2>
        <span className="text-xs text-muted">
          {ocupado ? "Guardando..." : "Arrastra para ordenar"}
        </span>
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
        </p>
      )}

      <div
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setInsertar(null);
        }}
        onDragOver={(e) => {
          if (drag.actual) e.preventDefault();
        }}
        onDrop={soltar}
        className="relative mt-3 space-y-1"
      >
        {ocupado && (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-background/50 pt-6">
            <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-accent" />
          </div>
        )}

        {bloques.length === 0 ? (
          <div
            onDragOver={(e) => {
              if (drag.actual) e.preventDefault();
            }}
            className="flex min-h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border px-6 text-center"
          >
            <p className="text-sm text-foreground/80">El lienzo está vacío</p>
            <p className="text-xs text-muted">
              Arrastra una imagen de la biblioteca o aplica un esqueleto.
            </p>
          </div>
        ) : (
          bloques.map((b, i) => (
            <div key={b.id} onDragOver={(e) => sobrevolar(e, i)} className="py-0.5">
              {linea(i)}
              <div className="py-1">
                <BloqueLienzo
                  landingId={landing.id}
                  bloque={b}
                  indice={i}
                  recarga={recarga}
                  onLanding={onLanding}
                />
              </div>
              {i === bloques.length - 1 && linea(bloques.length)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
