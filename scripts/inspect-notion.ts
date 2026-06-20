/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
/**
 * Introspección READ-ONLY de una base de datos de Notion.
 * Vuelca columnas (nombre + tipo + opciones/relaciones) y comprueba el acceso.
 * NO modifica nada en Notion.
 *
 * Uso (tras poner NOTION_API_KEY y NOTION_DB_FINANZAS_ID en .env.local):
 *   npm run inspect:notion
 *   npm run inspect:notion -- <otro_database_id>
 */
import { Client } from "@notionhq/client";

try {
  process.loadEnvFile(".env.local"); // Node 22+
} catch {
  // si no existe .env.local, se usan las variables del shell
}

const token = process.env.NOTION_API_KEY;
const dbId = process.argv[2] ?? process.env.NOTION_DB_FINANZAS_ID;

if (!token) {
  console.error("❌ Falta NOTION_API_KEY en .env.local");
  process.exit(1);
}
if (!dbId) {
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
      return `rollup(${prop.rollup?.function ?? ""})`;
    case "number":
      return prop.number?.format ?? "";
    default:
      return "";
  }
}

async function main() {
  const db: any = await notion.databases.retrieve({ database_id: dbId! });
  const title = (db.title ?? []).map((t: any) => t.plain_text).join("") || "(sin título)";

  console.log(`\n📊 DB: ${title}`);
  console.log(`   id: ${db.id}`);
  console.log(`   url: ${db.url ?? "-"}\n`);

  const props = db.properties as Record<string, any>;
  const rows = Object.entries(props)
    .map(([name, p]) => ({ propiedad: name, tipo: p.type, detalle: describe(p) }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo));
  console.table(rows);

  // Una fila de muestra para entender los datos (sin volcar todo).
  const sample = await notion.databases.query({ database_id: dbId!, page_size: 1 });
  console.log(
    `\nFilas (primera página): ${sample.results.length} · has_more: ${sample.has_more}`,
  );
  console.log(
    "Sugerencia: con esto genero src/lib/notion/schema.ts, los mappers y las tablas de Supabase para M1.\n",
  );
}

main().catch((err) => {
  console.error("❌ Error consultando Notion:", err?.body ?? err?.message ?? err);
  console.error(
    "\nComprueba: (1) token correcto, (2) la DB está COMPARTIDA con la integración (••• → Connections), (3) el ID es correcto.",
  );
  process.exit(1);
});
