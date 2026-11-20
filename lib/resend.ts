import { Resend } from "resend";

/**
 * Helpers sobre la API de Resend.
 *
 * El envio mensual es por contacto (el plan free solo permite 3 segments),
 * asi que aqui no hay nada de segments ni topics. El signo de cada persona
 * vive en la contact property `signo`.
 *
 * El cliente se instancia dentro de cada funcion para que el build de
 * Vercel no dependa de RESEND_API_KEY.
 */

export function resendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("falta RESEND_API_KEY");
  }

  // RESEND_API_URL permite apuntar a otro host (tests con mock, o un proxy).
  const baseUrl = process.env.RESEND_API_URL;
  return baseUrl ? new Resend(key, { baseUrl }) : new Resend(key);
}

const PREFIJO_LOG = "[resend]";

/** Keys de las contact properties que ya existen en la cuenta. */
export async function propertiesExistentes(): Promise<string[]> {
  const resend = resendClient();
  const { data, error } = await resend.contactProperties.list({ limit: 100 });

  if (error) {
    throw new Error(`contactProperties.list -> ${error.message}`);
  }

  return data.data.map((p) => p.key);
}

/**
 * Crea las contact properties que falten. Idempotente: si ya existen,
 * no las toca (Resend rechaza duplicados).
 */
export async function asegurarProperties(
  requeridas: string[],
): Promise<string[]> {
  const resend = resendClient();
  const existentes = await propertiesExistentes();

  for (const key of requeridas) {
    if (existentes.includes(key)) continue;

    const { error } = await resend.contactProperties.create({
      key,
      type: "string",
    });

    if (error) {
      // Si otra corrida la creo entremedio, se ignora.
      if (!/exist|already/i.test(error.message)) {
        throw new Error(`contactProperties.create(${key}) -> ${error.message}`);
      }
      console.log(`${PREFIJO_LOG} property "${key}" ya existia`);
      continue;
    }

    console.log(`${PREFIJO_LOG} property creada: ${key}`);
  }

  return propertiesExistentes();
}

/** Espera `ms` milisegundos. */
export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta tareas con limite de peticiones por segundo (rate limit de Resend:
 * 10 req/s por equipo).
 */
export async function conLimite<T>(
  tareas: (() => Promise<T>)[],
  porSegundo = 8,
): Promise<(T | Error)[]> {
  const intervalo = Math.floor(1000 / porSegundo);
  const resultados: (T | Error)[] = [];

  for (const tarea of tareas) {
    try {
      resultados.push(await tarea());
    } catch (error) {
      resultados.push(error instanceof Error ? error : new Error(String(error)));
    }
    await esperar(intervalo);
  }

  return resultados;
}
