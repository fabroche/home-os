import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16: proxy.ts reemplaza a middleware.ts (export default + config).
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Protege todo menos /api (tienen su propia auth), assets y archivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
