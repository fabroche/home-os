/**
 * Mock de `@/lib/actions/finanzas` para Storybook. Las Server Actions reales
 * arrastran la capa server/worker (`server-guard`), que lanza en el navegador.
 * En Storybook no se ejecutan: devuelven resultados OK de juguete.
 */
export const syncFinanzasAction = async () => ({
  ok: true as const,
  movimientos: 0,
  deudas: 0,
  movimientosBorrados: 0,
  deudasBorrados: 0,
  at: "2026-06-22T18:00:00.000Z",
});

export const cambiarEstadoMovimiento = async () => ({ ok: true as const });
export const crearMovimiento = async () => ({ ok: true as const });
export const crearDeuda = async () => ({ ok: true as const });
export const subirArchivoMovimiento = async () => ({ ok: true as const });
