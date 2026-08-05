import { Download } from "lucide-react";

const RECURSOS = [
  {
    name: "Tema Shirene",
    desc: "Tema de Shopify listo para usar con las landings que generas en esta herramienta. Descárgalo y súbelo a tu tienda desde Tienda online → Temas → Agregar tema → Cargar archivo ZIP.",
    file: "/recursos/tema-shirene-ecom-circle.zip",
    size: "1.3 MB",
  },
];

export default function Recursos() {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <p className="label text-accent">Recursos · Ecom Agents</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        Recursos
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Archivos y plantillas listos para descargar y usar en tu tienda.
      </p>

      <div className="mt-10 space-y-3">
        {RECURSOS.map((r) => (
          <a
            key={r.file}
            href={r.file}
            download
            className="card group flex items-start gap-4 p-4 transition hover:bg-foreground/5 sm:p-6"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted transition group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent">
              <Download size={16} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {r.name}{" "}
                <span className="font-normal text-muted">· ZIP {r.size}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{r.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
