"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutTemplate,
  Megaphone,
  Download,
  Rocket,
  Package,
  Settings,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/biblioteca", label: "Generador de landing", icon: LayoutTemplate },
  { href: "/anuncios", label: "Generador de anuncios", icon: Megaphone },
  { href: "/extraer", label: "Extraer", icon: Download },
  { href: "/landings", label: "Subir landing", icon: Rocket },
  { href: "/recursos", label: "Recursos", icon: Package },
  { href: "/configuracion", label: "Configuraciones", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-[100dvh] w-64 flex-col border-r border-border bg-card/60 p-4 backdrop-blur">
      <div className="mb-6 flex items-start justify-between border-b border-border px-2 pb-5 pt-2">
        <div>
          <p className="metal text-lg font-extrabold tracking-tight">
            Ecom Agents
          </p>
          <p className="mt-0.5 text-xs text-muted">Generador de Landings</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/"
              : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto px-3 pb-2 text-xs text-muted/60">
        Herramienta interna
      </p>
    </aside>
  );
}
