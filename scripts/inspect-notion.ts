/* eslint-disable no-console */
/**
 * Introspección READ-ONLY de Notion.
 * Acepta el ID de una base de datos O de una página (busca las bases dentro).
 * Vuelca columnas (nombre + tipo + opciones/relaciones) y comprueba el acceso.
 * NO modifica nada en Notion.
 *
 * Uso (tras poner NOTION_API_KEY y NOTION_DB_FINANZAS_ID en .env.local):
 *   npm run inspect:notion
 *   npm run inspect:notion -- <database_o_page_id>
 */
import { Client } from "@notionhq/client";

try {
  process.loadEnvFile(".env.local"); // Node 22+
} catch {
  // si no existe .env.local, se usan las variables del shell
}

const token = process.env.NOTION_API_KEY;
const inputId = process.argv[2] ?? process.env.NOTION_DB_FINANZAS_ID;

if (!token) {
  console.error("❌ Falta NOTION_API_KEY en .env.local");
  process.exit(1);
}
if (!inputId) {
  console.error("❌ Falta NOTION_DB_FINANZAS_ID en .env.local (o pásalo como argumento).");
  process.exit(1);
}

const notion = new Client({ auth: token });

function describe(prop: any): string {
  switch (prop.type) {
    case "select":
    case "status":
      return (prop[prop.type]?.options ?? []).map((o: any) => o.name).join(" | ");
    case "multi_select":
      return (prop.multi_select?.options ?? []).map((o: any) => o.name).join(" | ");
    case "relation":
      return `→ db ${prop.relation?.database_id ?? "?"}`;
    case "formula":
      return prop.formula?.expression ?? "";
    case "rollup":
      return `rollup(${prop.rollup?.function ?? ""} de ${prop.rollup?.relation_property_name ?? "?"})`;
    case "number":
      return prop.number?.format ?? "";
    default:
      return "";
  }
}

async function dumpDatabase(id: string) {
  const db: any = await notion.databases.retrieve({ database_id: id });
  const title = (db.title ?? []).map((t: any) => t.plain_text).join("") || "(sin título)";
  console.log(`\n📊 DB: ${title}`);
  console.log(`   id: ${db.id}`);
  console.log(`   url: ${db.url ?? "-"}`);
  const props = db.properties as Record<string, any>;
  const rows = Object.entries(props)
    .map(([name, p]) => ({ propiedad: name, tipo: p.type, detalle: describe(p) }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo));
  console.table(rows);
  const sample = await notion.databases.query({ database_id: id, page_size: 1 });
  console.log(`   filas (1ª página): ${sample.results.length} · has_more: ${sample.has_more}`);
}

async function listChildDatabases(pageId: string) {
  const found: { id: string; title: string }[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const b of res.results as any[]) {
      if (b.type === "child_database") {
        found.push({ id: b.id, title: b.child_database?.title ?? "(sin título)" });
      }
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return found;
}

async function main() {
  // 1) ¿Es directamente una base de datos?
  try {
    await dumpDatabase(inputId!);
    return;
  } catch (err: any) {
    if (err?.code !== "validation_error") throw err;
    console.log("ℹ️  El ID es una página, no una base de datos. Buscando bases dentro…\n");
  }

  // 2) Bases de datos embebidas en la página
  const childs = await listChildDatabases(inputId!);
  if (childs.length > 0) {
    console.log(`Encontradas ${childs.length} base(s) dentro de la página:`);
    childs.forEach((c) => console.log(`  • ${c.title} :: ${c.id}`));
    for (const c of childs) await dumpDatabase(c.id);
  } else {
    console.log("No hay bases embebidas directas en la página.");
  }

  // 3) Todas las bases accesibles por la integración (por si están en otra parte)
  const search: any = await notion.search({
    filter: { value: "database", property: "object" },
    page_size: 50,
  });
  console.log(`\n🔎 Bases accesibles por la integración (search): ${search.results.length}`);
  for (const r of search.results as any[]) {
    const t = (r.title ?? []).map((x: any) => x.plain_text).join("") || "(sin título)";
    console.log(`  • ${t} :: ${r.id}`);
  }
  console.log(
    "\nApunta NOTION_DB_FINANZAS_ID al id de la base correcta y vuelve a ejecutar para ver su schema.\n",
  );
}

main().catch((err: any) => {
  console.error("❌ Error consultando Notion:", err?.body ?? err?.message ?? err);
  console.error(
    "\nComprueba: (1) token correcto, (2) la página/DB está COMPARTIDA con la integración (••• → Connections), (3) el ID es correcto.",
  );
  process.exit(1);
});
