import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE = "presupuesto_auth";
export const DURACION = 60 * 60 * 24 * 90; // 90 días

// El valor de la cookie es una firma derivada de la contraseña: si cambiás APP_PASSWORD,
// todas las sesiones existentes dejan de ser válidas.
function firma(): string | null {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("presupuesto-sesion-v1").digest("hex");
}

function igual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordCorrecta(intento: string): boolean {
  const pw = process.env.APP_PASSWORD;
  return !!pw && igual(intento, pw);
}

export function valorCookie(): string | null {
  return firma();
}

export async function estaAutenticado(): Promise<boolean> {
  const esperado = firma();
  if (!esperado) return false;
  const actual = (await cookies()).get(COOKIE)?.value;
  return !!actual && igual(actual, esperado);
}
