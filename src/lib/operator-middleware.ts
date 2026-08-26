import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { SESSION_COOKIE, verifySession } from "@/lib/operator-session.server";

// Replaces requireSupabaseAuth: the operator session cookie is the only gate now.
// context.supabase is the service-role client (RLS is bypassed by design here).
export const requireOperatorSession = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = getCookie(SESSION_COOKIE);
    const session = token ? await verifySession(token) : null;
    if (!session) throw new Error("Unauthorized: sessão inválida ou expirada.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return next({ context: { supabase: supabaseAdmin, operador: session.sub } });
  },
);
