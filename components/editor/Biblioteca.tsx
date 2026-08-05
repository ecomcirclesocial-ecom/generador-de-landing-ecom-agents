"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, LayoutTemplate, Type } from "lucide-react";
import {
  drag,
  iniciarArrastre,
  type Categoria,
  type Plantilla,
  type Wireframe,
} from "./tipos";

export default function Biblioteca({
  onEsqueleto,
}: {
  onEsqueleto: (w: Wireframe) => void;
}) {
  const [tab, setTab] = useState<"imagenes" | "bloques">("imagenes");
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [esqueletos, setEsqueletos] = useState<Wireframe[]>([]);
  const [cat, setCat] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setPlantillas)
      .catch(() => {});
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategorias)
      .catch(() => {});
    fetch("/api/wireframes")
      .then((r) => r.json())
      .then(setEsqueletos)
      .catch(() => {});
  }, []);

  const conImagenes = categorias.filter((c) =>
    plantillas.some((p) => p.category === c.id),
  );
  const visibles = cat ? plantillas.filter((p) => p.category === cat) : plantillas;

  return (
    <aside className="card self-start p-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-foreground/5 p-1">
        {(["imagenes", "bloques"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition " +
              (tab === t
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground")
            }
          >
            {t === "imagenes" ? "Imágenes" : "Bloques"}
          </button>
        ))}
      </div>

      {tab === "imagenes" ? (
        <>
          {conImagenes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip activo={!cat} onClick={() => setCat("")}>
                Todas
              </Chip>
              {conImagenes.map((c) => (
                <Chip
                  key={c.id}
                  activo={cat === c.id}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          )}

          {plantillas.length === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              No tienes imágenes.{" "}
              <Link href="/biblioteca" className="text-accent hover:underline">
                Sube plantillas
              </Link>{" "}
              para arrastrarlas al lienzo.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {visibles.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) =>
                    iniciarArrastre(e, { tipo: "plantilla", templateId: t.id })
                  }
                  onDragEnd={() => (drag.actual = null)}
                  title={t.name}
                  className="cursor-grab overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent/40 active:cursor-grabbing"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/templates/${t.id}/raw`}
                    alt={t.name}
                    draggable={false}
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <Ficha
            icono={<Type size={16} strokeWidth={1.5} />}
            titulo="Texto / HTML"
            detalle="Bloque de texto editable"
            onDragStart={(e) => iniciarArrastre(e, { tipo: "nuevo", kind: "html" })}
          />
          <Ficha
            icono={<ImageIcon size={16} strokeWidth={1.5} />}
            titulo="Hueco de imagen"
            detalle="Para llenar después"
            onDragStart={(e) =>
              iniciarArrastre(e, { tipo: "nuevo", kind: "image" })
            }
          />
        </div>
      )}

      {esqueletos.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="label flex items-center gap-1.5">
            <LayoutTemplate size={13} strokeWidth={1.5} />
            Esqueletos
          </p>
          <div className="mt-2 space-y-2">
            {esqueletos.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onEsqueleto(w)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left transition hover:border-accent/40 hover:bg-foreground/5"
              >
                <p className="text-xs font-medium text-foreground">{w.name}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {w.description}
                </p>
                <p className="mt-1 text-[10px] text-muted/70">
                  {w.blocks.length} bloques
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 text-[10px] transition " +
        (activo
          ? "bg-accent text-white"
          : "border border-border bg-card text-muted hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function Ficha({
  icono,
  titulo,
  detalle,
  onDragStart,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => (drag.actual = null)}
      className="flex cursor-grab items-center gap-2.5 rounded-lg border border-dashed border-border bg-card px-3 py-2.5 text-foreground/80 transition hover:border-accent/40 active:cursor-grabbing"
    >
      <span className="text-accent">{icono}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium">{titulo}</span>
        <span className="block text-[10px] text-muted">{detalle}</span>
      </span>
    </div>
  );
}
