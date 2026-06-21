import { listEntradas } from "@/lib/services/contexto";
import { ListaContexto } from "@/components/contexto/lista-contexto";
import { Reveal } from "@/components/motion/reveal";

// Lee de Supabase con RLS (entradas del usuario). Contenido editable → siempre fresco.
export const dynamic = "force-dynamic";

/** M4 · Banco de contexto — conocimiento personal que alimenta a la IA. */
export default async function ContextoPage() {
  const entradas = await listEntradas();
  const publicadas = entradas.filter((e) => e.estado === "publicado").length;

  return (
    <main className="container-app max-w-4xl py-12">
      <Reveal>
        <h1 className="text-4xl">
          Banco de <span className="serif-accent text-primary">contexto</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {entradas.length} entradas · {publicadas} publicadas que la IA puede recuperar.
          Conocimiento sin embeddings de pago: filtrado por tipo/tags y búsqueda de texto.
        </p>
      </Reveal>

      <div className="mt-8">
        <ListaContexto entradas={entradas} />
      </div>
    </main>
  );
}
