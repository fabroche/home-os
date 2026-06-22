/**
 * Mock de `@/lib/actions/ai` para Storybook (las Server Actions reales importan la
 * capa server/worker, que no debe ejecutarse en el navegador).
 */
export const preguntarAsistente = async () => ({ ok: true as const, jobId: "sb-job" });

export const consultarJob = async () => ({
  estado: "ok" as const,
  respuesta: "Respuesta de ejemplo del asistente.",
  fuentes: [{ id: "c1", titulo: "Fuente de ejemplo" }],
});
