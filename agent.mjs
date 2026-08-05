#!/usr/bin/env node
// Modo agente — Fase 6.
// Da el mismo poder que la web desde la terminal, hablando con las MISMAS
// rutas API del server local (npm run dev). Cero lógica duplicada.
//
// Uso:
//   node agent.mjs list                           Lista las landings
//   node agent.mjs templates [--categoria hero]   Lista las plantillas
//   node agent.mjs show <id>                      Ver una landing (JSON)
//   node agent.mjs create --name "X" --product "Y" [--market Colombia] [--photos a.jpg,b.jpg]
//   node agent.mjs section <id> --template <tid> [--instructions "..."] [--texto]
//   node agent.mjs texto <id> <sid> [--instructions "..."] [--ajustar]   Escribe/reescribe el bloque de texto
//   node agent.mjs quitar <id> <sid>              Borra una sección
//   node agent.mjs orden <id> <sid,sid,sid>       Reordena las secciones
//   node agent.mjs preview <id>                   URL de la vista previa
//   node agent.mjs publish <id>
//   node agent.mjs extract <url> [--save]         Extrae imágenes de una landing y las etiqueta con IA
//
// Base configurable con LANDING_BASE (default http://localhost:3001).

import { promises as fs } from "fs";
import path from "path";

const BASE = process.env.LANDING_BASE || "http://localhost:3001";

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true; // flag booleano (ej. --copy)
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

async function api(method, pathname, { json, form } = {}) {
  const opts = { method };
  if (json) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(json);
  }
  if (form) opts.body = form;
  const res = await fetch(`${BASE}${pathname}`, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && data.error) || data || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

const MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseFlags(rest);

  switch (cmd) {
    case "list": {
      const landings = await api("GET", "/api/landings");
      if (!landings.length) return console.log("(sin landings)");
      for (const l of landings) {
        console.log(`${l.id}  ${l.name}  ·  ${l.product}  ·  ${l.market}  ·  ${l.sectionCount} secc.`);
      }
      return;
    }

    case "templates": {
      const all = await api("GET", "/api/templates");
      const tpls =
        flags.categoria && flags.categoria !== true
          ? all.filter((t) => t.category === flags.categoria)
          : all;
      if (!tpls.length) return console.log("(sin plantillas)");
      for (const t of tpls) {
        console.log(`${t.id}  [${t.category}]${t.niche ? ` (${t.niche})` : ""}  ${t.name}`);
      }
      return;
    }

    case "show": {
      const id = positional[0];
      if (!id) throw new Error("Uso: show <id>");
      console.log(JSON.stringify(await api("GET", `/api/landings/${id}`), null, 2));
      return;
    }

    case "create": {
      if (!flags.name || !flags.product) {
        throw new Error("Uso: create --name \"X\" --product \"Y\" [--market Colombia] [--photos a.jpg,b.jpg]");
      }
      const form = new FormData();
      form.append("name", flags.name);
      form.append("product", flags.product);
      form.append("market", flags.market || "Colombia");
      if (flags.photos && flags.photos !== true) {
        for (const p of String(flags.photos).split(",").map((s) => s.trim()).filter(Boolean)) {
          const bytes = await fs.readFile(p);
          const ext = (path.extname(p).slice(1) || "jpg").toLowerCase();
          form.append("files", new Blob([new Uint8Array(bytes)], { type: MIME[ext] || "image/jpeg" }), path.basename(p));
        }
      }
      const l = await api("POST", "/api/landings", { form });
      console.log(`Landing creada: ${l.id}`);
      return;
    }

    case "section": {
      const id = positional[0];
      if (!id || !flags.template) {
        throw new Error("Uso: section <id> --template <tid> [--instructions \"...\"] [--texto]");
      }
      console.log("Generando sección (Gemini)...");
      const s = await api("POST", `/api/landings/${id}/sections`, {
        json: {
          templateId: flags.template,
          instructions: flags.instructions === true ? "" : flags.instructions || "",
          withCopy: !!(flags.texto || flags.copy),
        },
      });
      console.log(`Sección agregada: ${s.id} [${s.category}]${s.html ? " (con texto)" : ""}`);
      return;
    }

    case "texto": {
      const [id, sid] = positional;
      if (!id || !sid) {
        throw new Error("Uso: texto <id> <sid> [--instructions \"...\"] [--ajustar]");
      }
      console.log("Escribiendo el texto (Claude Code)...");
      const r = await api("POST", `/api/landings/${id}/sections/${sid}/html`, {
        json: {
          instructions: flags.instructions === true ? "" : flags.instructions || "",
          keepCurrent: !!flags.ajustar,
        },
      });
      console.log(r.html);
      return;
    }

    case "quitar": {
      const [id, sid] = positional;
      if (!id || !sid) throw new Error("Uso: quitar <id> <sid>");
      await api("DELETE", `/api/landings/${id}/sections/${sid}`);
      console.log("Sección borrada.");
      return;
    }

    case "orden": {
      const [id, ids] = positional;
      if (!id || !ids) throw new Error("Uso: orden <id> <sid,sid,sid>");
      const orderedIds = ids.split(",").map((s) => s.trim()).filter(Boolean);
      await api("POST", `/api/landings/${id}/reorder`, { json: { orderedIds } });
      console.log(`Orden guardado (${orderedIds.length} secciones).`);
      return;
    }

    case "preview": {
      const id = positional[0];
      if (!id) throw new Error("Uso: preview <id>");
      console.log(`${BASE}/api/landings/${id}/preview`);
      return;
    }

    case "publish": {
      const id = positional[0];
      if (!id) throw new Error("Uso: publish <id>");
      console.log("Publicando en Shopify...");
      const r = await api("POST", `/api/landings/${id}/publish`);
      console.log(`Publicada: ${r.productUrl}`);
      console.log(`Admin:     ${r.adminUrl}`);
      return;
    }

    case "extract": {
      const url = positional[0];
      if (!url) throw new Error("Uso: extract <url> [--save]");
      console.log("Extrayendo y etiquetando con IA...");
      const r = await api("POST", "/api/extract", { json: { url } });
      if (r.aiError) console.log(`(la IA no etiquetó: ${r.aiError})`);
      for (const im of r.images) {
        console.log(`  [${im.use ? im.category : "ignorar"}]  ${im.name}`);
      }
      if (!flags.save) {
        console.log(`\n${r.images.length} imágenes. Agrega --save para guardarlas en la biblioteca.`);
        return;
      }
      const items = r.images
        .filter((im) => im.use)
        .map((im) => ({ url: im.url, category: im.category, name: im.name }));
      const saved = await api("POST", "/api/extract/save", { json: { items } });
      console.log(`\nGuardadas ${saved.saved.length} en la biblioteca.`);
      return;
    }

    default:
      console.log(
        "Comandos: list | templates | show <id> | create | section <id> | texto <id> <sid> |\n" +
          "          quitar <id> <sid> | orden <id> <sids> | preview <id> | publish <id> | extract <url>\n" +
          "Ver el encabezado de agent.mjs para las opciones.",
      );
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
