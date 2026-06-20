# M7 · Auth & seguridad (single-user)

| Campo | Valor |
|-------|-------|
| **ID** | M7 |
| **Estado** | 🟧 borrador |
| **Depende de** | Supabase Auth |
| **Lo usan** | Todos los módulos |

## 1. Propósito y alcance
Asegurar que **solo tú** accedes, y que las credenciales de terceros (Notion, Gmail/IMAP, Calendar) se
guardan de forma **segura**. Single-user, pero con `user_id` y RLS explícitos para poder crecer.

**Dentro:** login (Supabase Auth, magic link), protección de rutas, RLS, cifrado de credenciales de
cuentas, gestión de secretos. **Fuera:** multi-usuario/roles (futuro).

## 2. Actores
Usuario; sistema (worker con service role).

## 3. Requisitos funcionales (RF)
| ID | Requisito | Prioridad |
|----|-----------|:---------:|
| RF-M7-001 | Login con Supabase Auth (magic link) restringido a tu email. | Must |
| RF-M7-002 | Proteger todas las rutas del dashboard y las Server Actions. | Must |
| RF-M7-003 | RLS por `user_id` en todas las tablas. | Must |
| RF-M7-004 | Cifrar credenciales de cuentas (Notion no incluye PII; Gmail/IMAP tokens) con AES-256-GCM. | Must |
| RF-M7-005 | El worker usa **service role** para jobs de sistema (sin pasar por RLS de usuario). | Must |
| RF-M7-006 | Endpoints `/api/cron/*` protegidos por `CRON_SECRET`. | Must |

## 4. Requisitos no funcionales (RNF)
| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-M7-001 | Secretos fuera del repo | `.env*` ignorado; claves solo en Dokploy/entorno. |
| RNF-M7-002 | Mínimo privilegio | `service_role` solo en worker/servidor, nunca en el cliente. |
| RNF-M7-003 | Cifrado en reposo | Credenciales de cuentas cifradas; clave en `ACCOUNT_ENCRYPTION_KEY`. |

## 5. Modelo de datos (fragmento)
`auth.users` (Supabase) + `user_id` en todas las tablas. Credenciales en `CUENTA_CORREO.credenciales_cifradas` (bytea).

## 6. Arquitectura / componentes
- `src/proxy.ts` (middleware Next 16) o middleware de sesión Supabase para proteger rutas.
- `lib/supabase/server.ts` (anon + RLS) y `service.ts` (service role, solo worker/servidor).
- `lib/crypto.ts` — helpers de cifrado/descifrado (AES-256-GCM) de credenciales.

## 7. Funcionalidades
- **F-M7-1 · Login (magic link)** restringido a tu email.
- **F-M7-2 · Protección de rutas/acciones** (sesión obligatoria).
- **F-M7-3 · RLS** por `user_id` (políticas por tabla).
- **F-M7-4 · Cifrado de credenciales** de cuentas.

## 8. Criterios de aceptación
- [ ] Sin sesión válida no se accede a `/finanzas`, `/calendario`, etc.
- [ ] Las políticas RLS impiden leer filas de otro `user_id`.
- [ ] Las credenciales de cuentas no aparecen en texto plano en la BD.
- [ ] `/api/cron/*` rechaza peticiones sin `CRON_SECRET`.

## 9. Riesgos y decisiones abiertas
- Gestión/rotación de `ACCOUNT_ENCRYPTION_KEY` (si se pierde, se reconectan cuentas).
- Confirmar que Supabase Auth magic link cubre tu caso (alternativa: passkey).
