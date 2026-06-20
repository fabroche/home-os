# 00 · Visión y alcance

## Problema
La gestión personal del usuario está repartida: finanzas en **bases de datos de Notion**, facturas que
llegan a **varias cuentas de correo**, viajes y eventos sin un sitio central, y ningún sistema que avise
de **eventos de interés** (locales o accesibles en remoto). Falta un punto único que lo integre y que,
además, se apoye en **IA** para el trabajo repetitivo (leer facturas, conciliar, resumir, recordar).

## Visión
**home-os**: un panel personal que integra finanzas, calendario inteligente y backoffice de correo
sobre un **banco de contexto** que alimenta a una IA asistente. Notion sigue siendo donde el usuario
**edita** sus datos; home-os los **espeja, analiza y enriquece**, y automatiza tareas con IA.

## Objetivos
1. **Finanzas unificadas** — leer/escribir las DBs de finanzas de Notion y construir analítica (Supabase).
2. **Facturas automáticas** — detectar facturas en el correo, extraer datos y conciliarlas con gastos.
3. **Calendario inteligente** — planificar viajes/eventos y **avisar** de eventos locales o remotos de interés.
4. **Backoffice** — triaje de varias cuentas de correo y estar al día del entorno.
5. **IA con tu suscripción** — automatización con Claude Code headless, **sin coste de API**.

## Alcance (esta fase)
**Dentro:** estructura del proyecto, documentación técnica, subagentes y banco de contexto. Diseño
completo de los 7 módulos + transversales. **Fuera (siguientes rondas):** implementación de features,
y a futuro: pasarela de pagos, app móvil, multi-usuario.

## Módulos
| ID | Módulo | Resumen |
|----|--------|---------|
| M1 | Finanzas | DBs Notion + analítica Supabase + ingesta de facturas del correo |
| M2 | Calendario inteligente | Viajes, eventos, descubrimiento local/remoto, recordatorios |
| M3 | Backoffice / correo | Multi-cuenta Gmail+IMAP, clasificación, extracción de facturas → M1 |
| M4 | Banco de contexto | Conocimiento personal estructurado para la IA |
| M5 | Dashboard | Panel unificado |
| M6 | Asistente IA | Cola `ai_jobs` + runner headless + contratos de tareas |
| M7 | Auth & seguridad | Single-user, Supabase Auth, RLS, cifrado de credenciales |

## Métricas de éxito (personales)
- Facturas del correo capturadas y conciliadas sin intervención manual > 80 %.
- Avisos de eventos de interés relevantes (poca/ninguna basura).
- Cero coste de API de IA (todo por suscripción).
