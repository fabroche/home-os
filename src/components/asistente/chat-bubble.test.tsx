// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const enviar = vi.fn();
const registrar = vi.fn();
const consultar = vi.fn();
const crearMovimiento = vi.fn();
vi.mock("@/lib/actions/ai", () => ({
  enviarAlAsistente: (...a: unknown[]) => enviar(...a),
  // Acciones dedicadas (las usa la desambiguación al elegir una opción).
  registrarGasto: (...a: unknown[]) => registrar(...a),
  preguntarAsistente: vi.fn(),
  proponerContexto: vi.fn(),
  registrarIngreso: vi.fn(),
  registrarDeuda: vi.fn(),
  marcarPagado: vi.fn(),
  consultarJob: (...a: unknown[]) => consultar(...a),
}));
// SuggestionCard / ActionCard / DeudaCard / MarcarPagadoCard (vía ChatPanel) importan Server Actions.
vi.mock("@/lib/actions/contexto", () => ({ guardarEntrada: vi.fn() }));
vi.mock("@/lib/actions/finanzas", () => ({
  crearMovimiento: (...a: unknown[]) => crearMovimiento(...a),
  crearDeuda: vi.fn(),
  cambiarEstadoMovimiento: vi.fn(),
  borrarMovimiento: vi.fn(),
  borrarDeuda: vi.fn(),
  editarMovimiento: vi.fn(),
  editarDeuda: vi.fn(),
  pagarExtracto: vi.fn(),
}));
// HerramientaCard (vía ChatPanel) + carga de opciones importan Server Actions: se mockean.
vi.mock("@/lib/actions/opciones", () => ({
  opcionesFinanzas: vi.fn(() => Promise.resolve({ cuentas: [], tarjetas: [], personas: [] })),
}));
vi.mock("@/lib/actions/cuentas", () => ({ crearCuenta: vi.fn(), crearTarjeta: vi.fn() }));
vi.mock("@/lib/actions/cuotas", () => ({ crearPlanCuotas: vi.fn() }));
vi.mock("@/lib/actions/presupuestos", () => ({ guardarPresupuesto: vi.fn() }));
vi.mock("@/lib/actions/gastos-recurrentes", () => ({ crearGastoRecurrente: vi.fn() }));

// Respuesta del router que propone un gasto (reutilizada en varios tests de tarjetas).
const PROPUESTA_GASTO = {
  estado: "ok",
  tipo: "registrar_gasto",
  propuesta: {
    nombre: "Café",
    importe: 2.5,
    categoria: "Restaurantes",
    tipo: "Gasto Variable",
    fecha: "2026-06-23",
    estado: "Pending",
  },
} as const;

import { ChatBubble } from "@/components/asistente/chat-bubble";

beforeEach(() => {
  enviar.mockReset();
  registrar.mockReset();
  consultar.mockReset();
  crearMovimiento.mockReset();
  sessionStorage.clear();
});

