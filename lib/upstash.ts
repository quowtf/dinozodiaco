/**
 * Cliente minimo de Upstash Redis via REST (sin SDK).
 * Las envs se leen dentro de cada funcion para que el build de Vercel
 * no dependa de ellas (preview builds no las tienen).
 */

const TIMEOUT_MS = 10_000;

function credenciales(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN",
    );
  }

  return { url: url.replace(/\/+$/, ""), token };
}

async function comando(
  metodo: "GET" | "POST",
  ruta: string,
  body?: string,
): Promise<unknown> {
  const { url, token } = credenciales();

  const res = await fetch(`${url}/${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "text/plain" } : {}),
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const texto = await res.text();

  if (!res.ok) {
    throw new Error(
      `Upstash ${metodo} ${ruta} -> ${res.status}: ${texto.slice(0, 300)}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(`Upstash ${ruta} devolvio una respuesta no-JSON: ${texto.slice(0, 300)}`);
  }

  if (typeof json === "object" && json !== null && "error" in json) {
    throw new Error(`Upstash ${ruta} -> ${(json as { error: string }).error}`);
  }

  return json;
}

function resultado(json: unknown): unknown {
  if (typeof json === "object" && json !== null && "result" in json) {
    return (json as { result: unknown }).result;
  }
  return json;
}

/** Lee una key. Devuelve null si no existe. */
export async function upstashGet(key: string): Promise<string | null> {
  const json = await comando("GET", `get/${encodeURIComponent(key)}`);
  const valor = resultado(json);

  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "string") {
    throw new Error(`Upstash get ${key} devolvio ${typeof valor}, se esperaba string`);
  }
  return valor;
}

/** Escribe una key (sobrescribe). */
export async function upstashSet(key: string, value: string): Promise<void> {
  const json = await comando("POST", `set/${encodeURIComponent(key)}`, value);

  if (resultado(json) !== "OK") {
    throw new Error(`Upstash set ${key} no devolvio OK`);
  }
}

/** Escribe una key solo si no existe. Devuelve true si la escribio. */
export async function upstashSetNx(
  key: string,
  value: string,
): Promise<boolean> {
  const json = await comando(
    "POST",
    `setnx/${encodeURIComponent(key)}`,
    value,
  );
  return resultado(json) === 1;
}

/** Borra una key. */
export async function upstashDel(key: string): Promise<void> {
  await comando("POST", `del/${encodeURIComponent(key)}`);
}

/** Lee varias keys en una sola peticion. */
export async function upstashMget(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];

  const ruta = keys.map((k) => encodeURIComponent(k)).join("/");
  const json = await comando("GET", `mget/${ruta}`);
  const valores = resultado(json);

  if (!Array.isArray(valores)) {
    throw new Error("Upstash mget devolvio algo que no es un array");
  }

  return valores.map((v) => (typeof v === "string" ? v : null));
}
