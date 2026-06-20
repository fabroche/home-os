# T3 · Integración Calendar y descubrimiento de eventos

Da soporte a M2. Dos partes: **Google Calendar** (tus eventos) y **fuentes de descubrimiento** (eventos de interés).

## Google Calendar
- Reutiliza el OAuth de Google (T2). Scope `calendar.readonly` (o `calendar` si se escribe).
- Worker `syncCalendar`: pull de eventos en una ventana (p. ej. ±60 días) → upsert `EVENTO` (`fuente=calendar`), sin duplicar.
- Escritura opcional (crear eventos desde home-os) en fase posterior.

## Descubrimiento de eventos
- Interfaz `EventSource`:
```ts
interface EventSource {
  buscar(params: { ubicacion?: Geo; ventana: Rango; online?: boolean }): Promise<EventoCandidato[]>;
}
```
- Fuentes a evaluar (confirmar uso/ToS antes de integrar): APIs públicas de eventos, Eventbrite, Meetup,
  Luma, feeds locales/municipales. Empezar con **una** y ampliar (RNF-M2-002).
- **Locales**: por `ubicacion` + radio. **Remotos**: `online=true` (accesibles desde casa).

## Scoring de relevancia (con M4 + M6)
- Cada candidato → `ai_job: puntuar_evento` con tus **preferencias** (banco de contexto, M4).
- Se guardan como `EVENTO` (`fuente=descubierto`) los que superan el umbral; el feedback del usuario ajusta preferencias.

```mermaid
flowchart LR
  cal[(Calendar)] --> ev[(EVENTO)]
  src[EventSource(s)] --> cand[Candidatos]
  cand --> score[ai_job puntuar_evento + M4]
  score --> ev
  ev --> rec[Recordatorios M2]
```

## Recordatorios
- Worker `dispararRecordatorios`: calcula avisos por `EVENTO`/preferencias → envía (nodemailer/push) → `RECORDATORIO.estado`.