describe("ChatBubble", () => {
  it("abre el panel desde el FAB", () => {
    render(<ChatBubble />);
    fireEvent.click(screen.getByRole("button", { name: /abrir asistente/i }));
    expect(screen.getByLabelText("Mensaje para el asistente")).toBeInTheDocument();
  });

  it("manda el mensaje al router, sondea y muestra la respuesta con fuentes", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "j1" });
    consultar.mockResolvedValue({
      estado: "ok",
      tipo: "consulta_rag",
      respuesta: "En mayo gastaste 420 €.",
      fuentes: [{ id: "c1", titulo: "12 movimientos" }],
    });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "¿gasto de mayo?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByText("¿gasto de mayo?")).toBeInTheDocument(); // mensaje optimista
    await waitFor(() => expect(screen.getByText("En mayo gastaste 420 €.")).toBeInTheDocument());
    expect(screen.getByText(/12 movimientos/)).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledWith({ mensaje: "¿gasto de mayo?" });
  });

  it("el router propone un gasto y muestra la tarjeta de acción", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "jg" });
    consultar.mockResolvedValue({
      estado: "ok",
      tipo: "registrar_gasto",
      propuesta: {
        nombre: "Café",
        importe: 2.5,
        categoria: "Restaurantes",
        tipo: "Gasto Variable",
        fecha: "2026-06-23",
        estado: "Pending",
      },
    });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "apúntame un gasto de 2,5€ en café" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/registrar gasto/i)).toBeInTheDocument());
    expect(screen.getByDisplayValue("Café")).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledWith({ mensaje: "apúntame un gasto de 2,5€ en café" });
  });

  it("desambigua: muestra las opciones y al elegir una encola la acción forzada", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "jr" });
    registrar.mockResolvedValue({ ok: true, jobId: "jg" });
    // 1ª respuesta del router: pide aclarar. Tras elegir "gasto", el job forzado propone.
    consultar
      .mockResolvedValueOnce({
        estado: "ok",
        tipo: "aclarar",
        pregunta: "¿Registrar un gasto nuevo o marcar la luz como pagada?",
        opciones: [
          { etiqueta: "Registrar gasto nuevo", accion: "gasto" },
          { etiqueta: "Marcar la luz como pagada", accion: "pagado" },
        ],
      })
      .mockResolvedValue({
        estado: "ok",
        tipo: "registrar_gasto",
        propuesta: {
          nombre: "Luz",
          importe: 50,
          categoria: "Casa",
          tipo: "Gasto Variable",
          fecha: "2026-06-23",
          estado: "Pending",
        },
      });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "ya pagué la luz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    // Aparece la tarjeta de desambiguación con sus opciones.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /registrar gasto nuevo/i })).toBeInTheDocument(),
    );
    expect(enviar).toHaveBeenCalledWith({ mensaje: "ya pagué la luz" });

    // Elegir "gasto" reenvía el mensaje ORIGINAL forzando registrarGasto.
    fireEvent.click(screen.getByRole("button", { name: /registrar gasto nuevo/i }));
    expect(registrar).toHaveBeenCalledWith({ peticion: "ya pagué la luz" });

    // Y se pinta la tarjeta de gasto propuesta por el job forzado.
    await waitFor(() => expect(screen.getByDisplayValue("Luz")).toBeInTheDocument());
  });

  it("conserva el historial tras desmontar (persistencia)", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "j1" });
    consultar.mockResolvedValue({ estado: "ok", tipo: "consulta_rag", respuesta: "Balance: 100 €", fuentes: [] });

    const { unmount } = render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), { target: { value: "balance?" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText("Balance: 100 €")).toBeInTheDocument());

    unmount();
    cleanup();

    // Nueva instancia (simula cambiar de sección / reabrir): el historial se restaura.
    render(<ChatBubble defaultOpen />);
    await waitFor(() => expect(screen.getByText("Balance: 100 €")).toBeInTheDocument());
    expect(screen.getByText("balance?")).toBeInTheDocument();
  });

  it("una tarjeta confirmada sigue resuelta (no interactuable) al reabrir", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "jg" });
    consultar.mockResolvedValue(PROPUESTA_GASTO);
    crearMovimiento.mockResolvedValue({ ok: true, id: "m1" });

    const { unmount } = render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "apúntame un café de 2,5€" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/registrar gasto/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /confirmar y crear/i }));
    await waitFor(() => expect(screen.getByText(/^Gasto creado/)).toBeInTheDocument());

    // Cerrar y reabrir (nueva instancia): la tarjeta se rehidrata CONGELADA.
    unmount();
    cleanup();
    render(<ChatBubble defaultOpen pollMs={5} />);

    await waitFor(() => expect(screen.getByText(/^Gasto creado/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /confirmar y crear/i })).not.toBeInTheDocument();
    // No se vuelve a escribir en Notion por la rehidratación.
    expect(crearMovimiento).toHaveBeenCalledTimes(1);
  });

  it("escribir un mensaje nuevo supera la tarjeta pendiente sin resolver", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "jg" });
    // El primer sondeo propone el gasto; el segundo (tras reescribir) responde texto.
    consultar
      .mockResolvedValueOnce(PROPUESTA_GASTO)
      .mockResolvedValue({ estado: "ok", tipo: "consulta_rag", respuesta: "Vale, anotado.", fuentes: [] });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "apúntame un café" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /confirmar y crear/i })).toBeInTheDocument());

    // El usuario NO confirma: vuelve a escribir corrigiendo.
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "no, fue hace 2 días" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    // La tarjeta anterior queda congelada y deja de ser interactuable.
    await waitFor(() => expect(screen.getByText(/lo reescribiste/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /confirmar y crear/i })).not.toBeInTheDocument();
    expect(crearMovimiento).not.toHaveBeenCalled();
  });

  it("al reescribir, envía el historial reciente con la propuesta anterior (memoria conversacional)", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "jg" });
    consultar
      .mockResolvedValueOnce(PROPUESTA_GASTO)
      .mockResolvedValue({ estado: "ok", tipo: "consulta_rag", respuesta: "Hecho.", fuentes: [] });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "apúntame un café" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /confirmar y crear/i })).toBeInTheDocument());

    // El primer mensaje no lleva historial (conversación vacía).
    expect(enviar).toHaveBeenNthCalledWith(1, { mensaje: "apúntame un café" });

    // El usuario corrige sin confirmar la tarjeta.
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "no, fue hace 2 días" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    const segunda = enviar.mock.calls[1]![0] as { mensaje: string; historial?: { texto: string }[] };
    expect(segunda.mensaje).toBe("no, fue hace 2 días");
    expect(segunda.historial).toBeDefined();
    expect(JSON.stringify(segunda.historial)).toContain("Propuse registrar un gasto");
  });

  it("el router propone un borrado y muestra la tarjeta de confirmación", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "jb" });
    consultar.mockResolvedValue({
      estado: "ok",
      tipo: "borrar",
      objetivo: { tipo: "deuda", id: "bd1", nombre: "Préstamo a Leo" },
    });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), {
      target: { value: "borra el préstamo de Leo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/borrar deuda/i)).toBeInTheDocument());
    expect(screen.getByText("Préstamo a Leo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sí, borrar/i })).toBeInTheDocument();
  });

  it("muestra el error si el job falla", async () => {
    enviar.mockResolvedValue({ ok: true, jobId: "j2" });
    consultar.mockResolvedValue({ estado: "error", error: "salida no válida" });

    render(<ChatBubble defaultOpen pollMs={5} />);
    fireEvent.change(screen.getByLabelText("Mensaje para el asistente"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(screen.getByText(/no pude responder/i)).toBeInTheDocument());
  });
});
