# T2 · Integración de correo (Gmail + IMAP, multi-cuenta)

Soporta **varias cuentas** de proveedores distintos tras una interfaz común. Lo usa M3 (triaje) y M1 (facturas).

## Interfaz común
```ts
interface EmailProvider {
  listNuevos(cursor?: string): Promise<{ mensajes: CorreoCrudo[]; cursor: string }>;
  getMensaje(id: string): Promise<CorreoCrudo>;     // incl. adjuntos
}
```
Implementaciones: `GmailProvider` (`googleapis`) y `ImapProvider` (`imapflow`). Intercambiables (RNF-M3-003).

## Gmail (OAuth)
- Google Cloud Console → OAuth client (Web). Scopes mínimos: `gmail.readonly` (y `gmail.modify` solo si se etiqueta).
- Flujo: usuario autoriza → callback `/api/auth/google/callback` → guardar **refresh_token cifrado** por cuenta.
- Ingesta incremental con `history.list` (`historyId`) en vez de re-listar todo.
- (Opcional) push con Gmail watch + Pub/Sub; de inicio, **polling** por el worker basta.

## IMAP (dominio propio / otros)
- `imapflow`: host/puerto/usuario/**app-password** (no la contraseña principal), guardados **cifrados**.
- Ingesta por `UID` desde el último visto; parsear con `mailparser`.

## Credenciales y seguridad
- Tabla `CUENTA_CORREO`; `credenciales_cifradas` (bytea) con **AES-256-GCM** (`ACCOUNT_ENCRYPTION_KEY`).
- Nunca en `.env` ni en texto plano. Descifrado solo en el worker/servidor.

## Idempotencia y parsing
- Único `(cuenta_id, message_id)` → no duplicar (RNF-M3-002).
- `parsers/`: normaliza a `CorreoCrudo` y extrae candidatos a factura (la extracción fina la hace M6).

## Notificaciones salientes
- `nodemailer` (SMTP del `.env`) para recordatorios/resúmenes (M2/M3). Distinto de la ingesta.
