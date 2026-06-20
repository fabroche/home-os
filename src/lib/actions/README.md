# `lib/actions` — Server Actions

Punto de entrada desde la UI. Patrón: `'use server'` + validación **Zod** de la entrada + delegar en
`lib/services`. Nunca acceder a Notion/Supabase crudo directamente desde un componente.

```ts
"use server";
import { z } from "zod";
// const Input = z.object({ ... });
// export async function miAccion(raw: unknown) { const input = Input.parse(raw); ... }
```
