/**
 * Mock de `@/lib/actions/ai` para Storybook (las Server Actions reales importan la
 * capa server/worker, que no debe ejecutarse en el navegador).
 */
export const preguntarAsistente = async () => ({ ok: true as const, jobId: "sb-job" });
export const proponerContexto = async () => ({ ok: true as const, jobId: "sb-job" });
export const registrarGasto = async () => ({ ok: true as const, jobId: "sb-job" });
export const registrarIngreso = async () => ({ ok: true as const, jobId: "sb-job" });
export const registrarDeuda = async () => ({ ok: true as const, jobId: "sb-job" });
export const marcarPagado = async () => ({ ok: true as const, jobId: "sb-job" });

export const consultarJob = async () => ({
  estado: "ok" as const,
  respuesta: "Respuesta de ejemplo del asistente.",
  fuentes: [{ id: "c1", titulo: "Fuente de ejemplo" }],
});
