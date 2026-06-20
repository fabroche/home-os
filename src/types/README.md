# `types` — tipos de DOMINIO

Modelos propios de la app (`Gasto`, `Ingreso`, `Factura`, `Viaje`, `Evento`, `EntradaContexto`,
`CuentaCorreo`, `AiJob`…). **Nunca** se re-exporta el shape crudo de Notion: los mappers de
`lib/notion/mappers` convierten Notion → estos tipos. Así un cambio en Notion no se propaga por la app.
