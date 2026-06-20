# `lib/email` — ingesta de correo multi-cuenta

Lee correos de **varias cuentas** (Gmail API + IMAP) para el backoffice (M3) y la extracción de facturas (M1).

## Archivos (a implementar)
- `gmail/` — cliente Gmail API (OAuth con `googleapis`), `watch`/historial, listado y lectura de mensajes.
- `imap/` — cliente IMAP (`imapflow`) para dominio propio / otros proveedores.
- `parsers/` — normalización (`mailparser`) + extracción de facturas (remitente, importe, fecha, adjunto PDF).

## Reglas
- Las credenciales/refresh tokens de cada cuenta se guardan **cifrados en Supabase**
  (`ACCOUNT_ENCRYPTION_KEY`, AES-256-GCM), nunca en texto plano ni en `.env`.
- Interfaz común `EmailProvider` para que Gmail e IMAP sean intercambiables.
- Idempotencia: registrar el `message_id` procesado para no duplicar facturas.

Ver `docs/transversal/integracion-correo.md` y `docs/modules/M3-backoffice-correo.md`.
