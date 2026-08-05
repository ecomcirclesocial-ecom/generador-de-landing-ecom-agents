"use client";

import { useEffect, useRef, useState } from "react";

export type Dispositivo = "movil" | "portatil";

const MEDIDAS = {
  movil: { ancho: 390, alto: 760, marco: 12 },
  portatil: { ancho: 1280, alto: 800, marco: 14 },
};

// Marco de celular o portátil. El contenido se escala para caber en la columna.
export default function MarcoDispositivo({
  dispositivo,
  children,
}: {
  dispositivo: Dispositivo;
  children: React.ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const { ancho, alto, marco } = MEDIDAS[dispositivo];
  const anchoTotal = ancho + marco * 2;
  const altoTotal = alto + marco * 2 + (dispositivo === "portatil" ? 14 : 0);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ajustar = () =>
      setEscala(Math.min(1, el.clientWidth / anchoTotal));
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [anchoTotal]);

  return (
    <div ref={caja} className="w-full">
      <div
        className="mx-auto"
        style={{ width: anchoTotal * escala, height: altoTotal * escala }}
      >
        <div
          style={{
            width: anchoTotal,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
          }}
        >
          {dispositivo === "movil" ? (
            <div
              className="relative rounded-[44px] bg-neutral-900 shadow-xl ring-1 ring-white/10"
              style={{ padding: marco }}
            >
              <div className="absolute left-1/2 top-[14px] z-10 h-[18px] w-[104px] -translate-x-1/2 rounded-full bg-neutral-900" />
              <div
                className="overflow-hidden rounded-[32px] bg-white"
                style={{ width: ancho, height: alto }}
              >
                {children}
              </div>
            </div>
          ) : (
            <>
              <div
                className="rounded-xl bg-neutral-900 shadow-xl ring-1 ring-white/10"
                style={{ padding: marco }}
              >
                <div
                  className="overflow-hidden rounded-md bg-white"
                  style={{ width: ancho, height: alto }}
                >
                  {children}
                </div>
              </div>
              <div className="mx-auto h-[14px] w-[62%] rounded-b-xl bg-neutral-800 ring-1 ring-white/10" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
