import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  checkOperatorCredentials,
  signSession,
  verifySession,
} from "./operator-session.server";

const loginSchema = z.object({
  usuario: z.string().trim().min(3).max(40),
  senha: z.string().min(1).max(72),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      if (!checkOperatorCredentials(data.usuario, data.senha)) {
        throw new Error("Usuário ou senha incorretos.");
      }
      const token = await signSession(data.usuario);
      setCookie(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
      return { ok: true };
    } catch (err) {
      console.error("[login] handler failed", err);
      throw err;
    }
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE);
  const session = token ? await verifySession(token) : null;
  return session
    ? { authenticated: true as const, usuario: session.sub }
    : { authenticated: false as const };
});
