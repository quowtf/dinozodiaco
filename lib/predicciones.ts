import { SIGNOS } from "@/data/signos";
import { upstashGet } from "@/lib/upstash";

export interface PrediccionBloque {
  titulo: string;
  texto: string;
  tags: string[];
}

export interface PrediccionMes {
  mes: string; // "2026-12"
  edicion: number; // 3
  general: PrediccionBloque;
  signos: Record<string, PrediccionBloque>; // clave = slug de data/signos.ts
}

export interface ResultadoValidacion {
  ok: boolean;
  errores: string[];
}

const MES_RE = /^\d{4}-\d{2}$/;

const LIMITE_TITULO = 120;
const TEXTO_MIN = 40;
const TEXTO_MAX = 1200;
const MAX_TAGS = 3;
const MAX_TAG = 60;

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Slugs de los 12 signos, en el orden de `data/signos.ts`. */
export function clavesSignosEsperadas(): string[] {
  return SIGNOS.map((s) => s.slug);
}

/** "2026-12" -> "Diciembre". */
export function etiquetaMes(mes: string): string {
  const match = MES_RE.exec(mes);
  if (!match) return mes;
  const indice = Number(mes.slice(5, 7)) - 1;
  return MESES_ES[indice] ?? mes;
}

/** Mes local actual en America/Mexico_City, formato "YYYY-MM". */
export function slugSignoActual(): string {
  const zona = process.env.PREDICCIONES_ZONA || "America/Mexico_City";
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return partes.slice(0, 7);
}

/**
 * Lee la prediccion de un mes desde Upstash y la valida.
 * Lanza si la key no existe o si el contenido no pasa `validarPrediccion`.
 */
export async function prediccionDelMes(mes: string): Promise<PrediccionMes> {
  const cruda = await upstashGet(`prediccion:${mes}`);

  if (cruda === null) {
    throw new Error(`no hay prediccion para ${mes}`);
  }

  let datos: unknown;
  try {
    datos = JSON.parse(cruda);
  } catch {
    throw new Error(`la prediccion de ${mes} no es JSON valido`);
  }

  const validacion = validarPrediccion(datos);
  if (!validacion.ok) {
    throw new Error(
      `la prediccion de ${mes} es invalida: ${validacion.errores.join("; ")}`,
    );
  }

  return datos as PrediccionMes;
}

function esTexto(v: unknown): v is string {
  return typeof v === "string";
}

function validarBloque(
  bloque: unknown,
  ruta: string,
  errores: string[],
): void {
  if (typeof bloque !== "object" || bloque === null || Array.isArray(bloque)) {
    errores.push(`${ruta}: se esperaba un objeto con titulo, texto y tags`);
    return;
  }

  const b = bloque as Record<string, unknown>;

  if (!esTexto(b.titulo) || b.titulo.trim() === "") {
    errores.push(`${ruta}.titulo: titulo vacio`);
  } else if (b.titulo.length > LIMITE_TITULO) {
    errores.push(`${ruta}.titulo: maximo ${LIMITE_TITULO} caracteres (tiene ${b.titulo.length})`);
  }

  if (!esTexto(b.texto) || b.texto.trim() === "") {
    errores.push(`${ruta}.texto: texto vacio`);
  } else {
    if (b.texto.length < TEXTO_MIN) {
      errores.push(`${ruta}.texto: minimo ${TEXTO_MIN} caracteres (tiene ${b.texto.length})`);
    }
    if (b.texto.length > TEXTO_MAX) {
      errores.push(`${ruta}.texto: maximo ${TEXTO_MAX} caracteres (tiene ${b.texto.length})`);
    }
    if (b.texto.includes("<") || b.texto.includes(">")) {
      errores.push(`${ruta}.texto: no puede contener < ni > (se inyecta HTML en el correo)`);
    }
  }

  if (!Array.isArray(b.tags)) {
    errores.push(`${ruta}.tags: se esperaba un array de strings`);
  } else if (b.tags.length > MAX_TAGS) {
    errores.push(`${ruta}.tags: maximo ${MAX_TAGS} tags (tiene ${b.tags.length})`);
  } else {
    b.tags.forEach((tag, i) => {
      if (!esTexto(tag) || tag.trim() === "") {
        errores.push(`${ruta}.tags[${i}]: tag vacio`);
      } else if (tag.length > MAX_TAG) {
        errores.push(`${ruta}.tags[${i}]: maximo ${MAX_TAG} caracteres (tiene ${tag.length})`);
      }
    });
  }
}

/**
 * Valida la forma de un mes de predicciones.
 * No lanza: devuelve la lista de errores en español.
 */
export function validarPrediccion(datos: unknown): ResultadoValidacion {
  const errores: string[] = [];

  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return { ok: false, errores: ["raiz: se esperaba un objeto"] };
  }

  const d = datos as Record<string, unknown>;

  if (!esTexto(d.mes) || !MES_RE.test(d.mes)) {
    errores.push(`mes: se esperaba un string con formato YYYY-MM (tiene ${JSON.stringify(d.mes)})`);
  }

  if (typeof d.edicion !== "number" || !Number.isInteger(d.edicion) || d.edicion < 1) {
    errores.push(`edicion: se esperaba un entero >= 1 (tiene ${JSON.stringify(d.edicion)})`);
  }

  validarBloque(d.general, "general", errores);

  const esperadas = clavesSignosEsperadas();

  if (typeof d.signos !== "object" || d.signos === null || Array.isArray(d.signos)) {
    errores.push("signos: se esperaba un objeto con una clave por signo");
  } else {
    const signos = d.signos as Record<string, unknown>;
    const presentes = Object.keys(signos);

    for (const slug of esperadas) {
      if (!(slug in signos)) {
        errores.push(`signos: falta el signo ${slug}`);
        continue;
      }
      validarBloque(signos[slug], `signos.${slug}`, errores);
    }

    for (const slug of presentes) {
      if (!esperadas.includes(slug)) {
        errores.push(`signos: sobra la clave ${slug} (no es un signo valido)`);
      }
    }
  }

  // Los 12 textos deben ser distintos: predicciones repetidas = error de contenido.
  if (typeof d.signos === "object" && d.signos !== null && !Array.isArray(d.signos)) {
    const vistos = new Map<string, string>();
    for (const [slug, bloque] of Object.entries(d.signos as Record<string, unknown>)) {
      if (typeof bloque !== "object" || bloque === null) continue;
      const texto = (bloque as Record<string, unknown>).texto;
      if (!esTexto(texto)) continue;
      const clave = texto.trim().toLowerCase();
      const previo = vistos.get(clave);
      if (previo) {
        errores.push(`signos.${slug}.texto: texto identico al de ${previo}`);
      } else {
        vistos.set(clave, slug);
      }
    }
  }

  return { ok: errores.length === 0, errores };
}
