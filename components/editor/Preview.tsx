"use client";

import { Laptop, Smartphone } from "lucide-react";
import MarcoDispositivo, { type Dispositivo } from "./MarcoDispositivo";

export default function Preview({
  landingId,
  recarga,
  vacia,
  dispositivo,
  onDispositivo,
}: {
  landingId: string;
  recarga: number;
  vacia: boolean;
  dispositivo: Dispositivo;
  onDispositivo: (d: Dispositivo) => void;
}) {
  return (
    <div className="self-start lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label">Vista previa</h2>
        <div className="flex items-center gap-1">
          {(
            [
              ["movil", Smartphone, "Celular"],
              ["portatil", Laptop, "Portátil"],
            ] as const
          ).map(([d, Icono, titulo]) => (
            <button
              key={d}
              type="button"
              onClick={() => onDispositivo(d)}
              aria-label={titulo}
              className={
                "rounded-lg border p-1.5 transition " +
                (dispositivo === d
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-transparent text-muted hover:bg-foreground/5 hover:text-foreground")
              }
            >
              <Icono size={16} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      <div className="card mt-3 p-3">
        {vacia ? (
          <div className="flex h-[40vh] items-center justify-center px-6 text-center">
            <p className="text-xs text-muted">
              Cuando agregues bloques vas a ver aquí la landing.
            </p>
          </div>
        ) : (
          <MarcoDispositivo dispositivo={dispositivo}>
            <iframe
              key={recarga}
              src={`/api/landings/${landingId}/preview`}
              title="Vista previa de la landing"
              className="h-full w-full border-0 bg-white"
            />
          </MarcoDispositivo>
        )}
      </div>
    </div>
  );
}
