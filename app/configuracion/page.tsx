"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";

type Mode = "suscripcion" | "api" | "ambos";
type TextEngine = "claude" | "codex";
type ImageEngine = "nano-banana" | "chatgpt";
type PromptEngine = "gemini" | "chatgpt" | "ninguno";

interface Config {
  mode: Mode;
  textEngine: TextEngine;
  imageEngine: ImageEngine;
  promptEngine: PromptEngine;
  geminiApiKey: string;
  openaiApiKey: string;
}

const MODOS: { id: Mode; name: string; desc: string }[] = [
  {
    id: "suscripcion",
    name: "Solo suscripción",
    desc: "El texto lo escribe el CLI con tu plan de Claude o ChatGPT. No gasta créditos de API.",
  },
  {
    id: "api",
    name: "Solo clave API",
    desc: "Todo va por clave API. Útil si no tienes los CLI instalados en este Mac.",
  },
  {
    id: "ambos",
    name: "Suscripción + API de respaldo",
    desc: "Intenta con tu suscripción y, si falla, sigue con la clave API. Nunca se queda sin escribir.",
  },
];

const TEXTOS: { id: TextEngine; name: string; desc: string }[] = [
  { id: "claude", name: "Claude Code", desc: "Plan de Claude · CLI claude" },
  { id: "codex", name: "Codex", desc: "Plan de ChatGPT · CLI codex" },
];

const IMAGENES: { id: ImageEngine; name: string; desc: string }[] = [
  { id: "nano-banana", name: "Nano Banana", desc: "Gemini · clave de Google AI Studio" },
  { id: "chatgpt", name: "ChatGPT", desc: "gpt-image · clave de OpenAI" },
];

const PROMPTS: { id: PromptEngine; name: string; desc: string }[] = [
  {
    id: "gemini",
    name: "Gemini",
    desc: "Lee la plantilla y escribe el prompt. Rápido y barato.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    desc: "gpt-4.1 · escribe prompts más detallados y mejores textos.",
  },
  {
    id: "ninguno",
    name: "Sin director",
    desc: "El motor de imagen lee la plantilla directo. Más rápido, moldea peor.",
  },
];

function Opcion({
  active,
  name,
  desc,
  badge,
  onClick,
}: {
  active: boolean;
  name: string;
  desc: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
        active
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-card hover:bg-foreground/5"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          active ? "border-accent bg-accent text-white" : "border-border"
        }`}
      >
        {active && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`text-sm font-medium ${active ? "text-accent" : "text-foreground"}`}>
            {name}
          </span>
          {badge && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{desc}</span>
      </span>
    </button>
  );
}

function CampoClave({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pega aquí tu clave"
          className="input pr-11"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground"
        >
          {visible ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}

export default function Configuracion() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cli, setCli] = useState({ claude: false, codex: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setCfg(d.config);
        setCli(d.cli);
      })
      .catch(() => setError("No se pudo cargar la configuración"));
  }, []);

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setCfg((c) => (c ? { ...c, [key]: value } : c));
    setSaved(false);
  }

  async function guardar() {
    if (!cfg) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo guardar");
      setCfg(d.config);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) {
    return (
      <div className="mx-auto max-w-3xl px-6 text-sm text-muted">
        {error || "Cargando…"}
      </div>
    );
  }

  const usaCli = cfg.mode !== "api";
  const cliActivo = cli[cfg.textEngine];

  return (
    <div className="mx-auto max-w-3xl px-6 pb-16">
      <p className="label text-accent">Configuraciones</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        Motores y forma de pago
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Elige con qué se paga el texto y con qué motor se generan las imágenes. Se guarda
        en este Mac, no se sube a ningún lado.
      </p>

      <section className="card mt-8 p-5 sm:p-6">
        <p className="label">Cómo se paga el texto</p>
        <div className="mt-4 space-y-2">
          {MODOS.map((m) => (
            <Opcion
              key={m.id}
              active={cfg.mode === m.id}
              name={m.name}
              desc={m.desc}
              onClick={() => set("mode", m.id)}
            />
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Las imágenes siempre van por clave API: ninguna suscripción las expone.
        </p>
      </section>

      {usaCli && (
        <section className="card mt-4 p-5 sm:p-6">
          <p className="label">Quién escribe el texto</p>
          <div className="mt-4 space-y-2">
            {TEXTOS.map((t) => (
              <Opcion
                key={t.id}
                active={cfg.textEngine === t.id}
                name={t.name}
                desc={t.desc}
                badge={cli[t.id] ? "instalado" : "no instalado"}
                onClick={() => set("textEngine", t.id)}
              />
            ))}
          </div>
          {!cliActivo && (
            <p className="mt-4 text-xs leading-relaxed text-accent">
              El CLI de {cfg.textEngine === "codex" ? "Codex" : "Claude Code"} no está
              instalado en este Mac
              {cfg.mode === "ambos"
                ? ": el texto saldrá siempre por la clave API."
                : ": el texto va a fallar hasta que lo instales o cambies de modo."}
            </p>
          )}
        </section>
      )}

      <section className="card mt-4 p-5 sm:p-6">
        <p className="label">Motor del prompt · director de arte</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Antes de pintar, este motor mira la plantilla y las fotos del producto, saca solo
          el esqueleto y escribe el prompt con la dirección de arte nueva. Es lo que hace
          que el producto se moldee a la plantilla en vez de solo cambiarle la foto.
        </p>
        <div className="mt-4 space-y-2">
          {PROMPTS.map((p) => (
            <Opcion
              key={p.id}
              active={cfg.promptEngine === p.id}
              name={p.name}
              desc={p.desc}
              onClick={() => set("promptEngine", p.id)}
            />
          ))}
        </div>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <p className="label">Motor de imágenes</p>
        <div className="mt-4 space-y-2">
          {IMAGENES.map((i) => (
            <Opcion
              key={i.id}
              active={cfg.imageEngine === i.id}
              name={i.name}
              desc={i.desc}
              onClick={() => set("imageEngine", i.id)}
            />
          ))}
        </div>
      </section>

      <section className="card mt-4 space-y-5 p-5 sm:p-6">
        <p className="label">Claves API</p>
        <CampoClave
          label="Nano Banana · Gemini"
          hint="Gratis en aistudio.google.com/apikey. También la usan el clasificador y el extractor."
          value={cfg.geminiApiKey}
          onChange={(v) => set("geminiApiKey", v)}
        />
        <CampoClave
          label="ChatGPT · OpenAI"
          hint="En platform.openai.com/api-keys. Necesaria si generas imágenes con ChatGPT."
          value={cfg.openaiApiKey}
          onChange={(v) => set("openaiApiKey", v)}
        />
        {cfg.imageEngine === "chatgpt" && !cfg.openaiApiKey && (
          <p className="text-xs text-accent">
            Elegiste ChatGPT para las imágenes pero no hay clave de OpenAI.
          </p>
        )}
        {cfg.imageEngine === "nano-banana" && !cfg.geminiApiKey && (
          <p className="text-xs text-accent">
            Elegiste Nano Banana para las imágenes pero no hay clave de Gemini.
          </p>
        )}
      </section>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={guardar} disabled={saving} className="btn-primary">
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Guardando
            </span>
          ) : (
            "Guardar"
          )}
        </button>
        {saved && <span className="text-sm text-muted">Guardado</span>}
        {error && <span className="text-sm text-accent">{error}</span>}
      </div>
    </div>
  );
}
