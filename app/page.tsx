import Link from "next/link";
import { LayoutTemplate, Megaphone, Download, Rocket, Package, Settings, ChevronRight } from "lucide-react";

const SECCIONES = [
  {
    href: "/biblioteca",
    name: "Generador de landing",
    desc: "Genera secciones de landing con IA a partir de tus plantillas y las fotos de tu producto.",
    icon: LayoutTemplate,
  },
  {
    href: "/anuncios",
    name: "Generador de anuncios",
    desc: "Genera imágenes de anuncios con IA usando tus plantillas de anuncios como referencia.",
    icon: Megaphone,
  },
  {
    href: "/extraer",
    name: "Extraer",
    desc: "Extrae secciones o anuncios desde la URL de una landing y los guarda como plantillas en tu biblioteca.",
    icon: Download,
  },
  {
    href: "/landings",
    name: "Subir landing",
    desc: "Arma tu landing con las imágenes, acompáñala con texto escrito por IA, previsualízala y súbela a Shopify como producto.",
    icon: Rocket,
  },
  {
    href: "/recursos",
    name: "Recursos",
    desc: "Descarga el tema Shirene de Shopify y demás archivos listos para usar en tu tienda.",
    icon: Package,
  },
  {
    href: "/configuracion",
    name: "Configuraciones",
    desc: "Elige si el texto corre con tu suscripción (Claude o Codex) o con clave API, y con qué motor se generan las imágenes.",
    icon: Settings,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <p className="label text-accent">Herramienta interna · Ecom Agents</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        Generador de Landing Pages
      </h1>

      <div className="mt-10 space-y-3">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card group flex items-start gap-4 p-4 transition hover:bg-foreground/5 sm:p-6"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted transition group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent">
              <s.icon size={16} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</p>
            </div>
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
