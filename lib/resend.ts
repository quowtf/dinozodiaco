import { Resend } from "resend";

/**
 * Helpers sobre la API de Resend.
 *
 * Todos los ids (segments, topics, properties) se resuelven POR NOMBRE en
 * runtime: nunca se hardcodean. Asi el setup se puede re-ejecutar en otra
 * cuenta y el deploy no depende de ids externos.
 *
 * El cliente se instancia dentro de cada funcion para que el build de Vercel
 * no dependa de RESEND_API_KEY.
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

/** Segment por nombre exacto. null si no existe. */
export async function segmentPorNombre(nombre: string): Promise<string | null> {
  const resend = resendClient();
  let cursor: string | undefined;

  for (let pagina = 0; pagina < 5; pagina++) {
    const { data, error } = await resend.segments.list({
      limit: 100,
      ...(cursor ? { after: cursor } : {}),
    });

    if (error) {
      throw new Error(`segments.list -> ${error.message}`);
    }

    const encontrado = data.data.find((s) => s.name === nombre);
    if (encontrado) return encontrado.id;

    if (!data.has_more || data.data.length === 0) break;
    cursor = data.data[data.data.length - 1].id;
  }

  return null;
}

/** Topic por nombre exacto. null si no existe. */
export async function topicPorNombre(nombre: string): Promise<string | null> {
  const resend = resendClient();
  const { data, error } = await resend.topics.list();

  if (error) {
    throw new Error(`topics.list -> ${error.message}`);
  }

  const encontrado = data.data.find((t) => t.name === nombre);
  return encontrado ? encontrado.id : null;
}

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
export async function asegurarProperties(overrides: string[]): Promise<string[]> {
  const resend = resendClient();
  const existentes = await propertiesExistentes();
  const creadas: string[] = [];

  for (const key of overrides) {
    if (existentes.includes(key)) continue;

    const { error } = await resend.contactProperties.create({
      key,
      type: "string",
    });

    if (error) {
      // Si otra corrida lo creo entremedio, se ignora.
      if (!/exist|already/i.test(error.message)) {
        throw new Error(`contactProperties.create(${key}) -> ${error.message}`);
      }
      console.log(`${PREFIJO_LOG} property "${key}" ya existia`);
      continue;
    }

    console.log(`${PREFIJO_LOG} property creada: ${key}`);
    creadas.push(key);
  }

  const finales = await propertiesExistentes();
  return finales;
}

/**
 * Devuelve nombre -> id de los segments indicados, creando los que falten.
 * Idempotente.
 */
export async function asegurarSegments(
  nombres: string[],
): Promise<Record<string, string>> {
  const resend = resendClient();
  const mapa: Record<string, string> = {};

  for (const nombre of nombres) {
    const existente = await segmentPorNombre(nombre);

    if (existente) {
      mapa[nombre] = existente;
      continue;
    }

    const { data, error } = await resend.segments.create({ name: nombre });
    if (error) {
      throw new Error(`segments.create(${nombre}) -> ${error.message}`);
    }

    console.log(`${PREFIJO_LOG} segment creado: ${nombre} (${data.id})`);
    mapa[nombre] = data.id;
  }

  return mapa;
}

/**
 * Devuelve nombre -> id de los topics indicados, creando los que falten.
 * Idempotente.
 */
export async function asegurarTopics(
  defs: { nombre: string; descripcion: string }[],
): Promise<Record<string, string>> {
  const resend = resendClient();
  const mapa: Record<string, string> = {};

  for (const def of defs) {
    const existente = await topicPorNombre(def.nombre);

    if (existente) {
      mapa[def.nombre] = existente;
      continue;
    }

    const { data, error } = await resend.topics.create({
      name: def.nombre,
      description: def.descripcion,
      defaultSubscription: "opt_in",
    });
    if (error) {
      throw new Error(`topics.create(${def.nombre}) -> ${error.message}`);
    }

    console.log(`${PREFIJO_LOG} topic creado: ${def.nombre} (${data.id})`);
    mapa[def.nombre] = data.id;
  }

  return mapa;
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
