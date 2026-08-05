// Publicación en Shopify como página de producto — Fase 5.
// La landing vive en una plantilla de producto custom (product.landing),
// que renderiza las secciones (imágenes) desde un metafield del producto.
//
// Conexión vía el AI Toolkit de Shopify: la auth vive en el CLI
// (`shopify store auth`). Aquí ejecutamos GraphQL con `shopify store execute`.
// El CLI corre local y autenticado, así que esto sirve igual para el modo
// agente y para un futuro botón en la web (ambos comparten esta capa core).
//
// Flujo de publishLanding:
//   1. Asegura la plantilla `templates/product.landing.liquid` en el tema principal.
//   2. Sube cada imagen de sección a Shopify Files → URL de CDN.
//   3. Crea el producto con template_suffix "landing".
//   4. Guarda las URLs en el metafield custom.landing_sections (json).

import { promises as fs } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { getLanding, blockFilePath, setShopifyRef } from "@/lib/landings";
import { toBlocks } from "@/lib/render";

const execFileP = promisify(execFile);

function storeDomain(): string {
  const d = process.env.SHOPIFY_STORE_DOMAIN;
  if (!d) throw new Error("Falta SHOPIFY_STORE_DOMAIN en .env.local");
  return d;
}

// Ejecuta una operación GraphQL en la tienda vía el CLI de Shopify.
async function adminGraphQL<T = any>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const args = [
    "store",
    "execute",
    "--store",
    storeDomain(),
    "--query",
    query,
    "--allow-mutations",
    "--json",
  ];
  if (variables) args.push("--variables", JSON.stringify(variables));

  let stdout: string;
  try {
    ({ stdout } = await execFileP("shopify", args, {
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (e: any) {
    throw new Error(`shopify store execute falló: ${e.stderr || e.message}`);
  }
  // El CLI puede anteponer líneas de progreso; nos quedamos con el JSON.
  const start = stdout.indexOf("{");
  if (start === -1) throw new Error(`Respuesta inesperada del CLI: ${stdout}`);
  const json = JSON.parse(stdout.slice(start));
  if (json.errors) {
    throw new Error(`Shopify GraphQL: ${JSON.stringify(json.errors)}`);
  }
  // store execute devuelve el objeto `data` directamente.
  return (json.data ?? json) as T;
}

// La plantilla de producto: apila los bloques (imagen o HTML) desde el metafield.
const TEMPLATE_LIQUID = `{% comment %}Generado por Generador de Landing — Ecom Circle{% endcomment %}
{% assign blocks = product.metafields.custom.landing_blocks.value %}
<div class="ecom-landing" style="max-width:900px;margin:0 auto;">
  {% for b in blocks %}
    {% if b.type == 'image' %}
      <img src="{{ b.url }}" alt="{{ product.title | escape }}" loading="lazy" style="display:block;width:100%;height:auto;" />
    {% else %}
      {{ b.html }}
    {% endif %}
  {% endfor %}
</div>
`;

async function ensureTemplate(): Promise<void> {
  const data = await adminGraphQL<{
    themes: { nodes: { id: string }[] };
  }>(`query { themes(first: 1, roles: [MAIN]) { nodes { id } } }`);
  const themeId = data.themes.nodes[0]?.id;
  if (!themeId) throw new Error("No se encontró el tema principal de la tienda");

  const r = await adminGraphQL<{
    themeFilesUpsert: { userErrors: { message: string }[] };
  }>(
    `mutation UpsertTemplate($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
      themeFilesUpsert(themeId: $themeId, files: $files) {
        userErrors { message }
      }
    }`,
    {
      themeId,
      files: [
        {
          filename: "templates/product.landing.liquid",
          body: { type: "TEXT", value: TEMPLATE_LIQUID },
        },
      ],
    },
  );
  const errs = r.themeFilesUpsert.userErrors;
  if (errs.length) throw new Error(`Subiendo plantilla: ${errs[0].message}`);
}

// Sube una imagen a Shopify Files y devuelve su URL de CDN (espera a que procese).
async function uploadImage(
  bytes: Buffer,
  filename: string,
  mime: string,
): Promise<string> {
  // 1. Staged upload target.
  const staged = await adminGraphQL<{
    stagedUploadsCreate: {
      stagedTargets: {
        url: string;
        resourceUrl: string;
        parameters: { name: string; value: string }[];
      }[];
      userErrors: { message: string }[];
    };
  }>(
    `mutation StagedUpload($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { message }
      }
    }`,
    {
      input: [
        { filename, mimeType: mime, resource: "FILE", httpMethod: "POST" },
      ],
    },
  );
  if (staged.stagedUploadsCreate.userErrors.length) {
    throw new Error(staged.stagedUploadsCreate.userErrors[0].message);
  }
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  // 2. POST del binario al target (URL firmada, no usa el token de Shopify).
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`Staged upload HTTP ${up.status}: ${await up.text()}`);

  // 3. Registrar el archivo en Shopify Files.
  const created = await adminGraphQL<{
    fileCreate: { files: { id: string }[]; userErrors: { message: string }[] };
  }>(
    `mutation FileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id }
        userErrors { message }
      }
    }`,
    { files: [{ originalSource: target.resourceUrl, contentType: "IMAGE" }] },
  );
  if (created.fileCreate.userErrors.length) {
    throw new Error(created.fileCreate.userErrors[0].message);
  }
  const fileId = created.fileCreate.files[0].id;

  // 4. Esperar a que Shopify procese la imagen y exponga su URL de CDN.
  for (let i = 0; i < 20; i++) {
    const q = await adminGraphQL<{
      node: { fileStatus: string; image?: { url: string } } | null;
    }>(
      `query FileUrl($id: ID!) {
        node(id: $id) {
          ... on MediaImage { fileStatus image { url } }
        }
      }`,
      { id: fileId },
    );
    const url = q.node?.image?.url;
    if (q.node?.fileStatus === "READY" && url) return url;
    if (q.node?.fileStatus === "FAILED") {
      throw new Error(`Shopify no pudo procesar la imagen ${filename}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Timeout esperando la URL de la imagen ${filename}`);
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface PublishResult {
  productUrl: string;
  adminUrl: string;
  updated: boolean; // true = se actualizó el producto existente
}

interface ProductPayload {
  product: { id: string; handle: string } | null;
  userErrors: { field: string[]; message: string }[];
}

export async function publishLanding(landingId: string): Promise<PublishResult> {
  const landing = await getLanding(landingId);
  if (!landing) throw new Error("Landing no encontrada");
  if (!landing.blocks.some((b) => b.image || b.html)) {
    throw new Error("La landing no tiene contenido para publicar");
  }

  // 1. Plantilla del tema (idempotente).
  await ensureTemplate();

  // 2. Subir las imágenes en orden (los huecos vacíos se saltan) y armar los bloques.
  const urls: string[] = [];
  for (let i = 0; i < landing.blocks.length; i++) {
    const block = landing.blocks[i];
    if (!block.image) {
      urls.push("");
      continue;
    }
    const bytes = await fs.readFile(blockFilePath(landingId, block));
    const ext = block.image.split(".").pop()?.toLowerCase() || "png";
    urls.push(
      await uploadImage(bytes, `${landing.id}-${i}.${ext}`, MIME[ext] || "image/png"),
    );
  }
  const blocks = toBlocks(landing.blocks, (_b, i) => urls[i]);

  const metafields = [
    {
      namespace: "custom",
      key: "landing_blocks",
      type: "json",
      value: JSON.stringify(blocks),
    },
  ];

  // 3. Actualizar el producto si esta landing ya se publicó; si no, crearlo.
  //    Sin esto, republicar dejaba productos duplicados en la tienda.
  const existingId = landing.shopify?.productId;
  let product: { id: string; handle: string };

  if (existingId) {
    const r = await adminGraphQL<{ productUpdate: ProductPayload }>(
      `mutation UpdateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id handle }
          userErrors { field message }
        }
      }`,
      {
        input: {
          id: existingId,
          title: landing.name || landing.product,
          templateSuffix: "landing",
          metafields,
        },
      },
    );
    if (r.productUpdate.userErrors.length) {
      throw new Error(`Actualizando producto: ${r.productUpdate.userErrors[0].message}`);
    }
    product = r.productUpdate.product!;
  } else {
    const r = await adminGraphQL<{ productCreate: ProductPayload }>(
      `mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product { id handle }
          userErrors { field message }
        }
      }`,
      {
        input: {
          title: landing.name || landing.product,
          status: "ACTIVE",
          templateSuffix: "landing",
          metafields,
        },
      },
    );
    if (r.productCreate.userErrors.length) {
      throw new Error(`Creando producto: ${r.productCreate.userErrors[0].message}`);
    }
    product = r.productCreate.product!;

    // Publicar en el canal "Tienda online" (ACTIVE no basta en tiendas nuevas).
    const pubs = await adminGraphQL<{
      publications: { nodes: { id: string; name: string }[] };
    }>(`query { publications(first: 20) { nodes { id name } } }`);
    const onlineStore = pubs.publications.nodes.find((p) =>
      /online|tienda online/i.test(p.name),
    );
    if (onlineStore) {
      await adminGraphQL(
        `mutation Publish($id: ID!, $pubId: ID!) {
          publishablePublish(id: $id, input: { publicationId: $pubId }) {
            userErrors { message }
          }
        }`,
        { id: product.id, pubId: onlineStore.id },
      );
    }
  }

  const domain = storeDomain();
  const numericId = product.id.split("/").pop();
  const result: PublishResult = {
    productUrl: `https://${domain}/products/${product.handle}`,
    adminUrl: `https://${domain}/admin/products/${numericId}`,
    updated: Boolean(existingId),
  };

  await setShopifyRef(landingId, {
    productId: product.id,
    handle: product.handle,
    productUrl: result.productUrl,
    adminUrl: result.adminUrl,
    publishedAt: new Date().toISOString(),
  });

  return result;
}
