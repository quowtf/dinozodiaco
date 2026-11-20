import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { upstashGet, upstashSetNx } from "@/lib/upstash";

/**
 * Tokens de baja.
 *
 * La clave HMAC se guarda en Upstash la primera vez que se usa, asi no
 * hay una env var nueva y los links sobreviven a la rotacion de
 * CRON_SECRET. Firmar solo el email evita que alguien pueda dar de baja
 * a otra persona cambiando la URL.
 */

const KEY_CLAVE = "baja:clave";

async function clave(): Promise<string> {
  const existente = await upstashGet(KEY_CLAVE);
  if (existente) return existente;

  const nueva = randomBytes(32).toString("hex");
  const gano = await upstashSetNx(KEY_CLAVE, nueva);
  if (gano) return nueva;

  // Otra instancia la creo entre medio.
  const otra = await upstashGet(KEY_CLAVE);
  if (!otra) throw new Error("no se pudo obtener la clave de baja");
  return otra;
}

function firmar(email: string, secreto: string): string {
  return createHmac("sha256", secreto)
    .update(email.trim().toLowerCase())
    .digest("base64url");
}

/** URL absoluta de baja para un correo. */
export async function urlBaja(email: string, sitio: string): Promise<string> {
  const secreto = await clave();
  const token = firmar(email, secreto);
  const params = new URLSearchParams({ e: email.trim().toLowerCase(), t: token });
  return `${sitio}/api/baja?${params.toString()}`;
}

/** true si el token corresponde a ese correo. */
export async function tokenValido(
  email: string,
  token: string,
): Promise<boolean> {
  const secreto = await clave();
  const esperado = firmar(email, secreto);

  const a = Buffer.from(esperado);
  const b = Buffer.from(token);

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
