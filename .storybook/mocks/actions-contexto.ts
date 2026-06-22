/**
 * Mock de `@/lib/actions/contexto` para Storybook (las Server Actions reales
 * importan la capa server/worker, que no debe ejecutarse en el navegador).
 */
export const guardarEntrada = async () => ({ ok: true as const });
export const cambiarEstado = async () => ({ ok: true as const });
export const eliminarEntrada = async () => ({ ok: true as const });
