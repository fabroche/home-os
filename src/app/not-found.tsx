import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold">404 — No encontrado</h2>
      <Link href="/" className="text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  );
}
